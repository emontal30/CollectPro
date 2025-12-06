/**
 * Format number as currency (Egyptian Pounds)
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
  return new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num || 0)
}

/**
 * Format date to Arabic locale
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date
 */
export function formatDate(date) {
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date))
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 * @param {string|Date} date - Date to format
 * @returns {string} ISO date string
 */
export function toIsoDate(date) {
  return new Date(date).toISOString().split('T')[0]
}

/**
 * Parse number from string, handling Arabic and English digits
 * @param {string} str - String to parse
 * @returns {number} Parsed number
 */
export function parseNumber(str) {
  if (!str) return 0

  // Replace Arabic digits with English digits
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩'
  const englishDigits = '0123456789'

  let result = str.toString()
  for (let i = 0; i < arabicDigits.length; i++) {
    result = result.replace(new RegExp(arabicDigits[i], 'g'), englishDigits[i])
  }

  // Remove non-numeric characters except decimal point
  result = result.replace(/[^\d.]/g, '')

  return parseFloat(result) || 0
}

/**
 * Format file size in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * حساب الأيام المتبقية حتى تاريخ محدد
 * @param {string|Date} endDate - تاريخ الانتهاء
 * @returns {number} عدد الأيام المتبقية (عدد صحيح)
 */
export function calculateDaysRemaining(endDate) {
  if (!endDate) return 0;
  
  const end = new Date(endDate);
  const today = new Date();
  
  // تعيين الوقت إلى بداية اليوم
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  // حساب الفرق بالأيام
  const diffTime = end - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}