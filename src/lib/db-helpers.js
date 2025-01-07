import {
  ref,
  push,
  update,
  get,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";
import { db } from "./firebase";

export const dbHelpers = {
  // Customer related functions
  async updateCustomerBalance(customerId, amount) {
    const customerRef = ref(db, `customers/${customerId}`);
    const snapshot = await get(customerRef);
    const currentBalance = snapshot.val()?.balance || 0;

    return update(customerRef, {
      balance: currentBalance + amount,
      updatedAt: new Date().toISOString(),
    });
  },

  // Memo (Sale) related functions
  async createMemo(memoData) {
    const { customerId, total, items } = memoData;

    try {
      // Create memo
      const memoRef = ref(db, "memos");
      const newMemoRef = await push(memoRef, {
        ...memoData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Update customer balance and stats
      await this.updateCustomerBalance(customerId, total);
      await this.updateCustomerStats(customerId, total);

      // Create cash transaction
      await this.createCashTransaction({
        type: "SALE",
        amount: total,
        relatedId: newMemoRef.key,
        description: `Sale to customer ${memoData.customerName}`,
        paymentMethod: memoData.paymentMethod,
        date: new Date().toISOString(),
      });

      return newMemoRef.key;
    } catch (error) {
      console.error("Error creating memo:", error);
      throw error;
    }
  },

  // Cash management functions
  async createCashTransaction(transactionData) {
    const transactionRef = ref(db, "cash_transactions");
    return push(transactionRef, {
      ...transactionData,
      createdAt: new Date().toISOString(),
    });
  },

  // Customer statistics
  async updateCustomerStats(customerId, purchaseAmount) {
    const customerRef = ref(db, `customers/${customerId}`);
    const snapshot = await get(customerRef);
    const currentStats = snapshot.val() || {};

    return update(customerRef, {
      totalPurchases: (currentStats.totalPurchases || 0) + purchaseAmount,
      lastPurchaseDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },

  // Reporting functions
  async getCustomerHistory(customerId) {
    const memosRef = ref(db, "memos");
    const customerMemos = query(
      memosRef,
      orderByChild("customerId"),
      equalTo(customerId)
    );

    const snapshot = await get(customerMemos);
    return snapshot.val() || {};
  },

  async getCustomerTransactions(customerId) {
    const transactionsRef = ref(db, "cash_transactions");
    const customerTransactions = query(
      transactionsRef,
      orderByChild("relatedId"),
      equalTo(customerId)
    );

    const snapshot = await get(customerTransactions);
    return snapshot.val() || {};
  },

  // Daily summary
  async getDailySummary(date) {
    const transactionsRef = ref(db, "cash_transactions");
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const dailyTransactions = query(
      transactionsRef,
      orderByChild("date"),
      startAt(dayStart.toISOString()),
      endAt(dayEnd.toISOString())
    );

    const snapshot = await get(dailyTransactions);
    return snapshot.val() || {};
  },
};
