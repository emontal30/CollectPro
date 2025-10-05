/* ====== المتغيرات العامة ====== */
const STORAGE_KEYS = {
  DARK_MODE: "darkMode",
  CLIENT_DATA: "clientData",
  ROW_DATA: "rowData",
  HARVEST_DATA: "harvestData",
  MASTER_LIMIT: "masterLimit",
  ARCHIVE_DATA: "archiveData",
  USER: "user"
};

const PAGES = {
  DASHBOARD: "dashboard",
  HARVEST: "harvest",
  ARCHIVE: "archive"
};

const SELECTORS = {
  TOGGLE_DARK: "toggleDark",
  DATA_INPUT: "dataInput",
  HARVEST_TABLE: "harvestTable",
  ARCHIVE_TABLE: "archiveTable",
  ARCHIVE_SELECT: "archiveSelect",
  ARCHIVE_SEARCH: "archiveSearch",
  MASTER_LIMIT: "masterLimit",
  CURRENT_BALANCE: "currentBalance",
  CURRENT_DATE: "currentDate"
};

/* ====== دوال مساعدة ====== */
/**
 * تحويل النص إلى رقم
 * @param {string|number|null|undefined} x - القيمة المراد تحويلها
 * @returns {number} - القيمة الرقمية
 */
function parseNumber(x) {
  if (x === null || x === undefined) return 0;
  const s = String(x).replace(/,/g, "").trim();
  if (s === "") return 0;
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

/**
 * تنسيق الرقم مع فواصل الآلاف
 * @param {string|number} n - الرقم المراد تنسيقه
 * @returns {string} - الرقم المنسق
 */
function formatNumber(n) {
  const num = parseNumber(n);
  return num.toLocaleString("en-US", { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  });
}

/**
 * تأخير تنفيذ الدالة
 * @param {Function} func - الدالة المراد تأخيرها
 * @param {number} wait - مدة الانتظار بالمللي ثانية
 * @returns {Function} - الدالة المؤجلة
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/* ====== دوال الإشعارات المنبثقة (Toast) ====== */
/**
 * تهيئة حاوية الإشعارات
 */
function initToastContainer() {
  if (!document.querySelector('.toast-container')) {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
}

/**
 * عرض إشعار منبثق
 * @param {string} message - الرسالة
 * @param {string} type - نوع الإشعار (success, error, warning, info)
 * @param {number} duration - مدة العرض بالمللي ثانية
 * @returns {HTMLElement} - عنصر الإشعار
 */
function showToast(message, type = 'info', duration = 4000) {
  initToastContainer();
  
  const container = document.querySelector('.toast-container');
  
  // إنشاء عنصر الإشعار
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  // تحديد الأيقونة حسب نوع الإشعار
  let icon = '';
  switch(type) {
    case 'success':
      icon = '✓';
      break;
    case 'error':
      icon = '✕';
      break;
    case 'warning':
      icon = '⚠';
      break;
    default:
      icon = 'ℹ';
  }
  
  // بناء محتوى الإشعار
  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-message">${message}</div>
    <button class="toast-close" aria-label="إغلاق">&times;</button>
  `;
  
  // إضافة الإشعار إلى الحاوية
  container.appendChild(toast);
  
  // إظهار الإشعار مع تأثير الحركة
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // إضافة حدث النقر على زر الإغلاق
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    hideToast(toast);
  });
  
  // إخفاء الإشعار تلقائيًا بعد المدة المحددة
  setTimeout(() => {
    hideToast(toast);
  }, duration);
  
  return toast;
}

/**
 * إخفاء إشعار منبثق
 * @param {HTMLElement} toast - عنصر الإشعار
 */
function hideToast(toast) {
  if (!toast) return;
  
  toast.classList.remove('show');
  
  // إزالة الإشعار من DOM بعد انتهاء تأثير الاختفاء
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 300);
}

/**
 * عرض رسالة نجاح
 * @param {string} message - الرسالة
 * @param {number} duration - مدة العرض بالمللي ثانية
 * @returns {HTMLElement} - عنصر الإشعار
 */
function showSuccessToast(message, duration = 4000) {
  return showToast(message, 'success', duration);
}

/**
 * عرض رسالة خطأ
 * @param {string} message - الرسالة
 * @param {number} duration - مدة العرض بالمللي ثانية
 * @returns {HTMLElement} - عنصر الإشعار
 */
function showErrorToast(message, duration = 5000) {
  return showToast(message, 'error', duration);
}

/**
 * عرض رسالة تحذير
 * @param {string} message - الرسالة
 * @param {number} duration - مدة العرض بالمللي ثانية
 * @returns {HTMLElement} - عنصر الإشعار
 */
function showWarningToast(message, duration = 4000) {
  return showToast(message, 'warning', duration);
}

/**
 * عرض رسالة معلومات
 * @param {string} message - الرسالة
 * @param {number} duration - مدة العرض بالمللي ثانية
 * @returns {HTMLElement} - عنصر الإشعار
 */
function showInfoToast(message, duration = 4000) {
  return showToast(message, 'info', duration);
}

/* ====== دوال الواجهة الرسومية ====== */
/**
 * عرض نافذة منبثقة مخصصة
 * @param {string} title - عنوان النافذة
 * @param {string} message - الرسالة
 * @param {Function} onConfirm - دالة التنفيذ عند التأكيد
 * @param {Function} onCancel - دالة التنفيذ عند الإلغاء
 * @param {boolean} isSimpleNotification - هل هي رسالة بسيطة لا تتطلب تأكيدًا
 */
function showModal(title, message, onConfirm, onCancel, isSimpleNotification = false) {
  // إذا كانت رسالة بسيطة، استخدم الإشعارات المنبثقة بدلاً من النافذة المنبثقة
  if (isSimpleNotification) {
    // تحديد نوع الإشعار بناءً على العنوان
    let toastType = 'info';
    if (title === 'نجاح') toastType = 'success';
    else if (title === 'خطأ') toastType = 'error';
    else if (title === 'تحذير' || title === 'تنبيه') toastType = 'warning';
    
    return showToast(message, toastType);
  }
  
  const existingModal = document.querySelector('.modal');
  if (existingModal) existingModal.remove();
  
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-content">
      <h3>${title}</h3>
      <p>${message}</p>
      <div class="modal-buttons">
        <button id="modalYes" class="confirm-btn">تأكيد</button>
        <button id="modalNo" class="cancel-btn">إلغاء</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.style.display = "flex";
  
  document.getElementById("modalYes").onclick = () => {
    if (onConfirm) onConfirm();
    modal.remove();
  };
  
  document.getElementById("modalNo").onclick = () => {
    if (onCancel) onCancel();
    modal.remove();
  };
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      if (onCancel) onCancel();
      modal.remove();
    }
  };
}

/* ====== دوال الوضع الليلي ====== */
/**
 * تطبيق الوضع الليلي من التخزين المحلي
 */
function applyDarkModeFromStorage() {
  const isDarkMode = localStorage.getItem(STORAGE_KEYS.DARK_MODE) === "on";
  document.body.classList.toggle("dark", isDarkMode);
}

/**
 * تبديل الوضع الليلي
 */
function toggleDarkMode() {
  document.body.classList.toggle("dark");
  localStorage.setItem(
    STORAGE_KEYS.DARK_MODE, 
    document.body.classList.contains("dark") ? "on" : "off"
  );
}

/* ====== دوال الحافظة ====== */
/**
 * لصق النص من الحافظة في حقل معين
 * @param {HTMLElement} el - العنصر المراد اللصق فيه
 */
async function pasteInto(el) {
  if (!el) return;
  try {
    const text = await navigator.clipboard.readText();
    el.value = text;
  } catch (err) {
    const manual = prompt("المتصفح منع الوصول للحافظة.\nألصق بياناتك هنا ثم اضغط موافق:");
    if (manual !== null) el.value = manual;
  }
}

/* ====== دوال مسح البيانات ====== */
/**
 * مسح حقول إدخال البيانات
 */
function clearIndexFields() {
  const dataInput = document.getElementById(SELECTORS.DATA_INPUT);
  if (dataInput) {
    dataInput.value = "";
    localStorage.removeItem(STORAGE_KEYS.CLIENT_DATA);
    showSuccessToast("تم تفريغ حقل إدخال البيانات!");
  }
}

/**
 * مسح حقول التحصيل مع تأكيد من المستخدم
 */
function clearHarvestFields() {
  showModal(
    "تحذير", 
    "سيتم تفريغ جميع حقول التحصيلات! البيانات غير المحفوظة ستفقد.\n\nهل أنت متأكد أنك تريد المتابعة؟",
    () => {
      const mlEl = document.getElementById(SELECTORS.MASTER_LIMIT);
      const mlVal = mlEl ? mlEl.value : (localStorage.getItem(STORAGE_KEYS.MASTER_LIMIT) || "");
      
      const tbody = document.querySelector(`#${SELECTORS.HARVEST_TABLE} tbody`);
      if (tbody) {
        tbody.innerHTML = "";
        addEmptyRow();
      }
      
      localStorage.removeItem(STORAGE_KEYS.ROW_DATA);
      localStorage.removeItem(STORAGE_KEYS.HARVEST_DATA);
      localStorage.removeItem(STORAGE_KEYS.CLIENT_DATA);
      
      if (mlVal !== "") localStorage.setItem(STORAGE_KEYS.MASTER_LIMIT, mlVal);
      if (mlEl) mlEl.value = mlVal;
      
      updateTotals();
      showSuccessToast("تم تفريغ حقول التحصيلات بنجاح!");
    }
  );
}

