import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import api from '@/services/api';
import logger from '@/utils/logger.js'

export const useDashboardStore = defineStore('dashboard', () => {
  // --- الحالة (State) ---
  const clientData = ref('');
  const subscriptionStatus = ref(null);
  const isLoadingSubscription = ref(false);
  let saveTimeout = null;

  // استعادة البيانات عند التحميل
  const init = () => {
    const savedData = localStorage.getItem('clientData');
    const dataCleared = sessionStorage.getItem('dataCleared');
    
    if (savedData && savedData.trim() !== "" && dataCleared !== "true") {
      clientData.value = savedData;
    }
  };

  // --- الدوال المساعدة (Helpers) ---
  
  function filterClientDataLines(raw) {
    if (!raw) return raw;
    const lines = raw.split("\n");
    const filtered = [];
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed.includes("المسلسل") && trimmed.includes("إجمالي البيع-التحويل-الرصيد")) {
        filtered.push(line);
        return;
      }
      if (/^[0-9٠-٩]+[\t\s]/.test(trimmed)) {
        filtered.push(line);
      }
    });
    return filtered.join("\n");
  }

  // دالة تحويل الأرقام العربية إلى إنجليزية
  const normalizeArabicNumbers = (str) => {
    if (!str) return "";
    return str.toString().replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
  };

  // 2. (تحسين جذري وذكي) دالة استخراج بيانات خط السير بناءً على شكل البيانات الفعلي
  function extractRouteData(raw) {
    if (!raw) return [];

    const lines = raw.split("\n");
    const routeItems = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // المثال: 1	توب تن:15972 رصيده : 3016.230 نوع التعامل : مكن	01004402042	3000.000
      
      // 1. استخراج الرصيد (بعد "رصيده :")
      let balance = 0;
      const balanceMatch = trimmed.match(/رصيده\s*[:\s]+\s*([-+]?[0-9٠-٩\.]+)/);
      if (balanceMatch) {
          balance = parseFloat(normalizeArabicNumbers(balanceMatch[1])) || 0;
      }

      // 2. استخراج الاسم والكود
      // نبحث عن النمط: [رقم مسلسل] [تاب/مسافات] [الاسم]:[الكود]
      // سنقوم بتقسيم السطر أولاً بناءً على علامة ":" المرتبطة بالاسم والكود
      let name = "";
      let code = "";

      if (trimmed.includes(":")) {
          const parts = trimmed.split(":");
          
          // الجزء الذي قبل ":" يحتوي على المسلسل والاسم
          const beforeColon = parts[0].trim();
          // نزيل المسلسل من البداية (عادة يكون رقم في بداية السطر متبوعاً بمسافات)
          name = beforeColon.replace(/^[0-9٠-٩]+\s+/, '').trim();
          
          // الجزء الذي بعد ":" يبدأ بالكود
          const afterColon = parts[1].trim();
          // نأخذ أول رقم يظهر بعد النقطتين (والذي هو الكود)
          const codeMatch = afterColon.match(/^([0-9٠-٩]+)/);
          if (codeMatch) {
              code = normalizeArabicNumbers(codeMatch[1]);
          }
      }

      // تحسين أخير للاسم: إذا كان الاسم لا يزال يحتوي على "رصيده" أو أي شيء آخر
      if (name.includes("رصيده")) {
          name = name.split("رصيده")[0].trim();
      }

      // التأكد من جودة البيانات قبل الإضافة
      if (code && name) {
          routeItems.push({
              code: code,
              name: name,
              balance: balance
          });
      }
    });

    return routeItems;
  }

  // --- الإجراءات (Actions) ---

  async function pasteData() {
    try {
      const text = await navigator.clipboard.readText();
      clientData.value = text;
      return { success: true };
    } catch (err) {
      const manual = prompt("المتصفح منع الوصول للحافظة.\nألصق بياناتك هنا ثم اضغط موافق:");
      if (manual !== null) {
        clientData.value = manual;
        return { success: true };
      }
      return { success: false };
    }
  }

  function clearData() {
    clientData.value = "";
    localStorage.removeItem("clientData");
    localStorage.removeItem("harvestData");
    localStorage.removeItem("routeData");
    sessionStorage.setItem("dataCleared", "true");
  }

  function processAndSave() {
    const rawData = clientData.value.trim();
    
    if (!rawData) {
      return { status: 'error', message: 'من فضلك أدخل البيانات أولاً!' };
    }

    const harvestFilteredData = filterClientDataLines(rawData);
    const routeParsedData = extractRouteData(rawData);

    clientData.value = harvestFilteredData; 

    localStorage.setItem("clientData", harvestFilteredData);
    localStorage.setItem("harvestData", harvestFilteredData);
    localStorage.setItem("routeData", JSON.stringify(routeParsedData));

    logger.info(`تم استخراج ${routeParsedData.length} عميل لخط السير.`);

    return { 
      status: 'success', 
      harvestData: harvestFilteredData,
      routeData: routeParsedData 
    };
  }

  watch(clientData, (newVal) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(() => {
      localStorage.setItem("clientData", newVal.trim());
    }, 1000);
  });

  async function loadSubscriptionStatus() {
    try {
      isLoadingSubscription.value = true;
      const { user } = await api.auth.getUser();
      if (user) {
        const { subscription } = await api.subscriptions.getSubscription(user.id);
        subscriptionStatus.value = subscription;
      }
    } catch (error) {
      logger.error('Error loading subscription status:', error);
    } finally {
      isLoadingSubscription.value = false;
    }
  }

  init();

  return {
    clientData,
    subscriptionStatus,
    isLoadingSubscription,
    pasteData,
    clearData,
    processAndSave,
    loadSubscriptionStatus
  };
});