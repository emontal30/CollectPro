import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import logger from './logger';
import Swal from 'sweetalert2';

/**
 * محرك تصدير ومشاركة الجداول
 * يقوم بتحويل أي عنصر HTML إلى صورة أو PDF أو Excel ومشاركتها
 */
export const exportAndShareTable = async (elementId, fileName = 'CollectPro_Report', options = {}) => {
  const element = document.getElementById(elementId);
  if (!element) {
    logger.error('Element not found for export:', elementId);
    return { success: false, message: 'لم يتم العثور على الجدول' };
  }

  // سؤال المستخدم عن الصيغة المطلوبة
  const { value: selectedFormat } = await Swal.fire({
    title: 'اختر صيغة المشاركة',
    text: 'اختر التنسيق المناسب لمشاركة التقرير',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'تأكيد',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: 'var(--primary)',
    input: 'radio',
    inputOptions: {
      'image': '📷 صورة (PNG)',
      'pdf': '📄 ملف (PDF)',
      'excel': '📊 شيت اكسل (XLSX)'
    },
    inputValue: 'image', // القيمة الافتراضية
    customClass: {
      popup: 'swal-custom-z-index',
      input: 'swal-radio-grid'
    }
  });

  if (!selectedFormat) {
    return { success: false, message: 'تم إلغاء العملية' };
  }

  try {
    if (selectedFormat === 'excel') {
      return await exportToExcel(elementId, fileName);
    } 
    
    // إعدادات التحويل للصورة والـ PDF
    const canvas = await html2canvas(element, {
      scale: 2, // جودة مضاعفة
      useCORS: true,
      backgroundColor: getComputedStyle(document.body).backgroundColor,
      logging: false,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
            clonedElement.style.padding = '20px';
            clonedElement.style.borderRadius = '0';
            // تأكد من أن الألوان واضحة
            const computedStyle = getComputedStyle(document.body);
            if (computedStyle.color) clonedElement.style.color = computedStyle.color;
        }
      }
    });

    if (selectedFormat === 'image') {
      // تصدير كصورة PNG
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
      const file = new File([blob], `${fileName}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'تقرير CollectPro',
          text: 'مرفق تقرير التحصيلات المالية'
        });
        return { success: true };
      } else {
        const link = document.createElement('a');
        link.download = `${fileName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        return { success: true, message: 'تم تحميل التقرير كصورة' };
      }

    } else if (selectedFormat === 'pdf') {
      // تصدير كملف PDF
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const pdf = new jsPDF({
        orientation: imgWidth > imgHeight ? 'l' : 'p',
        unit: 'px',
        format: [imgWidth, imgHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], `${fileName}.pdf`, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: 'تقرير CollectPro (PDF)',
          text: 'مرفق تقرير التحصيلات بصيغة PDF'
        });
        return { success: true };
      } else {
        pdf.save(`${fileName}.pdf`);
        return { success: true, message: 'تم تحميل التقرير كـ PDF' };
      }
    }

  } catch (err) {
    logger.error('Export Error:', err);
    return { success: false, message: 'فشل تصدير التقرير' };
  }
};

/**
 * وظيفة مساعدة لتصدير الجدول إلى Excel
 */
const exportToExcel = async (elementId, fileName) => {
  try {
    const table = document.getElementById(elementId).querySelector('table');
    if (!table) return { success: false, message: 'لم يتم العثور على جدول داخل العنصر' };

    // تحويل الجدول إلى Workbook
    const wb = XLSX.utils.table_to_book(table, { sheet: "Sheet1", raw: true });
    
    // تحسين تنسيق RTL للشيت
    if(wb.Workbook) wb.Workbook.Views = [{ RTL: true }];
    else wb.Workbook = { Views: [{ RTL: true }] };
    
    // الحصول على الشيت الأول
    const ws = wb.Sheets["Sheet1"];
    
    // ضبط اتجاه الخلية من اليمين لليسار (لا يدعمه كل برامج الاكسل ولكن جيد للمحاولة)
    // مكتبة SheetJS المجانية لا تدعم التنسيقات المتقدمة (Styles) بشكل كامل في النسخة Community
    // لكن خاصية RTL في الـ Workbook View تعمل غالباً.

    // توليد الملف
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const file = new File([blob], `${fileName}.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'تقرير CollectPro (Excel)',
          text: 'مرفق تقرير التحصيلات بصيغة Excel'
        });
        return { success: true };
    } else {
        XLSX.writeFile(wb, `${fileName}.xlsx`);
        return { success: true, message: 'تم تحميل التقرير كملف Excel' };
    }
  } catch (err) {
    logger.error('Excel Export Error:', err);
    return { success: false, message: 'فشل تصدير ملف Excel' };
  }
};
