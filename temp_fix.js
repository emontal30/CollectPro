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
  } else if (page === "dashboard" || page === "index") {
    const tbody = document.querySelector("#harvestTable tbody");
    if (tbody) {
      try {
        localStorage.setItem("rowData", tbodyToStorage());
      } catch (e) {
        console.error("Failed to save row data", e);
      }
    }
    window.location.href = `${page === "dashboard" ? "dashboard.html" : "index.html"}`;
  } else {
    // حالة عامة لأي صفحة أخرى
    window.location.href = `${page}.html`;
  }
}