/**
 * التحقق من وجود بيانات في صفحة التحصيل
 * @returns {boolean} - هل توجد بيانات
 */
function hasHarvestData() {
  const tbody = document.querySelector(`#${SELECTORS.HARVEST_TABLE} tbody`);
  if (!tbody) return false;
  
  const rows = Array.from(tbody.querySelectorAll("tr"));
  if (rows.length <= 1) return false;
  
  for (const row of rows) {
    if (row.id === "totalRow") continue;
    
    const shop = row.querySelector(".shop")?.innerText.trim();
    const code = row.querySelector(".code")?.innerText.trim();
    const extra = row.querySelector(".extra")?.value;
    const collector = row.querySelector(".collector")?.value;
    
    if (shop || code || extra || collector) {
      return true;
    }
  }
  
  return false;
}

/**
 * مسح بيانات صفحة التحصيل مع الحفاظ على ليميت الماستر
 */
function clearHarvestTable() {
  const mlEl = document.getElementById(SELECTORS.MASTER_LIMIT);
  const mlVal = mlEl ? mlEl.value : (localStorage.getItem(STORAGE_KEYS.MASTER_LIMIT) || "");
  
  const tbody = document.querySelector(`#${SELECTORS.HARVEST_TABLE} tbody`);
  if (tbody) {
    tbody.innerHTML = "";
    addEmptyRow();
    updateTotals();
  }
  
  localStorage.removeItem(STORAGE_KEYS.ROW_DATA);
  
  if (mlVal !== "") localStorage.setItem(STORAGE_KEYS.MASTER_LIMIT, mlVal);
  if (mlEl) mlEl.value = mlVal;
}

