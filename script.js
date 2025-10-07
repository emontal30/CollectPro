
/* ==================================
// ==         SCRIPT PRINCIPAL       ==
// ================================== */

/* ====== المتغيرات العامة ====== */
const STORAGE_KEYS = {
  DARK_MODE: "darkMode",
  CLIENT_DATA: "clientData",
  ARCHIVE_INDEX: "archiveIndex", 
  USER: "user",
  SIDEBAR_COLLAPSED: "sidebar-collapsed",
};

const PAGES = {
  DASHBOARD: "dashboard.html",
  HARVEST: "harvest.html",
  ARCHIVE: "archive.html",
  SUBSCRIPTIONS: "subscriptions.html",
  MY_SUBSCRIPTION: "my-subscription.html",
  ADMIN: "admin.html",
  INDEX: "index.html",
};

const SELECTORS = {
  // General
  SIDEBAR: ".sidebar",
  SIDEBAR_TOGGLE: ".sidebar-toggle",
  TOGGLE_DARK: "toggleDark",
  LOGOUT_BTN: "logout-btn",
  USER_NAME: "#user-name",
  USER_EMAIL: "#user-email",
  USER_INITIAL: "#user-initial",
  NAV_LINKS: ".nav-links a",
  
  // Dashboard Page
  DATA_INPUT: "#dataInput",
  PASTE_BTN: "#pasteBtn",
  CLEAR_BTN: "#clearBtn",
  SAVE_GO_BTN: "#saveGoBtn",
  GO_TO_ARCHIVE_BTN: "#goToArchiveBtn",

  // Harvest Page
  HARVEST_TABLE: "#harvestTable",
  ARCHIVE_TODAY_BTN: "#archiveTodayBtn",
  EXPORT_EXCEL_BTN: "#exportExcelBtn",
  COPY_SUMMARY_BTN: "#copySummaryBtn",
  DELIVERED_AMOUNT: "#deliveredAmount",
  DIFFERENCE: "#difference",

  // Summary Fields
  SUMMARY_TOTAL_AMOUNT: "#summaryTotalAmount",
  SUMMARY_TOTAL_EXTRA: "#summaryTotalExtra",
  SUMMARY_TOTAL_COLLECTOR: "#summaryTotalCollector",
  SUMMARY_TOTAL_NET: "#summaryTotalNet",

  // Archive Page
  ARCHIVE_TABLE: "#archiveTable",
  ARCHIVE_SELECT: "#archiveSelect",
  ARCHIVE_SEARCH: "#archiveSearch",
  DELETE_ARCHIVE_BTN: "#deleteArchiveBtn",
};


/* ====== دوال مساعدة ====== */
const parseNumber = (x) => {
  if (x === null || x === undefined) return 0;
  const s = String(x).replace(/,/g, "").trim();
  if (s === "") return 0;
  const n = Number(s);
  return isNaN(n) ? 0 : n;
};

const formatNumber = (n) => {
  const num = parseNumber(n);
  return num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/* ====== دوال الإشعارات والمربعات الحوارية ====== */
const showToast = (message, type = "info", duration = 4000) => {
  document.querySelector(".toast-container")?.remove();
  const container = document.createElement("div");
  container.className = "toast-container";
  document.body.appendChild(container);
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  let icon = "ℹ️";
  if (type === "success") icon = "✅";
  if (type === "error") icon = "❌";
  if (type === "warning") icon = "⚠️";
  toast.innerHTML = `<div class="toast-icon">${icon}</div><div class="toast-message">${message}</div><button class="toast-close">&times;</button>`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  const hide = () => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  };
  toast.querySelector(".toast-close").addEventListener("click", hide);
  setTimeout(hide, duration);
};

const showSuccessToast = (msg, dur) => showToast(msg, "success", dur);
const showErrorToast = (msg, dur) => showToast(msg, "error", dur);
const showWarningToast = (msg, dur) => showToast(msg, "warning", dur);

const showModal = (title, message, onConfirm) => {
    document.querySelector('.modal')?.remove();
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
        <div class="modal-content">
            <h3>${title}</h3><p>${message}</p>
            <div class="modal-buttons">
                <button id="modalYes" class="confirm-btn">تأكيد</button>
                <button id="modalNo" class="cancel-btn">إلغاء</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.style.display = "flex";
    const closeModal = () => modal.remove();
    document.getElementById("modalYes").onclick = () => { onConfirm?.(); closeModal(); };
    document.getElementById("modalNo").onclick = closeModal;
    modal.onclick = e => { if (e.target === modal) closeModal(); };
};


