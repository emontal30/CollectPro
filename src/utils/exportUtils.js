import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import logger from './logger';
import Swal from 'sweetalert2';

/**
 * محرك تصدير ومشاركة الجداول - CollectPro Export Engine
 * يتميز بضغط عالي للملفات وتوافقية كاملة مع الهواتف
 */
export const exportAndShareTable = async (elementId, fileName = 'CollectPro_Report', options = {}) => {
  const element = document.getElementById(elementId);
  if (!element) {
    logger.error('Element not found for export:', elementId);
    return { success: false, message: 'لم يتم العثور على الجدول' };
  }

  // تحديد الوضع الحالي (ليلي أم نهاري) لتكييف نافذة الاختيار
  const isDark = document.body.classList.contains('dark') ||
    document.documentElement.classList.contains('dark') ||
    localStorage.getItem('theme') === 'dark';

  const themeColors = {
    background: isDark ? '#1e293b' : '#ffffff',
    color: isDark ? '#f8fafc' : '#1e293b',
    confirmButtonColor: 'var(--primary)',
    cancelButtonColor: isDark ? '#334155' : '#64748b'
  };

  // استخراج الوصف والعنوان من الخيارات أو استخدام الافتراضي
  const reportTitle = options.title || 'تصدير التقرير';
  const reportDesc = options.description || `يتم الآن تجهيز ملف: ${fileName}`;

  // إنشاء معاينة سريعة (Thumbnail)
  let previewHtml = '';
  try {
    // نأخذ لقطة سريعة للجزء العلوي فقط من الجدول كمعاينة
    const previewCanvas = await html2canvas(element, {
      height: Math.min(element.offsetHeight, 300), // Height limit for speed
      width: element.offsetWidth,
      scale: 1, // Low scale for speed
      useCORS: true,
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });
    const previewDataUrl = previewCanvas.toDataURL('image/png');
    previewHtml = `
      <div class="report-preview-container" style="margin-bottom: 20px; text-align: center; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px dashed #cbd5e1;">
        <p style="font-size: 0.8rem; color: #64748b; margin-bottom: 8px;">معاينة جزئية للتقرير</p>
        <img src="${previewDataUrl}" style="max-width: 100%; height: auto; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-radius: 4px;" alt="Report Preview" />
      </div>
    `;
  } catch (e) {
    logger.warn('Failed to generate preview', e);
  }

  // استخدام نظام التنبيهات الموحد مع تخصيص HTML
  const { value: selectedFormat } = await Swal.fire({
    title: `<span class="text-xl font-bold">${reportTitle}</span>`,
    html: `
      <div class="export-summary mb-4 text-muted text-sm" style="color:#666; font-size:0.95rem; margin-bottom:15px; line-height:1.5;">
        ${reportDesc}
      </div>

      ${previewHtml}

      <div class="export-options-grid">
        <label class="export-option-card">
          <input type="radio" name="exportFormat" value="image" class="hidden-radio">
          <div class="card-content">
            <div class="icon-wrapper img-bg"><i class="fas fa-image"></i></div>
            <span class="format-name">صورة (PNG)</span>
            <span class="checkmark"><i class="fas fa-check"></i></span>
          </div>
        </label>

        <label class="export-option-card">
          <input type="radio" name="exportFormat" value="pdf" class="hidden-radio">
          <div class="card-content">
            <div class="icon-wrapper pdf-bg"><i class="fas fa-file-pdf"></i></div>
            <span class="format-name">ملف (PDF)</span>
            <span class="checkmark"><i class="fas fa-check"></i></span>
          </div>
        </label>

        <label class="export-option-card">
          <input type="radio" name="exportFormat" value="excel" class="hidden-radio">
          <div class="card-content">
            <div class="icon-wrapper xls-bg"><i class="fas fa-file-excel"></i></div>
            <span class="format-name">شيت (Excel)</span>
            <span class="checkmark"><i class="fas fa-check"></i></span>
          </div>
        </label>
      </div>
      <style>
        .export-options-grid { display: grid; gap: 15px; margin-top: 20px; }
        .export-option-card { cursor: pointer; position: relative; }
        .hidden-radio { display: none; }
        .card-content {
          display: flex; align-items: center; gap: 15px; padding: 15px;
          border: 2px solid var(--border-color, #eee); border-radius: 12px;
          transition: all 0.2s ease; background: var(--surface-bg, #fff);
        }
        .icon-wrapper {
          width: 45px; height: 45px; display: flex; align-items: center; justify-content: center;
          border-radius: 10px; font-size: 1.5rem; color: white;
        }
        .img-bg { background: linear-gradient(135deg, #3b82f6, #2563eb); }
        .pdf-bg { background: linear-gradient(135deg, #ef4444, #dc2626); }
        .xls-bg { background: linear-gradient(135deg, #10b981, #059669); }
        .format-name { font-weight: bold; font-size: 1rem; color: var(--text-main, #333); flex: 1; text-align: right; }
        .checkmark {
          width: 24px; height: 24px; border-radius: 50%; border: 2px solid #ddd;
          display: flex; align-items: center; justify-content: center;
          color: transparent; transition: all 0.2s;
        }
        /* Selected State */
        .hidden-radio:checked + .card-content {
          border-color: var(--primary, #007965); background-color: rgba(0, 121, 101, 0.05);
        }
        .hidden-radio:checked + .card-content .checkmark {
          background-color: var(--primary, #007965); border-color: var(--primary, #007965); color: white;
        }
        
        /* Custom Button Styles */
        .swal-btn-custom {
          font-family: 'Cairo', sans-serif !important;
          font-weight: 700 !important;
          font-size: 1rem !important;
          padding: 10px 24px !important;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
        }
        /* Dark Mode overrides injected via JS logic below */
      </style>
    `,
    showCloseButton: true,
    showCancelButton: true,
    confirmButtonText: 'تأكيد التصدير',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: themeColors.confirmButtonColor,
    cancelButtonColor: themeColors.cancelButtonColor,
    background: themeColors.background,
    color: themeColors.color,
    focusConfirm: false,
    customClass: {
      popup: `swal-custom-z-index ${isDark ? 'dark-alert-popup' : ''}`,
      confirmButton: 'swal-btn-custom',
      cancelButton: 'swal-btn-custom'
    },
    preConfirm: () => {
      const selected = document.querySelector('input[name="exportFormat"]:checked');
      if (!selected) {
        Swal.showValidationMessage('الرجاء اختيار صيغة التصدير');
        return false;
      }
      return selected.value;
    }
  });

  if (!selectedFormat) return { success: false, message: 'تم إلغاء العملية' };

  try {
    if (selectedFormat === 'excel') {
      return await exportToExcel(elementId, fileName);
    }

    // إعدادات html2canvas مع مراعاة الخطوط والتنسيقات الموحدة لضمان ظهور العربية
    const canvas = await html2canvas(element, {
      scale: 2, // زيادة الجودة لضمان وضوح النص العربي
      useCORS: true,
      allowTaint: true,
      backgroundColor: getComputedStyle(document.body).getPropertyValue('--surface-bg') || (isDark ? '#0f172a' : '#ffffff'),
      logging: false,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          // تطبيق تنسيقات الطباعة/التصدير لضمان ظهور النص العربي بشكل صحيح
          clonedElement.style.direction = 'rtl';
          clonedElement.style.textAlign = 'right';
          clonedElement.style.padding = '20px';
          clonedElement.style.fontFamily = "'Cairo', sans-serif";

          // إصلاح محاذاة الأعمدة في النسخة المنسوخة
          const cells = clonedElement.querySelectorAll('td, th');
          cells.forEach(cell => {
            cell.style.fontFamily = "'Cairo', sans-serif";
            // التأكد من أن الأرقام تظهر بشكل جيد
            if (!cell.classList.contains('shop')) {
              cell.style.textAlign = 'center';
            }
          });

          // إخفاء العناصر غير المرغوب فيها عند التصدير
          const actions = clonedElement.querySelectorAll('.btn-toggle-sign, .btn-settings-table, .btn-clear-search');
          actions.forEach(el => el.style.display = 'none');
        }
      }
    });

    // --- معالجة الصور ---
    if (selectedFormat === 'image') {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
      const file = new File([blob], `${fileName}.png`, { type: 'image/png' });

      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'تقرير CollectPro' });
          return { success: true };
        }
      } catch (e) { logger.warn('Share failed:', e); }

      const link = document.createElement('a');
      link.download = `${fileName}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      return { success: true, message: 'تم تحميل الصورة بنجاح' };

      // --- معالجة PDF ---
    } else if (selectedFormat === 'pdf') {
      // نستخدم الصورة داخل PDF لأن jsPDF لا يدعم العربية بشكل مباشر بدون ملفات خطوط معقدة
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'l' : 'p',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // حساب الأبعاد للحفاظ على التناسب
      const margin = 10;
      const maxWidth = pdfWidth - (margin * 2);
      const maxHeight = pdfHeight - (margin * 2);

      const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
      const finalWidth = canvas.width * ratio;
      const finalHeight = canvas.height * ratio;

      pdf.addImage(imgData, 'JPEG', (pdfWidth - finalWidth) / 2, margin, finalWidth, finalHeight, undefined, 'FAST');

      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], `${fileName}.pdf`, { type: 'application/pdf' });

      try {
        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({ files: [pdfFile], title: 'تقرير PDF' });
          return { success: true };
        }
      } catch (e) { logger.warn('PDF Share failed:', e); }

      pdf.save(`${fileName}.pdf`);
      return { success: true, message: 'تم تحميل ملف PDF بنجاح' };
    }

  } catch (err) {
    logger.error('Export Error:', err);
    return { success: false, message: 'حدث خطأ أثناء التصدير' };
  }
};

/**
 * تصدير للاكسل مع تحسين دعم الرموز واللغة العربية
 */
const exportToExcel = async (elementId, fileName) => {
  try {
    const tableElement = document.getElementById(elementId).querySelector('table');
    if (!tableElement) return { success: false, message: 'لم يتم العثور على جدول البيانات' };

    // تحويل الجدول إلى شيت مع الحفاظ على التنسيق
    const wb = XLSX.utils.table_to_book(tableElement, {
      sheet: "تقرير الأرشيف",
      raw: false, // لضمان التعامل مع النصوص كالسلاسل
      dateNF: 'yyyy-mm-dd'
    });

    // ضبط إعدادات اللغة والاتجاه في ملف الإكسل
    if (!wb.Workbook) wb.Workbook = {};
    wb.Workbook.Views = [{ RTL: true }];

    // كتابة الملف بصيغة تدعم اليونيكود (العربية)
    const excelBuffer = XLSX.write(wb, {
      bookType: 'xlsx',
      type: 'array',
      bookSST: false // تحسين التوافقية
    });

    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const file = new File([blob], `${fileName}.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'تقرير Excel' });
        return { success: true };
      }
    } catch (e) { logger.warn('Excel Share failed:', e); }

    XLSX.writeFile(wb, `${fileName}.xlsx`);
    return { success: true, message: 'تم تحميل ملف الإكسل' };

  } catch (err) {
    logger.error('Excel Export Error:', err);
    return { success: false, message: 'فشل تصدير ملف الإكسل' };
  }
};
