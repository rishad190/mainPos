"use client";

import React from "react";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { ref, push, onValue } from "firebase/database";
import { dateUtils } from "@/lib/dateUtils";

import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/Components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/Components/ui/select";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/Components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/Components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/Components/ui/popover";
import { cn } from "@/lib/utils";

const groupByDate = (entries) => {
  return entries.reduce((groups, entry) => {
    const date = entry.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {});
};

export default function CashManagementPage() {
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split("T")[0],
    details: "",
    type: "in",
    amount: 0,
    category: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerPayment, setShowCustomerPayment] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [dateFilter, setDateFilter] = useState("all"); // all, thisMonth, thisYear
  const [searchTerm, setSearchTerm] = useState("");
  const [dateSearch, setDateSearch] = useState({
    from: undefined,
    to: undefined,
  });

  useEffect(() => {
    const entriesRef = ref(db, "cashEntries");
    const unsubscribe = onValue(entriesRef, (snapshot) => {
      if (snapshot.exists()) {
        const entriesData = Object.entries(snapshot.val()).map(
          ([id, data]) => ({
            id,
            ...data,
          })
        );
        setEntries(entriesData.sort((a, b) => b.date.localeCompare(a.date)));

        // Check if we need to add opening balance for today
        checkAndAddOpeningBalance(entriesData);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const customersRef = ref(db, "customers");
    const unsubscribe = onValue(customersRef, (snapshot) => {
      if (snapshot.exists()) {
        const customersData = Object.entries(snapshot.val()).map(
          ([id, data]) => ({
            id,
            ...data,
          })
        );
        setCustomers(customersData);
      }
    });

    return () => unsubscribe();
  }, []);

  // Function to check and add opening balance
  const checkAndAddOpeningBalance = async (currentEntries) => {
    const today = new Date().toISOString().split("T")[0];
    const hasOpeningBalanceToday = currentEntries.some(
      (entry) => entry.date === today && entry.category === "opening_balance"
    );

    if (!hasOpeningBalanceToday) {
      // Get yesterday's entries
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const yesterdayEntries = currentEntries.filter(
        (entry) => entry.date === yesterdayStr
      );

      // Calculate yesterday's net balance
      const netBalance = yesterdayEntries.reduce((sum, entry) => {
        return sum + (entry.type === "in" ? entry.amount : -entry.amount);
      }, 0);

      if (netBalance !== 0) {
        // Add opening balance entry for today
        const entriesRef = ref(db, "cashEntries");
        await push(entriesRef, {
          date: today,
          type: "in",
          amount: netBalance,
          category: "opening_balance",
          details: `Opening Balance (carried forward)`,
          createdAt: new Date().toISOString(),
        });
      }
    }
  };

  // Calculate totals for the current day
  const calculateDayTotal = (entries, date) => {
    return entries
      .filter((entry) => entry.date === date)
      .reduce(
        (totals, entry) => {
          if (entry.type === "in") {
            totals.cashIn += entry.amount;
          } else {
            totals.cashOut += entry.amount;
          }
          return totals;
        },
        { cashIn: 0, cashOut: 0 }
      );
  };

  const addEntry = async () => {
    setIsLoading(true);
    try {
      const entriesRef = ref(db, "cashEntries");
      const newRef = await push(entriesRef, {
        ...newEntry,
        createdAt: new Date().toISOString(),
      });

      const entry = {
        id: newRef.key,
        ...newEntry,
      };

      setEntries([entry, ...entries]);
      setNewEntry({
        date: new Date().toISOString().split("T")[0],
        details: "",
        type: "in",
        amount: 0,
        category: "",
      });
    } catch (error) {
      console.error("Error adding cash entry:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomerPayment = async () => {
    if (!selectedCustomer || !newEntry.amount) {
      alert("Please select a customer and enter amount");
      return;
    }

    try {
      setIsLoading(true);

      // 1. Create cash entry
      const entriesRef = ref(db, "cashEntries");
      const newRef = await push(entriesRef, {
        ...newEntry,
        category: "customer_payment",
        details: `Payment from ${selectedCustomer.name}`,
        reference: {
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          customerPhone: selectedCustomer.phone,
        },
        createdAt: new Date().toISOString(),
      });

      // 2. Update customer's payment history
      const historyRef = ref(db, "customerPayments");
      await push(historyRef, {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        amount: newEntry.amount,
        date: newEntry.date,
        paymentMethod: newEntry.paymentMethod || "cash",
        createdAt: new Date().toISOString(),
      });

      setNewEntry({
        date: new Date().toISOString().split("T")[0],
        details: "",
        type: "in",
        amount: 0,
        category: "",
      });
      setSelectedCustomer(null);
      setShowCustomerPayment(false);
    } catch (error) {
      console.error("Error processing customer payment:", error);
      alert("Failed to process payment");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter entries based on search and date
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = entry.details
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const entryDate = new Date(entry.date);

    // Date range filter
    if (dateSearch.from && dateSearch.to) {
      const isInRange =
        entryDate >= dateSearch.from && entryDate <= dateSearch.to;
      return matchesSearch && isInRange;
    }

    if (dateFilter === "all") return matchesSearch;

    if (dateFilter === "thisMonth") {
      const now = new Date();
      return (
        matchesSearch &&
        entryDate.getMonth() === now.getMonth() &&
        entryDate.getFullYear() === now.getFullYear()
      );
    }

    if (dateFilter === "thisYear") {
      return (
        matchesSearch && entryDate.getFullYear() === new Date().getFullYear()
      );
    }

    return matchesSearch;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEntries = filteredEntries.slice(startIndex, endIndex);

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Cash Management</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium">
            <span className="text-gray-500">Today Balance: </span>
            {entries.length > 0 && (
              <span
                className={`${
                  calculateDayTotal(
                    entries,
                    new Date().toISOString().split("T")[0]
                  ).cashIn -
                    calculateDayTotal(
                      entries,
                      new Date().toISOString().split("T")[0]
                    ).cashOut >=
                  0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                $
                {(
                  calculateDayTotal(
                    entries,
                    new Date().toISOString().split("T")[0]
                  ).cashIn -
                  calculateDayTotal(
                    entries,
                    new Date().toISOString().split("T")[0]
                  ).cashOut
                ).toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Add search and filter controls */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />

          {/* Add Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !dateSearch.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateSearch.from ? (
                  dateSearch.to ? (
                    <>
                      {format(dateSearch.from, "LLL dd, y")} -{" "}
                      {format(dateSearch.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateSearch.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                selected={dateSearch}
                onSelect={setDateSearch}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {/* Clear Filters Button */}
          {(dateSearch.from || searchTerm) && (
            <Button
              variant="ghost"
              onClick={() => {
                setDateSearch({ from: undefined, to: undefined });
                setSearchTerm("");
              }}
              className="h-10"
            >
              Clear Filters
            </Button>
          )}

          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
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
      </div>

      {/* New Entry Card */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-6">New Transaction</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm font-medium">
              Date
            </Label>
            <Input
              id="date"
              type="date"
              value={newEntry.date}
              onChange={(e) =>
                setNewEntry({ ...newEntry, date: e.target.value })
              }
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="details" className="text-sm font-medium">
              Details
            </Label>
            <Input
              id="details"
              value={newEntry.details}
              onChange={(e) =>
                setNewEntry({ ...newEntry, details: e.target.value })
              }
              placeholder="Transaction details"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-sm font-medium">
              Type
            </Label>
            <Select
              value={newEntry.type}
              onValueChange={(value) =>
                setNewEntry({ ...newEntry, type: value })
              }
            >
              <SelectTrigger id="type" className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in">Cash In</SelectItem>
                <SelectItem value="out">Cash Out</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium">
              Amount
            </Label>
            <Input
              id="amount"
              type="number"
              value={newEntry.amount}
              onChange={(e) =>
                setNewEntry({ ...newEntry, amount: parseFloat(e.target.value) })
              }
              placeholder="0.00"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">
              Category
            </Label>
            <Select
              value={newEntry.category}
              onValueChange={(value) =>
                setNewEntry({ ...newEntry, category: value })
              }
            >
              <SelectTrigger id="category" className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="salary">Salary</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6">
          <Button
            onClick={addEntry}
            disabled={isLoading}
            className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Transaction"
            )}
          </Button>
        </div>
      </div>

      <Dialog open={showCustomerPayment} onOpenChange={setShowCustomerPayment}>
        <DialogTrigger asChild>
          <Button className="ml-4">Add Customer Payment</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Customer Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Customer</Label>
              <Select
                value={selectedCustomer?.id}
                onValueChange={(value) => {
                  const customer = customers.find((c) => c.id === value);
                  setSelectedCustomer(customer);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} ({customer.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={newEntry.amount}
                onChange={(e) =>
                  setNewEntry({
                    ...newEntry,
                    amount: parseFloat(e.target.value),
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={newEntry.paymentMethod}
                onValueChange={(value) =>
                  setNewEntry({ ...newEntry, paymentMethod: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleCustomerPayment}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Add Payment"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transactions Table Card */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-6">Transaction History</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-[150px]">Date</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Cash In</TableHead>
                <TableHead className="text-right">Cash Out</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupByDate(currentEntries))
                .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                .map(([date, dayEntries]) => {
                  const totals = calculateDayTotal(dayEntries, date);
                  const dayBalance = totals.cashIn - totals.cashOut;

                  return (
                    <React.Fragment key={date}>
                      {dayEntries.map((entry, index) => {
                        const formattedDate = dateUtils.formatDate(entry.date);

                        return (
                          <TableRow key={entry.id}>
                            <TableCell>
                              {index === 0 ? formattedDate : ""}
                            </TableCell>
                            <TableCell>{entry.details}</TableCell>
                            <TableCell className="text-right">
                              {entry.type === "in"
                                ? `$${entry.amount.toFixed(2)}`
                                : ""}
                            </TableCell>
                            <TableCell className="text-right">
                              {entry.type === "out"
                                ? `$${entry.amount.toFixed(2)}`
                                : ""}
                            </TableCell>
                            <TableCell className="text-right">
                              {index === dayEntries.length - 1 ? (
                                <span
                                  className={
                                    dayBalance >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }
                                >
                                  ${dayBalance.toFixed(2)}
                                </span>
                              ) : (
                                ""
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
            </TableBody>
          </Table>
        </div>

        {/* Add pagination controls */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {startIndex + 1} to{" "}
            {Math.min(endIndex, filteredEntries.length)} of{" "}
            {filteredEntries.length} entries
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
}
