import React, { useState, useEffect } from "react";

export const validateCashEntry = (entry) => {
  const errors = {};

  if (!entry.date) errors.date = "Date is required";
  if (!entry.details.trim()) errors.details = "Details are required";
  if (!entry.category) errors.category = "Category is required";
  if (!entry.amount || entry.amount <= 0)
    errors.amount = "Valid amount is required";
  if (typeof entry.amount !== "number")
    errors.amount = "Amount must be a number";
  if (!entry.type) errors.type = "Type is required";

  return errors;
};

export const validateMemo = (memo) => {
  const errors = {};

  if (!memo.customerName?.trim()) {
    errors.customerName = "Customer name is required";
  }

  if (!memo.customerPhone?.trim()) {
    errors.customerPhone = "Phone number is required";
  } else if (!/^\+?[\d\s-]{10,}$/.test(memo.customerPhone)) {
    errors.customerPhone = "Invalid phone number format";
  }

  if (!Array.isArray(memo.products) || memo.products.length === 0) {
    errors.products = "At least one product is required";
  } else {
    memo.products.forEach((product, index) => {
      if (!product.name || !product.quantity || product.quantity <= 0) {
        errors[`product${index}`] = "Invalid product details";
      }
    });
  }

  return errors;
};

export const useFormValidation = (initialState, validateFn) => {
  const [values, setValues] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const validationErrors = validateFn(values);
    setErrors(validationErrors);
    setIsValid(Object.keys(validationErrors).length === 0);
  }, [values]);

  return { values, setValues, errors, isValid };
};
