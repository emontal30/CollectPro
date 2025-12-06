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

  if (!isPositiveNumber(record.amount)) {
    errors.amount = 'المبلغ يجب أن يكون رقماً موجباً'
  }

  if (record.extra !== undefined && record.extra !== null && record.extra < 0) {
    errors.extra = 'القيمة الإضافية يجب أن تكون رقماً موجباً أو صفر'
  }

  if (record.collector && !isValidLength(record.collector, 0, 100)) {
    errors.collector = 'اسم المجمع يجب أن يكون أقل من 100 حرف'
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