/* ====== دوال الواجهة العامة ====== */
const navigateTo = (page) => { window.location.href = page; };

const applyInitialThemeAndSidebarState = () => {
    const isDarkMode = localStorage.getItem(STORAGE_KEYS.DARK_MODE) === "on";
    document.body.classList.toggle("dark", isDarkMode);
    const isSidebarCollapsed = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === "true";
    document.body.classList.toggle("sidebar-collapsed", isSidebarCollapsed);
    const sidebar = document.querySelector(SELECTORS.SIDEBAR);
    if (sidebar) {
      sidebar.classList.toggle("sidebar-collapsed", isSidebarCollapsed);
    }
};

const toggleDarkMode = () => {
  const isDarkMode = document.body.classList.toggle("dark");
  localStorage.setItem(STORAGE_KEYS.DARK_MODE, isDarkMode ? "on" : "off");
};

const populateUserData = () => {
    try {
        const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || sessionStorage.getItem(STORAGE_KEYS.USER));
        if (!user) return;
        const userNameEl = document.querySelector(SELECTORS.USER_NAME);
        const userInitialEl = document.querySelector(SELECTORS.USER_INITIAL);
        const userEmailEl = document.querySelector(SELECTORS.USER_EMAIL);
        if(userNameEl) userNameEl.textContent = user.name || 'مستخدم';
        if(userInitialEl) userInitialEl.textContent = user.name?.charAt(0).toUpperCase() || '?';
        if(userEmailEl) userEmailEl.textContent = user.email || '';
    } catch {}
};

/* ====== دوال الشريط الجانبي ====== */

const getSidebarHTML = () => {
  return `
    <div class="sidebar-header">
      <div class="user-box">
        <div class="user-avatar">
          <span id="user-initial">A</span>
        </div>
        <div class="user-meta">
          <span class="user-name" id="user-name">اسم المستخدم</span>
          <span class="user-email" id="user-email">user@example.com</span>
        </div>
      </div>
    </div>
    <div class="sidebar-content">
      <ul class="nav-links">
        <li><a href="${PAGES.DASHBOARD}"><i class="fas fa-tachometer-alt"></i><span>إدخال البيانات</span></a></li>
        <li><a href="${PAGES.HARVEST}"><i class="fas fa-donate"></i><span>التحصيلات</span></a></li>
        <li><a href="${PAGES.ARCHIVE}"><i class="fas fa-archive"></i><span>الأرشيف</span></a></li>
        <li><a href="${PAGES.SUBSCRIPTIONS}"><i class="fas fa-credit-card"></i><span>الاشتراكات</span></a></li>
        <li><a href="${PAGES.MY_SUBSCRIPTION}"><i class="fas fa-user-shield"></i><span>اشتراكي</span></a></li>
        <li><a href="${PAGES.ADMIN}"><i class="fas fa-user-cog"></i><span>لوحة التحكم</span></a></li>
      </ul>
    </div>
    <div class="sidebar-footer">
        <button id="logout-btn" class="logout-btn">
            <i class="fas fa-sign-out-alt"></i>
            <span>تسجيل الخروج</span>
        </button>
    </div>
  `;
};

const injectSidebar = () => {
  const sidebar = document.querySelector(SELECTORS.SIDEBAR);
  if (sidebar) {
    sidebar.innerHTML = getSidebarHTML();
  }
};

const toggleSidebar = () => {
    const isCollapsed = document.body.classList.toggle("sidebar-collapsed");
    const sidebar = document.querySelector(SELECTORS.SIDEBAR);
    if (sidebar) {
      sidebar.classList.toggle("sidebar-collapsed", isCollapsed);
    }
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, isCollapsed);
};

const highlightActiveMenuItem = () => {
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll(SELECTORS.NAV_LINKS).forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
};

const handleLogout = () => {
    showModal("تسجيل الخروج", "هل أنت متأكد أنك تريد تسجيل الخروج؟", () => {
        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
        sessionStorage.clear();
        showSuccessToast("تم تسجيل الخروج بنجاح!");
        setTimeout(() => navigateTo(PAGES.INDEX), 500);
    });
};

