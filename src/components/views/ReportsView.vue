<template>
  <div class="reports-page animate-fade-in">
    
    <PageHeader 
      title="تقارير التحصيل" 
      subtitle="نظرة شاملة على أداء التحصيلات والاتجاهات"
      icon="📊"
    />

    <!-- القسم العلوي: الفلاتر -->
    <div class="controls-section">
      <div class="period-toggle">
        <button 
          v-for="period in periodOptions" 
          :key="period.value"
          class="toggle-btn"
          :class="{ active: store.selectedPeriod === period.value }"
          @click="handlePeriodChange(period.value)"
        >
          <span>{{ period.label }}</span>
        </button>
        <div class="active-bg" :style="activeBgStyle"></div>
      </div>
    </div>

    <!-- شبكة الإحصائيات (KPIs) -->
    <div class="stats-grid" v-if="!store.isLoading">
      
      <!-- الصف الأول: الأرقام الرئيسية -->
      <div class="stat-card stat-card--gradient-primary span-2-mobile">
        <div class="stat-content">
          <span class="stat-label">إجمالي التحويلات</span>
          <h2 class="stat-value">{{ formatNum(store.totalStats.totalAmount + store.totalStats.totalExtra) }}</h2>
          <div class="stat-breakdown">
            <span class="breakdown-item">صافي التحويل: {{ formatNum(store.totalStats.totalAmount) }}</span>
            <span class="separator">|</span>
            <span class="breakdown-item">صافي أخرى: {{ formatNum(store.totalStats.totalExtra) }}</span>
          </div>
          <div class="stat-meta">
            <i class="fas fa-coins"></i>
            <span>{{ selectedPeriodLabel }}</span>
          </div>
        </div>
        <div class="stat-icon-bg"><i class="fas fa-wallet"></i></div>
      </div>

      <div class="stat-card stat-card--gradient-success span-2-mobile">
        <div class="stat-content">
          <span class="stat-label">صافي المديونية</span>
          <h2 class="stat-value">{{ formatNum(store.totalStats.totalNet) }}</h2>
          <div class="stat-meta">
             <i class="fas fa-calendar-day"></i>
             <span>{{ selectedPeriodLabel }}</span>
          </div>

        </div>
        <div class="stat-icon-bg"><i class="fas fa-chart-pie"></i></div>
      </div>

      <!-- الصف الثاني: تفاصيل الخصومات (بجانب بعضهم) -->
      <div class="stat-card stat-card--surface small-card">
        <div class="stat-icon-wrapper color-orange">
          <i class="fas fa-chart-line"></i>
        </div>
        <div class="stat-info-simple">
          <span class="stat-label-sm">متوسط التحويلات</span>
          <span class="stat-value-sm">{{ formatNum((store.totalStats.totalAmount + store.totalStats.totalExtra) / (store.totalStats.recordCount || 1)) }}</span>
        </div>
      </div>

      <div class="stat-card stat-card--surface small-card">
        <div class="stat-icon-wrapper color-purple">
          <i class="fas fa-hand-holding-usd"></i>
        </div>
        <div class="stat-info-simple">
          <span class="stat-label-sm">إجمالي المحصل</span>
          <span class="stat-value-sm">{{ formatNum(store.totalStats.totalCollector) }}</span>
        </div>
      </div>
    </div>

    <!-- قسم الرسوم البيانية -->
    <section class="chart-section" v-if="!store.isLoading && store.chartData.length > 0">
      <div class="glass-panel">
        <div class="panel-header">
          <h3><i class="fas fa-chart-area text-gradient"></i> اتجاهات الأداء المالي</h3>
        </div>
        <div class="canvas-container">
          <canvas ref="trendChartCanvas"></canvas>
        </div>
      </div>
    </section>

    <!-- قوائم التميز (Top Lists) -->
    <div class="lists-grid">
      
      <!-- أفضل العملاء -->
      <div class="list-panel">
        <div class="panel-header">
          <div class="header-icon icon-success"><i class="fas fa-crown"></i></div>
          <h3>أفضل 10 عملاء</h3>
          <span class="badge-soft success">الأكثر تحصيلاً</span>
        </div>
        
        <div class="custom-list-scroll">
          <div 
            v-for="(customer, index) in store.top10Customers" 
            :key="index"
            class="rank-item"
          >
            <div class="rank-badge" :class="getRankClass(index)">{{ index + 1 }}</div>
            <div class="rank-info">
              <span class="customer-name">{{ customer.shop }}</span>
              <span class="customer-meta">كود: {{ customer.code }} | {{ customer.count }} عملية</span>
            </div>
            <div class="rank-value success">
              {{ formatNum(customer.totalNet) }}
            </div>
             <button class="action-btn-mini" @click="openNotesModal(customer.shop)">
              <i class="far fa-edit"></i>
            </button>
          </div>
          <div v-if="!store.top10Customers.length" class="empty-state">لا توجد بيانات</div>
        </div>
      </div>

      <!-- العملاء المتعثرين -->
      <div class="list-panel">
        <div class="panel-header">
          <div class="header-icon icon-danger"><i class="fas fa-exclamation-circle"></i></div>
          <h3>العملاء المتعثرين</h3>
          <span class="badge-soft danger">الأقل صافي</span>
        </div>
        
        <div class="custom-list-scroll">
          <div 
            v-for="(customer, index) in store.worst10Customers" 
            :key="index"
            class="rank-item"
          >
            <div class="rank-badge rank-badge-gray">{{ index + 1 }}</div>
            <div class="rank-info">
              <span class="customer-name">{{ customer.shop }}</span>
              <span class="customer-meta">كود: {{ customer.code }}</span>
            </div>
            <div class="rank-value danger dir-ltr">
              {{ formatNum(customer.totalNet) }}
            </div>
            <button class="action-btn-mini" @click="openNotesModal(customer.shop)">
              <i class="far fa-edit"></i>
            </button>
          </div>
          <div v-if="!store.worst10Customers.length" class="empty-state">لا توجد بيانات</div>
        </div>
      </div>

    </div>

    <!-- قوائم التحويلات (أعلى وأقل 10) -->
    <div class="lists-grid mt-4">
       
       <!-- أعلى 10 تحويلات -->
       <div class="list-panel">
          <div class="panel-header">
            <div class="header-icon" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;"><i class="fas fa-arrow-up"></i></div>
            <h3>أعلى 10 تحويلات</h3>
            <span class="badge-soft" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;">الأكثر نشاطاً</span>
          </div>
          
          <div class="custom-list-scroll">
            <div 
              v-for="(customer, index) in store.topTransferCustomers" 
              :key="index"
              class="rank-item"
            >
              <div class="rank-badge" :class="getRankClass(index)">{{ index + 1 }}</div>
              <div class="rank-info">
                <span class="customer-name">{{ customer.shop }}</span>
                <span class="customer-meta">كود: {{ customer.code }} | {{ customer.count }} عملية</span>
              </div>
              <div class="rank-value" style="color: #3b82f6;">
                {{ formatNum(customer.totalTransfer) }}
              </div>
               <button class="action-btn-mini" @click="openNotesModal(customer.shop)">
                <i class="far fa-edit"></i>
              </button>
            </div>
            <div v-if="!store.topTransferCustomers.length" class="empty-state">لا توجد بيانات</div>
          </div>
       </div>

       <!-- أقل 10 تحويلات -->
       <div class="list-panel">
          <div class="panel-header">
            <div class="header-icon" style="background: rgba(245, 158, 11, 0.1); color: #f59e0b;"><i class="fas fa-arrow-down"></i></div>
            <h3>أقل 10 تحويلات</h3>
            <span class="badge-soft" style="background: rgba(245, 158, 11, 0.1); color: #f59e0b;">الأقل نشاطاً</span>
          </div>
           
           <div class="custom-list-scroll">
            <div 
              v-for="(customer, index) in store.lowestTransferCustomers" 
              :key="index"
              class="rank-item"
            >
              <div class="rank-badge rank-badge-gray" style="background: #f59e0b;">{{ index + 1 }}</div>
              <div class="rank-info">
                <span class="customer-name">{{ customer.shop }}</span>
                <span class="customer-meta">كود: {{ customer.code }}</span>
              </div>
              <div class="rank-value" style="color: #f59e0b;">
                {{ formatNum(customer.totalTransfer) }}
              </div>
              <button class="action-btn-mini" @click="openNotesModal(customer.shop)">
                <i class="far fa-edit"></i>
              </button>
            </div>
            <div v-if="!store.lowestTransferCustomers.length" class="empty-state">لا توجد بيانات</div>
          </div>
       </div>
    </div>

    <!-- Modal ملاحظات -->
    <BaseModal v-model:show="showNotesModal" title="ملاحظات العميل">
      <div class="notes-ui">
        <h4 class="customer-title-modal">{{ selectedCustomer }}</h4>
        
        <div class="input-group-modern">
           <textarea 
            v-model="newNote.text" 
            placeholder="اكتب ملاحظة جديدة هنا..."
            class="modern-textarea"
          ></textarea>
          <div class="form-footer">
            <div class="pills-select">
               <button 
                v-for="cat in ['normal', 'important', 'warning']" 
                :key="cat"
                class="pill-option"
                :class="[{ active: newNote.category === cat }, cat]"
                @click="newNote.category = cat"
               >
                 {{ getCategoryLabel(cat) }}
               </button>
            </div>
            <button class="btn-send" @click="handleAddNote" :disabled="!newNote.text.trim()">
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>

        <div class="notes-timeline">
           <div 
            v-for="note in store.customerNotes" 
            :key="note.id" 
            class="timeline-item"
            :class="note.category"
           >
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                 <div class="timeline-header">
                    <span class="timeline-date">{{ formatDate(note.createdAt) }}</span>
                    <button class="btn-xs-delete" @click="handleDeleteNote(note.id)"><i class="fas fa-times"></i></button>
                 </div>
                 <p>{{ note.text }}</p>
              </div>
           </div>
           
           <div v-if="store.customerNotes.length === 0" class="empty-timeline">
             <i class="far fa-sticky-note"></i>
             <p>لا توجد ملاحظات مسجلة</p>
           </div>
        </div>
      </div>
    </BaseModal>

    <!-- Loader -->
    <div v-if="store.isLoading" class="loader-overlay">
      <Loader />
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, inject, watch, nextTick, computed } from 'vue';
import { useReportsStore } from '@/stores/reportsStore';
import { useAuthStore } from '@/stores/auth';
import PageHeader from '@/components/layout/PageHeader.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import Loader from '@/components/ui/Loader.vue';
import logger from '@/utils/logger.js';
import Chart from 'chart.js/auto';

