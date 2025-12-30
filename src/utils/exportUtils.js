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

  // استخدام نظام التنبيهات الموحد لاختيار الصيغة
  const { value: selectedFormat } = await Swal.fire({
    title: 'تصدير التقرير',
    text: 'اختر التنسيق المناسب لمشاركة البيانات',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'تأكيد',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: 'var(--primary)',
    input: 'radio',
    inputOptions: {
      'image': '📷 صورة (PNG)',
      'pdf': '📄 ملف (PDF) - حجم مضغوط',
      'excel': '📊 شيت اكسل (XLSX)'
    },
    inputValue: 'image',
    customClass: {
      popup: 'swal-custom-z-index',
      input: 'swal-radio-grid'
    }
  });

  if (!selectedFormat) return { success: false, message: 'تم إلغاء العملية' };

  try {
    if (selectedFormat === 'excel') {
      return await exportToExcel(elementId, fileName);
    } 
    
    // إعدادات html2canvas مع مراعاة الخطوط والتنسيقات الموحدة
    const canvas = await html2canvas(element, {
      scale: 1.5, // توازن بين الجودة والمساحة
      useCORS: true,
      backgroundColor: getComputedStyle(document.body).getPropertyValue('--surface-bg') || '#ffffff',
      logging: false,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
            // تطبيق تنسيقات الطباعة/التصدير
            clonedElement.style.padding = '20px';
            clonedElement.style.fontFamily = "'Cairo', sans-serif";
            
            // إخفاء العناصر غير المرغوب فيها عند التصدير (مثل أزرار الإجراءات)
            const actions = clonedElement.querySelectorAll('.btn-toggle-sign, .btn-settings-table');
            actions.forEach(el => el.style.display = 'none');
        }
      }
    });

    // --- معالجة الصور ---
    if (selectedFormat === 'image') {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.8));
      const file = new File([blob], `${fileName}.png`, { type: 'image/png' });

      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'تقرير CollectPro' });
          return { success: true };
        }
      } catch (e) { logger.warn('Share failed:', e); }
      
      const link = document.createElement('a');
      link.download = `${fileName}.png`;
      link.href = canvas.toDataURL('image/png', 0.8);
      link.click();
      return { success: true, message: 'تم تحميل الصورة بنجاح' };

    // --- معالجة PDF ---
    } else if (selectedFormat === 'pdf') {
      const imgData = canvas.toDataURL('image/jpeg', 0.7); // ضغط JPEG لتقليل المساحة
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'l' : 'p',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
      const finalWidth = canvas.width * ratio;
      const finalHeight = canvas.height * ratio;
      
      pdf.addImage(imgData, 'JPEG', (pdfWidth - finalWidth) / 2, 10, finalWidth, finalHeight, undefined, 'FAST');
      
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
 * تصدير للاكسل مع دعم الـ RTL والتراجع التلقائي للتحميل
 */
const exportToExcel = async (elementId, fileName) => {
  try {
    const table = document.getElementById(elementId).querySelector('table');
    if (!table) return { success: false, message: 'لم يتم العثور على جدول البيانات' };

    const wb = XLSX.utils.table_to_book(table, { sheet: "Data", raw: true });
    
    // ضبط اتجاه الشيت من اليمين لليسار
    if(!wb.Workbook) wb.Workbook = {};
    wb.Workbook.Views = [{ RTL: true }];
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
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
