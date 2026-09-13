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
 * Formats a date in a verbose way (e.g., 4th April, 2026)
 */
export const formatDateVerbose = (date) => {
  if (!date) return null;
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;

    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'long' });
    const year = d.getFullYear();

    const getOrdinal = (n) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    return `${getOrdinal(day)} ${month}, ${year}`;
  } catch (e) {
    return null;
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

/**
 * Formats a phone number for WhatsApp links (wa.me)
 * Removes non-numeric characters and formats leading zero for Nigeria defaults
 */
export const formatWhatsAppNumber = (num) => {
  if (!num) return '';
  let cleaned = num.toString().replace(/\D/g, '');
  
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '234' + cleaned.substring(1);
  }
  
  return cleaned;
};