const store = useReportsStore();
const authStore = useAuthStore();
const { addNotification } = inject('notifications');

const trendChartCanvas = ref(null);
let trendChart = null;

const periodOptions = [
  { value: 'day', label: 'يومي' },
  { value: 'week', label: 'أسبوعي' },
  { value: 'month', label: 'شهري' }
];

const showNotesModal = ref(false);
const selectedCustomer = ref('');
const newNote = ref({ text: '', category: 'normal' });

// --- Computed & Helpers ---
const selectedPeriodLabel = computed(() => {
  const p = periodOptions.find(o => o.value === store.selectedPeriod);
  return p ? p.label : '';
});

const activeBgStyle = computed(() => {
  const index = periodOptions.findIndex(p => p.value === store.selectedPeriod);
  return {
    transform: `translateX(${-index * 100}%)`, // RTL Logic
  };
});

// تحديث دالة التنسيق لإزالة الكسور
const formatNum = (val) => Math.round(Number(val || 0)).toLocaleString();

// ... (Rest of script)

// ... (End of script logic)

const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour:'2-digit', minute:'2-digit' });

const getCategoryLabel = (c) => ({ normal: 'عادي', important: 'مهم', warning: 'تحذير' }[c]);

const getRankClass = (idx) => {
  if(idx === 0) return 'gold';
  if(idx === 1) return 'silver';
  if(idx === 2) return 'bronze';
  return 'default';
};

