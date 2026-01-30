/**
 * Formats a number as Nigerian Naira currency.
 * Safely handles null, undefined, and non-number values.
 */
export const formatCurrency = (amount) => {
  const value = parseFloat(amount);
  if (isNaN(value)) return '₦0';

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Formats a number with locale-specific separators.
 * Safely handles null, undefined, and non-number values.
 */
export const formatNumber = (num, options = {}) => {
  const value = parseFloat(num);
  if (isNaN(value)) return '0';

  return value.toLocaleString(undefined, options);
};

/**
 * Safely formats a date string or object.
 */
export const formatDate = (date, options = { dateStyle: 'medium' }) => {
  if (!date) return 'N/A';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString(undefined, options);
  } catch (e) {
    return 'N/A';
  }
};

/**
 * Safely formats a date-time string or object.
 */
export const formatDateTime = (date, options = { dateStyle: 'medium', timeStyle: 'short' }) => {
  if (!date) return 'N/A';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString(undefined, options);
  } catch (e) {
    return 'N/A';
  }
};
