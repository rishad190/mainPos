export const convertToCSV = (data) => {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const rows = data.map((obj) =>
    headers
      .map((header) =>
        typeof obj[header] === "string" && obj[header].includes(",")
          ? `"${obj[header]}"`
          : obj[header]
      )
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
};

export const exportToCSV = async (data, filename) => {
  try {
    const csvContent = convertToCSV(data);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up

    return true;
  } catch (error) {
    console.error("Export failed:", error);
    throw new Error("Failed to export data");
  }
};

export const exportCashEntries = (entries) => {
  const csvData = entries.map((entry) => ({
    Date: entry.date,
    Type: entry.type,
    Category: entry.category,
    Details: entry.details,
    Amount: entry.amount,
  }));

  exportToCSV(csvData, `cash_entries_${new Date().toISOString()}.csv`);
};

export const exportCustomerHistory = (history) => {
  const csvData = history.map((item) => ({
    Date: item.date,
    MemoNumber: item.memoNumber,
    Products: item.productNames.join(", "),
    Total: item.totalPrice,
    Paid: item.givenMoney,
    Credit: item.credit,
  }));

  exportToCSV(csvData, `customer_history_${new Date().toISOString()}.csv`);
};
