
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

document.addEventListener('DOMContentLoaded', async () => {
    // تحديث بيانات المستخدم في الشريط الجانبي
    if (window.populateUserData) {
        await window.populateUserData();
    }

    const plansContainer = document.querySelector('.plans-container');
    if (!plansContainer) {
        console.error("Plans container not found!");
        return;
    }

    const originalContent = plansContainer.innerHTML;
    plansContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> جاري تحميل الخطط...</div>';

    try {
        // استخدام البيانات الثابتة بدلاً من قاعدة البيانات
        const PLAN_DETAILS = {
            'monthly': { name: 'خطة شهرية', price: 30, durationMonths: 1, period: 'شهريًا' },
            'quarterly': { name: 'خطة 3 شهور', price: 80, durationMonths: 3, period: '3 شهور' },
            'yearly': { name: 'خطة سنوية', price: 360, durationMonths: 12, period: 'سنويًا' }
        };

        // تحويل البيانات الثابتة إلى تنسيق مشابه للبيانات من قاعدة البيانات
        const plans = Object.entries(PLAN_DETAILS).map(([planId, details]) => ({
            plan_id: planId,
            name: details.name,
            price: details.price,
            metadata: {
                featured: details.price === 80, // جعل خطة 3 شهور مميزة
                features: JSON.stringify([
                    'وصول كامل للمنصة',
                    'دعم فني على مدار الساعة',
                    'تحديثات مجانية',
                    details.durationMonths === 1 ? 'مرونة في الإلغاء' :
                    details.durationMonths >= 3 ? 'مرونة في الإلغاء' : '',
                    details.durationMonths === 3 ? '💰 خصم خاص للمدة الطويلة (خصم 10 جنيه - إجمالي 80 جنيه)' :
                    details.durationMonths === 12 ? '🎁 شهر إضافي مجاني (13 شهر بسعر 12 شهر)' : ''
                ].filter(feature => feature !== '')),
                period: details.period
            }
        }));

        plansContainer.innerHTML = ''; 

        if (plans && plans.length > 0) {
            plans.forEach(plan => {
                const planCard = document.createElement('div');
                planCard.className = `plan-card ${plan.metadata?.featured ? 'featured' : ''}`;
                
                let featuresHtml = '';
                if (plan.metadata?.features) {
                    try {
                        const features = JSON.parse(plan.metadata.features);
                        featuresHtml = features.map(feature => `<li><i class="fas fa-check"></i> ${feature}</li>`).join('');
                    } catch (e) {
                        console.error('Error parsing plan features:', e);
                        featuresHtml = '<li><i class="fas fa-exclamation-circle"></i> خطأ في عرض الميزات</li>';
                    }
                }

                planCard.innerHTML = `
                    ${plan.metadata?.featured ? '<div class="featured-badge">الأكثر شيوعًا</div>' : ''}
                    <div class="plan-header">
                        <h3>${plan.name || 'خطة مخصصة'}</h3>
                        <div class="plan-price">
                            <span class="currency">ج.م</span>
                            <span class="price">${plan.price || 0}</span>
                            <span class="period">/ ${plan.metadata?.period || ''}</span>
                        </div>
                    </div>
                    <div class="plan-features">
                        <ul>${featuresHtml}</ul>
                    </div>
                    <div class="plan-footer">
                        <button class="choose-plan-btn" data-plan-id="${plan.plan_id}">اختر الخطة</button>
                    </div>
                `;
                plansContainer.appendChild(planCard);
            });

            document.querySelectorAll('.choose-plan-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const planId = btn.getAttribute('data-plan-id');
                    if (planId) {
                        // التحقق من وجود طلب معلق للمستخدم
                        try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (user) {
                                const { data: pendingSubscriptions, error } = await supabase
                                    .from('subscriptions')
                                    .select('id, status, created_at, plan_name')
                                    .eq('user_id', user.id)
                                    .eq('status', 'pending');

                                if (pendingSubscriptions && pendingSubscriptions.length > 0 && !error) {
                                    const latestPending = pendingSubscriptions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
                                    const planName = latestPending.plan_name || 'خطة الاشتراك';
                                    const requestDate = new Date(latestPending.created_at).toLocaleDateString('ar-EG');

                                    const message = `عذراً، لديك طلب اشتراك قيد المراجعة حالياً. لا يمكنك تقديم طلب جديد حتى يتم الانتهاء من مراجعة الطلب الحالي.\n\n` +
                                                   `تفاصيل الطلب الحالي:\n` +
                                                   `• نوع الخطة: ${planName}`;

                                    showAlert(message, 'warning');
                                    return;
                                }
                            }
                        } catch (error) {
                            console.error('Error checking pending subscriptions:', error);
                        }

                        localStorage.setItem('selectedPlanId', planId);
                        window.location.href = 'payment.html';
                    }
                });
            });

        } else {
            plansContainer.innerHTML = '<p class="error-message"><i class="fas fa-info-circle"></i> لا توجد خطط اشتراك متاحة حاليًا.</p>';
        }

    } catch (error) {
        console.error("Error fetching subscription plans:", error);
        plansContainer.innerHTML = `<p class="error-message"><i class="fas fa-exclamation-triangle"></i> حدث خطأ أثناء تحميل الخطط. يرجى المحاولة مرة أخرى لاحقًا.</p>`;
    }

    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const faqItem = question.parentElement;
            faqItem.classList.toggle('active');
        });
    });
});
