/* ========== Helpers ========== */
function parseNumber(x) {
  if (x === null || x === undefined) return 0;
  const s = String(x).replace(/,/g, "").trim();
  if (s === "") return 0;
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}
function formatNumber(n) {
  const num = parseNumber(n);
  return num.toLocaleString("en-US", { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  });
}
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
/* ========== Custom Modal & Toast ========== */
function showToast(message, duration = 2000) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = message;
  document.body.appendChild(t);
  // Force reflow to enable transition
  void t.offsetWidth;
  t.classList.add('show');
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, duration);
}
function showModal(title, message, onConfirm, onCancel) {
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
/* ========== Dark Mode ========== */
function applyDarkModeFromStorage() {
  const isDarkMode = localStorage.getItem("darkMode") === "on";
  document.body.classList.toggle("dark", isDarkMode);
}
/* ========== Clipboard ========== */
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
/* ========== Clear Functions ========== */
function clearIndexFields() {
  const dataInput = document.getElementById("dataInput");
  if (dataInput) {
    try {
      dataInput.value = "";
      localStorage.removeItem("clientData");
      showToast("تم تفريغ الحقول بنجاح");
    } catch (error) {
      console.error("خطأ في مسح الحقول:", error);
      showToast("حدث خطأ أثناء مسح الحقول");
    }
  }
}
// ======== تعديل رئيسي: دالة مسح حقول التحصيل ========
function clearHarvestFields() {
  showModal(
    "تحذير", 
    "سيتم تفريغ جميع حقول التحصيلات! البيانات غير المحفوظة ستفقد.\n\nهل أنت متأكد أنك تريد المتابعة؟",
    () => {
      const mlEl = document.getElementById("masterLimit");
      const mlVal = mlEl ? mlEl.value : (localStorage.getItem("masterLimit") || "");
      
      const tbody = document.querySelector("#harvestTable tbody");
      if (tbody) {
        tbody.innerHTML = "";
        addEmptyRow();
      }
      
      // تعديل هام: مسح كل البيانات المؤقتة
      localStorage.removeItem("rowData");
      localStorage.removeItem("harvestData");
      localStorage.removeItem("clientData"); // مسح بيانات الإدخال القديمة
      
      if (mlVal !== "") localStorage.setItem("masterLimit", mlVal);
      if (mlEl) mlEl.value = mlVal;
      
      updateTotals();
      showToast("تم تفريغ الحقول بنجاح");
    }
  );
}
/* ========== دالة جديدة للتحقق من وجود بيانات في صفحة التحصيل ========== */
function hasHarvestData() {
  const tbody = document.querySelector("#harvestTable tbody");
  if (!tbody) return false;
  
  const rows = Array.from(tbody.querySelectorAll("tr"));
  
  // التحقق من وجود أكثر من صف واحد (الصف الفارغ)
  if (rows.length <= 1) return false;
  
  // التحقق من وجود بيانات في أي صف
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
/* ========== دالة جديدة لمسح بيانات صفحة التحصيل مع الحفاظ على ليميت الماستر ========== */
function clearHarvestTable() {
  const mlEl = document.getElementById("masterLimit");
  const mlVal = mlEl ? mlEl.value : (localStorage.getItem("masterLimit") || "");
  
  const tbody = document.querySelector("#harvestTable tbody");
  if (tbody) {
    tbody.innerHTML = "";
    addEmptyRow();
    updateTotals();
  }
  
  localStorage.removeItem("rowData");
  
  if (mlVal !== "") localStorage.setItem("masterLimit", mlVal);
  if (mlEl) mlEl.value = mlVal;
}
/* ========== Navigation ========== */
// ======== تعديل رئيسي: دالة التنقل بين الصفحات ========
function navigateTo(page) {
  if (page === "harvest") {
    const dataInput = document.getElementById("dataInput");
    if (dataInput) {
      const data = dataInput.value.trim();
      
      // تعديل هام: دائماً احفظ البيانات الجديدة في harvestData
      if (data) {
        try {
          localStorage.setItem("harvestData", data);
          localStorage.removeItem("clientData"); // مسح البيانات القديمة
        } catch (error) {
          console.error("خطأ في حفظ البيانات:", error);
          showToast("حدث خطأ أثناء حفظ البيانات");
        }
      }
    }
    window.location.href = `${page}.html`;
  } else if (page === "archive") {
    const tbody = document.querySelector("#harvestTable tbody");
    if (tbody) {
      try {
        localStorage.setItem("rowData", tbodyToStorage());
      } catch (e) {
        console.error("Failed to save row data", e);
      }
    }
    window.location.href = `${page}.html`;
  } else if (page === "index") {
    const tbody = document.querySelector("#harvestTable tbody");
    if (tbody) {
      try {
        localStorage.setItem("rowData", tbodyToStorage());
      } catch (e) {
        console.error("Failed to save row data", e);
      }
    }
    window.location.href = `${page}.html`;
  }
}
/* ========== Navigation Arrows ========== */
function setupNavigationArrows() {
  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");
  
  const pages = ["index", "harvest", "archive"];
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
/* ========== Storage Functions ========== */
function tbodyToStorage() {
  const tbody = document.querySelector("#harvestTable tbody");
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
// ======== تعديل رئيسي: دالة تحميل البيانات من التخزين ========
function loadRowsFromStorage() {
  // أولاً: تحقق من البيانات الجديدة (harvestData)
  const harvestData = localStorage.getItem("harvestData");
  if (harvestData) {
    const tbody = document.querySelector("#harvestTable tbody");
    if (tbody) {
      // التحقق من وجود بيانات في الجدول قبل التحميل
      if (hasHarvestData()) {
        showModal(
          "تنبيه", 
          "صفحة التحصيل تحتوي على بيانات. سيتم تفريغها قبل استخراج البيانات الجديدة.",
          () => {
            clearHarvestTable();
            loadHarvestDataFromStorage(harvestData, tbody);
            // مسح البيانات المؤقتة بعد التحميل
            localStorage.removeItem("harvestData");
          }
        );
        return true;
      } else {
        const result = loadHarvestDataFromStorage(harvestData, tbody);
        // مسح البيانات المؤقتة بعد التحميل
        localStorage.removeItem("harvestData");
        return result;
      }
    }
  }
  
  // ثانياً: إذا لم توجد بيانات جديدة، جرب البيانات المحفوظة (rowData)
  const saved = localStorage.getItem("rowData");
  if (saved) {
    const tbody = document.querySelector("#harvestTable tbody");
    if (!tbody) return false;
    
    tbody.innerHTML = "";
    saved.split("\n").forEach((line, i) => {
      if (!line) return;
      const parts = line.split("\t");
      const shop = parts[0] || "";
      const code = parts[1] || "";
      const amount = parts[2] || "0";
      const extra = parts[3] || "";
      const collector = parts[4] || "";
      const net = parts[5] || "";
      const status = parts[6] || "";
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="serial">${i + 1}</td>
        <td class="shop non-editable">${shop}</td>
        <td class="code non-editable">${code}</td>
        <td class="amount" data-amount="${amount}">${formatNumber(amount)}</td>
        <td><input type="text" class="extra" value="${formatNumber(extra)}"/></td>
        <td class="highlight"><input type="text" class="collector" value="${formatNumber(collector)}"/></td>
        <td class="numeric result">${net}</td>
        <td class="status">${status}</td>
      `;
      tbody.appendChild(tr);
    });
    
    const rows = Array.from(tbody.querySelectorAll("tr"));
    rows.forEach((r) => attachRowListeners(r));
    // لا تضف صفاً فارغاً تلقائياً؛ سيُضاف فقط عند الكتابة في آخر صف
    updateTotals();
    return true;
  }
  
  // أخيراً: إذا لم يوجد شيء، جرب البيانات الأصلية (clientData)
  const raw = localStorage.getItem("clientData");
  if (raw) {
    const tbody = document.querySelector("#harvestTable tbody");
    if (tbody) {
      tbody.innerHTML = "";
      const rows = raw.split("\n");
      
      rows.forEach((row, index) => {
        if (!row.trim()) return;
        
        if (row.includes("المسلسل") && row.includes("إجمالي البيع-التحويل-الرصيد")) return;
        
        const parts = row.split("\t");
        if (parts.length < 4) return;
        
        const serial = parts[0].trim();
        const center = parts[1].trim();
        
        // استخراج اسم المحل والكود بشكل أفضل
        let shopName = "";
        let code = "";
        
        // التحقق إذا كان التنسيق هو "اسم المحل: كود"
        const match = center.match(/(.+?):\s*(\d+)/);
        if (match) {
          shopName = match[1].trim();
          code = match[2].trim();
        } else {
          // إذا لم يكن التنسيق متوقعًا، حاول فصل اسم المحل والكود بطريقة أخرى
          shopName = center;
          code = parts[2] ? parts[2].trim() : "";
        }
        
        const transferAmount = parseNumber(parts[3]);
        if (transferAmount === 0) return;
        
        const tr = document.createElement("tr");
        tr.classList.add('non-editable-row'); // إضافة فئة للتمييز
        tr.innerHTML = `
          <td class="serial">${index + 1}</td>
          <td class="shop non-editable">${shopName}</td>
          <td class="code non-editable">${code}</td>
          <td class="amount" data-amount="${transferAmount}">${formatNumber(transferAmount)}</td>
          <td><input type="text" class="extra" /></td>
          <td class="highlight"><input type="text" class="collector" /></td>
          <td class="numeric result"></td>
          <td class="status">🔔</td>
        `;
        tbody.appendChild(tr);
      });
      
      const allRows = Array.from(tbody.querySelectorAll("tr"));
      allRows.forEach((r) => attachRowListeners(r));
      
      addEmptyRow();
      
      try { 
        localStorage.setItem("rowData", tbodyToStorage()); 
      } catch (e) {}
      
      updateTotals();
      return true;
    }
  }
  
  return false;
}
/* ========== دالة جديدة لتحميل بيانات الحصاد من التخزين ========== */
function loadHarvestDataFromStorage(harvestData, tbody) {
  tbody.innerHTML = "";
  const rows = harvestData.split("\n");
  
  rows.forEach((row, index) => {
    if (!row.trim()) return;
    
    if (row.includes("المسلسل") && row.includes("إجمالي البيع-التحويل-الرصيد")) return;
    
    const parts = row.split("\t");
    if (parts.length < 4) return;
    
    const serial = parts[0].trim();
    const center = parts[1].trim();
    
    // استخراج اسم المحل والكود بشكل أفضل
    let shopName = "";
    let code = "";
    
    // التحقق إذا كان التنسيق هو "اسم المحل: كود"
    const match = center.match(/(.+?):\s*(\d+)/);
    if (match) {
      shopName = match[1].trim();
      code = match[2].trim();
    } else {
      // إذا لم يكن التنسيق متوقعًا، حاول فصل اسم المحل والكود بطريقة أخرى
      shopName = center;
      code = parts[2] ? parts[2].trim() : "";
    }
    
    const transferAmount = parseNumber(parts[3]);
    if (transferAmount === 0) return;
    
    const tr = document.createElement("tr");
    tr.classList.add('non-editable-row'); // إضافة فئة للتمييز
    tr.innerHTML = `
      <td class="serial">${index + 1}</td>
      <td class="shop non-editable">${shopName}</td>
      <td class="code non-editable">${code}</td>
      <td class="amount" data-amount="${transferAmount}">${formatNumber(transferAmount)}</td>
      <td><input type="text" class="extra" /></td>
      <td class="highlight"><input type="text" class="collector" /></td>
      <td class="numeric result"></td>
      <td class="status">🔔</td>
    `;
    tbody.appendChild(tr);
  });
  
  const allRows = Array.from(tbody.querySelectorAll("tr"));
  allRows.forEach((r) => attachRowListeners(r));
  
  // لا تضف صفاً فارغاً تلقائياً؛ سيُضاف فقط عند الكتابة في آخر صف
  
  try { 
    localStorage.setItem("rowData", tbodyToStorage()); 
  } catch (e) {}
  
  updateTotals();
  
  // مسح البيانات المؤقتة بعد الاستخدام
  localStorage.removeItem("harvestData");
  
  return true;
}
/* ========== Number Input Formatting ========== */
function formatNumberInput(input) {
  // حفظ موضع المؤشر الحالي
  const cursorPosition = input.selectionStart;
  
  // إزالة أي فواصل أو أحرف غير رقمية
  let value = input.value.replace(/[^\d]/g, '');
  
  // إذا كانت القيمة فارغة، نخرج
  if (value === '') {
    input.value = '';
    return;
  }
  
  // تنسيق الرقم مع الفواصل
  const formatted = formatNumber(value);
  
  // تحديث قيمة الحقل
  input.value = formatted;
  
  // استعادة موضع المؤشر مع تعديله بناءً على الفواصل المضافة
  const commaCount = (formatted.match(/,/g) || []).length;
  const originalCommaCount = (input.value.substring(0, cursorPosition).match(/,/g) || []).length;
  const newCursorPosition = cursorPosition + (commaCount - originalCommaCount);
  
  // تعيين موضع المؤشر الجديد
  input.setSelectionRange(newCursorPosition, newCursorPosition);
}
function setupNumberInputFormatting(input) {
  // تغيير نوع الحقل إلى نص للسماح بالفواصل
  input.type = 'text';
  
  // تنسيق القيمة الأولية
  formatNumberInput(input);
  
  // إضافة مستمعي الأحداث
  input.addEventListener('input', function() {
    formatNumberInput(this);
  });
  
  input.addEventListener('blur', function() {
    formatNumberInput(this);
  });
}

// دعم الأرقام السالبة لحقل "تحويل إضافي" فقط
function setupSignedNumberInputFormatting(input) {
  input.type = 'text';
  
  function formatSignedInput(el) {
    const raw = el.value || '';
    const isNegative = raw.trim().startsWith('-');
    let digits = raw.replace(/[^\d]/g, '');
    if (digits === '') {
      // اترك "-" لوحدها للسماح للمستخدم بكتابة الرقم بعده، أو فرّغ إن لم يكن سالباً
      el.value = isNegative ? '-' : '';
      return;
    }
    const formattedDigits = formatNumber(digits);
    el.value = (isNegative ? '-' : '') + formattedDigits;
    // اجعل المؤشر في نهاية الحقل لتفادي تعقيد حساب موضع المؤشر مع الفواصل والإشارة
    const pos = el.value.length;
    try { el.setSelectionRange(pos, pos); } catch (e) {}
  }

  // تنسيق أولي
  formatSignedInput(input);
  // أحداث الإدخال والblur
  input.addEventListener('input', function() { formatSignedInput(this); });
  input.addEventListener('blur', function() { formatSignedInput(this); });
}
/* ========== Table Functions ========== */
function attachRowListeners(row) {
  if (!row || row.dataset.attached === "1") return;
  row.dataset.attached = "1";
  
  const extra = row.querySelector(".extra");
  const collector = row.querySelector(".collector");
  const resultCell = row.querySelector(".result");
  const statusCell = row.querySelector(".status");
  const amountCell = row.querySelector(".amount");
  
  // إعداد تنسيق الأرقام لحقول المحصل وتحويل إضافي
  if (collector) {
    setupNumberInputFormatting(collector); // موجب فقط
  }
  
  if (extra) {
    setupSignedNumberInputFormatting(extra); // يسمح بالسالب
  }
  
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
      localStorage.setItem("rowData", tbodyToStorage()); 
    } catch (e) { 
      console.error("Failed to save row data", e);
    }
  }
  
  if (extra) extra.addEventListener("input", () => { 
    updateRow(); 
    ensureAddRowIfLast(row); 
  });
  
  if (collector) collector.addEventListener("input", () => { 
    updateRow(); 
    ensureAddRowIfLast(row); 
  });
  
  // إضافة مستمعي الأحداث فقط للصفوف القابلة للتعديل
  if (row.classList.contains('editable-row')) {
    const shopCell = row.querySelector(".shop");
    const codeCell = row.querySelector(".code");
    
    if (shopCell) {
      shopCell.addEventListener("input", () => { 
        try { 
          localStorage.setItem("rowData", tbodyToStorage()); 
        } catch (e) {} 
        ensureAddRowIfLast(row); 
      });
      
      shopCell.addEventListener("blur", () => { 
        try { 
          localStorage.setItem("rowData", tbodyToStorage()); 
        } catch (e) {} 
      });
    }
    
    if (codeCell) {
      codeCell.addEventListener("input", () => { 
        try { 
          localStorage.setItem("rowData", tbodyToStorage()); 
        } catch (e) {} 
        ensureAddRowIfLast(row); 
      });
      
      codeCell.addEventListener("blur", () => { 
        try { 
          localStorage.setItem("rowData", tbodyToStorage()); 
        } catch (e) {} 
      });
    }
  }
}
function addEmptyRow() {
  const tbody = document.querySelector("#harvestTable tbody");
  if (!tbody) return;
  
  const totalRow = document.getElementById("totalRow");
  const count = tbody.querySelectorAll("tr").length - (totalRow ? 1 : 0);
  
  const tr = document.createElement("tr");
  tr.classList.add('editable-row'); // إضافة فئة للتمييز
  tr.innerHTML = `
    <td class="serial">${count + 1}</td>
    <td contenteditable="true" class="shop editable"></td>
    <td contenteditable="true" class="code editable"></td>
    <td class="amount" data-amount="0">0</td>
    <td><input type="text" class="extra" value=""/></td>
    <td class="highlight"><input type="text" class="collector" value=""/></td>
    <td class="numeric result"></td>
    <td class="status">🔔</td>
  `;
  
  if (totalRow) tbody.insertBefore(tr, totalRow);
  else tbody.appendChild(tr);
  
  attachRowListeners(tr);
}
function ensureAddRowIfLast(row) {
  const tbody = row.parentElement;
  if (!tbody) return;
  
  const totalRow = document.getElementById("totalRow");
  const lastRow = totalRow ? totalRow.previousElementSibling : tbody.lastElementChild;
  
  const hasData = lastRow.querySelector(".shop")?.innerText.trim() || 
                 lastRow.querySelector(".code")?.innerText.trim() ||
                 lastRow.querySelector(".extra")?.value ||
                 lastRow.querySelector(".collector")?.value;
  
  if (row === lastRow && hasData) {
    addEmptyRow();
  }
}
const debouncedUpdateTotals = debounce(() => {
  const tbody = document.querySelector("#harvestTable tbody");
  if (!tbody) return;
  
  const oldTotal = document.getElementById("totalRow");
  if (oldTotal) oldTotal.remove();
  
  let totalAmount = 0, totalExtra = 0, totalCollector = 0, totalNet = 0;
  const rows = Array.from(tbody.querySelectorAll("tr"));
  
  // تحديث أرقام المسلسل لتبدأ من 1
  rows.forEach((row, index) => {
    if (row.id !== "totalRow") {
      const serialCell = row.querySelector(".serial");
      if (serialCell) {
        serialCell.textContent = index + 1;
      }
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
  
  const masterLimit = parseNumber(document.getElementById("masterLimit")?.value);
  const currentBalance = parseNumber(document.getElementById("currentBalance")?.value);
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
/* ========== Archive Functions ========== */
function loadArchive(dateStr) {
  const archiveTable = document.querySelector("#archiveTable tbody");
  const searchInput = document.getElementById("archiveSearch");
  
  if (!archiveTable) return;
  
  archiveTable.innerHTML = "";
  if (!dateStr) return;
  
  const archive = JSON.parse(localStorage.getItem("archiveData") || "{}");
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
function searchArchive(query) {
  const archiveTable = document.querySelector("#archiveTable tbody");
  
  if (!archiveTable) return;
  
  archiveTable.innerHTML = "";
  if (!query) return;
  
  const archive = JSON.parse(localStorage.getItem("archiveData") || "{}");
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
/* ========== Auto-save Setup ========== */
function setupAutoSave() {
  const dataInput = document.getElementById("dataInput");
  if (dataInput) {
    dataInput.addEventListener("input", debounce(() => {
      localStorage.setItem("clientData", dataInput.value.trim());
    }, 1000));
  }
  
  const harvestTable = document.getElementById("harvestTable");
  if (harvestTable) {
    harvestTable.addEventListener("input", debounce(() => {
      try {
        localStorage.setItem("rowData", tbodyToStorage());
      } catch (e) {
        console.error("Auto-save failed", e);
      }
    }, 1000));
  }
  
  const masterLimit = document.getElementById("masterLimit");
  if (masterLimit) {
    masterLimit.addEventListener("input", debounce(() => {
      localStorage.setItem("masterLimit", masterLimit.value);
    }, 500));
  }
}
/* ========== Summary Number Formatting ========== */
function setupSummaryNumberFormatting() {
  const masterLimit = document.getElementById("masterLimit");
  const currentBalance = document.getElementById("currentBalance");
  
  if (masterLimit) {
    setupNumberInputFormatting(masterLimit);
  }
  
  if (currentBalance) {
    setupNumberInputFormatting(currentBalance);
  }
}
/* ========== Enhance User Experience ========== */
function enhanceTableExperience() {
  const tables = document.querySelectorAll("table");
  tables.forEach(table => {
    const rows = table.querySelectorAll("tbody tr");
    rows.forEach(row => {
      row.addEventListener("mouseenter", () => {
        row.style.backgroundColor = document.body.classList.contains("dark") 
          ? "#333" 
          : "#f5f5f5";
      });
      row.addEventListener("mouseleave", () => {
        row.style.backgroundColor = "";
      });
    });
  });
}
/* ========== DOM Ready ========== */
document.addEventListener("DOMContentLoaded", async () => {
  // التحقق من صلاحية الوصول للصفحة
  if (window.auth && typeof window.auth.checkPageAccess === 'function') {
    const hasAccess = await window.auth.checkPageAccess();
    if (!hasAccess) {
      // التحقق من الوصول فشل، تم توجيه المستخدم بالفعل
      return;
    }
  }

  // إضافة انتقال سلس للصفحة
  setTimeout(() => {
    document.body.classList.add("loaded");
  }, 100);

  applyDarkModeFromStorage();
  
  const toggleDarkBtn = document.getElementById("toggleDark");
  if (toggleDarkBtn) {
    toggleDarkBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      localStorage.setItem("darkMode", document.body.classList.contains("dark") ? "on" : "off");
    });
  }
  
  const todayEl = document.getElementById("currentDate");
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
  
  // Index page elements
  const dataInput = document.getElementById("dataInput");
  if (dataInput) {
    document.getElementById("pasteBtn")?.addEventListener("click", () => pasteInto(dataInput));
    
    document.getElementById("saveGoBtn")?.addEventListener("click", () => {
      const data = dataInput.value.trim();
      if (!data) {
        showModal("تنبيه", "من فضلك أدخل البيانات أولاً!");
        return;
      }
      if (!data.startsWith("المسلسل")) {
        showModal("تأكيد", "البيانات لا تبدأ بكلمة 'المسلسل'. هل تريد المتابعة وحفظ البيانات?", () => {
          localStorage.setItem("clientData", data);
          navigateTo("harvest");
        });
        return;
      }
      localStorage.setItem("clientData", data);
      navigateTo("harvest");
    });
    
    document.getElementById("goToArchiveBtn")?.addEventListener("click", () => {
      navigateTo("archive");
    });
    
    // إصلاح زر مسح البيانات
    document.getElementById("clearBtn")?.addEventListener("click", clearIndexFields);
    
    const savedClient = localStorage.getItem("clientData");
    if (savedClient) dataInput.value = savedClient;
  }
  
  // Harvest page elements
  const harvestTable = document.getElementById("harvestTable");
  if (harvestTable) {
    const savedML = localStorage.getItem("masterLimit");
    if (savedML && document.getElementById("masterLimit")) {
      document.getElementById("masterLimit").value = savedML;
    }
    
    const loadedFromRowData = loadRowsFromStorage();
    
    if (!loadedFromRowData) {
      const raw = localStorage.getItem("clientData");
      const tbody = harvestTable.querySelector("tbody");
      
      if (!tbody) return;
      tbody.innerHTML = "";
      
      if (!raw) {
        // إن لم توجد بيانات، أضف صفاً واحداً فقط كبداية
        addEmptyRow();
        updateTotals();
      } else {
        const rows = raw.split("\n");
        
        rows.forEach((row, index) => {
          if (!row.trim()) return;
          
          if (row.includes("المسلسل") && row.includes("إجمالي البيع-التحويل-الرصيد")) return;
          
          const parts = row.split("\t");
          if (parts.length < 4) return;
          
          const serial = parts[0].trim();
          const center = parts[1].trim();
          
          // استخراج اسم المحل والكود بشكل أفضل
          let shopName = "";
          let code = "";
          
          // التحقق إذا كان التنسيق هو "اسم المحل: كود"
          const match = center.match(/(.+?):\s*(\d+)/);
          if (match) {
            shopName = match[1].trim();
            code = match[2].trim();
          } else {
            // إذا لم يكن التنسيق متوقعًا، حاول فصل اسم المحل والكود بطريقة أخرى
            shopName = center;
            code = parts[2] ? parts[2].trim() : "";
          }
          
          const transferAmount = parseNumber(parts[3]);
          if (transferAmount === 0) return;
          
          const tr = document.createElement("tr");
          tr.classList.add('non-editable-row'); // إضافة فئة للتمييز
          tr.innerHTML = `
            <td class="serial">${index + 1}</td>
            <td class="shop non-editable">${shopName}</td>
            <td class="code non-editable">${code}</td>
            <td class="amount" data-amount="${transferAmount}">${formatNumber(transferAmount)}</td>
            <td><input type="text" class="extra" /></td>
            <td class="highlight"><input type="text" class="collector" /></td>
            <td class="numeric result"></td>
            <td class="status">🔔</td>
          `;
          tbody.appendChild(tr);
        });
        
        const allRows = Array.from(tbody.querySelectorAll("tr"));
        allRows.forEach((r) => attachRowListeners(r));
        
        // لا تضف صفاً فارغاً تلقائياً؛ سيُضاف فقط عند الكتابة في آخر صف
        
        try { 
          localStorage.setItem("rowData", tbodyToStorage()); 
        } catch (e) {}
        
        updateTotals();
      }
    }
    
    document.getElementById("clearHarvestBtn")?.addEventListener("click", clearHarvestFields);
    
    const archiveTodayBtn = document.getElementById("archiveTodayBtn");
    if (archiveTodayBtn) {
      archiveTodayBtn.addEventListener("click", () => {
        const tbody = harvestTable.querySelector("tbody");
        const rows = Array.from(tbody.querySelectorAll("tr"));
        
        if (rows.length <= 1) {
          showModal("تنبيه", "لا توجد بيانات لأرشفتها!");
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
        const archive = JSON.parse(localStorage.getItem("archiveData") || "{}");
        archive[today] = archiveData.join("\n");
        localStorage.setItem("archiveData", JSON.stringify(archive));
        
        showModal("نجاح", "✅ تم أرشفة بيانات اليوم بالكامل!");
      });
    }
    
    // Archive button in harvest page

    

    
    document.getElementById("masterLimit")?.addEventListener("input", (e) => {
      localStorage.setItem("masterLimit", e.target.value || "0");
      updateTotals();
    });
    
    document.getElementById("currentBalance")?.addEventListener("input", updateTotals);
  }
  
  // Archive page elements
  const archiveSelect = document.getElementById("archiveSelect");
  if (archiveSelect) {
    const archive = JSON.parse(localStorage.getItem("archiveData") || "{}");
    
    Object.keys(archive).sort().forEach(dateStr => {
      const opt = document.createElement("option");
      opt.value = dateStr; 
      opt.textContent = dateStr;
      archiveSelect.appendChild(opt);
    });
    
    archiveSelect.addEventListener("change", () => {
      const searchInput = document.getElementById("archiveSearch");
      if (searchInput) searchInput.value = "";
      loadArchive(archiveSelect.value);
    });
    
    const searchInput = document.getElementById("archiveSearch");
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
        showModal("تنبيه", "اختر تاريخًا أولاً!");
        return;
      }
      
      showModal(
        "تأكيد الحذف", 
        `هل أنت متأكد أنك عايز تحذف أرشيف يوم ${dateStr}؟`,
        () => {
          delete archive[dateStr];
          localStorage.setItem("archiveData", JSON.stringify(archive));
          archiveSelect.querySelector(`option[value="${dateStr}"]`)?.remove();
          archiveSelect.value = "";
          document.querySelector("#archiveTable tbody").innerHTML = "";
        }
      );
    });
    

  }
});