
document.addEventListener('DOMContentLoaded', async () => {
    const plansContainer = document.querySelector('.plans-container');
    if (!plansContainer) {
        console.error("Plans container not found!");
        return;
    }

    const originalContent = plansContainer.innerHTML;
    plansContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> جاري تحميل الخطط...</div>';

    try {
        const { data: plans, error } = await supabase
            .from('payments')
            .select('*')
            .eq('active', true)
            .order('price', { ascending: true });

        if (error) {
            throw error;
        }

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
                btn.addEventListener('click', () => {
                    const planId = btn.getAttribute('data-plan-id');
                    if (planId) {
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
