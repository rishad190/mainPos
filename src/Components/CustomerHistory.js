"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  ref,
  query,
  orderByChild,
  equalTo,
  onValue,
  update,
} from "firebase/database";
import { dateUtils } from "@/lib/dateUtils";
import { LoadingSpinner } from "@/Components/LoadingSpinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/Components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import {
  Receipt,
  Calendar,
  DollarSign,
  Package,
  Calculator,
  CreditCard,
  Download,
  Printer,
  ArrowRight,
} from "lucide-react";
import { ErrorBoundary } from "@/Components/ErrorBoundary";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/Components/ui/select";
import { exportCustomerHistory } from "@/lib/exportData";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/Components/ui/pagination";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar as CalendarComponent } from "@/Components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/Components/ui/popover";

const CustomerHistory = ({ customerId }) => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [selectedMemo, setSelectedMemo] = useState(null);
  const [paymentInputs, setPaymentInputs] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [dateRange, setDateRange] = useState({
    from: undefined,
    to: undefined,
  });
  const [totals, setTotals] = useState({
    totalPurchases: 0,
    totalPayments: 0,
    totalGivenMoney: 0,
    outstandingCredit: 0,
  });

  useEffect(() => {
    if (!customerId) return;

    const memosRef = ref(db, "memos");
    const customerMemosQuery = query(
      memosRef,
      orderByChild("customerPhone"),
      equalTo(customerId)
    );

    const unsubscribe = onValue(customerMemosQuery, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const memosData = Object.entries(snapshot.val()).map(
            ([id, data]) => ({
              id,
              date: dateUtils.formatDate(data.date),
              memoNumber: data.memoNumber || id.slice(0, 8).toUpperCase(),
              productNames: data.products.map(
                (p) => `${p.name} (${p.quantity}x)`
              ),
              totalPrice: data.totalBill,
              givenMoney: data.paymentAmount,
              credit: data.credit || 0,
            })
          );

          const totalPurchases = memosData.reduce(
            (sum, memo) => sum + memo.totalPrice,
            0
          );
          const totalGivenMoney = memosData.reduce(
            (sum, memo) => sum + memo.givenMoney,
            0
          );

          const outstandingCredit =
            totalPurchases - (totals.totalPayments + totalGivenMoney);

          setTotals((prev) => ({
            ...prev,
            totalPurchases,
            totalGivenMoney,
            outstandingCredit,
          }));

          setHistory(memosData.sort((a, b) => b.date.localeCompare(a.date)));
        } else {
          setHistory([]);
          setTotals((prev) => ({
            ...prev,
            totalPurchases: 0,
            totalGivenMoney: 0,
            outstandingCredit: 0,
          }));
        }
      } catch (error) {
        console.error("Error processing customer history:", error);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [customerId]);

  useEffect(() => {
    if (!customerId) return;

    const paymentsRef = ref(db, "customerPayments");
    const customerPaymentsQuery = query(
      paymentsRef,
      orderByChild("customerPhone"),
      equalTo(customerId)
    );

    const unsubscribe = onValue(customerPaymentsQuery, (snapshot) => {
      if (snapshot.exists()) {
        const paymentsData = Object.entries(snapshot.val()).map(
          ([id, data]) => ({
            id,
            ...data,
          })
        );

        const totalPayments = paymentsData.reduce(
          (sum, payment) => sum + (payment.amount || 0),
          0
        );

        setTotals((prev) => ({
          ...prev,
          totalPayments,
          outstandingCredit:
            prev.totalPurchases - (totalPayments + prev.totalGivenMoney),
        }));

        setPaymentHistory(
          paymentsData.sort((a, b) => b.date.localeCompare(a.date))
        );
      }
    });

    return () => unsubscribe();
  }, [customerId]);

  const handlePayment = async (item) => {
    const amount = paymentInputs[item.id];
    if (!amount || amount <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    const updatedItem = {
      ...item,
      givenMoney: item.givenMoney + Number(amount),
      credit: item.totalPrice - (item.givenMoney + Number(amount)),
    };

    try {
      const memoRef = ref(db, `memos/${item.id}`);
      await update(memoRef, {
        paymentAmount: updatedItem.givenMoney,
        credit: updatedItem.credit,
      });

      // Update local state
      setHistory((prev) =>
        prev.map((histItem) =>
          histItem.id === item.id ? updatedItem : histItem
        )
      );

      // Clear the payment input
      setPaymentInputs((prev) => ({ ...prev, [item.id]: "" }));
      setSelectedMemo(null);
    } catch (error) {
      console.error("Error updating payment:", error);
      alert("Failed to update payment. Please try again.");
    }
  };

  const filteredHistory = history.filter((item) => {
    const itemDate = new Date(item.date);
    const matchesSearch =
      (item.productNames || [])
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (item.memoNumber || "").toLowerCase().includes(searchTerm.toLowerCase());

    if (dateRange.from && dateRange.to) {
      return (
        itemDate >= dateRange.from && itemDate <= dateRange.to && matchesSearch
      );
    }
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredHistory.slice(startIndex, endIndex);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const exportData = history.map((item) => ({
      Date: item.date,
      "Memo Number": item.memoNumber,
      Products: (item.productNames || []).join(", "),
      "Total Amount": `৳${(item.totalPrice || 0).toFixed(2)}`,
      "Amount Paid": `৳${(item.givenMoney || 0).toFixed(2)}`,
      Credit: `৳${(item.credit || 0).toFixed(2)}`,
    }));

    exportCustomerHistory(exportData);
  };

  if (loading) return <LoadingSpinner />;

  if (!history.length) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Purchase History
        </h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          This customer hasn't made any purchases yet. New transactions will
          appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Purchases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ৳{totals.totalPurchases.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ৳{totals.totalPayments.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Given Money
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ৳{totals.totalGivenMoney.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding Credit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ৳{totals.outstandingCredit.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
        <div className="flex flex-wrap gap-4">
          <Input
            placeholder="Search memos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !dateRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                initialFocus
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Rows per page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="25">25 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="hidden print:hidden md:flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="hidden md:flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-section,
          .print-section * {
            visibility: visible;
          }
          .print-section {
            position: absolute;
            left: 0;
            top: 0;
          }
          @page {
            size: auto;
            margin: 20mm;
          }
        }
      `}</style>

      <Card>
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Memo #</TableHead>
                  <TableHead className="min-w-[200px]">Products</TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Total
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Paid
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Credit
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.date}</TableCell>
                    <TableCell className="font-medium">
                      {item.memoNumber}
                    </TableCell>
                    <TableCell>
                      {(item.productNames || []).join(", ")}
                    </TableCell>
                    <TableCell className="text-right">
                      ৳{(item.totalPrice || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ৳{(item.givenMoney || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-medium ${
                          (item.credit || 0) > 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        ৳{(item.credit || 0).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {/* ... existing action buttons ... */}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="print-section mt-8">
        <h3 className="text-lg font-semibold mb-4">Payment History</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentHistory.map((payment) => {
              const relatedMemo = history.find(
                (memo) => memo.date === payment.date
              ) || {
                totalPrice: 0,
                givenMoney: 0,
                credit: 0,
              };

              return (
                <TableRow key={payment.id}>
                  <TableCell>
                    {new Date(payment.date || new Date()).toLocaleString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      }
                    )}
                  </TableCell>
                  <TableCell>৳{payment.amount.toFixed(2)}</TableCell>
                  <TableCell className="capitalize">
                    {payment.paymentMethod || "cash"}
                  </TableCell>
                  <TableCell>
                    ৳{(relatedMemo.totalPrice || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    ৳{(relatedMemo.givenMoney || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-medium ${
                        (relatedMemo.credit || 0) > 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      ৳{(relatedMemo.credit || 0).toFixed(2)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {startIndex + 1} to{" "}
            {Math.min(endIndex, filteredHistory.length)} of{" "}
            {filteredHistory.length} entries
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                />
              </PaginationItem>
              {[...Array(totalPages)].map((_, index) => (
                <PaginationItem key={index + 1}>
                  <PaginationLink
                    onClick={() => setCurrentPage(index + 1)}
                    isActive={currentPage === index + 1}
                  >
                    {index + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
};

export default function CustomerHistoryWrapper(props) {
  return (
    <ErrorBoundary>
      <CustomerHistory {...props} />
    </ErrorBoundary>
  );
}
