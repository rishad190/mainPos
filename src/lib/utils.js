import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useMemo } from "react";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const filterData = (data, searchTerm, fields) => {
  if (!searchTerm) return data;

  return data.filter((item) =>
    fields.some((field) =>
      item[field]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );
};

export const sortData = (data, field, direction = "asc") => {
  return [...data].sort((a, b) => {
    if (direction === "asc") {
      return a[field] > b[field] ? 1 : -1;
    }
    return a[field] < b[field] ? 1 : -1;
  });
};

export const useFilteredData = (data, searchTerm, dateRange) => {
  return useMemo(() => {
    return data.filter((item) => {
      const matchesSearch = item.details
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      if (dateRange.from && dateRange.to) {
        const itemDate = new Date(item.date);
        return (
          matchesSearch &&
          itemDate >= dateRange.from &&
          itemDate <= dateRange.to
        );
      }

      return matchesSearch;
    });
  }, [data, searchTerm, dateRange]);
};
