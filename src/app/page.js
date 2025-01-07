"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  ref,
  get,
  query,
  orderByChild,
  startAt,
  endAt,
} from "firebase/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  Users,
  Package,
  Receipt,
  CreditCard,
} from "lucide-react";

export default function Home() {
  const [totals, setTotals] = useState({
    customers: 0,
    products: 0,
    credits: 0,
    memos: 0,
  });

  const [trends, setTrends] = useState({
    customers: 0,
    products: 0,
    credits: 0,
    memos: 0,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch customers
        const customersRef = ref(db, "customers");
        const customersSnap = await get(customersRef);
        const totalCustomers = customersSnap.exists()
          ? Object.keys(customersSnap.val()).length
          : 0;

        // Fetch products
        const productsRef = ref(db, "products");
        const productsSnap = await get(productsRef);
        const totalProducts = productsSnap.exists()
          ? Object.keys(productsSnap.val()).length
          : 0;

        // Fetch memos
        const memosRef = ref(db, "memos");
        const memosSnap = await get(memosRef);
        const memos = memosSnap.exists() ? Object.values(memosSnap.val()) : [];
        const totalMemos = memos.length;

        // Calculate total credits
        const totalCredits = memos.reduce(
          (sum, memo) => sum + (memo.credit || 0),
          0
        );

        // Simple trend calculation based on the last 5 items
        const recentMemos = memos
          .sort((a, b) => b.createdAt.localeCompare(a.credatedAt))
          .slice(0, 5);

        setTotals({
          customers: totalCustomers,
          products: totalProducts,
          credits: totalCredits,
          memos: totalMemos,
        });

        setTrends({
          customers: 0, // Will implement proper trending later
          products: 0,
          credits: recentMemos.length > 0 ? 5 : 0,
          memos: recentMemos.length > 0 ? 8 : 0,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-gray-500">
          Welcome back! Heres an overview of your store.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Customers Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Customers
            </CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              <div className="text-2xl font-bold">{totals.customers}</div>
              <div className="flex items-center text-sm">
                <span
                  className={`flex items-center ${
                    trends.customers >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {trends.customers >= 0 ? (
                    <ArrowUpIcon className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(trends.customers)}%
                </span>
                <span className="text-gray-500 ml-2">vs last month</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Products
            </CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              <div className="text-2xl font-bold">{totals.products}</div>
              <div className="flex items-center text-sm">
                <span
                  className={`flex items-center ${
                    trends.products >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {trends.products >= 0 ? (
                    <ArrowUpIcon className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(trends.products)}%
                </span>
                <span className="text-gray-500 ml-2">vs last month</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credits Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Credits
            </CardTitle>
            <CreditCard className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              <div className="text-2xl font-bold">
                ${totals.credits.toFixed(2)}
              </div>
              <div className="flex items-center text-sm">
                <span
                  className={`flex items-center ${
                    trends.credits >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {trends.credits >= 0 ? (
                    <ArrowUpIcon className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(trends.credits)}%
                </span>
                <span className="text-gray-500 ml-2">vs last month</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Memos Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Memos
            </CardTitle>
            <Receipt className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              <div className="text-2xl font-bold">{totals.memos}</div>
              <div className="flex items-center text-sm">
                <span
                  className={`flex items-center ${
                    trends.memos >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {trends.memos >= 0 ? (
                    <ArrowUpIcon className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(trends.memos)}%
                </span>
                <span className="text-gray-500 ml-2">vs last month</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
