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
import { ref, push, get, set } from "firebase/database";

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

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center">Stock Management</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Add New Product</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              name="name"
              placeholder="Product Name"
              value={newProduct.name}
              onChange={handleInputChange}
            />
            <Input
              name="price"
              type="number"
              step="0.01"
              placeholder="Price"
              value={newProduct.price}
              onChange={handleInputChange}
            />
            <Input
              name="quantity"
              type="number"
              placeholder="Quantity"
              value={newProduct.quantity}
              onChange={handleInputChange}
            />
          </div>
          <Button type="submit" className="w-full">
            Add Product
          </Button>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id} className="hover:bg-gray-100">
                <TableCell className="p-2 border-b">{product.id}</TableCell>
                <TableCell className="p-2 border-b">{product.name}</TableCell>
                <TableCell className="p-2 border-b">
                  ${product.price.toFixed(2)}
                </TableCell>
                <TableCell className="p-2 border-b">
                  {product.quantity}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
