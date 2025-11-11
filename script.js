// Global error handlers
window.onerror = function(message, source, lineno, colno, error) {
  console.error("An unhandled error occurred:", {
    message: message,
    source: source,
    lineno: lineno,
    colno: colno,
    error: error
  });
  // Here you could send the error to a logging service
};

window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled promise rejection:', {
    reason: event.reason
  });
  // Here you could send the error to a logging service
});

/* ========== Service Worker Auto-Update ========== */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(registration => {
    // Check for updates every 60 seconds
    setInterval(() => {
      registration.update();
    }, 60000);

    // Listen for new service worker
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available, skip waiting and reload
          newWorker.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      });
    });
  });

  // Reload page when new service worker takes control
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

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
  /* ========== Custom Modal ========== */
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
  /* ========== Alert System ========== */
  function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type} show`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'danger') icon = 'fa-exclamation-circle';

    alert.innerHTML = `<i class="fas ${icon}"></i> ${message}`;

    alertContainer.appendChild(alert);

    setTimeout(() => {
      alert.classList.remove('show');
      setTimeout(() => alert.remove(), 500);
    }, 5000);
  }
  /* ========== Dark Mode ========== */
  function applyDarkModeFromStorage() {
    const isDarkMode = localStorage.getItem("darkMode") === "on";
    document.body.classList.toggle("dark", isDarkMode);
  }
  /* ========== Zoom/Font Size Control ========== */
  function migrateOldZoomLevel(oldLevel) {
    // تحويل المستويات القديمة إلى الجديدة
    const migration = {
      "small": "md",
      "normal": "normal",
      "large": "lg",
      "xlarge": "xl",
      "xxlarge": "2xl",
      "ultra": "3xl",
      "mega": "3xl"
    };
    return migration[oldLevel] || oldLevel;
  }

  function applyZoomFromStorage() {
    let zoomLevel = localStorage.getItem("zoomLevel") || "normal";
    
    // تحويل المستويات القديمة
    const newLevel = migrateOldZoomLevel(zoomLevel);
    if (newLevel !== zoomLevel) {
      localStorage.setItem("zoomLevel", newLevel);
      zoomLevel = newLevel;
    }
    
    document.body.classList.remove("zoom-xs", "zoom-sm", "zoom-md", "zoom-base", "zoom-normal", "zoom-lg", "zoom-xl", "zoom-2xl", "zoom-3xl");
    document.body.classList.add(`zoom-${zoomLevel}`);
    updateZoomButtons(zoomLevel);
  }
  
  function updateZoomButtons(level) {
    const zoomInBtn = document.getElementById("zoom-in-btn");
    const zoomOutBtn = document.getElementById("zoom-out-btn");
    
    if (zoomInBtn) {
      zoomInBtn.disabled = (level === "3xl");
      zoomInBtn.style.opacity = (level === "3xl") ? "0.5" : "1";
    }
    
    if (zoomOutBtn) {
      zoomOutBtn.disabled = (level === "xs");
      zoomOutBtn.style.opacity = (level === "xs") ? "0.5" : "1";
    }
  }
  
  function zoomIn() {
    const currentZoom = localStorage.getItem("zoomLevel") || "normal";
    const zoomUp = { 
      xs: "sm",
      sm: "md",
      md: "base",
      base: "normal",
      normal: "lg", 
      lg: "xl",
      xl: "2xl",
      "2xl": "3xl",
      "3xl": "3xl"
    };
    const nextZoom = zoomUp[currentZoom];
    
    if (nextZoom !== currentZoom) {
      localStorage.setItem("zoomLevel", nextZoom);
      applyZoomFromStorage();
      
      const messages = {
        xs: "صغير جداً -4 📱",
        sm: "صغير جداً -3 📱",
        md: "صغير -2 📱",
        base: "صغير -1 📱",
        normal: "عادي (افتراضي) 📄",
        lg: "كبير +1 📺",
        xl: "كبير +2 🖥️",
        "2xl": "كبير +3 🎯",
        "3xl": "كبير +4 🌟"
      };
      
      showAlert(messages[nextZoom] || `حجم ${nextZoom}`, "success");
    }
  }
  
  function zoomOut() {
    const currentZoom = localStorage.getItem("zoomLevel") || "normal";
    const zoomDown = { 
      "3xl": "2xl",
      "2xl": "xl",
      xl: "lg",
      lg: "normal",
      normal: "base", 
      base: "md",
      md: "sm",
      sm: "xs",
      xs: "xs"
    };
    const nextZoom = zoomDown[currentZoom];
    
    if (nextZoom !== currentZoom) {
      localStorage.setItem("zoomLevel", nextZoom);
      applyZoomFromStorage();
      
      const messages = {
        xs: "صغير جداً -4 📱",
        sm: "صغير جداً -3 📱",
        md: "صغير -2 📱",
        base: "صغير -1 📱",
        normal: "عادي (افتراضي) 📄",
        lg: "كبير +1 📺",
        xl: "كبير +2 🖥️",
        "2xl": "كبير +3 🎯",
        "3xl": "كبير +4 🌟"
      };
      
      showAlert(messages[nextZoom] || `حجم ${nextZoom}`, "info");
    }
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
  /* ========== Minus Toggle Helper ========== */
  function injectMinusToggle(input) {
    if (!input || input.dataset.minusBtn === '1') return;
    input.dataset.minusBtn = '1';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '−';
    btn.title = 'سالب';
    btn.style.marginInlineStart = '6px';
    btn.style.padding = '4px 8px';
    btn.style.border = '1px solid #ddd';
    btn.style.borderRadius = '6px';
    btn.style.background = '#f7f7f7';
    btn.style.cursor = 'pointer';
    btn.style.lineHeight = '1';
    btn.style.fontWeight = '700';
    btn.addEventListener('click', () => {
      const v = input.value || '';
      const hasMinus = v.startsWith('-');
      const raw = v.replace(/[^\d]/g, '');
      input.value = (hasMinus ? '' : '-') + (raw ? raw.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
      try { input.setSelectionRange(input.value.length, input.value.length); } catch(e) {}
    });
    if (input.parentElement) input.parentElement.appendChild(btn);
  }
  /* ========== Clear Functions ========== */
  function clearIndexFields() {
    const dataInput = document.getElementById("dataInput");
    if (dataInput) {
      dataInput.value = "";
      // مسح البيانات من localStorage لمنع ظهورها عند إعادة التحميل
      localStorage.removeItem("clientData");
      localStorage.removeItem("harvestData");
      // إضافة علامة للدلالة على أن البيانات تم مسحها يدوياً
      sessionStorage.setItem("dataCleared", "true");
      showAlert("تم تفريغ حقل إدخال البيانات!", "success");
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
        showAlert("تم تفريغ حقول التحصيلات بنجاح!", "success");
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
          localStorage.setItem("harvestData", data);
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
    } else if (page === "dashboard") {
      const tbody = document.querySelector("#harvestTable tbody");
      if (tbody) {
        try {
          localStorage.setItem("rowData", tbodyToStorage());
        } catch (e) {
          console.error("Failed to save row data", e);
        }
      }
      window.location.href = `${page}.html`;
    } else {
      window.location.href = `${page}.html`;
    }
  }
  /* ========== Navigation Arrows ========== */
  function setupNavigationArrows() {
    // إزالة وظائف أزرار التنقل السفلي
    const prevBtn = document.getElementById("prevPage");
    const nextBtn = document.getElementById("nextPage");

    if (prevBtn) {
      prevBtn.remove();
    }
    if (nextBtn) {
      nextBtn.remove();
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

        // حفظ نوع الصف (editable أو non-editable)
        const rowType = r.classList.contains('editable-row') ? 'E' : 'N';

        return [rowType, shop, code, amount, extra, collector].join("\t");
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

        // التحقق من تنسيق البيانات الجديد (مع نوع الصف)
        let rowType, shop, code, amount, extra, collector;

        if (parts.length >= 6 && (parts[0] === 'E' || parts[0] === 'N')) {
          // البيانات الجديدة مع نوع الصف (بدون عمود الصافي)
          rowType = parts[0];
          shop = parts[1] || "";
          code = parts[2] || "";
          amount = parts[3] || "0";
          extra = parts[4] || "";
          collector = parts[5] || "";
        } else {
          // البيانات القديمة بدون نوع الصف (للتوافق الخلفي)
          rowType = 'N'; // افتراضياً non-editable
          shop = parts[0] || "";
          code = parts[1] || "";
          amount = parts[2] || "0";
          extra = parts[3] || "";
          collector = parts[4] || "";
        }

        const tr = document.createElement("tr");

        // تطبيق نوع الصف الصحيح
        if (rowType === 'E') {
          tr.classList.add('editable-row');
          tr.innerHTML = `
            <td class="serial">${i + 1}</td>
            <td contenteditable="true" class="shop editable">${shop}</td>
            <td contenteditable="true" class="code editable">${code}</td>
            <td class="amount" data-amount="${amount}">${formatNumber(amount)}</td>
            <td><input type="text" class="extra" value="${extra === '' ? '' : formatNumber(extra)}"/></td>
            <td class="highlight"><input type="text" class="collector" value="${collector === '' ? '' : formatNumber(collector)}"/></td>
            <td class="net numeric ${parseNumber(collector) - (parseNumber(extra) + parseNumber(amount)) > 0 ? 'positive' : (parseNumber(collector) - (parseNumber(extra) + parseNumber(amount)) < 0 ? 'negative' : 'zero')}">${formatNumber(parseNumber(collector) - (parseNumber(extra) + parseNumber(amount)))}<i class="fas ${parseNumber(collector) - (parseNumber(extra) + parseNumber(amount)) > 0 ? 'fa-arrow-up' : (parseNumber(collector) - (parseNumber(extra) + parseNumber(amount)) < 0 ? 'fa-arrow-down' : 'fa-check')}" style="margin-right: 4px; font-size: 0.8em;"></i></td>
          `;
        } else {
          tr.classList.add('non-editable-row');
          tr.innerHTML = `
            <td class="serial">${i + 1}</td>
            <td class="shop">${shop}</td>
            <td class="code">${code}</td>
            <td class="amount" data-amount="${amount}">${formatNumber(amount)}</td>
            <td><input type="text" class="extra" value="${extra === '' ? '' : formatNumber(extra)}"/></td>
            <td class="highlight"><input type="text" class="collector" value="${collector === '' ? '' : formatNumber(collector)}"/></td>
            <td class="net numeric ${parseNumber(collector) - (parseNumber(extra) + parseNumber(amount)) > 0 ? 'positive' : (parseNumber(collector) - (parseNumber(extra) + parseNumber(amount)) < 0 ? 'negative' : 'zero')}">${formatNumber(parseNumber(collector) - (parseNumber(extra) + parseNumber(amount)))}<i class="fas ${parseNumber(collector) - (parseNumber(extra) + parseNumber(amount)) > 0 ? 'fa-arrow-up' : (parseNumber(collector) - (parseNumber(extra) + parseNumber(amount)) < 0 ? 'fa-arrow-down' : 'fa-check')}" style="margin-right: 4px; font-size: 0.8em;"></i></td>
          `;
        }
        tbody.appendChild(tr);
      });

      const rows = Array.from(tbody.querySelectorAll("tr"));
      rows.forEach((r) => attachRowListeners(r));
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
          tr.classList.add('non-editable-row'); // البيانات الأصلية غير قابلة للتعديل
          tr.innerHTML = `
            <td class="serial">${index + 1}</td>
            <td class="shop">${shopName}</td>
            <td class="code">${code}</td>
            <td class="amount" data-amount="${transferAmount}">${formatNumber(transferAmount)}</td>
            <td><input type="text" class="extra" /></td>
            <td class="highlight"><input type="text" class="collector" /></td>
          `;
          tbody.appendChild(tr);
        });

        const allRows = Array.from(tbody.querySelectorAll("tr"));
        allRows.forEach((r) => attachRowListeners(r));

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
      tr.classList.add('non-editable-row'); // البيانات الجديدة غير قابلة للتعديل
      tr.innerHTML = `
        <td class="serial">${index + 1}</td>
        <td class="shop">${shopName}</td>
        <td class="code">${code}</td>
        <td class="amount" data-amount="${transferAmount}">${formatNumber(transferAmount)}</td>
        <td><input type="text" class="extra" /></td>
        <td class="highlight"><input type="text" class="collector" /></td>
        <td class="net numeric ${0 - (0 + transferAmount) > 0 ? 'positive' : (0 - (0 + transferAmount) < 0 ? 'negative' : 'zero')}">${formatNumber(0 - (0 + transferAmount))}<i class="fas ${0 - (0 + transferAmount) > 0 ? 'fa-arrow-up' : (0 - (0 + transferAmount) < 0 ? 'fa-arrow-down' : 'fa-check')}" style="margin-right: 4px; font-size: 0.8em;"></i></td>
      `;
      tbody.appendChild(tr);
    });

    const allRows = Array.from(tbody.querySelectorAll("tr"));
    allRows.forEach((r) => attachRowListeners(r));

    try {
      localStorage.setItem("rowData", tbodyToStorage());
    } catch (e) {}

    updateTotals();

    // مسح البيانات المؤقتة بعد الاستخدام
    localStorage.removeItem("harvestData");

    return true;
  }
  /* ========== Table Column Settings (Show/Hide) ========== */
  function applyColumnVisibility(table, settings, columns) {
    if (!table) return;
    columns.forEach(col => {
      const hidden = settings[col.key] === false;
      table.classList.toggle(`hide-col-${col.key}`, hidden);
    });
  }
  function loadColumnSettings(storageKey, columns) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return Object.fromEntries(columns.map(c => [c.key, true]));
      const parsed = JSON.parse(raw);
      const merged = {};
      columns.forEach(c => {
        merged[c.key] = typeof parsed[c.key] === 'boolean' ? parsed[c.key] : true;
      });
      return merged;
    } catch(_) {
      return Object.fromEntries(columns.map(c => [c.key, true]));
    }
  }
  function saveColumnSettings(storageKey, settings) {
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch(_) {}
  }
  function setupTableSettings(tableId, storageKey, columns) {
    const table = document.getElementById(tableId);
    if (!table) {
      console.log(`setupTableSettings: Table ${tableId} not found`);
      return;
    }

    console.log(`setupTableSettings: Setting up for ${tableId}`);

    // Create container above table if not exists
    let tableContainer = table.closest('.table-wrap');
    if (!tableContainer) {
      tableContainer = table.parentElement;
    }

    // Create settings button container
    let btnContainer = document.getElementById(`${tableId}-settings-container`);
    if (!btnContainer) {
      btnContainer = document.createElement('div');
      btnContainer.id = `${tableId}-settings-container`;
      btnContainer.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:12px;';
      tableContainer.insertBefore(btnContainer, table);
    }

    // Create settings button
    let btn = document.getElementById(`${tableId}-settings-btn`);
    if (!btn) {
      btn = document.createElement('button');
      btn.id = `${tableId}-settings-btn`;
      btn.className = 'table-settings-btn';
      btn.innerHTML = '<i class="fas fa-cog"></i><span> إعداد الأعمدة</span>';
      btnContainer.appendChild(btn);
    }

    // Modal
    let modal = document.getElementById(`${tableId}-settings-modal`);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = `${tableId}-settings-modal`;
      modal.className = 'table-settings-modal';
      modal.innerHTML = `
        <div class="table-settings-modal-content">
          <div class="modal-header">
            <h3><i class="fas fa-cog"></i> إعداد الأعمدة</h3>
            <div class="header-actions">
              <button class="btn-select-all" title="تحديد الكل">
                <i class="fas fa-check-double"></i>
                <span>تحديد الكل</span>
              </button>
              <button class="modal-close-btn" aria-label="إغلاق">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          <div class="cols-wrap"></div>
          <div class="modal-footer">
            <button class="btn-cancel">
              <i class="fas fa-times"></i>
              <span>إلغاء</span>
            </button>
            <button class="btn-save">
              <i class="fas fa-check"></i>
              <span>حفظ</span>
            </button>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }

    const wrap = () => modal.querySelector('.cols-wrap');
    const btnCancel = () => modal.querySelector('.btn-cancel');
    const btnSave = () => modal.querySelector('.btn-save');

    let settings = loadColumnSettings(storageKey, columns);
    applyColumnVisibility(table, settings, columns);

    function openModal() {
      const container = wrap();
      if (!container) return;
      container.innerHTML = '';
      columns.forEach(col => {
        const id = `${storageKey}-${col.key}`;
        const row = document.createElement('label');
        row.className = 'column-option';
        row.innerHTML = `
          <input type="checkbox" id="${id}" ${settings[col.key] !== false ? 'checked' : ''} />
          <span>${col.label}</span>
        `;
        container.appendChild(row);
      });
      modal.classList.add('show');
    }
    function closeModal() { 
      modal.classList.remove('show');
    }

    btn.addEventListener('click', openModal);
    btnCancel().addEventListener('click', closeModal);
    modal.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    
    // Select All button functionality
    const btnSelectAll = modal.querySelector('.btn-select-all');
    if (btnSelectAll) {
      btnSelectAll.addEventListener('click', () => {
        const container = wrap();
        if (!container) return;
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        // Toggle all checkboxes
        checkboxes.forEach(cb => {
          cb.checked = !allChecked;
        });
        
        // Update button text and icon
        if (allChecked) {
          btnSelectAll.innerHTML = '<i class="fas fa-check-double"></i><span>تحديد الكل</span>';
        } else {
          btnSelectAll.innerHTML = '<i class="fas fa-times-circle"></i><span>إلغاء الكل</span>';
        }
      });
    }
    btnSave().addEventListener('click', () => {
      const container = wrap();
      if (!container) return;
      const newSettings = { ...settings };
      columns.forEach(col => {
        const id = `${storageKey}-${col.key}`;
        const cb = container.querySelector(`#${id}`);
        newSettings[col.key] = cb ? cb.checked : true;
      });
      settings = newSettings;
      saveColumnSettings(storageKey, settings);
      applyColumnVisibility(table, settings, columns);
      closeModal();
    });
  }

  /* ========== Number Input Formatting ========== */
  function formatNumberInput(input) {
    // حفظ موضع المؤشر الحالي
    const cursorPosition = input.selectionStart;
    const originalValue = input.value;

    // 1. تذكر إذا كان سالبًا (لكن لن نسمح بالسالب في عمود المحصل)
    const isNegative = originalValue.startsWith('-');

    // 2. إزالة أي فواصل أو أحرف غير رقمية
    let value = originalValue.replace(/[^\d]/g, '');

    // إذا كانت القيمة فارغة، تعامل معها
    if (value === '') {
      input.value = '';
      return;
    }

    // تنسيق الرقم مع الفواصل
    const formatted = formatNumber(value);

    // 3. تحديث قيمة الحقل (بدون السالب لعمود المحصل)
    const finalValue = formatted;

    // لا تقم بتحديث إذا لم تتغير القيمة لتجنب مشاكل المؤشر
    if (input.value === finalValue) {
        return;
    }

    input.value = finalValue;

    // استعادة موضع المؤشر (محاولة مبسطة)
    const diff = finalValue.length - originalValue.length;
    // تأكد من أن موضع المؤشر الجديد صالح
    const newCursorPosition = Math.max(0, Math.min(finalValue.length, cursorPosition + diff));

    try {
      // وضع المؤشر في مكان آمن
      input.setSelectionRange(newCursorPosition, newCursorPosition);
    } catch(e) {
      // تجاهل الأخطاء ووضع المؤشر في النهاية
      try { input.setSelectionRange(finalValue.length, finalValue.length); } catch(e) {}
    }
  }
  function setupNumberInputFormatting(input) {
    input.type = 'text';
    input.setAttribute('inputmode', 'decimal');
    input.setAttribute('pattern', '^-?[0-9,]*$');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('dir', 'ltr');

    formatNumberInput(input);

    input.addEventListener('keydown', function(e) {
      const ctrl = e.ctrlKey || e.metaKey;
      const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Tab','Enter'];
      if (ctrl || allowed.includes(e.key)) return;
      // منع إدخال السالب في عمود المحصل
      if (e.key === '-') {
        e.preventDefault();
        return;
      }
      if (e.key >= '0' && e.key <= '9') return;
      if (e.key === ',') return;
      e.preventDefault();
    });

    input.addEventListener('input', function() {
      formatNumberInput(this);
    });

    input.addEventListener('blur', function() {
      formatNumberInput(this);
    });
  }
  /* ========== Table Functions ========== */
  function attachRowListeners(row) {
    if (!row || row.dataset.attached === "1") return;
    row.dataset.attached = "1";
    
    const extra = row.querySelector(".extra");
    const collector = row.querySelector(".collector");
    const resultCell = row.querySelector(".net");
    const amountCell = row.querySelector(".amount");
    
    // إعداد تنسيق الأرقام لحقول المحصل وتحويل إضافي
    if (collector) {
      setupNumberInputFormatting(collector);
    }
    
    if (extra) {
      setupNumberInputFormatting(extra);
      injectMinusToggle(extra);
    }
    
    const transferAmount = parseNumber(
      amountCell?.getAttribute("data-amount") ?? amountCell?.innerText
    );

    function updateRow() {
       if (!row) return;

       const extraVal = parseNumber(extra?.value || 0);
       const collectorVal = parseNumber(collector?.value || 0);
       const net = collectorVal - (extraVal + transferAmount);

       // تحديث خلية الصافي مع إضافة الكلاس المناسب حسب القيمة
       if (resultCell) {
         // إزالة الأيقونة القديمة إذا وجدت
         const existingIcon = resultCell.querySelector('i');
         if (existingIcon) {
           existingIcon.remove();
         }

         resultCell.textContent = formatNumber(net);

         // إزالة الكلاسات السابقة
         resultCell.classList.remove('positive', 'negative', 'zero');

         // إضافة الكلاس المناسب حسب القيمة وإضافة الأيقونة
         let iconClass = '';
         if (net > 0) {
           resultCell.classList.add('positive');
           iconClass = 'fa-arrow-up';
         } else if (net < 0) {
           resultCell.classList.add('negative');
           iconClass = 'fa-arrow-down';
         } else {
           resultCell.classList.add('zero');
           iconClass = 'fa-check';
         }

         // إضافة الأيقونة الجديدة
         const icon = document.createElement('i');
         icon.className = `fas ${iconClass}`;
         icon.style.marginRight = '4px';
         icon.style.fontSize = '0.8em';
         resultCell.appendChild(icon);
       }

       // تحديث صف الإجمالي فوراً
       updateTotalsImmediate();

       // حفظ البيانات فوراً بعد كل تحديث
       try {
         localStorage.setItem("rowData", tbodyToStorage());
       } catch (e) {
         console.error("Failed to save row data", e);
       }
     }
    
    if (extra) {
      extra.addEventListener("input", () => {
        updateRow();
        ensureAddRowIfLast(row);
      });
      // إضافة مستمع blur للحفظ النهائي
      extra.addEventListener("blur", () => {
        try {
          localStorage.setItem("rowData", tbodyToStorage());
        } catch (e) {
          console.error("Failed to save row data", e);
        }
      });
    }

    if (collector) {
      collector.addEventListener("input", () => {
        updateRow();
        ensureAddRowIfLast(row);
      });
      // إضافة مستمع blur للحفظ النهائي
      collector.addEventListener("blur", () => {
        try {
          localStorage.setItem("rowData", tbodyToStorage());
        } catch (e) {
          console.error("Failed to save row data", e);
        }
      });
    }
    
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
      <td class="net numeric zero">0<i class="fas fa-check" style="margin-right: 4px; font-size: 0.8em;"></i></td>
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
  
  function addFinalEmptyRowIfNeeded() {
    const tbody = document.querySelector("#harvestTable tbody");
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
  function updateTotals() {
    updateTotalsImmediate();
  }

  // دالة تحديث فوري محسنة للحالات المهمة
  function updateTotalsImmediate() {
    const tbody = document.querySelector("#harvestTable tbody");
    if (!tbody) return;

    // حذف صف الإجمالي القديم
    const oldTotal = document.getElementById("totalRow");
    if (oldTotal) oldTotal.remove();

    let totalAmount = 0, totalExtra = 0, totalCollector = 0;
    const rows = Array.from(tbody.querySelectorAll("tr"));

    // تحديث أرقام المسلسل
    rows.forEach((row, index) => {
      if (row.id !== "totalRow") {
        const serialCell = row.querySelector(".serial");
        if (serialCell) {
          serialCell.textContent = index + 1;
        }
      }
    });

    // حساب الإجماليات
    rows.forEach((row) => {
      if (row.id === "totalRow") return;

      const amount = parseNumber(
        row.querySelector(".amount")?.getAttribute("data-amount") ??
        row.querySelector(".amount")?.innerText
      );
      const extra = parseNumber(row.querySelector(".extra")?.value || 0);
      const collector = parseNumber(row.querySelector(".collector")?.value || 0);

      totalAmount += amount;
      totalExtra += extra;
      totalCollector += collector;
    });

    // حساب إجمالي الصافي بالمعادلة الصحيحة
    const totalNet = totalCollector - (totalExtra + totalAmount);

    // إنشاء صف الإجمالي الجديد
    const trTotal = document.createElement("tr");
    trTotal.id = "totalRow";
    trTotal.classList.add("total-row", "summary-row");
    trTotal.style.fontWeight = "bold";
    trTotal.innerHTML = `
      <td class="serial"></td>
      <td class="shop">الإجمالي</td>
      <td class="code"></td>
      <td class="amount">${formatNumber(totalAmount)}</td>
      <td class="extra">${formatNumber(totalExtra)}</td>
      <td class="collector">${formatNumber(totalCollector)}</td>
      <td class="net numeric ${totalNet > 0 ? 'positive' : (totalNet < 0 ? 'negative' : 'zero')}">${formatNumber(totalNet)}<i class="fas ${totalNet > 0 ? 'fa-arrow-up' : (totalNet < 0 ? 'fa-arrow-down' : 'fa-check')}" style="margin-right: 4px; font-size: 0.8em;"></i></td>
    `;
    tbody.appendChild(trTotal);

    // تحديث ملخص البيانات
    updateSummaryFields(totalAmount, totalExtra, totalCollector);
  }

  // دالة محسنة لتحديث حقول ملخص البيانات
  function updateSummaryFields(totalAmount, totalExtra, totalCollector) {
    const masterLimit = parseNumber(document.getElementById("masterLimit")?.value || 0);
    const currentBalance = parseNumber(document.getElementById("currentBalance")?.value || 0);
    const resetAmount = currentBalance - masterLimit;

    // تحديث مبلغ التصفيرة
    const resetAmountEl = document.getElementById("resetAmount");
    if (resetAmountEl) {
      resetAmountEl.textContent = formatNumber(resetAmount);
      resetAmountEl.style.color = resetAmount < 0 ? "var(--danger)" : resetAmount > 0 ? "var(--success)" : "#2c3e50";
    }

    // تحديث إجمالي المحصل
    const totalCollectedEl = document.getElementById("totalCollected");
    if (totalCollectedEl) {
      totalCollectedEl.textContent = formatNumber(totalCollector);
      localStorage.setItem('totalCollected', totalCollector);
    }

    // تحديث حالة التصفير
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
  }

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
      const netValue = parseNumber(parts[6] || 0);
      tr.innerHTML = `
        <td>${dateStr}</td>
        <td class="shop">${parts[1] || ""}</td>
        <td>${parts[2] || ""}</td>
        <td>${formatNumber(parts[3] || 0)}</td>
        <td>${formatNumber(parts[4] || 0)}</td>
        <td>${formatNumber(parts[5] || 0)}</td>
        <td class="net numeric ${netValue > 0 ? 'positive' : (netValue < 0 ? 'negative' : 'zero')}">${formatNumber(netValue)}<i class="fas ${netValue > 0 ? 'fa-arrow-up' : (netValue < 0 ? 'fa-arrow-down' : 'fa-check')}" style="margin-right: 4px; font-size: 0.8em;"></i></td>
      `;
      archiveTable.appendChild(tr);

      totalAmount += parseNumber(parts[3]);
      totalExtra += parseNumber(parts[4]);
      totalCollector += parseNumber(parts[5]);
      totalNet += netValue;
    });

    if (archiveTable.children.length > 0) {
      const trTotal = document.createElement("tr");
      trTotal.id = "archiveTotalRow";
      trTotal.classList.add("total-row");
      trTotal.style.fontWeight = "700";
      trTotal.style.background = "#00897B";
      trTotal.style.color = "white";
      trTotal.style.borderTop = "1px solid rgba(0, 0, 0, 0.1)";
      trTotal.style.position = "sticky";
      trTotal.style.bottom = "0";
      trTotal.style.zIndex = "5";
      trTotal.style.boxShadow = "0 -2px 5px rgba(0,0,0,0.1)";

      if (document.body.classList.contains("dark")) {
        trTotal.style.background = "linear-gradient(135deg, rgba(0, 200, 150, 0.3) 0%, rgba(0, 150, 130, 0.4) 100%)";
        trTotal.style.boxShadow = "0 4px 16px rgba(0, 200, 150, 0.3)";
        trTotal.style.borderRadius = "8px";
      }

      trTotal.innerHTML = `
        <td colspan="3" style="text-align: center; font-size: 20px; font-weight: 800;">الإجمالي</td>
        <td style="text-align: center; font-weight: 700; font-size: 18px; letter-spacing: 0.5px;">${formatNumber(totalAmount)}</td>
        <td style="text-align: center; font-weight: 700; font-size: 18px; letter-spacing: 0.5px;">${formatNumber(totalExtra)}</td>
        <td style="text-align: center; font-weight: 700; font-size: 18px; letter-spacing: 0.5px;">${formatNumber(totalCollector)}</td>
        <td class="net numeric" style="text-align: center; font-weight: 700; font-size: 18px; letter-spacing: 0.5px;">${formatNumber(totalNet)}<i class="fas ${totalNet > 0 ? 'fa-arrow-up' : (totalNet < 0 ? 'fa-arrow-down' : 'fa-check')}" style="margin-right: 4px; font-size: 0.8em;"></i></td>
      `;

      // تطبيق التنسيقات على الخلايا
      const cells = trTotal.querySelectorAll("td");
      cells.forEach((cell, index) => {
        if (index > 0) { // تجاهل العمود الأول (الإجمالي)
          cell.style.borderBottom = "1px solid rgba(0,121,101,0.4)";
          cell.style.borderRight = "1px solid rgba(0,121,101,0.4)";
          cell.style.padding = "18px 12px";
          cell.style.verticalAlign = "middle";
          cell.style.fontFamily = "'Cairo', sans-serif";
          cell.style.color = "white";

          if (document.body.classList.contains("dark")) {
            cell.style.borderBottom = "1px solid rgba(0,200,150,0.6)";
            cell.style.borderRight = "1px solid rgba(0,200,150,0.6)";
            cell.style.color = "#ffffff";
            cell.style.textShadow = "0 1px 2px rgba(0,0,0,0.5)";
          }
        }
      });

      archiveTable.appendChild(trTotal);

      // تطبيق تأثيرات الوضع الليلي على الجدول
      const allRows = archiveTable.querySelectorAll("tr");
      allRows.forEach(row => {
        row.addEventListener("mouseenter", () => {
          row.style.backgroundColor = document.body.classList.contains("dark")
            ? "#333"
            : "#f5f5f5";
        });
        row.addEventListener("mouseleave", () => {
          row.style.backgroundColor = "";
        });
      });
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
          const netValue = parseNumber(parts[6] || 0);
          tr.innerHTML = `
            <td>${date}</td>
            <td class="shop">${shop}</td>
            <td>${code}</td>
            <td>${formatNumber(parts[3] || 0)}</td>
            <td>${formatNumber(parts[4] || 0)}</td>
            <td>${formatNumber(parts[5] || 0)}</td>
            <td class="net numeric ${netValue > 0 ? 'positive' : (netValue < 0 ? 'negative' : 'zero')}">${formatNumber(netValue)}<i class="fas ${netValue > 0 ? 'fa-arrow-up' : (netValue < 0 ? 'fa-arrow-down' : 'fa-check')}" style="margin-right: 4px; font-size: 0.8em;"></i></td>
          `;
          archiveTable.appendChild(tr);

          totalAmount += parseNumber(parts[3]);
          totalExtra += parseNumber(parts[4]);
          totalCollector += parseNumber(parts[5]);
          totalNet += netValue;
        }
      });
    });

    if (archiveTable.children.length > 0) {
      const trTotal = document.createElement("tr");
      trTotal.id = "archiveTotalRow";
      trTotal.classList.add("total-row");
      trTotal.style.fontWeight = "700";
      trTotal.style.background = "#00897B";
      trTotal.style.color = "white";
      trTotal.style.borderTop = "1px solid rgba(0, 0, 0, 0.1)";
      trTotal.style.position = "sticky";
      trTotal.style.bottom = "0";
      trTotal.style.zIndex = "5";
      trTotal.style.boxShadow = "0 -2px 5px rgba(0,0,0,0.1)";

      if (document.body.classList.contains("dark")) {
        trTotal.style.background = "linear-gradient(135deg, rgba(0, 200, 150, 0.3) 0%, rgba(0, 150, 130, 0.4) 100%)";
        trTotal.style.boxShadow = "0 4px 16px rgba(0, 200, 150, 0.3)";
        trTotal.style.borderRadius = "8px";
      }

      trTotal.innerHTML = `
        <td colspan="3" style="text-align: center; font-size: 20px; font-weight: 800;">الإجمالي</td>
        <td style="text-align: center; font-weight: 700; font-size: 18px; letter-spacing: 0.5px;">${formatNumber(totalAmount)}</td>
        <td style="text-align: center; font-weight: 700; font-size: 18px; letter-spacing: 0.5px;">${formatNumber(totalExtra)}</td>
        <td style="text-align: center; font-weight: 700; font-size: 18px; letter-spacing: 0.5px;">${formatNumber(totalCollector)}</td>
        <td class="net numeric" style="text-align: center; font-weight: 700; font-size: 18px; letter-spacing: 0.5px;">${formatNumber(totalNet)}<i class="fas ${totalNet > 0 ? 'fa-arrow-up' : (totalNet < 0 ? 'fa-arrow-down' : 'fa-check')}" style="margin-right: 4px; font-size: 0.8em;"></i></td>
      `;

      // تطبيق التنسيقات على الخلايا
      const cells = trTotal.querySelectorAll("td");
      cells.forEach((cell, index) => {
        if (index > 0) { // تجاهل العمود الأول (الإجمالي)
          cell.style.borderBottom = "1px solid rgba(0,121,101,0.4)";
          cell.style.borderRight = "1px solid rgba(0,121,101,0.4)";
          cell.style.padding = "18px 12px";
          cell.style.verticalAlign = "middle";
          cell.style.fontFamily = "'Cairo', sans-serif";
          cell.style.color = "white";

          if (document.body.classList.contains("dark")) {
            cell.style.borderBottom = "1px solid rgba(0,200,150,0.6)";
            cell.style.borderRight = "1px solid rgba(0,200,150,0.6)";
            cell.style.color = "#ffffff";
            cell.style.textShadow = "0 1px 2px rgba(0,0,0,0.5)";
          }
        }
      });

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

    const currentBalance = document.getElementById("currentBalance");
    if (currentBalance) {
      currentBalance.addEventListener("input", debounce(() => {
        localStorage.setItem("currentBalance", currentBalance.value);
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
  document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM Content Loaded - Starting initialization");

    // إضافة انتقال سلس للصفحة بدون التأثير على الشريط الجانبي
    if (!document.body.classList.contains("loaded")) {
      setTimeout(() => {
        document.body.classList.add("loaded");
      }, 100);
    }

    applyDarkModeFromStorage();
    applyZoomFromStorage();
    
    // Zoom buttons functionality
    const zoomInBtn = document.getElementById("zoom-in-btn");
    const zoomOutBtn = document.getElementById("zoom-out-btn");
    
    if (zoomInBtn) {
      zoomInBtn.addEventListener("click", zoomIn);
    }
    
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener("click", zoomOut);
    }

    // التأكد من تهيئة أزرار صفحة الإدخال بشكل صحيح
    if (window.location.pathname.includes('dashboard.html') || window.location.pathname.endsWith('/')) {
      console.log("Dashboard page detected - initializing buttons");

      // تأخير بسيط للتأكد من تحميل العناصر
      setTimeout(() => {
        // زر لصق البيانات
        const pasteBtn = document.getElementById("pasteBtn");
        const dataInput = document.getElementById("dataInput");

        if (pasteBtn && dataInput) {
          console.log("Initializing paste button");
          pasteBtn.addEventListener("click", () => {
            console.log("Paste button clicked");
            pasteInto(dataInput);
          });
        } else {
          console.error("pasteBtn or dataInput not found", { pasteBtn: !!pasteBtn, dataInput: !!dataInput });
        }

        // زر حفظ وانتقال
        const saveGoBtn = document.getElementById("saveGoBtn");
        if (saveGoBtn) {
          console.log("Initializing save and go button");
          saveGoBtn.addEventListener("click", () => {
            console.log("Save and Go button clicked");
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
        } else {
          console.error("saveGoBtn not found");
        }

        // زر الذهاب للأرشيف
        const goToArchiveBtn = document.getElementById("goToArchiveBtn");
        if (goToArchiveBtn) {
          console.log("Initializing go to archive button");
          goToArchiveBtn.addEventListener("click", () => {
            console.log("Go to Archive button clicked");
            navigateTo("archive");
          });
        } else {
          console.error("goToArchiveBtn not found");
        }

        // زر مسح البيانات
        const clearBtn = document.getElementById("clearBtn");
        if (clearBtn) {
          console.log("Initializing clear button");
          clearBtn.addEventListener("click", function() {
            console.log("Clear button clicked");
            if (dataInput) {
              dataInput.value = "";
              dataInput.focus();

              // مسح البيانات من localStorage
              localStorage.removeItem("clientData");
              localStorage.removeItem("harvestData");

              // إضافة علامة للدلالة على أن البيانات تم مسحها يدوياً
              sessionStorage.setItem("dataCleared", "true");

              console.log("تم مسح البيانات بنجاح");
              showAlert("تم مسح البيانات بنجاح!", "success");
            }
          });
        } else {
          console.error("clearBtn not found");
        }
      }, 300);
    }

    const toggleDarkBtn = document.getElementById("toggleDark");
    if (toggleDarkBtn) {
      toggleDarkBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark");
        const isDark = document.body.classList.contains("dark");
        localStorage.setItem("darkMode", isDark ? "on" : "off");

        // تغيير رمز الأيقونة حسب الوضع
        toggleDarkBtn.textContent = isDark ? "☀️" : "🌙";
      });
    }

    const todayEl = document.getElementById("currentDate");
    const dayEl = document.getElementById("currentDay");
    if (todayEl) {
      try {
        todayEl.textContent = new Date().toLocaleDateString("en-GB", {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } catch {
        todayEl.textContent = new Date().toLocaleDateString();
      }
    }
    if (dayEl) {
      try {
        dayEl.textContent = new Date().toLocaleDateString("ar-EG", {
          weekday: 'long'
        });
      } catch {
        dayEl.textContent = new Date().toLocaleDateString("ar", { weekday: 'long' });
      }
    }

    setupAutoSave();
    setupNavigationArrows();
    enhanceTableExperience();
    setupSummaryNumberFormatting();

    // Index page elements
    const dataInput = document.getElementById("dataInput");
    console.log("Dashboard page loaded, dataInput found:", !!dataInput);

    if (dataInput) {
      console.log("Setting up dashboard buttons...");

      const pasteBtn = document.getElementById("pasteBtn");
      console.log("pasteBtn found:", !!pasteBtn);
      if (pasteBtn) {
        pasteBtn.addEventListener("click", () => {
          console.log("Paste button clicked");
          pasteInto(dataInput);
        });
      }

      const saveGoBtn = document.getElementById("saveGoBtn");
      console.log("saveGoBtn found:", !!saveGoBtn);
      if (saveGoBtn) {
        saveGoBtn.addEventListener("click", () => {
          console.log("Save and Go button clicked");
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
      }

      const goToArchiveBtn = document.getElementById("goToArchiveBtn");
      console.log("goToArchiveBtn found:", !!goToArchiveBtn);
      if (goToArchiveBtn) {
        goToArchiveBtn.addEventListener("click", () => {
          console.log("Go to Archive button clicked");
          navigateTo("archive");
        });
      }

      // إصلاح زر مسح البيانات
      const clearBtn = document.getElementById("clearBtn");
      console.log("clearBtn found:", !!clearBtn);
      if (clearBtn) {
        clearBtn.addEventListener("click", function() {
          console.log("Clear button clicked");
          const dataInput = document.getElementById("dataInput");
          if (dataInput) {
            dataInput.value = "";
            dataInput.focus();

            // مسح البيانات من localStorage لمنع ظهورها عند إعادة التحميل
            localStorage.removeItem("clientData");
            localStorage.removeItem("harvestData");

            // إضافة علامة للدلالة على أن البيانات تم مسحها يدوياً
            sessionStorage.setItem("dataCleared", "true");

            console.log("تم مسح البيانات بنجاح");
            showAlert("تم مسح البيانات بنجاح!", "success");
          }
        });
      }

      const savedClient = localStorage.getItem("clientData");
      const dataCleared = sessionStorage.getItem("dataCleared");

      // لا تملأ الحقل إذا تم مسح البيانات يدوياً في نفس الجلسة
      if (savedClient && savedClient.trim() !== "" && dataCleared !== "true") {
        dataInput.value = savedClient;
      }

      // مسح علامة المسح بعد التحقق منها
      if (dataCleared === "true") {
        sessionStorage.removeItem("dataCleared");
      }
    }
    
    // Harvest page elements
    const harvestTable = document.getElementById("harvestTable");
    if (harvestTable) {
      const savedML = localStorage.getItem("masterLimit");
      if (savedML && document.getElementById("masterLimit")) {
        document.getElementById("masterLimit").value = savedML;
      }

      const savedCB = localStorage.getItem("currentBalance");
      if (savedCB && document.getElementById("currentBalance")) {
        document.getElementById("currentBalance").value = savedCB;
      }
      
      const loadedFromRowData = loadRowsFromStorage();
      
      if (!loadedFromRowData) {
        const raw = localStorage.getItem("clientData");
        const tbody = harvestTable.querySelector("tbody");
        
        if (!tbody) return;
        tbody.innerHTML = "";
        
        if (!raw) {
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
              <td class="shop">${shopName}</td>
              <td class="code">${code}</td>
              <td class="amount" data-amount="${transferAmount}">${formatNumber(transferAmount)}</td>
              <td><input type="text" class="extra" /></td>
              <td class="highlight"><input type="text" class="collector" /></td>
              <td class="net numeric ${0 - (0 + transferAmount) > 0 ? 'positive' : (0 - (0 + transferAmount) < 0 ? 'negative' : 'zero')}">${formatNumber(0 - (0 + transferAmount))}</td>
            `;
            tbody.appendChild(tr);
          });
          
          const allRows = Array.from(tbody.querySelectorAll("tr"));
          allRows.forEach((r) => attachRowListeners(r));
          
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

            // إضافة قيمة الصافي المحسوبة
            const amount = parseNumber(cells[3]);
            const extra = parseNumber(cells[4]);
            const collector = parseNumber(cells[5]);
            const net = collector - (extra + amount);
            cells.push(net.toString());

            archiveData.push(cells.join("\t"));
          });
          
          const today = new Date().toLocaleDateString("en-GB", {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          const archive = JSON.parse(localStorage.getItem("archiveData") || "{}");
          archive[today] = archiveData.join("\n");
          localStorage.setItem("archiveData", JSON.stringify(archive));
          
          showAlert("✅ تم أرشفة بيانات اليوم بالكامل!", "success");
        });
      }
      
      // Archive button in harvest page
      const goToArchiveBtn = document.getElementById("goToArchiveBtn");
      if (goToArchiveBtn) {
        goToArchiveBtn.addEventListener("click", () => {
          navigateTo("archive");
        });
      }
      
      document.getElementById("goToInputBtn")?.addEventListener("click", () => {
        navigateTo("dashboard");
      });
      
      document.getElementById("masterLimit")?.addEventListener("input", (e) => {
        localStorage.setItem("masterLimit", e.target.value || "0");
        updateTotalsImmediate();
      });

      document.getElementById("currentBalance")?.addEventListener("input", () => {
        updateTotalsImmediate();
      });
      addFinalEmptyRowIfNeeded();
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
        localStorage.setItem("lastArchiveDate", archiveSelect.value);
        localStorage.removeItem("lastArchiveSearch");
        loadArchive(archiveSelect.value);
      });

      const searchInput = document.getElementById("archiveSearch");
      if (searchInput) {
        searchInput.addEventListener("input", (e) => {
          if (e.target.value.trim()) {
            archiveSelect.value = "";
            localStorage.setItem("lastArchiveSearch", e.target.value.trim());
            localStorage.removeItem("lastArchiveDate");
            searchArchive(e.target.value.trim());
          } else {
            localStorage.removeItem("lastArchiveSearch");
            loadArchive(archiveSelect.value);
          }
        });
      }

      // استرجاع آخر حالة محفوظة عند تحميل الصفحة
      const lastDate = localStorage.getItem("lastArchiveDate");
      const lastSearch = localStorage.getItem("lastArchiveSearch");

      if (lastDate && archive[lastDate]) {
        archiveSelect.value = lastDate;
        loadArchive(lastDate);
      } else if (lastSearch) {
        searchInput.value = lastSearch;
        searchArchive(lastSearch);
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
      
      document.getElementById("backToHarvestBtn")?.addEventListener("click", () => {
        navigateTo("harvest");
      });
    }

    // Sidebar listeners
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    sidebarLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('data-page');
        if (page) {
          navigateTo(page);
        }
      });
    });

    // Add beforeunload listener
    window.addEventListener('beforeunload', () => {
      const tbody = document.querySelector("#harvestTable tbody");
      if (tbody) {
        try {
          localStorage.setItem("rowData", tbodyToStorage());
        } catch (e) {
          console.error("Failed to save row data on unload", e);
        }
      }
    });

    // Setup table column settings for harvest and archive pages
    if (document.getElementById('harvestTable')) {
      setupTableSettings('harvestTable', 'harvestTableCols', [
        { key: 'serial', label: '#️⃣' },
        { key: 'shop', label: '🏪 المحل' },
        { key: 'code', label: '🔢 الكود' },
        { key: 'amount', label: '💸 مبلغ التحويل' },
        { key: 'extra', label: '🔄 اخرى' },
      ]);
    }
    if (document.getElementById('archiveTable')) {
      setupTableSettings('archiveTable', 'archiveTableCols', [
        { key: 'shop', label: '🏪 المحل' },
        { key: 'code', label: '🔢 الكود' },
        { key: 'amount', label: '💸 مبلغ التحويل' },
        { key: 'extra', label: '🔄 اخرى' },
      ]);
    }
  });