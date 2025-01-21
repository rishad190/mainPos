"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  ref,
  push,
  get,
  query,
  orderByChild,
  onValue,
  update,
  serverTimestamp,
  equalTo,
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
  Edit,
  Trash2,
  MoreHorizontal,
  Loader2,
  ClipboardX,
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
import { toast } from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/Components/ui/dropdown-menu";

export default function MemosPage() {
  // State management
  const [memos, setMemos] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [productQuantity, setProductQuantity] = useState(1);
  const [newMemo, setNewMemo] = useState({
    date: new Date().toDateString(),
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    memoNumber: "",
    products: [],
    totalBill: 0,
    paymentAmount: 0,
    credit: 0,
    customMemo: "",
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
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isValid, setIsValid] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
            if (snapshot.exists()) {
              const memosData = Object.entries(snapshot.val())
                .map(([id, data]) => ({
                  id,
                  ...data,
                  date: dateUtils.formatDate(data.date),
                }))
                .sort((a, b) => new Date(b.date) - new Date(a.date));
              setMemos(memosData);
            } else {
              setMemos([]);
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
      toast.error("Please select a product");
      return;
    }

    const product = products.find((p) => p.id === selectedProduct);

    if (!product) {
      toast.error("Product not found");
      return;
    }

    if (productQuantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (productQuantity > product.quantity) {
      toast.error(`Only ${product.quantity} items available in stock`);
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

  // Add this function to update stock quantities
  const updateStockQuantities = async (products) => {
    try {
      const productsRef = ref(db, "products");
      const updates = {};

      // Get current stock quantities
      const snapshot = await get(productsRef);
      const currentStock = snapshot.val();

      // Update quantities for each product
      for (const product of products) {
        const currentQuantity = currentStock[product.id]?.quantity || 0;
        const newQuantity = currentQuantity - product.quantity;

        if (newQuantity < 0) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }

        updates[`${product.id}/quantity`] = newQuantity;
      }

      // Update all products atomically
      await update(productsRef, updates);
    } catch (error) {
      console.error("Error updating stock:", error);
      throw error;
    }
  };

  // Update the addMemo function
  const addMemo = async () => {
    if (newMemo.products.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

    if (!newMemo.customerName || !newMemo.customerPhone) {
      toast.error("Please enter customer information");
      return;
    }

    if (!newMemo.memoNumber.trim()) {
      toast.error("Please enter a memo number");
      return;
    }

    setLoading(true);

    try {
      // Check if memo number already exists
      const memosRef = ref(db, "memos");
      const memoQuery = query(
        memosRef,
        orderByChild("memoNumber"),
        equalTo(newMemo.memoNumber)
      );
      const snapshot = await get(memoQuery);

      if (snapshot.exists()) {
        toast.error("Memo number already exists");
        setLoading(false);
        return;
      }

      // First update stock quantities
      await updateStockQuantities(newMemo.products);

      const memoData = {
        ...newMemo,
        createdAt: new Date().toISOString(),
      };

      // Save the memo
      const newRef = await push(memosRef, memoData);

      // Handle payment if exists
      if (newMemo.paymentAmount > 0) {
        const cashEntryRef = ref(db, "cashEntries");
        await push(cashEntryRef, {
          date: new Date().toISOString().split("T")[0],
          type: "in",
          amount: newMemo.paymentAmount,
          category: "memo_payment",
          details: `Memo Payment - ${newMemo.customerName} (#${newMemo.memoNumber})`,
          reference: {
            memoId: newRef.key,
            memoNumber: newMemo.memoNumber,
            customerName: newMemo.customerName,
            customerPhone: newMemo.customerPhone,
            transactionType: "memo_payment",
          },
          createdAt: new Date().toISOString(),
        });
      }

      // Reset form
      setNewMemo({
        date: new Date().toDateString(),
        customerName: "",
        customerPhone: "",
        customerAddress: "",
        memoNumber: "",
        products: [],
        totalBill: 0,
        paymentAmount: 0,
        credit: 0,
        customMemo: "",
      });

      toast.success("Memo created successfully!");
    } catch (error) {
      console.error("Error creating memo:", error);
      toast.error(error.message || "Failed to create memo");
    } finally {
      setLoading(false);
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

  // Add a function to validate stock before adding to selected products
  const handleAddProduct = (product) => {
    if (product.quantity < selectedQuantity) {
      toast.error(`Only ${product.quantity} items available in stock`);
      return;
    }

    const newProduct = {
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: selectedQuantity,
    };

    setSelectedProducts([...selectedProducts, newProduct]);
    setSelectedProduct(null);
    setSelectedQuantity(1);
  };

  const handleEditProduct = (index) => {
    const productToEdit = newMemo.products[index];
    setSelectedProduct(productToEdit.id);
    setSelectedQuantity(productToEdit.quantity);

    // Remove the product from the list
    const updatedProducts = [...newMemo.products];
    updatedProducts.splice(index, 1);

    setNewMemo((prev) => ({
      ...prev,
      products: updatedProducts,
      totalBill: calculateTotal(updatedProducts),
    }));
  };

  const handleDeleteProduct = (index) => {
    const updatedProducts = [...newMemo.products];
    updatedProducts.splice(index, 1);

    setNewMemo((prev) => ({
      ...prev,
      products: updatedProducts,
      totalBill: calculateTotal(updatedProducts),
    }));

    toast.success("Product removed from memo");
  };

  const calculateTotal = (products) => {
    const total = products.reduce(
      (sum, product) => sum + product.quantity * product.price,
      0
    );
    return total;
  };

  // Add a loading state component
  const LoadingState = () => (
    <div className="flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );

  const EmptyState = ({ message }) => (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
        <ClipboardX className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-sm font-medium text-gray-900 mb-1">
        No results found
      </h3>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );

  // Update the validateForm function to only set errors
  const validateForm = () => {
    const newErrors = {};
    if (!newMemo.date) newErrors.date = "Date is required";
    if (!newMemo.customerName)
      newErrors.customerName = "Customer name is required";
    if (!newMemo.customerPhone)
      newErrors.customerPhone = "Customer phone is required";
    if (!newMemo.memoNumber.trim())
      newErrors.memoNumber = "Memo number is required";
    if (newMemo.products.length === 0)
      newErrors.products = "Please add at least one product";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Add useEffect to check form validity when dependencies change
  useEffect(() => {
    const isFormValid =
      !newMemo.date ||
      !newMemo.customerName ||
      !newMemo.customerPhone ||
      !newMemo.memoNumber.trim() ||
      newMemo.products.length === 0;

    setIsValid(!isFormValid);
  }, [newMemo]);

  // Update the handleSubmit function
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await addMemo();
      toast.success("Memo added successfully");
    } catch (error) {
      toast.error("Failed to add memo");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewMemo({
      date: new Date().toDateString(),
      customerName: "",
      customerPhone: "",
      customerAddress: "",
      memoNumber: "",
      products: [],
      totalBill: 0,
      paymentAmount: 0,
      credit: 0,
      customMemo: "",
    });
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center">Memo Management</h1>

      {/* Customer Information */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="memoNumber">Memo Number</Label>
            <Input
              id="memoNumber"
              placeholder="Enter memo number"
              value={newMemo.memoNumber}
              onChange={(e) =>
                setNewMemo((prev) => ({
                  ...prev,
                  memoNumber: e.target.value,
                }))
              }
            />
          </div>
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
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !newMemo.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newMemo.date ? (
                    new Date(Date.parse(newMemo.date)).toDateString()
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={new Date(Date.parse(newMemo.date))}
                  defaultMonth={new Date()}
                  onSelect={(date) =>
                    setNewMemo({
                      ...newMemo,
                      date: date
                        ? date.toDateString()
                        : new Date().toDateString(),
                    })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
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
                    {product.name} (৳{product.price})
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
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {newMemo.products.map((product, index) => (
                <TableRow
                  key={index}
                  className="transition-colors hover:bg-gray-50 group"
                >
                  <TableCell className="group-hover:bg-gray-50">
                    {product.name}
                  </TableCell>
                  <TableCell className="group-hover:bg-gray-50">
                    {product.quantity}
                  </TableCell>
                  <TableCell className="group-hover:bg-gray-50">
                    ৳{product.price.toFixed(2)}
                  </TableCell>
                  <TableCell className="group-hover:bg-gray-50">
                    {product.quantity * product.price}
                  </TableCell>
                  <TableCell className="group-hover:bg-gray-50">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleEditProduct(index)}
                          className="cursor-pointer"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteProduct(index)}
                          className="cursor-pointer text-red-600"
                        >
                          <DeleteIcon className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
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
              Total Bill: ৳{newMemo.totalBill.toFixed(2)}
            </p>
            <p className="text-lg text-red-500">
              Credit: ৳{newMemo.credit.toFixed(2)}
            </p>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !isValid}
          className={cn(
            "w-full mt-4",
            "transition-all duration-200",
            isSubmitting && "opacity-70 cursor-not-allowed",
            !isValid && "opacity-50 cursor-not-allowed"
          )}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </div>
          ) : (
            "Save Memo"
          )}
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
        <div className="overflow-x-auto -mx-6">
          <div className="inline-block min-w-full align-middle px-6">
            {currentMemos.length === 0 ? (
              <EmptyState message="No transactions found matching your filters." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
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
                    <TableRow
                      key={memo.id}
                      className="transition-colors hover:bg-gray-50 group"
                    >
                      <TableCell className="group-hover:bg-gray-50">
                        {memo.date === new Date().toDateString() ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-blue-600">
                              Today
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(entry.createdAt).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                }
                              )}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {new Date(
                                Date.parse(memo.createdAt)
                              ).toDateString()}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(memo.createdAt).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                }
                              )}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="group-hover:bg-gray-50">
                        {memo.memoNumber || memo.id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="group-hover:bg-gray-50">
                        {memo.customerName}
                      </TableCell>
                      <TableCell className="group-hover:bg-gray-50">
                        {memo.customerPhone}
                      </TableCell>
                      <TableCell className="group-hover:bg-gray-50 text-right">
                        ৳{memo.totalBill.toFixed(2)}
                      </TableCell>
                      <TableCell className="group-hover:bg-gray-50 text-right">
                        ৳{memo.paymentAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="group-hover:bg-gray-50 text-right">
                        <span
                          className={
                            memo.credit > 0 ? "text-red-600" : "text-green-600"
                          }
                        >
                          ৳{memo.credit.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="group-hover:bg-gray-50">
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
            )}
          </div>
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
