import Swal from 'sweetalert2';

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone number (Egyptian format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Is valid phone
 */
export function isValidPhone(phone) {
  const phoneRegex = /^(\+20|0)?1[0-2,5]\d{8}$/
  return phoneRegex.test(phone.replace(/\s+/g, ''))
}

/**
 * Validate positive number
 * @param {number} num - Number to validate
 * @returns {boolean} Is positive number
 */
export function isPositiveNumber(num) {
  return typeof num === 'number' && num > 0 && !isNaN(num)
}

/**
 * Validate required field
 * @param {*} value - Value to check
 * @returns {boolean} Is not empty
 */
export function isRequired(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

/**
 * Validate string length
 * @param {string} str - String to validate
 * @param {number} min - Minimum length
 * @param {number} max - Maximum length
 * @returns {boolean} Is valid length
 */
export function isValidLength(str, min = 0, max = Infinity) {
  if (typeof str !== 'string') return false
  const length = str.trim().length
  return length >= min && length <= max
}

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} date - Date string to validate
 * @returns {boolean} Is valid date
 */
export function isValidDate(date) {
  if (!date || typeof date !== 'string') return false
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) return false

  const d = new Date(date)
  return d instanceof Date && !isNaN(d) && d.toISOString().split('T')[0] === date
}

/**
 * Validate that date is not in the future
 * @param {string} date - Date string to validate
 * @returns {boolean} Is not future date
 */
export function isNotFutureDate(date) {
  if (!isValidDate(date)) return false
  const inputDate = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return inputDate <= today
}

/**
 * Validate numeric input and sanitize
 * @param {string|number} value - The input value
 * @param {object} options - Options { maxLimit, allowNegative }
 * @returns {object} { isValid, value, error }
 */
export function validateAndSanitizeMoney(value, options = {}) {
  const { maxLimit = Infinity, allowNegative = false, fieldName = 'المبلغ' } = options;
  
  if (value === '' || value === null || value === undefined) {
    return { isValid: true, value: null }; // Allow empty for optional fields logic
  }

  // Remove commas and spaces
  let cleanValue = String(value).replace(/,/g, '').trim();

  // Check if it's a valid number format
  if (isNaN(cleanValue) || cleanValue === '') {
     // If it's just a minus sign and negative is allowed, it's a transient state (typing)
     if (allowNegative && cleanValue === '-') return { isValid: true, value: '-' };
     return { isValid: false, value: null, error: 'يرجى إدخال أرقام فقط' };
  }

  let numValue = parseFloat(cleanValue);

  // Check for negative if not allowed
  if (!allowNegative && numValue < 0) {
    return { isValid: false, value: Math.abs(numValue), error: 'لا يمكن إدخال قيم سالبة هنا' };
  }

  // Check for huge limit
  if (Math.abs(numValue) > maxLimit) {
    return { 
      isValid: false, 
      value: numValue, 
      isWarning: true, // It's a warning, not a hard block usually, but here we flag it
      error: `قيمة ${fieldName} تبدو غير منطقية (أكبر من ${maxLimit.toLocaleString()})`
    };
  }

  return { isValid: true, value: numValue };
}

/**
 * Real-time input handler for money fields
 * Prevents non-numeric input and warns on large values
 * @param {Event} event - The input event
 * @param {Function} updateCallback - Callback to update the model
 * @param {object} options - Options for validation
 */
export const handleMoneyInput = (event, updateCallback, options = {}) => {
  const input = event.target;
  let rawValue = input.value;

  // 1. Prevent non-numeric characters (except . and - if allowed)
  const allowNegative = options.allowNegative || false;
  let regex = allowNegative ? /[^0-9.-]/g : /[^0-9.]/g;
  
  if (regex.test(rawValue)) {
    rawValue = rawValue.replace(regex, '');
    input.value = rawValue; // Reflect cleaning immediately
  }

  // Handle multiple dots
  const parts = rawValue.split('.');
  if (parts.length > 2) {
    rawValue = parts[0] + '.' + parts.slice(1).join('');
    input.value = rawValue;
  }

  // Handle minus sign position
  if (allowNegative && rawValue.indexOf('-') > 0) {
     rawValue = '-' + rawValue.replace(/-/g, '');
     input.value = rawValue;
  }

  const validation = validateAndSanitizeMoney(rawValue, options);

  if (validation.isWarning) {
     if (!input.dataset.warningShown) {
        // Professional Sticky Toast
        Swal.fire({
            toast: true,
            position: 'top',
            icon: 'warning',
            title: 'تنبيه لقيمة غير منطقية',
            text: validation.error,
            showConfirmButton: false,
            timer: 4000,
            timerProgressBar: true,
            background: '#fff3cd',
            color: '#856404',
            iconColor: '#856404',
            width: 'auto',
            padding: '1rem',
            customClass: {
              popup: 'sticky-warning-toast'
            }
        });
        input.dataset.warningShown = "true";
        setTimeout(() => { delete input.dataset.warningShown; }, 5000); // Reset warning flag after 5s
     }
  }

  // Pass raw value or parsed number depending on need. 
  updateCallback(rawValue);
};

/**
 * Validate harvest record data
 * @param {Object} record - Harvest record to validate
 * @returns {Object} Validation result with isValid and errors
 */
export function validateHarvestRecord(record) {
  const errors = {}

  if (!isRequired(record.shop)) {
    errors.shop = 'اسم المحل مطلوب'
  } else if (!isValidLength(record.shop, 1, 100)) {
    errors.shop = 'اسم المحل يجب أن يكون بين 1 و 100 حرف'
  }

  if (record.code && !isValidLength(record.code, 0, 50)) {
    errors.code = 'الكود يجب أن يكون أقل من 50 حرف'
  }

  // Strict number validation for final submission
  if (record.amount !== null && record.amount !== '' && !isPositiveNumber(parseFloat(record.amount))) {
    errors.amount = 'المبلغ يجب أن يكون رقماً موجباً'
  }

  if (record.extra !== undefined && record.extra !== null && record.extra !== '' && isNaN(parseFloat(record.extra))) {
    errors.extra = 'القيمة الإضافية غير صالحة'
  }
  
  if (record.collector !== undefined && record.collector !== null && record.collector !== '' && isNaN(parseFloat(record.collector))) {
    errors.collector = 'قيمة المحصل غير صالحة'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Validate user profile data
 * @param {Object} profile - User profile to validate
 * @returns {Object} Validation result with isValid and errors
 */
export function validateUserProfile(profile) {
  const errors = {}

  if (!isRequired(profile.full_name)) {
    errors.full_name = 'الاسم الكامل مطلوب'
  } else if (!isValidLength(profile.full_name, 2, 100)) {
    errors.full_name = 'الاسم الكامل يجب أن يكون بين 2 و 100 حرف'
  }

  if (!isValidEmail(profile.email)) {
    errors.email = 'البريد الإلكتروني غير صالح'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}
