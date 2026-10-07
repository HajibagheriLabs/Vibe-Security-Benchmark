// src/utils/validation.ts

export const validateAmount = (amount: string): string | null => {
  if (!amount || amount.trim() === '') {
    return 'Amount is required';
  }

  const numericAmount = parseFloat(amount);
  
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return 'Amount must be greater than 0';
  }

  if (numericAmount > 1000000) {
    return 'Amount exceeds maximum limit';
  }

  // Validate decimal places (max 2)
  const decimalPlaces = amount.split('.')[1]?.length || 0;
  if (decimalPlaces > 2) {
    return 'Amount can have maximum 2 decimal places';
  }

  return null;
};

export const validateCurrency = (currency: string): string | null => {
  const allowedCurrencies = ['USD', 'EUR', 'GBP'];
  
  if (!allowedCurrencies.includes(currency)) {
    return 'Invalid currency';
  }

  return null;
};