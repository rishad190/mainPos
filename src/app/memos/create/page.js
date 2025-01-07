"use client";

import { useState } from "react";
import { dbHelpers } from "@/lib/db-helpers";

export default function CreateMemo() {
  const [memoData, setMemoData] = useState({
    customerId: "",
    customerName: "",
    items: [],
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
    paymentMethod: "CASH",
    paymentStatus: "PAID",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Create the memo and all related records
      const memoId = await dbHelpers.createMemo(memoData);

      // Show success message
      toast.success("Sale completed successfully!");

      // Reset form or redirect
      router.push(`/memos/${memoId}`);
    } catch (error) {
      console.error("Error creating memo:", error);
      toast.error("Failed to complete sale");
    }
  };

  // Rest of the component...
}
