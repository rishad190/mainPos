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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/Components/ui/card";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  Users,
  Package,
  Receipt,
  CreditCard,
  DollarSign,
  Clock,
} from "lucide-react";

// Update chart tooltip formats
const chartConfig = {
  tooltip: {
    formatter: (value) => `৳${value.toFixed(2)}`,
  },
  // ... other chart config
};

// Update any value formatters
const valueFormatter = (value) => `৳${value.toFixed(2)}`;

export default function Home() {
  const [totals, setTotals] = useState({
    customers: 0,
    products: 0,
    credits: 0,
    memos: 0,
    sales: 0,
    pendingPayments: 0,
  });

  const [trends, setTrends] = useState({
    customers: 0,
    products: 0,
    credits: 0,
    memos: 0,
    sales: 0,
  });

  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch totals
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0
        );

        const [customersSnap, productsSnap, memosSnap] = await Promise.all([
          get(ref(db, "customers")),
          get(ref(db, "products")),
          get(
            query(
              ref(db, "memos"),
              orderByChild("date"),
              startAt(firstDayOfMonth.toISOString()),
              endAt(lastDayOfMonth.toISOString())
            )
          ),
        ]);

        const customers = customersSnap.val() || {};
        const products = productsSnap.val() || {};
        const memos = memosSnap.val() || {};

        const totalSales = Object.values(memos).reduce(
          (sum, memo) => sum + (memo.totalBill || 0),
          0
        );

        const totalCredits = Object.values(memos).reduce(
          (sum, memo) => sum + (memo.credit || 0),
          0
        );

        // Get recent transactions
        const recentMemos = Object.entries(memos)
          .map(([id, memo]) => ({
            id,
            ...memo,
            type: "memo",
          }))
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 5);

        setRecentTransactions(recentMemos);

        setTotals({
          customers: Object.keys(customers).length,
          products: Object.keys(products).length,
          credits: totalCredits,
          memos: Object.keys(memos).length,
          sales: totalSales,
          pendingPayments: totalCredits,
        });

        // Calculate trends (example calculation)
        setTrends({
          customers: 15,
          products: 8,
          credits: -5,
          memos: 12,
          sales: 20,
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
          Welcome back! Here's an overview of your store.
        </p>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Sales Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Sales
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              <div className="text-2xl font-bold">
                ৳{totals.sales.toFixed(2)}
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-600 flex items-center">
                  <ArrowUpIcon className="h-4 w-4 mr-1" />
                  {trends.sales}%
                </span>
                <span className="text-gray-500 ml-2">vs last month</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Payments Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Pending Payments
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              <div className="text-2xl font-bold">
                ৳{totals.pendingPayments.toFixed(2)}
              </div>
              <p className="text-sm text-gray-500">
                From {totals.memos} total memos
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Credits Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Credits
            </CardTitle>
            <CreditCard className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              <div className="text-2xl font-bold">
                ৳{totals.credits.toFixed(2)}
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
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Customers Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Customers
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.customers}</div>
          </CardContent>
        </Card>

        {/* Products Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Products
            </CardTitle>
            <Package className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.products}</div>
          </CardContent>
        </Card>

        {/* Memos Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Memos
            </CardTitle>
            <Receipt className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.memos}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-4">
                  <Receipt className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="font-medium">{transaction.customerName}</p>
                    <p className="text-sm text-gray-500">
                      Memo #{transaction.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">৳{transaction.totalBill}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(transaction.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
