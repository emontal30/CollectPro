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

  // استخدام نظام التنبيهات الموحد لاختيار الصيغة
  const { value: selectedFormat } = await Swal.fire({
    title: 'تصدير التقرير',
    text: 'اختر التنسيق المناسب لمشاركة البيانات',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'تأكيد',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: themeColors.confirmButtonColor,
    cancelButtonColor: themeColors.cancelButtonColor,
    background: themeColors.background,
    color: themeColors.color,
    input: 'radio',
    inputOptions: {
      'image': '📷 صورة (PNG)',
      'pdf': '📄 ملف (PDF) - صورة مطبوعة',
      'excel': '📊 شيت اكسل (XLSX)'
    },
    inputValue: 'image',
    customClass: {
      popup: `swal-custom-z-index ${isDark ? 'dark-alert-popup' : ''}`,
      title: isDark ? 'dark-alert-title' : '',
      htmlContainer: isDark ? 'dark-alert-text' : '',
      input: `swal-radio-grid ${isDark ? 'dark-radio-grid' : ''}`
    },
    didOpen: () => {
      // إصلاح لون النصوص داخل الراديو في الوضع الليلي
      if (isDark) {
        const labels = document.querySelectorAll('.swal2-radio label');
        labels.forEach(label => {
          label.style.color = '#f8fafc';
        });
        const radioContainer = document.querySelector('.swal2-radio');
        if (radioContainer) {
          radioContainer.style.background = 'transparent';
          radioContainer.style.color = '#f8fafc';
        }
      }
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
    if(!wb.Workbook) wb.Workbook = {};
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
