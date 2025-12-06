import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useDashboardStore = defineStore('dashboard', () => {
  // --- الحالة (State) ---
  const clientData = ref('');
  let saveTimeout = null;

  // استعادة البيانات عند التحميل (ما لم يتم مسحها في نفس الجلسة)
  const init = () => {
    const savedData = localStorage.getItem('clientData');
    const dataCleared = sessionStorage.getItem('dataCleared');
    
    if (savedData && savedData.trim() !== "" && dataCleared !== "true") {
      clientData.value = savedData;
    }
  };

  // --- الدوال المساعدة (Helpers from script.js) ---
  
  // دالة تنقية البيانات (نفس المنطق الأصلي)
  function filterClientDataLines(raw) {
    if (!raw) return raw;
    const lines = raw.split("\n");
    const filtered = [];
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      // الاحتفاظ بـ سطر العناوين
      if (trimmed.includes("المسلسل") && trimmed.includes("إجمالي البيع-التحويل-الرصيد")) {
        filtered.push(line);
        return;
      }
      // الاحتفاظ بالأسطر التي تبدأ بأرقام (بيانات العملاء)
      if (/^[0-9٠-٩]+[\t\s]/.test(trimmed)) {
        filtered.push(line);
      }
    });
    return filtered.join("\n");
  }

  // --- الإجراءات (Actions) ---

  // 1. لصق البيانات
  async function pasteData() {
    try {
      const text = await navigator.clipboard.readText();
      clientData.value = text;
      return { success: true };
    } catch (err) {
      // في حالة فشل اللصق التلقائي (أذونات المتصفح)
      const manual = prompt("المتصفح منع الوصول للحافظة.\nألصق بياناتك هنا ثم اضغط موافق:");
      if (manual !== null) {
        clientData.value = manual;
        return { success: true };
      }
      return { success: false };
    }
  }

  // 2. مسح البيانات
  function clearData() {
    clientData.value = "";
    localStorage.removeItem("clientData");
    localStorage.removeItem("harvestData"); // مسح البيانات المرتبطة في الصفحة الأخرى
    sessionStorage.setItem("dataCleared", "true"); // وضع علامة لمنع الاستعادة
  }

  // 3. المعالجة والحفظ (Save & Go Logic)
  function processAndSave() {
    let data = clientData.value.trim();
    
    if (!data) {
      return { status: 'error', message: 'من فضلك أدخل البيانات أولاً!' };
    }

    // تنقية البيانات
    data = filterClientDataLines(data);
    clientData.value = data; // تحديث الحقل بالنص المنقى

    // التحقق من صحة البيانات (بداية الملف)
    if (!data.startsWith("المسلسل")) {
      const confirmSave = confirm("البيانات لا تبدأ بكلمة 'المسلسل'. هل تريد المتابعة وحفظ البيانات؟");
      if (!confirmSave) return { status: 'cancelled' };
    }

    // التحقق من وجود بيانات سابقة في التحصيلات (harvestData logic mock)
    // هنا نفترض المنطق المباشر للحفظ
    localStorage.setItem("clientData", data);
    
    // نقوم أيضاً بحفظها كـ harvestData لضمان نقلها للصفحة التالية كما في الكود الأصلي
    localStorage.setItem("harvestData", data);

    return { status: 'success' };
  }

  // --- المراقبة (Auto-Save) ---
  watch(clientData, (newVal) => {
    // إلغاء الحفظ السابق إذا كان موجوداً
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    // حفظ تلقائي مع Debounce (تأخير 1 ثانية)
    saveTimeout = setTimeout(() => {
      localStorage.setItem("clientData", newVal.trim());
    }, 1000);
  });

  // استدعاء التهيئة
  init();

  return {
    clientData,
    pasteData,
    clearData,
    processAndSave
  };
});