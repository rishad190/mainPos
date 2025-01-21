"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import {
  ref,
  push,
  get,
  update,
  remove,
  query,
  orderByChild,
  startAt,
  endAt,
} from "firebase/database";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Card } from "@/Components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/Components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/Components/ui/alert-dialog";

import {
  Search,
  UserPlus,
  Phone,
  MapPin,
  User,
  Loader2,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/Components/ui/tooltip";
import CustomerHistory from "@/Components/CustomerHistory";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/Components/ui/popover";
import { Calendar } from "@/Components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    date: new Date().toDateString(),
  });
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "asc",
  });

  // Initialize Firestore listeners
  useEffect(() => {
    const initializeFirestore = async () => {
      try {
        setLoading(true);
        await fetchCustomers();
      } catch (err) {
        console.error("Error initializing Firestore:", err);
        setError("Failed to connect to the database");
      } finally {
        setLoading(false);
      }
    };

    initializeFirestore();
  }, []);

  const fetchCustomers = async () => {
    try {
      const customersRef = ref(db, "customers");
      const snapshot = await get(customersRef);

      if (snapshot.exists()) {
        const customersData = Object.entries(snapshot.val()).map(
          ([id, data]) => ({
            id,
            ...data,
          })
        );
        setCustomers(
          customersData.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        );
      } else {
        setCustomers([]);
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching customers:", err);
      setError("Failed to fetch customers");
      throw err;
    }
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  };

  const addCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      alert("Name and Phone are required!");
      return;
    }

    if (!validatePhone(newCustomer.phone)) {
      alert("Please enter a valid phone number!");
      return;
    }

    try {
      setLoading(true);
      const customerData = {
        name: newCustomer.name.toLowerCase(),
        phone: newCustomer.phone,
        address: newCustomer.address || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: auth.currentUser?.uid || null,
      };

      const customersRef = ref(db, "customers");
      const newRef = await push(customersRef, customerData);

      const newCustomerWithId = {
        id: newRef.key,
        ...customerData,
      };

      setCustomers((prev) => [newCustomerWithId, ...prev]);
      setNewCustomer({
        name: "",
        phone: "",
        address: "",
        date: new Date().toDateString(),
      });
      setError(null);
    } catch (err) {
      console.error("Error adding customer:", err);
      setError("Failed to add customer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (value) => {
    setSearchTerm(value);

    try {
      if (!value.trim()) {
        await fetchCustomers();
        return;
      }

      const customersRef = ref(db, "customers");
      const lowercaseValue = value.toLowerCase();
      const searchQuery = query(
        customersRef,
        orderByChild("name"),
        startAt(lowercaseValue),
        endAt(lowercaseValue + "\uf8ff")
      );

      const snapshot = await get(searchQuery);
      if (snapshot.exists()) {
        const searchResults = Object.entries(snapshot.val()).map(
          ([id, data]) => ({
            id,
            ...data,
          })
        );
        setCustomers(searchResults);
      } else {
        setCustomers([]);
      }
      setError(null);
    } catch (err) {
      console.error("Error searching customers:", err);
      setError("Search failed");
    }
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm)
  );

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === "asc" ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handleCustomerClick = (customerId) => {
    setSelectedCustomer(customerId);
  };

  const handleEditClick = (e, customer) => {
    e.stopPropagation();
    setEditingCustomer({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address || "",
    });
  };

  const handleSaveEdit = async (e) => {
    e.stopPropagation();
    try {
      if (!editingCustomer.name || !editingCustomer.phone) {
        alert("Name and Phone are required!");
        return;
      }

      if (!validatePhone(editingCustomer.phone)) {
        alert("Please enter a valid phone number!");
        return;
      }

      const customerRef = ref(db, `customers/${editingCustomer.id}`);
      await update(customerRef, {
        name: editingCustomer.name.toLowerCase(),
        phone: editingCustomer.phone,
        address: editingCustomer.address || "",
        updatedAt: new Date().toISOString(),
      });

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === editingCustomer.id
            ? {
                ...c,
                name: editingCustomer.name.toLowerCase(),
                phone: editingCustomer.phone,
                address: editingCustomer.address || "",
              }
            : c
        )
      );
      setEditingCustomer(null);
    } catch (error) {
      console.error("Error updating customer:", error);
      alert("Failed to update customer");
    }
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    const hasChanges =
      editingCustomer.name !== customer.name ||
      editingCustomer.phone !== customer.phone ||
      editingCustomer.address !== customer.address;

    if (hasChanges) {
      if (
        window.confirm(
          "You have unsaved changes. Are you sure you want to cancel?"
        )
      ) {
        setEditingCustomer(null);
      }
    } else {
      setEditingCustomer(null);
    }
  };

  const handleDeleteClick = (e, customer) => {
    e.stopPropagation();
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      if (!customerToDelete) return;

      // Check if customer has any memos
      const memosRef = ref(db, "memos");
      const customerMemosQuery = query(
        memosRef,
        orderByChild("customerPhone"),
        equalTo(customerToDelete.phone)
      );
      const snapshot = await get(customerMemosQuery);

      if (snapshot.exists()) {
        alert("Cannot delete customer with existing memos");
        return;
      }

      await remove(ref(db, `customers/${customerToDelete.id}`));
      setCustomers((prev) => prev.filter((c) => c.id !== customerToDelete.id));
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    } catch (error) {
      console.error("Error deleting customer:", error);
      alert("Failed to delete customer");
    }
  };

  const handleKeyPress = (e, field, customer) => {
    if (e.key === "Enter") {
      handleSaveEdit(e);
    } else if (e.key === "Escape") {
      handleCancelEdit(e);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const inputs = ["name", "phone", "address"];
      const currentIndex = inputs.indexOf(field);
      const nextIndex = (currentIndex + 1) % inputs.length;
      const input = document.querySelector(`input[name=${inputs[nextIndex]}]`);
      input?.focus();
    }
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
            <p className="text-gray-500 mt-2">Manage your customer database</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 w-[250px]"
              />
            </div>
          </div>
        </div>

        {/* Add Customer Card */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Add New Customer</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Customer Name"
                  value={newCustomer.name}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, name: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Phone Number"
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, phone: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Address"
                  value={newCustomer.address}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, address: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Registration Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newCustomer.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newCustomer.date ? (
                      format(new Date(Date.parse(newCustomer.date)), "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={new Date(Date.parse(newCustomer.date))}
                    defaultMonth={new Date()}
                    onSelect={(date) =>
                      setNewCustomer({
                        ...newCustomer,
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
          <Button
            onClick={addCustomer}
            className="mt-6 w-full md:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            Add Customer
          </Button>
        </Card>

        {/* Customers Table Card */}
        <Card className="p-6">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => requestSort("name")}
                  >
                    Name{" "}
                    {sortConfig.key === "name" && (
                      <span>{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                    )}
                  </TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-500 mr-2" />
                        <span>Loading customers...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-gray-500"
                    >
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedCustomers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedCustomer(customer.phone)}
                    >
                      <TableCell>
                        {editingCustomer?.id === customer.id ? (
                          <Input
                            name="name"
                            value={editingCustomer.name}
                            onChange={(e) =>
                              setEditingCustomer((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                            onKeyDown={(e) =>
                              handleKeyPress(e, "name", customer)
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            {customer.name}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingCustomer?.id === customer.id ? (
                          <Input
                            name="phone"
                            value={editingCustomer.phone}
                            onChange={(e) =>
                              setEditingCustomer((prev) => ({
                                ...prev,
                                phone: e.target.value,
                              }))
                            }
                            onKeyDown={(e) =>
                              handleKeyPress(e, "phone", customer)
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            {customer.phone}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingCustomer?.id === customer.id ? (
                          <Input
                            name="address"
                            value={editingCustomer.address}
                            onChange={(e) =>
                              setEditingCustomer((prev) => ({
                                ...prev,
                                address: e.target.value,
                              }))
                            }
                            onKeyDown={(e) =>
                              handleKeyPress(e, "address", customer)
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            {customer.address}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="group-hover:bg-gray-50">
                        {customer.date === new Date().toDateString() ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-blue-600">
                              Today
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(customer.createdAt).toLocaleTimeString(
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
                                Date.parse(customer.createdAt)
                              ).toDateString()}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(customer.createdAt).toLocaleTimeString(
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
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {editingCustomer?.id === customer.id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleCancelEdit}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleSaveEdit}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) =>
                                      handleEditClick(e, customer)
                                    }
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit customer</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) =>
                                      handleDeleteClick(e, customer)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete customer</TooltipContent>
                              </Tooltip>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Customer History Section */}
        {selectedCustomer && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Purchase History</h2>
            <CustomerHistory customerId={selectedCustomer} />
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the customer
                <span className="font-semibold">{customerToDelete?.name}</span>.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCustomerToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-red-500 hover:bg-red-600"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