/* ====== دوال التنقل ====== */
/**
 * التنقل بين الصفحات
 * @param {string} page - اسم الصفحة
 */
function navigateTo(page) {
  if (page === PAGES.HARVEST) {
    const dataInput = document.getElementById(SELECTORS.DATA_INPUT);
    if (dataInput) {
      const data = dataInput.value.trim();
      if (data) {
        localStorage.setItem(STORAGE_KEYS.HARVEST_DATA, data);
        localStorage.removeItem(STORAGE_KEYS.CLIENT_DATA);
      }
    }
    window.location.href = `${page}.html`;
  } else if (page === PAGES.ARCHIVE || page === PAGES.DASHBOARD) {
    const tbody = document.querySelector(`#${SELECTORS.HARVEST_TABLE} tbody`);
    if (tbody) {
      try {
        localStorage.setItem(STORAGE_KEYS.ROW_DATA, tbodyToStorage());
      } catch (e) {
        console.error("Failed to save row data", e);
      }
    }
    window.location.href = `${page}.html`;
  }
}

/**
 * إعداد أزرار التنقل بين الصفحات
 */
function setupNavigationArrows() {
  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");
  
  const pages = [PAGES.DASHBOARD, PAGES.HARVEST, PAGES.ARCHIVE];
  const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
  const currentIndex = pages.indexOf(currentPage);
  
  if (prevBtn) {
    if (currentIndex > 0) {
      prevBtn.addEventListener("click", () => navigateTo(pages[currentIndex - 1]));
      prevBtn.classList.remove("hidden");
    } else {
      prevBtn.classList.add("hidden");
    }
  }
  
  if (nextBtn) {
    if (currentIndex < pages.length - 1) {
      nextBtn.addEventListener("click", () => navigateTo(pages[currentIndex + 1]));
      nextBtn.classList.remove("hidden");
    } else {
      nextBtn.classList.add("hidden");
    }
  }
}

/* ====== دوال التخزين ====== */
/**
 * تحويل بيانات الجدول إلى نص للتخزين
 * @returns {string} - البيانات كنص
 */
function tbodyToStorage() {
  const tbody = document.querySelector(`#${SELECTORS.HARVEST_TABLE} tbody`);
  if (!tbody) return "";
  
  const rows = Array.from(tbody.querySelectorAll("tr"));
  return rows
    .filter((r) => r.id !== "totalRow")
    .map((r) => {
      const shop = r.querySelector(".shop")?.innerText || "";
      const code = r.querySelector(".code")?.innerText || "";
      const amount = r.querySelector(".amount")?.getAttribute("data-amount") || "0";
      const extra = r.querySelector(".extra")?.value || "";
      const collector = r.querySelector(".collector")?.value || "";
      const net = r.querySelector(".result")?.innerText || "";
      const status = r.querySelector(".status")?.innerText || "";
      return [shop, code, amount, extra, collector, net, status].join("\t");
    })
    .join("\n");
}

/**
 * تحليل وتعبئة الجدول من نص خام
 * @param {string} rawDataString - النص الخام للبيانات
 * @param {HTMLElement} tbody - عنصر tbody للجدول
 * @param {boolean} isEditable - هل الصفوف قابلة للتعديل
 */
function parseAndPopulateTable(rawDataString, tbody, isEditable = false) {
  if (!rawDataString || !tbody) return;
  
  tbody.innerHTML = "";
  const rows = rawDataString.split("\n");
  
  rows.forEach((row, index) => {
    if (!row.trim()) return;
    if (row.includes("المسلسل") && row.includes("إجمالي البيع-التحويل-الرصيد")) return;
    
    const parts = row.split("\t");
    if (parts.length < 4) return;
    
    const center = parts[1].trim();
    let shopName = "";
    let code = "";
    
    const match = center.match(/(.+?):\s*(\d+)/);
    if (match) {
      shopName = match[1].trim();
      code = match[2].trim();
    } else {
      shopName = center;
      code = parts[2] ? parts[2].trim() : "";
    }
    
    const transferAmount = parseNumber(parts[3]);
    if (transferAmount === 0) return;
    
    const tr = document.createElement("tr");
    tr.classList.add(isEditable ? 'editable-row' : 'non-editable-row');
    tr.innerHTML = `
      <td class="serial">${index + 1}</td>
      <td class="shop ${isEditable ? 'editable' : 'non-editable'}" ${isEditable ? 'contenteditable="true"' : ''}>${shopName}</td>
      <td class="code ${isEditable ? 'editable' : 'non-editable'}" ${isEditable ? 'contenteditable="true"' : ''}>${code}</td>
      <td class="amount" data-amount="${transferAmount}">${formatNumber(transferAmount)}</td>
      <td><input type="text" class="extra" value="${formatNumber(parts[4] || 0)}"/></td>
      <td class="highlight"><input type="text" class="collector" value="${formatNumber(parts[5] || 0)}"/></td>
      <td class="numeric result">${parts[6] || ""}</td>
      <td class="status">${parts[7] || "🔔"}</td>
    `;
    tbody.appendChild(tr);
  });
  
  const allRows = Array.from(tbody.querySelectorAll("tr"));
  allRows.forEach((r) => attachRowListeners(r));
  
  try { 
    localStorage.setItem(STORAGE_KEYS.ROW_DATA, tbodyToStorage()); 
  } catch (e) {}
  
  updateTotals();
}

