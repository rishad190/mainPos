"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  ref,
  push,
  get,
  query,
  orderByChild,
  onValue,
} from "firebase/database";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
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
import { Label } from "@/Components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/Components/ui/pagination";
import {
  Calendar as CalendarIcon,
  Pencil as EditIcon,
  Trash2 as DeleteIcon,
} from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/Components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/Components/ui/popover";
import { cn } from "@/lib/utils";
import { dateUtils } from "@/lib/dateUtils";

export default function MemosPage() {
  // State management
  const [memos, setMemos] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [productQuantity, setProductQuantity] = useState(1);
  const [newMemo, setNewMemo] = useState({
    date: new Date().toISOString().split("T")[0],
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    products: [],
    totalBill: 0,
    paymentAmount: 0,
    credit: 0,
  });
  const [customPrice, setCustomPrice] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateSearch, setDateSearch] = useState({
    from: undefined,
    to: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch customers and products on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch customers
        const customersRef = ref(db, "customers");
        const customersSnapshot = await get(customersRef);
        if (customersSnapshot.exists()) {
          const customersData = Object.entries(customersSnapshot.val()).map(
            ([id, data]) => ({
              id,
              ...data,
            })
          );
          setCustomers(customersData);
        }

        // Fetch products
        const productsRef = ref(db, "products");
        const productsSnapshot = await get(productsRef);
        if (productsSnapshot.exists()) {
          const productsData = Object.entries(productsSnapshot.val()).map(
            ([id, data]) => ({
              id,
              ...data,
            })
          );
          setProducts(productsData);
        }

        // Fetch memos
        const memosRef = ref(db, "memos");
        const unsubscribe = onValue(
          memosRef,
          (snapshot) => {
            try {
              if (snapshot.exists()) {
                const memosData = Object.entries(snapshot.val()).map(
                  ([id, data]) => ({
                    id,
                    ...data,
                    date: dateUtils.formatDate(data.date),
                  })
                );
                setMemos(memosData);
              }
              setLoading(false);
            } catch (err) {
              setError(err.message);
              setLoading(false);
            }
          },
          (error) => {
            setError(error.message);
            setLoading(false);
          }
        );

        return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  // Set current date
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setNewMemo((prev) => ({ ...prev, date: today }));
  }, []);

  // Auto-calculate totals
  useEffect(() => {
    const total = newMemo.products.reduce(
      (sum, product) => sum + product.subtotal,
      0
    );
    setNewMemo((prev) => ({
      ...prev,
      totalBill: total,
      credit: total - prev.paymentAmount,
    }));
  }, [newMemo.products, newMemo.paymentAmount]);

  // Handle customer phone change
  const handlePhoneChange = (e) => {
    const phone = e.target.value;
    setNewMemo((prev) => ({ ...prev, customerPhone: phone }));

    const customer = customers.find((c) => c.phone === phone);
    if (customer) {
      setNewMemo((prev) => ({
        ...prev,
        customerName: customer.name,
        customerAddress: customer.address || "",
      }));
    }
  };

  // Add product to memo
  const addProductToMemo = () => {
    if (!selectedProduct) {
      alert("Please select a product");
      return;
    }

    const product = products.find((p) => p.id === selectedProduct);

    if (!product) {
      alert("Product not found");
      return;
    }

    if (productQuantity <= 0) {
      alert("Please enter a valid quantity");
      return;
    }

    if (productQuantity > product.quantity) {
      alert(`Only ${product.quantity} items available in stock`);
      return;
    }

    const existingProductIndex = newMemo.products.findIndex(
      (p) => p.id === product.id
    );

    const priceToUse = customPrice || product.price;

    if (existingProductIndex !== -1) {
      const updatedProducts = [...newMemo.products];
      const newQuantity =
        updatedProducts[existingProductIndex].quantity + productQuantity;

      if (newQuantity > product.quantity) {
        alert(
          `Cannot add more than available stock (${product.quantity} items)`
        );
        return;
      }

      updatedProducts[existingProductIndex] = {
        ...updatedProducts[existingProductIndex],
        quantity: newQuantity,
        price: priceToUse,
        subtotal: priceToUse * newQuantity,
      };

      setNewMemo((prev) => ({
        ...prev,
        products: updatedProducts,
      }));
    } else {
      setNewMemo((prev) => ({
        ...prev,
        products: [
          ...prev.products,
          {
            ...product,
            price: priceToUse,
            quantity: productQuantity,
            subtotal: priceToUse * productQuantity,
          },
        ],
      }));
    }

    setSelectedProduct("");
    setProductQuantity(1);
    setCustomPrice("");
  };

  // Save memo
  const addMemo = async () => {
    if (newMemo.products.length === 0) {
      alert("Please add at least one product");
      return;
    }

    if (!newMemo.customerName || !newMemo.customerPhone) {
      alert("Please enter customer information");
      return;
    }

    try {
      const memoData = {
        ...newMemo,
        createdAt: new Date().toISOString(),
      };

      // 1. Save the memo
      const memosRef = ref(db, "memos");
      const newRef = await push(memosRef, memoData);

      const newMemoWithId = {
        id: newRef.key,
        ...memoData,
      };

      // 2. If there's a payment amount, create a cash entry
      if (newMemo.paymentAmount > 0) {
        const cashEntryRef = ref(db, "cashEntries");
        await push(cashEntryRef, {
          date: new Date().toISOString().split("T")[0],
          type: "in",
          amount: newMemo.paymentAmount,
          category: "memo_payment",
          details: `Memo Payment - ${newMemo.customerName} (#${newRef.key
            .slice(0, 8)
            .toUpperCase()})`,
          reference: {
            memoId: newRef.key,
            customerName: newMemo.customerName,
            customerPhone: newMemo.customerPhone,
            transactionType: "memo_payment",
          },
          createdAt: new Date().toISOString(),
        });
      }

      setMemos((prev) => [newMemoWithId, ...prev]);

      // Reset form
      setNewMemo({
        date: new Date().toISOString().split("T")[0],
        customerName: "",
        customerPhone: "",
        customerAddress: "",
        products: [],
        totalBill: 0,
        paymentAmount: 0,
        credit: 0,
      });

      alert("Memo saved successfully!");
    } catch (error) {
      console.error("Error saving memo:", error);
      alert("Failed to save memo. Please try again.");
    }
  };

  // Filter memos based on search and date
  const filteredMemos = memos.filter((memo) => {
    const matchesSearch =
      memo.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      memo.customerPhone.toLowerCase().includes(searchTerm.toLowerCase());

    const memoDate = new Date(memo.date);

    if (dateSearch.from && dateSearch.to) {
      return (
        matchesSearch &&
        memoDate >= dateSearch.from &&
        memoDate <= dateSearch.to
      );
    }

    return matchesSearch;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredMemos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMemos = filteredMemos
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(startIndex, endIndex);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center">Memo Management</h1>

      {/* Customer Information */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="customerPhone">Phone</Label>
            <Input
              id="customerPhone"
              placeholder="Enter customer phone"
              value={newMemo.customerPhone}
              onChange={handlePhoneChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <Label htmlFor="customerName">Name</Label>
            <Input
              id="customerName"
              placeholder="Customer name"
              value={newMemo.customerName}
              onChange={(e) =>
                setNewMemo((prev) => ({
                  ...prev,
                  customerName: e.target.value,
                }))
              }
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <Label htmlFor="customerAddress">Address</Label>
            <Input
              id="customerAddress"
              placeholder="Customer address"
              value={newMemo.customerAddress}
              onChange={(e) =>
                setNewMemo((prev) => ({
                  ...prev,
                  customerAddress: e.target.value,
                }))
              }
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={newMemo.date}
              onChange={(e) =>
                setNewMemo((prev) => ({ ...prev, date: e.target.value }))
              }
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>

      {/* Product Selection */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <Label htmlFor="product">Product</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-full p-2 border rounded">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} (${product.price})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={productQuantity}
              onChange={(e) => setProductQuantity(Number(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <Label htmlFor="customPrice">Custom Price (Optional)</Label>
            <Input
              id="customPrice"
              type="number"
              step="0.01"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              placeholder="Enter custom price"
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={addProductToMemo}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              Add Product
            </Button>
          </div>
        </div>

        {/* Products Table */}
        {newMemo.products.length > 0 && (
          <Table className="w-full mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {newMemo.products.map((product, index) => (
                <TableRow key={index}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.quantity}</TableCell>
                  <TableCell>${product.price}</TableCell>
                  <TableCell>${product.subtotal}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Totals */}
        <div className="mt-4 space-y-2">
          <div>
            <Label htmlFor="paymentAmount">Payment Amount</Label>
            <Input
              id="paymentAmount"
              type="number"
              value={newMemo.paymentAmount}
              onChange={(e) =>
                setNewMemo((prev) => ({
                  ...prev,
                  paymentAmount: Number(e.target.value),
                }))
              }
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">
              Total Bill: ${newMemo.totalBill}
            </p>
            <p className="text-lg text-red-500">Credit: ${newMemo.credit}</p>
          </div>
        </div>

        <Button
          onClick={addMemo}
          className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white"
        >
          Save Memo
        </Button>
      </div>

      {/* Recent Memos Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Recent Memos</h2>
          <div className="flex gap-4">
            <Input
              placeholder="Search memos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />

            {/* Date Range Picker */}
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

            {/* Clear Filters */}
            {(dateSearch.from || searchTerm) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setDateSearch({ from: undefined, to: undefined });
                  setSearchTerm("");
                }}
              >
                Clear Filters
              </Button>
            )}

            {/* Items per page selector */}
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

        {/* Memos Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Memo #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentMemos.map((memo) => (
                <TableRow key={memo.id} className="hover:bg-gray-50">
                  <TableCell>{memo.date}</TableCell>
                  <TableCell>{memo.id}</TableCell>
                  <TableCell>{memo.customerName}</TableCell>
                  <TableCell>{memo.customerPhone}</TableCell>
                  <TableCell className="text-right">
                    ${memo.totalBill}
                  </TableCell>
                  <TableCell className="text-right">
                    ${memo.paymentAmount}
                  </TableCell>
                  <TableCell className="text-right">${memo.credit}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        // Implement edit functionality
                      }}
                    >
                      <EditIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        // Implement delete functionality
                      }}
                    >
                      <DeleteIcon className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {startIndex + 1} to{" "}
            {Math.min(endIndex, filteredMemos.length)} of {filteredMemos.length}{" "}
            entries
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
