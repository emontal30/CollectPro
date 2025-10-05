document.addEventListener('DOMContentLoaded', () => {
  console.log('subscriptions.js loaded and DOM fully parsed.');

  // أزرار اختيار الخطة
  const planButtons = document.querySelectorAll('.choose-plan-btn');
  console.log(`Found ${planButtons.length} plan buttons.`);

  planButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const planId = btn.getAttribute('data-plan-id');
      console.log(`Plan selected: ${planId}`);

      if (planId) {
        // حفظ الخطة المختارة في التخزين المحلي
        localStorage.setItem('selectedPlanId', planId);
        console.log(`Saved plan ID to localStorage.`);
        
        // التوجه لصفحة الدفع
        window.location.href = 'payment.html';
      } else {
        console.error('Missing data-plan-id attribute on button.');
        alert('حدث خطأ أثناء اختيار الخطة. يرجى المحاولة مرة أخرى.');
      }
    });
  });

  // قسم الأسئلة الشائعة
  const faqQuestions = document.querySelectorAll('.faq-question');
  console.log(`Found ${faqQuestions.length} FAQ items.`);

  faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
      const faqItem = question.parentElement;
      faqItem.classList.toggle('active');
    });
  });
});