// --- Actions ---
const handlePeriodChange = async (period) => {
  store.selectedPeriod = period;
  await nextTick();
  renderCharts();
};

const openNotesModal = async (shop) => {
  selectedCustomer.value = shop;
  await store.loadCustomerNotes(shop);
  showNotesModal.value = true;
};

const handleAddNote = async () => {
  if (!newNote.value.text.trim()) return;
  const res = await store.addCustomerNote(selectedCustomer.value, newNote.value.text.trim(), newNote.value.category);
  if (res.success) {
    addNotification(res.message, 'success');
    newNote.value.text = '';
    newNote.value.category = 'normal';
  } else addNotification(res.message, 'error');
};

const handleDeleteNote = async (id) => {
  const res = await store.deleteCustomerNote(selectedCustomer.value, id);
  if (res.success) addNotification(res.message, 'success');
  else addNotification(res.message, 'error');
};

// --- Charts ---
const renderCharts = () => {
  if (!trendChartCanvas.value || store.chartData.length === 0) return;
  
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js is not loaded correctly.');
    return;
  }

  if (trendChart) trendChart.destroy();

  const ctx = trendChartCanvas.value.getContext('2d');
  
  // Gradient Fill
  const gradientNet = ctx.createLinearGradient(0, 0, 0, 400);
  gradientNet.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
  gradientNet.addColorStop(1, 'rgba(16, 185, 129, 0)');

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: store.chartData.map(d => d.date),
      datasets: [
        {
          label: 'الصافي',
          data: store.chartData.map(d => d.totalNet),
          borderColor: '#10b981',
          borderWidth: 3,
          backgroundColor: gradientNet,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#10b981',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'التحويلات',
          data: store.chartData.map(d => d.totalAmount),
          borderColor: '#3b82f6',
          borderWidth: 2,
          borderDash: [5, 5], // Dashed line
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { position: 'top', align: 'end', labels: { font: { family: 'Cairo' }, usePointStyle: true, boxWidth: 8 } },
        tooltip: { 
          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
          titleColor: '#1f2937', 
          bodyColor: '#4b5563', 
          borderColor: '#e5e7eb', 
          borderWidth: 1, 
          titleFont: { family: 'Cairo', weight: 'bold' },
          bodyFont: { family: 'Cairo' },
          padding: 10,
          displayColors: true,
          rtl: true, // Support RTL in tooltips
          textDirection: 'rtl'
        }
      },
      scales: {
        y: { 
            beginAtZero: true, 
            grid: { color: 'rgba(0,0,0,0.03)' }, 
            ticks: { font: { family: 'Cairo' }, color: '#94a3b8' } 
        },
        x: { 
            grid: { display: false }, 
            ticks: { font: { family: 'Cairo', size: 10 }, color: '#94a3b8' } 
        }
      }
    }
  });
};