/**
 * تحميل البيانات من التخزين
 * @returns {boolean} - هل تم تحميل البيانات بنجاح
 */
function loadRowsFromStorage() {
  const harvestData = localStorage.getItem(STORAGE_KEYS.HARVEST_DATA);
  if (harvestData) {
    const tbody = document.querySelector(`#${SELECTORS.HARVEST_TABLE} tbody`);
    if (tbody) {
      if (hasHarvestData()) {
        showModal(
          "تنبيه", 
          "صفحة التحصيل تحتوي على بيانات. سيتم تفريغها قبل استخراج البيانات الجديدة.",
          () => {
            clearHarvestTable();
            parseAndPopulateTable(harvestData, tbody, true);
            localStorage.removeItem(STORAGE_KEYS.HARVEST_DATA);
          }
        );
        return true;
      } else {
        parseAndPopulateTable(harvestData, tbody, true);
        localStorage.removeItem(STORAGE_KEYS.HARVEST_DATA);
        return true;
      }
    }
  }
  
  const saved = localStorage.getItem(STORAGE_KEYS.ROW_DATA);
  if (saved) {
    const tbody = document.querySelector(`#${SELECTORS.HARVEST_TABLE} tbody`);
    if (tbody) {
      tbody.innerHTML = "";
      saved.split("\n").forEach((line, i) => {
        if (!line) return;
        const parts = line.split("\t");
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="serial">${i + 1}</td>
          <td class="shop non-editable">${parts[0] || ""}</td>
          <td class="code non-editable">${parts[1] || ""}</td>
          <td class="amount" data-amount="${parts[2] || "0"}">${formatNumber(parts[2] || 0)}</td>
          <td><input type="text" class="extra" value="${formatNumber(parts[3] || 0)}"/></td>
          <td class="highlight"><input type="text" class="collector" value="${formatNumber(parts[4] || 0)}"/></td>
          <td class="numeric result">${parts[5] || ""}</td>
          <td class="status">${parts[6] || ""}</td>
        `;
        tbody.appendChild(tr);
      });
      
      const rows = Array.from(tbody.querySelectorAll("tr"));
      rows.forEach((r) => attachRowListeners(r));
      updateTotals();
      return true;
    }
  }
  
  const raw = localStorage.getItem(STORAGE_KEYS.CLIENT_DATA);
  if (raw) {
    const tbody = document.querySelector(`#${SELECTORS.HARVEST_TABLE} tbody`);
    if (tbody) {
      parseAndPopulateTable(raw, tbody, true);
      return true;
    }
  }
  
  return false;
}

/* ====== دوال تنسيق الأرقام ====== */
/**
 * تنسيق حقل إدخال الأرقام
 * @param {HTMLInputElement} input - حقل الإدخال
 */
function formatNumberInput(input) {
  const cursorPosition = input.selectionStart;
  // *** تم التعديل هنا للسماح بالأرقام السالبة ***
  let value = input.value.replace(/[^\d-]/g, '');
  
  if (value === '') {
    input.value = '';
    return;
  }
  
  const formatted = formatNumber(value);
  input.value = formatted;
  
  const commaCount = (formatted.match(/,/g) || []).length;
  const originalCommaCount = (input.value.substring(0, cursorPosition).match(/,/g) || []).length;
  const newCursorPosition = cursorPosition + (commaCount - originalCommaCount);
  input.setSelectionRange(newCursorPosition, newCursorPosition);
}

/**
 * إعداد تنسيق الأرقام لحقل الإدخال
 * @param {HTMLInputElement} input - حقل الإدخال
 */
function setupNumberInputFormatting(input) {
  input.type = 'text';
  formatNumberInput(input);
  
  input.addEventListener('input', function() {
    formatNumberInput(this);
  });
  
  input.addEventListener('blur', function() {
    formatNumberInput(this);
  });
}

/* ====== دوال الجداول ====== */
/**
 * ربط مستمعي الأحداث بصف في الجدول
 * @param {HTMLTableRowElement} row - صف الجدول
 */
function attachRowListeners(row) {
  if (!row || row.dataset.attached === "1") return;
  row.dataset.attached = "1";
  
  const extra = row.querySelector(".extra");
  const collector = row.querySelector(".collector");
  const resultCell = row.querySelector(".result");
  const statusCell = row.querySelector(".status");
  const amountCell = row.querySelector(".amount");
  
  if (collector) setupNumberInputFormatting(collector);
  if (extra) setupNumberInputFormatting(extra);
  
  const transferAmount = parseNumber(
    amountCell?.getAttribute("data-amount") ?? amountCell?.innerText
  );
  
  function updateRow() {
    const extraVal = parseNumber(extra?.value);
    const collectorVal = parseNumber(collector?.value);
    
    if ((!extra || extra.value === "") && (!collector || collector.value === "")) {
      resultCell.textContent = "";
      resultCell.style.color = "";
      statusCell.textContent = "🔔";
      statusCell.className = "status";
      updateTotals();
      return;
    }
    
    const net = collectorVal - (transferAmount + extraVal);
    resultCell.textContent = formatNumber(net);
    
    if (net < 0) {
      statusCell.textContent = "عجز ✖️";
      statusCell.className = "status negative";
      resultCell.style.color = "var(--danger)";
    } else if (net > 0) {
      statusCell.textContent = "زيادة ➕";
      statusCell.className = "status positive";
      resultCell.style.color = "var(--success)";
    } else {
      statusCell.textContent = "تم ✔️";
      statusCell.className = "status zero";
      resultCell.style.color = "#2c3e50";
    }
    
    updateTotals();
    try { 
      localStorage.setItem(STORAGE_KEYS.ROW_DATA, tbodyToStorage()); 
    } catch (e) { 
      console.error("Failed to save row data", e);
    }
  }
  
  if (extra) extra.addEventListener("input", () => { updateRow(); ensureAddRowIfLast(row); });
  if (collector) collector.addEventListener("input", () => { updateRow(); ensureAddRowIfLast(row); });
  
  if (row.classList.contains('editable-row')) {
    const shopCell = row.querySelector(".shop");
    const codeCell = row.querySelector(".code");
    
    [shopCell, codeCell].forEach(cell => {
      if(cell) {
        cell.addEventListener("input", () => { 
          try { localStorage.setItem(STORAGE_KEYS.ROW_DATA, tbodyToStorage()); } catch (e) {} 
          ensureAddRowIfLast(row); 
        });
        cell.addEventListener("blur", () => { 
          try { localStorage.setItem(STORAGE_KEYS.ROW_DATA, tbodyToStorage()); } catch (e) {} 
        });
      }
    });
  }
}

/**
 * إضافة صف فارغ للجدول
 */
function addEmptyRow() {
  const tbody = document.querySelector(`#${SELECTORS.HARVEST_TABLE} tbody`);
  if (!tbody) return;
  
  const totalRow = document.getElementById("totalRow");
  const count = tbody.querySelectorAll("tr").length - (totalRow ? 1 : 0);
  
  const tr = document.createElement("tr");
  tr.classList.add('editable-row');
  tr.innerHTML = `
    <td class="serial">${count + 1}</td>
    <td contenteditable="true" class="shop editable"></td>
    <td contenteditable="true" class="code editable"></td>
    <td class="amount" data-amount="0">0</td>
    <td><input type="text" class="extra" value="0"/></td>
    <td class="highlight"><input type="text" class="collector" value="0"/></td>
    <td class="numeric result"></td>
    <td class="status">🔔</td>
  `;
  
  if (totalRow) tbody.insertBefore(tr, totalRow);
  else tbody.appendChild(tr);
  
  attachRowListeners(tr);
}

/**
 * التأكد من إضافة صف فارغ إذا كان الصف الحالي هو الأخير
 * @param {HTMLTableRowElement} row - الصف الحالي
 */
function ensureAddRowIfLast(row) {
  const tbody = row.parentElement;
  if (!tbody) return;

  const totalRow = document.getElementById("totalRow");
  const lastRow = totalRow ? totalRow.previousElementSibling : tbody.lastElementChild;

  if (row === lastRow) {
    const shop = row.querySelector(".shop")?.innerText.trim();
    const code = row.querySelector(".code")?.innerText.trim();
    const extra = row.querySelector(".extra")?.value.trim();
    const collector = row.querySelector(".collector")?.value.trim();

    const hasData = shop || code || (extra && extra !== "0") || (collector && collector !== "0");
    
    if (hasData) {
      addEmptyRow();
    }
  }
}

/**
 * إضافة صف فارغ أخير إذا لزم الأمر
 */
function addFinalEmptyRowIfNeeded() {
  const tbody = document.querySelector(`#${SELECTORS.HARVEST_TABLE} tbody`);
  if (!tbody) return;

  const totalRow = document.getElementById("totalRow");
  const lastRow = totalRow ? totalRow.previousElementSibling : tbody.lastElementChild;

  if (!lastRow || lastRow.id === 'totalRow') {
    addEmptyRow();
    return;
  }

  const shop = lastRow.querySelector(".shop")?.innerText.trim();
  const code = lastRow.querySelector(".code")?.innerText.trim();
  const extra = lastRow.querySelector(".extra")?.value.trim();
  const collector = lastRow.querySelector(".collector")?.value.trim();

  const hasData = shop || code || (extra && extra !== "0") || (collector && collector !== "0");

  if (hasData) {
    addEmptyRow();
  }
}

/**
 * تحديث إجماليات الجدول
 */
const debouncedUpdateTotals = debounce(() => {
  const tbody = document.querySelector(`#${SELECTORS.HARVEST_TABLE} tbody`);
  if (!tbody) return;
  
  const oldTotal = document.getElementById("totalRow");
  if (oldTotal) oldTotal.remove();
  
  let totalAmount = 0, totalExtra = 0, totalCollector = 0, totalNet = 0;
  const rows = Array.from(tbody.querySelectorAll("tr"));
  
  rows.forEach((row, index) => {
    if (row.id !== "totalRow") {
      const serialCell = row.querySelector(".serial");
      if (serialCell) serialCell.textContent = index + 1;
    }
  });
  
  rows.forEach((row) => {
    if (row.id === "totalRow") return;
    
    const amount = parseNumber(
      row.querySelector(".amount")?.getAttribute("data-amount") ??
      row.querySelector(".amount")?.innerText
    );
    const extra = parseNumber(row.querySelector(".extra")?.value);
    const collector = parseNumber(row.querySelector(".collector")?.value);
    
    totalAmount += amount;
    totalExtra += extra;
    totalCollector += collector;
    totalNet += collector - (amount + extra);
  });
  
  const trTotal = document.createElement("tr");
  trTotal.id = "totalRow";
  trTotal.style.fontWeight = "bold";
  trTotal.style.background = document.body.classList.contains("dark") ? "#333" : "#dff0d8";
  trTotal.style.color = document.body.classList.contains("dark") ? "#00c896" : "#000";
  trTotal.innerHTML = `
    <td colspan="3">الإجمالي</td>
    <td>${formatNumber(totalAmount)}</td>
    <td>${formatNumber(totalExtra)}</td>
    <td>${formatNumber(totalCollector)}</td>
    <td>${formatNumber(totalNet)}</td>
    <td>-</td>
  `;
  tbody.appendChild(trTotal);
  
  const masterLimit = parseNumber(document.getElementById(SELECTORS.MASTER_LIMIT)?.value);
  const currentBalance = parseNumber(document.getElementById(SELECTORS.CURRENT_BALANCE)?.value);
  const resetAmount = currentBalance - masterLimit;
  
  const resetAmountEl = document.getElementById("resetAmount");
  if (resetAmountEl) {
    resetAmountEl.textContent = formatNumber(resetAmount);
    resetAmountEl.style.color = resetAmount < 0 ? "var(--danger)" : resetAmount > 0 ? "var(--success)" : "#2c3e50";
  }
  
  const totalCollectedEl = document.getElementById("totalCollected");
  if (totalCollectedEl) totalCollectedEl.textContent = formatNumber(totalCollector);
  
  const resetStatusEl = document.getElementById("resetStatus");
  if (resetStatusEl) {
    const resetStatus = totalCollector + resetAmount;
    if (resetStatus === 0) {
      resetStatusEl.textContent = "0 ✔️ تم التصفير";
      resetStatusEl.style.color = "#2c3e50";
    } else if (resetStatus > 0) {
      resetStatusEl.textContent = `${formatNumber(resetStatus)} ➕ زيادة`;
      resetStatusEl.style.color = "var(--success)";
    } else {
      resetStatusEl.textContent = `${formatNumber(resetStatus)} ✖️ عجز`;
      resetStatusEl.style.color = "var(--danger)";
    }
  }
}, 100);

function updateTotals() {
  debouncedUpdateTotals();
}

/* ====== دوال الأرشيف ====== */
/**
 * تحميل بيانات الأرشيف لتاريخ معين
 * @param {string} dateStr - التاريخ
 */
function loadArchive(dateStr) {
  const archiveTable = document.querySelector(`#${SELECTORS.ARCHIVE_TABLE} tbody`);
  if (!archiveTable) return;
  
  archiveTable.innerHTML = "";
  if (!dateStr) return;
  
  const archive = JSON.parse(localStorage.getItem(STORAGE_KEYS.ARCHIVE_DATA) || "{}");
  const data = archive[dateStr];
  if (!data) return;
  
  const rows = data.split("\n");
  let totalAmount = 0, totalExtra = 0, totalCollector = 0, totalNet = 0;
  
  rows.forEach(rowStr => {
    if (!rowStr.trim()) return;
    const parts = rowStr.split("\t");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${dateStr}</td>
      <td>${parts[1] || ""}</td>
      <td>${parts[2] || ""}</td>
      <td>${formatNumber(parts[3] || 0)}</td>
      <td>${formatNumber(parts[4] || 0)}</td>
      <td>${formatNumber(parts[5] || 0)}</td>
      <td>${formatNumber(parts[6] || 0)}</td>
      <td>${parts[7] || "🔔"}</td>
    `;
    archiveTable.appendChild(tr);
    
    totalAmount += parseNumber(parts[3]);
    totalExtra += parseNumber(parts[4]);
    totalCollector += parseNumber(parts[5]);
    totalNet += parseNumber(parts[6]);
  });
  
  if (archiveTable.children.length > 0) {
    const trTotal = document.createElement("tr");
    trTotal.style.fontWeight = "bold";
    trTotal.style.background = document.body.classList.contains("dark") ? "#333" : "#dff0d8";
    trTotal.style.color = document.body.classList.contains("dark") ? "#00c896" : "#000";
    trTotal.innerHTML = `
      <td colspan="3">الإجمالي</td>
      <td>${formatNumber(totalAmount)}</td>
      <td>${formatNumber(totalExtra)}</td>
      <td>${formatNumber(totalCollector)}</td>
      <td>${formatNumber(totalNet)}</td>
      <td>-</td>
    `;
    archiveTable.appendChild(trTotal);
  }
}

/**
 * البحث في الأرشيف
 * @param {string} query - نص البحث
 */
function searchArchive(query) {
  const archiveTable = document.querySelector(`#${SELECTORS.ARCHIVE_TABLE} tbody`);
  if (!archiveTable) return;
  
  archiveTable.innerHTML = "";
  if (!query) return;
  
  const archive = JSON.parse(localStorage.getItem(STORAGE_KEYS.ARCHIVE_DATA) || "{}");
  let totalAmount = 0, totalExtra = 0, totalCollector = 0, totalNet = 0;
  
  Object.keys(archive).forEach(date => {
    const rows = archive[date].split("\n");
    rows.forEach(rowStr => {
      if (!rowStr.trim()) return;
      const parts = rowStr.split("\t");
      const shop = parts[1] || "";
      const code = parts[2] || "";
      
      if (shop.includes(query) || code.includes(query)) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${date}</td>
          <td>${shop}</td>
          <td>${code}</td>
          <td>${formatNumber(parts[3] || 0)}</td>
          <td>${formatNumber(parts[4] || 0)}</td>
          <td>${formatNumber(parts[5] || 0)}</td>
          <td>${formatNumber(parts[6] || 0)}</td>
          <td>${parts[7] || "🔔"}</td>
        `;
        archiveTable.appendChild(tr);
        
        totalAmount += parseNumber(parts[3]);
        totalExtra += parseNumber(parts[4]);
        totalCollector += parseNumber(parts[5]);
        totalNet += parseNumber(parts[6]);
      }
    });
  });
  
  if (archiveTable.children.length > 0) {
    const trTotal = document.createElement("tr");
    trTotal.style.fontWeight = "bold";
    trTotal.style.background = document.body.classList.contains("dark") ? "#333" : "#dff0d8";
    trTotal.style.color = document.body.classList.contains("dark") ? "#00c896" : "#000";
    trTotal.innerHTML = `
      <td colspan="3">الإجمالي</td>
      <td>${formatNumber(totalAmount)}</td>
      <td>${formatNumber(totalExtra)}</td>
      <td>${formatNumber(totalCollector)}</td>
      <td>${formatNumber(totalNet)}</td>
      <td>-</td>
    `;
    archiveTable.appendChild(trTotal);
  }
}

/* ====== دوال الحفظ التلقائي والتحسينات ====== */
function setupAutoSave() {
  const dataInput = document.getElementById(SELECTORS.DATA_INPUT);
  if (dataInput) {
    dataInput.addEventListener("input", debounce(() => {
      localStorage.setItem(STORAGE_KEYS.CLIENT_DATA, dataInput.value.trim());
    }, 1000));
  }
  
  const harvestTable = document.getElementById(SELECTORS.HARVEST_TABLE);
  if (harvestTable) {
    harvestTable.addEventListener("input", debounce(() => {
      try {
        localStorage.setItem(STORAGE_KEYS.ROW_DATA, tbodyToStorage());
      } catch (e) {
        console.error("Auto-save failed", e);
      }
    }, 1000));
  }
  
  const masterLimit = document.getElementById(SELECTORS.MASTER_LIMIT);
  if (masterLimit) {
    masterLimit.addEventListener("input", debounce(() => {
      localStorage.setItem(STORAGE_KEYS.MASTER_LIMIT, masterLimit.value);
    }, 500));
  }
}

function setupSummaryNumberFormatting() {
  const masterLimit = document.getElementById(SELECTORS.MASTER_LIMIT);
  const currentBalance = document.getElementById(SELECTORS.CURRENT_BALANCE);
  
  if (masterLimit) setupNumberInputFormatting(masterLimit);
  if (currentBalance) setupNumberInputFormatting(currentBalance);
}

function enhanceTableExperience() {
  const tables = document.querySelectorAll("table");
  tables.forEach(table => {
    const rows = table.querySelectorAll("tbody tr");
    rows.forEach(row => {
      row.addEventListener("mouseenter", () => {
        row.style.backgroundColor = document.body.classList.contains("dark") ? "#333" : "#f5f5f5";
      });
      row.addEventListener("mouseleave", () => {
        row.style.backgroundColor = "";
      });
    });
  });
}

function populateUserData() {
  const userString = localStorage.getItem(STORAGE_KEYS.USER) || sessionStorage.getItem(STORAGE_KEYS.USER);
  if (!userString) return;

  try {
    const user = JSON.parse(userString);
    const elements = {
      'user-name': user.name,
      'user-initial': user.name?.charAt(0).toUpperCase(),
      'user-email': user.email,
      'user-id': user.id ? `ID: ${user.id}` : null
    };
    
    Object.entries(elements).forEach(([id, text]) => {
      const el = document.getElementById(id);
      if (el && text) el.textContent = text;
    });

  } catch (error) {
    console.error('Failed to parse user data from storage', error);
  }
}

/* ====== معالجات الأحداث للصفحات ====== */
function setupIndexPageEvents() {
  const dataInput = document.getElementById(SELECTORS.DATA_INPUT);
  if (!dataInput) return;
  
  document.getElementById("pasteBtn")?.addEventListener("click", () => pasteInto(dataInput));
  
  document.getElementById("saveGoBtn")?.addEventListener("click", () => {
    const data = dataInput.value.trim();
    if (!data) {
      showWarningToast("من فضلك أدخل البيانات أولاً!");
      return;
    }
    if (!data.startsWith("المسلسل")) {
      showModal("تأكيد", "البيانات لا تبدأ بكلمة 'المسلسل'. هل تريد المتابعة وحفظ البيانات?", () => {
        localStorage.setItem(STORAGE_KEYS.CLIENT_DATA, data);
        navigateTo(PAGES.HARVEST);
      });
      return;
    }
    localStorage.setItem(STORAGE_KEYS.CLIENT_DATA, data);
    navigateTo(PAGES.HARVEST);
  });
  
  document.getElementById("goToArchiveBtn")?.addEventListener("click", () => navigateTo(PAGES.ARCHIVE));
  document.getElementById("clearBtnn")?.addEventListener("click", clearIndexFields);
  
  const savedClient = localStorage.getItem(STORAGE_KEYS.CLIENT_DATA);
  if (savedClient) dataInput.value = savedClient;
}

function setupHarvestPageEvents() {
  const harvestTable = document.getElementById(SELECTORS.HARVEST_TABLE);
  if (!harvestTable) return;
  
  const savedML = localStorage.getItem(STORAGE_KEYS.MASTER_LIMIT);
  if (savedML && document.getElementById(SELECTORS.MASTER_LIMIT)) {
    document.getElementById(SELECTORS.MASTER_LIMIT).value = savedML;
  }
  
  loadRowsFromStorage();
  
  document.getElementById("clearHarvestBtn")?.addEventListener("click", clearHarvestFields);
  
  const archiveTodayBtn = document.getElementById("archiveTodayBtn");
  if (archiveTodayBtn) {
    archiveTodayBtn.addEventListener("click", () => {
      const tbody = harvestTable.querySelector("tbody");
      const rows = Array.from(tbody.querySelectorAll("tr"));
      
      if (rows.length <= 1) {
        showWarningToast("لا توجد بيانات لأرشفتها!");
        return;
      }
      
      const archiveData = [];
      rows.forEach((r) => {
        if (r.id === "totalRow") return;
        const cells = Array.from(r.children).map((td) => {
          const inp = td.querySelector("input");
          return inp ? inp.value : td.innerText;
        });
        archiveData.push(cells.join("\t"));
      });
      
      const today = new Date().toISOString().split("T")[0];
      const archive = JSON.parse(localStorage.getItem(STORAGE_KEYS.ARCHIVE_DATA) || "{}");
      archive[today] = archiveData.join("\n");
      localStorage.setItem(STORAGE_KEYS.ARCHIVE_DATA, JSON.stringify(archive));
      
      showSuccessToast("✅ تم أرشفة بيانات اليوم بالكامل!");
    });
  }
  
  document.getElementById("goToArchiveBtn")?.addEventListener("click", () => navigateTo(PAGES.ARCHIVE));
  document.getElementById("goToInputBtn")?.addEventListener("click", () => navigateTo(PAGES.DASHBOARD));
  document.getElementById(SELECTORS.MASTER_LIMIT)?.addEventListener("input", updateTotals);
  document.getElementById(SELECTORS.CURRENT_BALANCE)?.addEventListener("input", updateTotals);
  
  addFinalEmptyRowIfNeeded();
}

function setupArchivePageEvents() {
  const archiveSelect = document.getElementById(SELECTORS.ARCHIVE_SELECT);
  if (!archiveSelect) return;
  
  const archive = JSON.parse(localStorage.getItem(STORAGE_KEYS.ARCHIVE_DATA) || "{}");
  Object.keys(archive).sort().forEach(dateStr => {
    const opt = document.createElement("option");
    opt.value = dateStr; 
    opt.textContent = dateStr;
    archiveSelect.appendChild(opt);
  });
  
  archiveSelect.addEventListener("change", () => {
    const searchInput = document.getElementById(SELECTORS.ARCHIVE_SEARCH);
    if (searchInput) searchInput.value = "";
    loadArchive(archiveSelect.value);
  });
  
  const searchInput = document.getElementById(SELECTORS.ARCHIVE_SEARCH);
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      if (e.target.value.trim()) {
        archiveSelect.value = "";
        searchArchive(e.target.value.trim());
      } else {
        loadArchive(archiveSelect.value);
      }
    });
  }
  
  document.getElementById("deleteArchiveBtn")?.addEventListener("click", () => {
    const dateStr = archiveSelect.value;
    if (!dateStr) {
      showWarningToast("اختر تاريخًا أولاً!");
      return;
    }
    
    showModal(
      "تأكيد الحذف", 
      `هل أنت متأكد أنك عايز تحذف أرشيف يوم ${dateStr}؟`,
      () => {
        delete archive[dateStr];
        localStorage.setItem(STORAGE_KEYS.ARCHIVE_DATA, JSON.stringify(archive));
        archiveSelect.querySelector(`option[value="${dateStr}"]`)?.remove();
        archiveSelect.value = "";
        document.querySelector(`#${SELECTORS.ARCHIVE_TABLE} tbody`).innerHTML = "";
        showSuccessToast(`تم حذف أرشيف يوم ${dateStr} بنجاح`);
      }
    );
  });
  
  document.getElementById("backToHarvestBtn")?.addEventListener("click", () => navigateTo(PAGES.HARVEST));
}

/* ====== تهيئة الصفحة ====== */
function initializePage() {
  setTimeout(() => document.body.classList.add("loaded"), 100);
  
  applyDarkModeFromStorage();
  populateUserData();
  
  const toggleDarkBtn = document.getElementById(SELECTORS.TOGGLE_DARK);
  if (toggleDarkBtn) {
    toggleDarkBtn.addEventListener("click", toggleDarkMode);
  }
  
  const todayEl = document.getElementById(SELECTORS.CURRENT_DATE);
  if (todayEl) {
    try {
      todayEl.textContent = new Date().toLocaleDateString("EN-EG");
    } catch {
      todayEl.textContent = new Date().toLocaleDateString();
    }
  }
  
  setupAutoSave();
  setupNavigationArrows();
  enhanceTableExperience();
  setupSummaryNumberFormatting();
  
  setupIndexPageEvents();
  setupHarvestPageEvents();
  setupArchivePageEvents();
}

document.addEventListener("DOMContentLoaded", initializePage);