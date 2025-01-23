"use client";

import { useState, useEffect } from "react";
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
import { db } from "@/lib/firebase";
import { ref, push, get, set, remove, update } from "firebase/database";
import { Label } from "@/Components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/Components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function StockPage() {
  const [products, setProducts] = useState([
    { id: "1", name: "Product A", price: 10.0, quantity: 100 },
    { id: "2", name: "Product B", price: 20.0, quantity: 200 },
  ]);

  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    quantity: "",
  });

  const [editingProduct, setEditingProduct] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsRef = ref(db, "products");
        const snapshot = await get(productsRef);

        if (snapshot.exists()) {
          const productsData = Object.entries(snapshot.val()).map(
            ([id, data]) => ({
              id,
              ...data,
            })
          );
          setProducts(productsData);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchProducts();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newProduct.name || !newProduct.price || !newProduct.quantity) {
      alert("Please fill all fields");
      return;
    }

    try {
      const productsRef = ref(db, "products");
      const product = {
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        quantity: parseInt(newProduct.quantity),
        createdAt: new Date().toISOString(),
      };

      const newRef = await push(productsRef, product);
      const newProductWithId = {
        id: newRef.key,
        ...product,
      };

      setProducts([...products, newProductWithId]);
      setNewProduct({
        name: "",
        price: "",
        quantity: "",
      });
    } catch (error) {
      console.error("Error adding product:", error);
      alert("Failed to add product");
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      price: product.price,
      quantity: product.quantity,
    });
    setIsEditing(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!newProduct.name || !newProduct.price || !newProduct.quantity) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      const productRef = ref(db, `products/${editingProduct.id}`);
      await update(productRef, {
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        quantity: parseInt(newProduct.quantity),
        updatedAt: new Date().toISOString(),
      });

      setProducts(
        products.map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                name: newProduct.name,
                price: parseFloat(newProduct.price),
                quantity: parseInt(newProduct.quantity),
              }
            : p
        )
      );

      setNewProduct({ name: "", price: "", quantity: "" });
      setEditingProduct(null);
      setIsEditing(false);
      toast.success("Product updated successfully");
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product");
    }
  };

  const handleDelete = async (productId) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        const productRef = ref(db, `products/${productId}`);
        await remove(productRef);
        setProducts(products.filter((p) => p.id !== productId));
        toast.success("Product deleted successfully");
      } catch (error) {
        console.error("Error deleting product:", error);
        toast.error("Failed to delete product");
      }
    }
  };

  const StockStatus = ({ quantity }) => {
    if (quantity <= 0) {
      return <span className="text-red-600 font-medium">Out of Stock</span>;
    }
    if (quantity < 10) {
      return <span className="text-orange-600 font-medium">Low Stock</span>;
    }
    return <span className="text-green-600 font-medium">In Stock</span>;
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center">Stock Management</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">
          {isEditing ? "Edit Product" : "Add New Product"}
        </h2>
        <form
          onSubmit={isEditing ? handleUpdate : handleSubmit}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Product Name"
                value={newProduct.name}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                name="price"
                type="number"
                placeholder="৳0.00"
                value={newProduct.price}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                placeholder="Quantity"
                value={newProduct.quantity}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <Button type="submit" className="w-full">
            {isEditing ? "Update Product" : "Add Product"}
          </Button>
          {isEditing && (
            <Button
              type="button"
              variant="outline"
              className="w-full mt-2"
              onClick={() => {
                setIsEditing(false);
                setEditingProduct(null);
                setNewProduct({ name: "", price: "", quantity: "" });
              }}
            >
              Cancel
            </Button>
          )}
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="p-2 border-b">ID</TableHead>
              <TableHead className="p-2 border-b">Name</TableHead>
              <TableHead className="p-2 border-b">Price</TableHead>
              <TableHead className="p-2 border-b">Quantity</TableHead>
              <TableHead className="p-2 border-b">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id} className="hover:bg-gray-100">
                <TableCell className="p-2 border-b">{product.id}</TableCell>
                <TableCell className="p-2 border-b">{product.name}</TableCell>
                <TableCell className="p-2 border-b">
                  ৳{product.price.toFixed(2)}
                </TableCell>
                <TableCell className="p-2 border-b">
                  <div className="flex items-center justify-between">
                    <span>{product.quantity}</span>
                    <StockStatus quantity={product.quantity} />
                  </div>
                </TableCell>
                <TableCell className="p-2 border-b">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleEdit(product)}
                        className="cursor-pointer"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(product.id)}
                        className="cursor-pointer text-red-600"
                        aria-label={`Delete ${product.name}`}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
