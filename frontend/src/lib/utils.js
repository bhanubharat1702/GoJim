/**
 * Cleans phone inputs by removing non-numeric characters and capping at 10 digits.
 * @param {string} val 
 * @returns {string}
 */
export const cleanPhone = (val) => {
  if (!val) return '';
  return val.replace(/[^0-9]/g, '').slice(0, 10);
};

/**
 * Validates if a phone number consists of exactly 10 digits.
 * @param {string} phone 
 * @returns {boolean}
 */
export const validatePhone = (phone) => {
  if (!phone) return false;
  const cleaned = phone.replace(/[^0-9]/g, '');
  return cleaned.length === 10;
};