onMounted(async () => {
  if (!authStore.isInitialized) {
    await new Promise(r => { const u = watch(() => authStore.isInitialized, (v) => { if(v) { u(); r(); } }); });
  }
  if (authStore.isAuthenticated) {
    await store.loadAllLocalArchives();
    await nextTick();
    renderCharts();
  }
});

watch(() => store.chartData, () => nextTick(renderCharts), { deep: true });
</script>

<style scoped>
/* --- Layout & Base --- */
.reports-page { padding-bottom: 80px; font-family: 'Cairo', sans-serif; gap: 24px; display: flex; flex-direction: column; }
.animate-fade-in { animation: fadeIn 0.5s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* --- Controls Section --- */
.controls-section { display: flex; justify-content: center; margin-bottom: 10px; }
.period-toggle {
  background: var(--surface-bg, #fff);
  padding: 4px; border-radius: 12px; display: flex; position: relative;
  box-shadow: var(--shadow-sm); border: 1px solid var(--border-color);
}
.toggle-btn {
  position: relative; z-index: 2; border: none; background: none; padding: 8px 0; /* Remove horizontal padding to rely on width */
  font-family: inherit; font-size: 0.9rem; font-weight: 600; color: var(--text-muted);
  cursor: pointer; transition: color 0.3s ease; width: 100px; /* Increased to 100px */
  text-align: center;
}
.toggle-btn.active { color: #fff; }
.active-bg {
  position: absolute; top: 4px; right: 4px; width: 100px; /* Matched width */ height: calc(100% - 8px);
  background: var(--primary); border-radius: 10px; z-index: 1;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* --- Stats Grid --- */
.stats-grid { 
  display: grid; 
  grid-template-columns: repeat(2, 1fr); /* Default: 2 columns */
  gap: 16px; 
}

/* Span classes for layout control */
.span-2-mobile { grid-column: span 1; } /* On desktop each takes 1 column */

.stat-card {
  position: relative; border-radius: 20px; padding: 20px; overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.06); transition: transform 0.3s, box-shadow 0.3s;
  display: flex; align-items: center; justify-content: space-between;
  min-height: 140px;
}

.small-card {
  min-height: 100px; /* Smaller height for the secondary cards */
  padding: 15px;
}

.stat-card:hover { transform: translateY(-5px); box-shadow: 0 15px 35px rgba(0,0,0,0.1); }

.stat-card--gradient-primary { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: white; }
.stat-card--gradient-primary .stat-label { color: rgba(255,255,255,0.95) !important; text-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.stat-card--gradient-primary .stat-value {
  background: linear-gradient(to bottom, #fffbf0 0%, #e2e8f0 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: #fff; /* Fallback */
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.stat-card--gradient-primary .stat-meta { color: rgba(255,255,255,0.9); }
.stat-breakdown { font-size: 0.75rem; color: rgba(255,255,255,0.85); margin-bottom: 8px; display: flex; gap: 6px; align-items: center; }
.breakdown-item { font-weight: 500; }
.separator { opacity: 0.5; }
.stat-card--gradient-primary .stat-icon-bg { color: rgba(255,255,255,0.15); }

.stat-card--gradient-success { background: linear-gradient(135deg, var(--success, #10b981), #059669); color: white; }
.stat-card--gradient-success .stat-label { color: rgba(255,255,255,0.95) !important; text-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.stat-card--gradient-success .stat-value {
  background: linear-gradient(to bottom, #fffbf0 0%, #e2e8f0 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: #fff; /* Fallback */
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.stat-card--gradient-success .stat-meta { color: rgba(255,255,255,0.9); background: rgba(255,255,255,0.2); border-radius: 20px; padding: 2px 8px; font-size: 0.75rem; width: fit-content; display: inline-flex; align-items: center; gap: 4px; margin-top: 6px; }
.stat-card--gradient-success .stat-icon-bg { color: rgba(255,255,255,0.15); }

.stat-card--surface { background: var(--surface-bg); border: 1px solid var(--border-color); }
.stat-info-simple { display: flex; flex-direction: column; }
.stat-label-sm { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 4px; }
.stat-value-sm { font-size: 1.4rem; font-weight: 800; color: var(--text-main); }
.stat-icon-wrapper { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; margin-left: 15px; }
.color-orange { background: rgba(245, 158, 11, 0.1); color: var(--warning); }
.color-purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }

.small-card {
  min-height: 130px; /* Increased height for vertical stack */
  padding: 20px;
  flex-direction: column; /* Stack vertically for better centering */
  justify-content: center;
  gap: 10px;
  text-align: center;
}
.small-card .stat-icon-wrapper {
  margin: 0; /* Remove margin */
  width: 52px; height: 52px;
  font-size: 1.5rem;
}
.small-card .stat-info-simple {
  align-items: center;
}
.small-card .stat-value-sm {
  font-size: 1.5rem;
}

.stat-content { position: relative; z-index: 2; width: 100%; display: flex; flex-direction: column; }
.stat-label { font-size: 0.9rem; font-weight: 600; display: block; margin-bottom: 8px; }
.stat-value { font-size: 2rem; font-weight: 800; line-height: 1; margin: 0 0 10px 0; }
.stat-meta { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; }
.stat-icon-bg { position: absolute; left: -10px; bottom: -10px; font-size: 5rem; transform: rotate(15deg); z-index: 1; pointer-events: none; }

/* --- Charts --- */
.chart-section { margin-top: 10px; }
.glass-panel {
  background: var(--surface-bg); border-radius: 24px; padding: 20px;
  box-shadow: var(--container-shadow); border: 1px solid var(--border-color);
}
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.panel-header h3 { font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin: 0; display: flex; align-items: center; gap: 8px; }
.canvas-container { height: 280px; width: 100%; }
.text-gradient { 
    background: linear-gradient(135deg, var(--primary), var(--info)); 
    -webkit-background-clip: text; 
    background-clip: text;
    -webkit-text-fill-color: transparent; 
}

/* --- Lists Grid --- */
.lists-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }
.list-panel { background: var(--surface-bg); border-radius: 20px; padding: 20px; box-shadow: var(--container-shadow); display:flex; flex-direction: column; }
.panel-header { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; }
.header-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
.icon-success { background: rgba(16, 185, 129, 0.1); color: var(--success); }
.icon-danger { background: rgba(239, 68, 68, 0.1); color: var(--danger); }
.panel-header h3 { font-size: 1.05rem; font-weight: 700; margin: 0; flex: 1; color: var(--text-main); }
.badge-soft { font-size: 0.7rem; padding: 4px 10px; border-radius: 20px; font-weight: 600; }
.badge-soft.success { background: rgba(16, 185, 129, 0.1); color: var(--success); }
.badge-soft.danger { background: rgba(239, 68, 68, 0.1); color: var(--danger); }

.custom-list-scroll { max-height: 350px; overflow-y: auto; padding-right: 2px; }
.custom-list-scroll::-webkit-scrollbar { width: 4px; }
.custom-list-scroll::-webkit-scrollbar-thumb { background: var(--gray-300); border-radius: 10px; }

.rank-item { display: flex; align-items: center; padding: 12px; margin-bottom: 8px; background: var(--gray-100); border-radius: 14px; transition: transform 0.2s; }
.rank-item:hover { transform: translateX(-4px); background: rgba(var(--primary-rgb), 0.05); }
.rank-badge { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-weight: 700; font-size: 0.9rem; color: #fff; margin-left: 12px; flex-shrink: 0; box-shadow: var(--shadow-sm); }
.rank-badge.gold { background: linear-gradient(135deg, #fbbf24, #d97706); }
.rank-badge.silver { background: linear-gradient(135deg, #94a3b8, #64748b); }
.rank-badge.bronze { background: linear-gradient(135deg, #d97706, #b45309); }
.rank-badge.default { background: var(--gray-400); color: var(--text-main); box-shadow: none; font-size: 0.8rem; }
.rank-badge-gray { background: var(--danger); color: #fff; opacity: 0.8; }

.rank-info { flex: 1; display: flex; flex-direction: column; }
.customer-name { font-weight: 700; font-size: 0.9rem; color: var(--text-main); }
.customer-meta { font-size: 0.75rem; color: var(--text-muted); }
.rank-value { font-weight: 800; font-size: 1rem; margin-right: 8px; }
.rank-value.success { color: var(--success); }
.rank-value.danger { color: var(--danger); }
.action-btn-mini { border: none; background: transparent; color: var(--text-muted); cursor: pointer; padding: 8px; margin-right: 8px; border-radius: 8px; transition: 0.2s; }
.action-btn-mini:hover { background: rgba(0,0,0,0.05); color: var(--primary); }

/* --- Compact Lists --- */
.compact-panel { padding: 15px; min-height: fit-content; }
.panel-header-mini { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.95rem; margin-bottom: 12px; color: var(--text-main); border-bottom: 1px solid var(--border-color); padding-bottom: 8px; }
.mini-list { display: flex; flex-direction: row; flex-wrap: wrap; gap: 8px; }
.mini-item { flex: 1; min-width: 140px; background: var(--gray-100); padding: 8px 12px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; border: 1px solid transparent; }
.text-primary { color: var(--primary) !important; }
.text-warning { color: var(--warning) !important; }
.mini-item .name { font-weight: 600; color: var(--text-main); }
.mini-item .value { font-weight: 800; color: var(--info); }

/* --- Notes Modal --- */
.notes-ui { display: flex; flex-direction: column; gap: 20px; }
.customer-title-modal { font-size: 1.1rem; color: var(--primary); margin: 0; text-align: center; border-bottom: 2px solid var(--border-color); padding-bottom: 10px; }
.input-group-modern { background: var(--gray-100); border-radius: 16px; padding: 12px; border: 1px solid var(--border-color); }
.modern-textarea { width: 100%; border: none; background: transparent; resize: none; min-height: 60px; font-family: inherit; font-size: 0.95rem; outline: none; color: var(--text-main); }
.form-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
.pills-select { display: flex; gap: 8px; }
.pill-option { border: none; background: rgba(0,0,0,0.05); color: var(--text-muted); padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: 0.2s; }
.pill-option.active.normal { background: var(--info); color: #fff; }
.pill-option.active.important { background: var(--warning); color: #fff; }
.pill-option.active.warning { background: var(--danger); color: #fff; }
.btn-send { width: 40px; height: 40px; background: var(--primary); color: #fff; border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3); transition: transform 0.2s; }
.btn-send:hover { transform: scale(1.1); }
.btn-send:disabled { background: var(--gray-400); cursor: not-allowed; transform: none; box-shadow: none; }

.notes-timeline { display: flex; flex-direction: column; gap: 15px; max-height: 300px; overflow-y: auto; padding: 5px; }
.timeline-item { display: flex; gap: 12px; position: relative; }
.timeline-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--gray-300); margin-top: 6px; flex-shrink: 0; position: relative; z-index: 1; }
.timeline-item::after { content: ''; position: absolute; right: 5.5px; top: 18px; bottom: -20px; width: 1px; background: var(--border-color); }
.timeline-item:last-child::after { display: none; }
.timeline-item.normal .timeline-dot { background: var(--info); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2); }
.timeline-item.important .timeline-dot { background: var(--warning); box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2); }
.timeline-item.warning .timeline-dot { background: var(--danger); box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2); }

.timeline-content { flex: 1; background: var(--surface-bg); padding: 10px 14px; border-radius: 12px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); }
.timeline-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.timeline-date { font-size: 0.7rem; color: var(--text-muted); }
.btn-xs-delete { border: none; background: transparent; color: var(--danger); cursor: pointer; font-size: 0.8rem; opacity: 0.6; }
.btn-xs-delete:hover { opacity: 1; }
.timeline-content p { margin: 0; font-size: 0.9rem; color: var(--text-main); line-height: 1.4; }

.empty-timeline, .empty-state { text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 20px; opacity: 0.7; }
.loader-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); z-index: 99; display: flex; align-items: center; justify-content: center; }
.dir-ltr { direction: ltr; text-align: right; }

/* --- Responsive Layout Adjustments --- */
@media (max-width: 600px) {
  .period-toggle { width: 100%; justify-content: center; }
  .toggle-btn { flex: 1; }
  .active-bg { width: 33.33%; }
  
  /* On mobile: Main cards take full width */
  .stats-grid {
      grid-template-columns: 1fr 1fr; /* Keep 2 columns grid */
  }
  
  .span-2-mobile { 
      grid-column: span 2; /* Main cards take full row on mobile */
  }
  
  /* Secondary cards stay side-by-side (1fr 1fr) automatically */
  
  .stat-card { padding: 16px; }
  .stat-value { font-size: 1.6rem; }
  .lists-grid { grid-template-columns: 1fr; }
  .custom-list-scroll { max-height: 300px; }
  
  /* Make secondary cards smaller on mobile to fit */
  .small-card .stat-icon-wrapper { width: 36px; height: 36px; font-size: 1.1rem; margin-left: 10px; }
  .small-card .stat-value-sm { font-size: 1.1rem; }
  .small-card .stat-label-sm { font-size: 0.75rem; }
}
</style>