const setupCommonUI = () => {
    const currentPage = window.location.pathname.split("/").pop();
    if (currentPage !== PAGES.INDEX) {
      injectSidebar();
      populateUserData();
      highlightActiveMenuItem();
      const logoutBtn = document.getElementById(SELECTORS.LOGOUT_BTN.substring(1));
      if(logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    }
    const sidebarToggle = document.querySelector(SELECTORS.SIDEBAR_TOGGLE);
    if(sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
    const toggleDarkBtn = document.getElementById(SELECTORS.TOGGLE_DARK.substring(1));
    if(toggleDarkBtn) toggleDarkBtn.addEventListener('click', toggleDarkMode);

};

/* ====== دوال صفحة إدخال البيانات ====== */
const setupDashboardPage = () => {
  const dataInput = document.querySelector(SELECTORS.DATA_INPUT);
  if (!dataInput) return;
  dataInput.value = localStorage.getItem(STORAGE_KEYS.CLIENT_DATA) || "";
  dataInput.addEventListener('input', debounce(() => localStorage.setItem(STORAGE_KEYS.CLIENT_DATA, dataInput.value), 300));
  document.querySelector(SELECTORS.PASTE_BTN)?.addEventListener("click", async () => {
      if (!dataInput) return;
      try {
          dataInput.value = await navigator.clipboard.readText();
          showSuccessToast("تم اللصق بنجاح!");
      } catch (err) { showErrorToast("فشل اللصق. يرجى اللصق يدويًا."); }
  });
  document.querySelector(SELECTORS.CLEAR_BTN)?.addEventListener("click", () => {
      dataInput.value = "";
      localStorage.removeItem(STORAGE_KEYS.CLIENT_DATA);
      showSuccessToast("تم تفريغ الحقل!");
  });
  document.querySelector(SELECTORS.SAVE_GO_BTN)?.addEventListener("click", () => {
    if (!dataInput.value.trim()) return showWarningToast("الرجاء إدخال البيانات أولاً!");
    navigateTo(PAGES.HARVEST);
  });
  document.querySelector(SELECTORS.GO_TO_ARCHIVE_BTN)?.addEventListener("click", () => navigateTo(PAGES.ARCHIVE));
};


/* ====== دوال صفحة التحصيلات ====== */
const setupHarvestPage = () => {
    if (!document.querySelector(SELECTORS.HARVEST_TABLE)) return;

    const loadData = () => {
        const data = localStorage.getItem(STORAGE_KEYS.CLIENT_DATA);
        const tbody = document.querySelector(`${SELECTORS.HARVEST_TABLE} tbody`);
        if (!data || !tbody) return;
        tbody.innerHTML = "";
        const rows = data.split("\n");
        let serial = 1;
        rows.forEach(row => {
            if (!row.trim() || row.includes("المسلسل")) return;
            const parts = row.split("\t");
            if (parts.length < 4) return;
            const center = parts[1].trim();
            const [shopName, code] = center.includes(":") ? center.split(":").map(s => s.trim()) : [center, (parts[2] || "").trim()];
            const amount = parseNumber(parts[3]);
            if (amount === 0) return;
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="serial">${serial++}</td> <td class="shop">${shopName}</td> <td class="code">${code}</td>
                <td class="amount" data-amount="${amount}">${formatNumber(amount)}</td>
                <td><input type="text" class="extra" placeholder="0"/></td>
                <td class="highlight"><input type="text" class="collector" placeholder="0"/></td>
                <td class="numeric result">0</td> <td class="status">🔔</td>`;
            tbody.appendChild(tr);
        });
        updateTotals();
        tbody.querySelectorAll('input[type="text"]').forEach(input => input.addEventListener("input", updateTotals));
    };

    document.querySelector(SELECTORS.EXPORT_EXCEL_BTN)?.addEventListener("click", () => {
        const table = document.querySelector(SELECTORS.HARVEST_TABLE);
        if (!table || !table.querySelector("tbody tr")) return showWarningToast("لا توجد بيانات للتصدير.");
        const wb = XLSX.utils.table_to_book(table, { sheet: "Harvest Data" });
        XLSX.writeFile(wb, `Harvest_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
        showSuccessToast("تم تصدير البيانات إلى Excel بنجاح!");
    });

    document.querySelector(SELECTORS.COPY_SUMMARY_BTN)?.addEventListener("click", () => {
        const summary = `*ملخص تحصيل يوم ${new Date().toLocaleDateString('ar-EG',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}*
-----------------------------------
- إجمالي التحويلات: ${document.querySelector(SELECTORS.SUMMARY_TOTAL_AMOUNT).textContent}
- إجمالي التحصيل: ${document.querySelector(SELECTORS.SUMMARY_TOTAL_COLLECTOR).textContent}
- الصافي: ${document.querySelector(SELECTORS.SUMMARY_TOTAL_NET).textContent}
-----------------------------------
- المبلغ المسلم: ${formatNumber(document.querySelector(SELECTORS.DELIVERED_AMOUNT).value) || "0"}
- الفارق: ${document.querySelector(SELECTORS.DIFFERENCE).textContent}`;
        navigator.clipboard.writeText(summary.trim()).then(() => showSuccessToast("تم نسخ الملخص بنجاح!"), () => showErrorToast("فشل نسخ الملخص."));
    });

    document.querySelector(SELECTORS.ARCHIVE_TODAY_BTN)?.addEventListener("click", () => {
        const table = document.querySelector(SELECTORS.HARVEST_TABLE);
        if (!table || !table.querySelector("tbody tr")) return showWarningToast("لا توجد بيانات لأرشفتها!");
        showModal("تأكيد الأرشفة", "سيتم حفظ البيانات الحالية والانتقال لصفحة جديدة. هل أنت متأكد؟", () => {
            const dateKey = `archive_${new Date().toISOString().slice(0, 10)}`;
            const userFriendlyDate = new Date().toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            let index = JSON.parse(localStorage.getItem(STORAGE_KEYS.ARCHIVE_INDEX)) || [];
            if (index.some(item => item.key === dateKey)) return showWarningToast("بيانات هذا اليوم مؤرشفة بالفعل.");
            const data = Array.from(table.querySelectorAll("tbody tr")).map(tr => ({
                shop: tr.querySelector(".shop").innerText, code: tr.querySelector(".code").innerText,
                amount: parseNumber(tr.querySelector(".amount").getAttribute("data-amount")),
                extra: parseNumber(tr.querySelector(".extra").value), collector: parseNumber(tr.querySelector(".collector").value),
                net: parseNumber(tr.querySelector(".result").innerText), status: tr.querySelector(".status").innerText,
            }));
            localStorage.setItem(dateKey, JSON.stringify(data));
            index.unshift({ key: dateKey, date: userFriendlyDate });
            localStorage.setItem(STORAGE_KEYS.ARCHIVE_INDEX, JSON.stringify(index));
            localStorage.removeItem(STORAGE_KEYS.CLIENT_DATA);
            showSuccessToast("تمت الأرشفة بنجاح!");
            setTimeout(() => navigateTo(PAGES.DASHBOARD), 1000);
        });
    });

    const deliveredAmountInput = document.querySelector(SELECTORS.DELIVERED_AMOUNT);
    if(deliveredAmountInput) deliveredAmountInput.addEventListener("input", updateTotals);
    loadData();
};

const updateTotals = debounce(() => {
    const tbody = document.querySelector(`${SELECTORS.HARVEST_TABLE} tbody`);
    if (!tbody) return;
    let [totalAmount, totalExtra, totalCollector] = [0, 0, 0];
    tbody.querySelectorAll("tr").forEach(row => {
        const amount = parseNumber(row.querySelector(".amount")?.getAttribute("data-amount"));
        const extra = parseNumber(row.querySelector(".extra")?.value);
        const collector = parseNumber(row.querySelector(".collector")?.value);
        const net = collector - (amount + extra);
        row.querySelector(".result").textContent = formatNumber(net);
        const statusCell = row.querySelector(".status");
        statusCell.className = "status";
        if (net < 0) { statusCell.textContent = "عجز ✖️"; statusCell.classList.add("negative"); }
        else if (net > 0) { statusCell.textContent = "زيادة ➕"; statusCell.classList.add("positive"); }
        else { statusCell.textContent = "تم ✔️"; statusCell.classList.add("zero"); }
        totalAmount += amount; totalExtra += extra; totalCollector += collector;
    });
    document.querySelector(SELECTORS.SUMMARY_TOTAL_AMOUNT).textContent = formatNumber(totalAmount);
    document.querySelector(SELECTORS.SUMMARY_TOTAL_EXTRA).textContent = formatNumber(totalExtra);
    document.querySelector(SELECTORS.SUMMARY_TOTAL_COLLECTOR).textContent = formatNumber(totalCollector);
    document.querySelector(SELECTORS.SUMMARY_TOTAL_NET).textContent = formatNumber(totalCollector - totalAmount - totalExtra);
    const delivered = parseNumber(document.querySelector(SELECTORS.DELIVERED_AMOUNT).value);
    const diffEl = document.querySelector(SELECTORS.DIFFERENCE);
    diffEl.textContent = formatNumber(delivered - totalCollector);
    diffEl.style.color = (delivered - totalCollector < 0) ? "var(--danger)" : "inherit";
}, 150);


/* ====== دوال صفحة الأرشيف ====== */
const setupArchivePage = () => {
    const select = document.querySelector(SELECTORS.ARCHIVE_SELECT);
    const search = document.querySelector(SELECTORS.ARCHIVE_SEARCH);
    const tbody = document.querySelector(`${SELECTORS.ARCHIVE_TABLE} tbody`);
    if (!select || !search || !tbody) return;

    const displayData = (key) => {
        tbody.innerHTML = '';
        if (!key) return;
        const data = JSON.parse(localStorage.getItem(key)) || [];
        const date = (JSON.parse(localStorage.getItem(STORAGE_KEYS.ARCHIVE_INDEX)) || []).find(i => i.key === key)?.date || '';
        data.forEach(item => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${date.split(',')[0]}</td><td>${item.shop}</td><td>${item.code}</td>
                <td>${formatNumber(item.amount)}</td><td>${formatNumber(item.extra)}</td>
                <td>${formatNumber(item.collector)}</td><td>${formatNumber(item.net)}</td>
                <td class="status ${item.net < 0 ? 'negative' : (item.net > 0 ? 'positive' : 'zero') }">${item.status}</td>`;
            tbody.appendChild(tr);
        });
    };

    const populateSelect = () => {
        const index = JSON.parse(localStorage.getItem(STORAGE_KEYS.ARCHIVE_INDEX)) || [];
        select.innerHTML = '<option value="">اختر تاريخًا لعرضه</option>';
        index.forEach(item => {
            select.add(new Option(item.date, item.key));
        });
    };

    select.addEventListener("change", (e) => displayData(e.target.value));
    search.addEventListener("input", debounce(() => {
        const query = search.value.toLowerCase();
        tbody.querySelectorAll("tr").forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(query) ? "" : "none";
        });
    }, 300));
    
    document.querySelector(SELECTORS.DELETE_ARCHIVE_BTN).addEventListener('click', () => {
        if (!select.value) return showWarningToast("يرجى اختيار تاريخ لحذفه.");
        showModal("تأكيد الحذف", `هل أنت متأكد من حذف أرشيف يوم: ${select.options[select.selectedIndex].text}؟`, () => {
            let index = JSON.parse(localStorage.getItem(STORAGE_KEYS.ARCHIVE_INDEX)) || [];
            localStorage.removeItem(select.value);
            localStorage.setItem(STORAGE_KEYS.ARCHIVE_INDEX, JSON.stringify(index.filter(i => i.key !== select.value)));
            populateSelect();
            tbody.innerHTML = '';
            showSuccessToast("تم حذف الأرشيف بنجاح.");
        });
    });
    
    populateSelect();
};


/* ====== تهيئة الصفحة ====== */
document.addEventListener("DOMContentLoaded", () => {
    const page = window.location.pathname.split("/").pop() || PAGES.INDEX;

    // حماية الصفحات: التحقق من وجود المستخدم قبل تحميل الصفحات الداخلية
    const user = localStorage.getItem(STORAGE_KEYS.USER) || sessionStorage.getItem(STORAGE_KEYS.USER);
    if (!user && page !== PAGES.INDEX) {
        showWarningToast('الرجاء تسجيل الدخول أولاً للوصول إلى هذه الصفحة.', 5000);
        setTimeout(() => navigateTo(PAGES.INDEX), 500); // إعادة توجيه بعد فترة قصيرة
        return; // إيقاف تنفيذ باقي السكربت
    }

    applyInitialThemeAndSidebarState();
    setupCommonUI();

    // التوجيه الشرطي لإعداد الصفحة الحالية
    if (page === PAGES.INDEX) {
        // لا توجد شيفرة خاصة بصفحة index.html هنا حاليًا
    } else if (page === PAGES.DASHBOARD) {
        setupDashboardPage();
    } else if (page === PAGES.HARVEST) {
        setupHarvestPage();
    } else if (page === PAGES.ARCHIVE) {
        setupArchivePage();
    }
    // يمكن إضافة إعدادات الصفحات الأخرى هنا بنفس الطريقة

    setTimeout(() => document.body.classList.add("loaded"), 50);
});
