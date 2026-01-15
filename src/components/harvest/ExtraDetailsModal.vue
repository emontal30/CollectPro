<template>
  <teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="close">
      <div class="modal-content extra-details-modal animate-scale-in">
        
        <!-- Header -->
        <div class="modal-header">
          <div class="header-info">
            <h3 class="shop-title">
              <i class="fas fa-store text-primary"></i>
              {{ shopName || 'بدون اسم' }}
              <span class="code-badge">{{ shopCode || '---' }}</span>
            </h3>
          </div>
          <button class="close-btn" @click="close">&times;</button>
        </div>

        <!-- Read-only Base Amount -->
        <div class="base-amount-section">
          <span class="base-label">مبلغ التحويل الأساسي :  </span>
          <span class="base-value">{{ formatNumber(baseAmount) }}</span>
        </div>

        <!-- Modern Table -->
        <div class="details-list scrollable-list">
          <div class="table-header">
            <div class="header-cell header-number">
              <i class="fas fa-hashtag"></i>
            </div>
            <div class="header-cell header-amount">
              <i class="fas fa-coins"></i>
              <span>المبلغ الإضافي</span>
            </div>
            <div class="header-cell header-time">
              <i class="fas fa-clock"></i>
              <span>التوقيت</span>
            </div>
            <div class="header-cell header-actions"></div>
          </div>

          <div 
            v-for="(item, index) in localDetails" 
            :key="index" 
            class="detail-row animate-slide-in"
            :style="{ animationDelay: `${index * 50}ms` }"
          >
            <span class="row-number">{{ index + 1 }}</span>
            
            <div class="input-wrapper">
              <input
                ref="amountInputs"
                :value="formatWithCommas(item.amount)"
                type="text"
                inputmode="decimal"
                class="detail-input"
                :class="{ 'negative': parseFloat(item.amount) < 0 }"
                placeholder="0"
                @input="(e) => handleInput(e, index)"
                @keydown.enter.prevent="focusNext(index)"
              />
            </div>

            <div class="timestamp-display">
              <span v-if="item.timestamp" class="time-badge">
                {{ formatTime(item.timestamp) }}
                <span class="separator">|</span>
                {{ formatDate(item.timestamp) }}
              </span>
              <span v-else class="placeholder-text">--:--</span>
            </div>
            
            <button v-if="localDetails.length > 1 && item.amount" class="btn-delete" @click="removeRow(index)" tabindex="-1">
                <i class="fas fa-times"></i>
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <div class="total-summary">
            <span class="label">إجمالي الإضافي:</span>
            <span class="value" :class="totalSum >= 0 ? 'text-success' : 'text-danger'">
              {{ formatNumber(totalSum) }}
            </span>
          </div>
          
          <div class="actions">
            <button class="btn btn-secondary" @click="close">إلغاء</button>
            <button class="btn btn-primary" @click="save">
              <i class="fas fa-check"></i>
              تأكيد ({{ formatNumber(totalSum) }})
            </button>
          </div>
        </div>

      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { TimeService } from '@/utils/time';

const props = defineProps({
  isOpen: Boolean,
  shopName: String,
  shopCode: [String, Number],
  baseAmount: [Number, String],
  initialDetails: {
    type: Array,
    default: () => []
  },
  initialTotal: [Number, String]
});

const emit = defineEmits(['close', 'save']);

const localDetails = ref([]);
const amountInputs = ref([]);

// Initialize data when modal opens


const addEmptyRow = () => {
  localDetails.value.push({
    amount: '',
    timestamp: null
  });
};

const handleInput = (e, index) => {
  let val = e.target.value;
  
  // Normalize Arabic numerals to English
  const arabicMap = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
  val = val.replace(/[٠-٩]/g, m => arabicMap[m]);

  // Remove commas for storage/validation
  val = val.replace(/,/g, '');

  // Allow numbers, minus sign, and one dot (including intermediate states)
  // This regex allows: "", "-", ".", "5", "5.", "-5", "-5.5", etc.
  if (!/^-?\d*\.?\d*$/.test(val)) {
    // If invalid, revert to previous value (formatted)
    e.target.value = formatWithCommas(localDetails.value[index].amount);
    return;
  }

  // Update the model inputs with clean numeric string
  localDetails.value[index].amount = val;

  // Only trigger row addition and timestamp for actual numeric values (not just "-" or ".")
  const isActualNumber = val !== '' && val !== '-' && val !== '.' && !isNaN(parseFloat(val));
  
  // If typing in the last row and it's an actual number, add a new one
  if (index === localDetails.value.length - 1 && isActualNumber) {
    // Add timestamp to current row if not exists
    if (!localDetails.value[index].timestamp) {
      localDetails.value[index].timestamp = new Date().toISOString();
    }
    addEmptyRow();
    
    // Scroll to bottom
    nextTick(() => {
        const list = document.querySelector('.details-list');
        if(list) list.scrollTop = list.scrollHeight;
    });
  }
};

const removeRow = (index) => {
    localDetails.value.splice(index, 1);
    // If we removed all, add one empty
    if(localDetails.value.length === 0) addEmptyRow();
};

const focusNext = (index) => {
    if(index < localDetails.value.length - 1) {
        // Focus next input logic needs ref access or DOM query
        const inputs = document.querySelectorAll('.detail-input');
        if(inputs[index + 1]) inputs[index + 1].focus();
    }
};

const totalSum = computed(() => {
  return localDetails.value.reduce((sum, item) => {
    const val = parseFloat(item.amount);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
});

const save = () => {
  // Filter out empty rows
  const validDetails = localDetails.value.filter(item => 
    item.amount !== '' && item.amount !== null && item.amount !== '-' && !isNaN(parseFloat(item.amount))
  );
  
  emit('save', {
    total: totalSum.value,
    details: validDetails
  });
  close();
};

const close = () => {
  emit('close');
};

// Formatters
const formatNumber = (num) => {
  if (num === '' || num === null || isNaN(num)) return '0';
  return new Intl.NumberFormat('en-US').format(num);
};

const formatTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric' });
};

// Initialize data when modal opens
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    if (props.initialDetails && props.initialDetails.length > 0) {
      // Deep copy existing details
      localDetails.value = JSON.parse(JSON.stringify(props.initialDetails));
      
      // Ensure there's always an empty row at the end for new entry
      const lastItem = localDetails.value[localDetails.value.length - 1];
      if (lastItem.amount !== '' && lastItem.amount !== null) {
        addEmptyRow();
      }
    } else {
      // Initial state: One empty row or pre-filled if total exists but no details
      localDetails.value = [];
      if (props.initialTotal && parseFloat(props.initialTotal) !== 0) {
        // Migration: If there was a total but no details, treat it as the first entry
        localDetails.value.push({
          amount: props.initialTotal,
          timestamp: new Date().toISOString() // Approximate since we don't know when
        });
      }
      addEmptyRow();
    }
    
    // Focus first empty input
    nextTick(() => {
        const inputs = document.querySelectorAll('.detail-input');
        if(inputs.length > 0) {
             // Focus the last one (empty) or specific logic? 
             // Logic: Focus the last empty one is usually best for "adding more"
             inputs[inputs.length - 1].focus();
        }
    });
  }
}, { immediate: true });

const formatWithCommas = (val) => {
  if (val === '' || val === null || val === undefined) return '';
  const str = String(val);
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join('.');
};


</script>

<style scoped>
/* =========================================
   MODAL OVERLAY - الطبقة الخلفية للنافذة المنبثقة
   ========================================= */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: var(--z-modal-backdrop);
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* =========================================
   MODAL CONTENT - محتوى النافذة المنبثقة
   ========================================= */
.modal-content {
  background: var(--surface-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-xl);
  width: 90%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  max-height: 85vh;
  box-shadow: var(--shadow-lg), 0 25px 50px -12px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

/* =========================================
   MODAL HEADER - رأس النافذة
   ========================================= */
.modal-header {
  padding: var(--spacing-md);
  background: linear-gradient(to bottom, var(--gray-100), var(--surface-bg));
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.shop-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.shop-title .fa-store {
  color: var(--primary);
  font-size: 1rem;
}

.code-badge {
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--gray-200);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  letter-spacing: 0.5px;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.75rem;
  line-height: 1;
  cursor: pointer;
  padding: 0 var(--spacing-sm);
  transition: var(--transition-fast);
  opacity: 0.7;
}

.close-btn:hover {
  opacity: 1;
  color: var(--danger);
  transform: scale(1.1);
}

/* =========================================
   BASE AMOUNT SECTION - قسم المبلغ الأساسي
   ========================================= */
.base-amount-section {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--gray-100);
  border-bottom: 2px solid var(--primary);
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--spacing-sm);
}

.base-label {
  font-size: 0.85rem;
  color: var(--text-main);
  font-weight: 600;
}

.base-value {
  font-family: var(--font-family-mono);
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--primary);
  letter-spacing: 0.5px;
}

/* =========================================
   DETAILS LIST - قائمة التفاصيل
   ========================================= */
.details-list {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  display: flex;
  flex-direction: column;
  background: var(--surface-bg);
}

/* Modern Table Header */
.table-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: 45px 1fr 145px 40px;
  gap: 0;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  padding: var(--spacing-md) var(--spacing-sm);
  border-bottom: 2px solid var(--primary-dark);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-cell {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: white;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.header-cell i {
  opacity: 0.9;
  font-size: 0.85rem;
}

.header-cell:not(:first-child) {
  border-right: 2px solid rgba(255, 255, 255, 0.4);
  padding-right: var(--spacing-sm);
}

.header-number {
  justify-content: center;
}

.header-amount {
  justify-content: center;
}

.header-time {
  justify-content: center;
}

.header-actions {
  justify-content: center;
}

.detail-row {
  display: grid;
  grid-template-columns: 45px 1fr 145px 40px;
  align-items: center;
  gap: 0;
  background: var(--white);
  padding: var(--spacing-md) var(--spacing-sm);
  border-bottom: 1px solid var(--gray-200);
  transition: var(--transition-fast);
  position: relative;
}

.detail-row:hover {
  background: linear-gradient(to left, rgba(var(--primary-rgb), 0.03), transparent);
  border-left: 3px solid var(--primary);
  padding-right: calc(var(--spacing-sm) + 3px);
}

.detail-row:focus-within {
  background: linear-gradient(to left, rgba(var(--primary-rgb), 0.05), var(--white));
  border-left: 3px solid var(--primary);
  box-shadow: inset 0 0 0 1px rgba(var(--primary-rgb), 0.2);
  padding-right: calc(var(--spacing-sm) + 3px);
}

.detail-row:last-child {
  border-bottom: none;
}

.row-number {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gray-100);
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 700;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  margin-left: var(--spacing-xs);
}

.input-wrapper {
  flex: 1;
  padding-right: var(--spacing-sm);
  border-right: 2px solid var(--gray-300);
}

.detail-input {
  width: 85%;
  display: block;
  margin: 0 auto;
  background: var(--gray-100);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  color: var(--text-main);
  font-size: 1rem;
  font-weight: 700;
  font-family: var(--font-family-mono);
  outline: none;
  padding: 4px 8px;
  transition: var(--transition-fast);
  text-align: center;
}

.detail-input:focus {
  background: var(--white);
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.1);
}

.detail-input::placeholder {
  color: var(--gray-400);
  opacity: 0.6;
}

.detail-input.negative {
  color: var(--danger);
}

.timestamp-display {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-right: var(--spacing-sm);
  border-right: 2px solid var(--gray-300);
}

.time-badge {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-muted);
  white-space: nowrap;
  background: var(--gray-100);
  padding: 2px 8px;
  border-radius: var(--border-radius-sm);
}

.separator {
  opacity: 0.5;
}

.placeholder-text {
  color: var(--gray-400);
  font-size: 0.75rem;
  font-style: italic;
}

.btn-delete {
  background: none;
  border: none;
  color: var(--danger);
  cursor: pointer;
  opacity: 0.4;
  transition: var(--transition-fast);
  padding: var(--spacing-xs);
  font-size: 0.9rem;
}

.btn-delete:hover {
  opacity: 1;
  transform: scale(1.2);
}

/* =========================================
   MODAL FOOTER - تذييل النافذة
   ========================================= */
.modal-footer {
  padding: var(--spacing-md);
  background: linear-gradient(to top, var(--gray-100), var(--surface-bg));
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
}

.total-summary {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.total-summary .label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.total-summary .value {
  font-size: 1.3rem;
  font-weight: 800;
  font-family: var(--font-family-mono);
  letter-spacing: 0.5px;
}

.actions {
  display: flex;
  gap: var(--spacing-sm);
}

/* =========================================
   ANIMATIONS - الحركات والانتقالات
   ========================================= */
.animate-scale-in {
  animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes scaleIn {
  from { 
    opacity: 0; 
    transform: scale(0.95) translateY(-20px);
  }
  to { 
    opacity: 1; 
    transform: scale(1) translateY(0);
  }
}

.animate-slide-in {
  animation: slideIn 0.3s ease-out backwards;
}

@keyframes slideIn {
  from { 
    opacity: 0; 
    transform: translateX(-10px);
  }
  to { 
    opacity: 1; 
    transform: translateX(0);
  }
}

/* =========================================
   DARK MODE SUPPORT - دعم الوضع الليلي
   ========================================= */
:deep(body.dark) .modal-overlay {
  background: rgba(0, 0, 0, 0.80);
}

:deep(body.dark) .modal-content {
  box-shadow: var(--shadow-lg), 0 25px 50px -12px rgba(0, 0, 0, 0.7);
}

:deep(body.dark) .modal-header {
  background: linear-gradient(to bottom, var(--gray-200), var(--surface-bg));
}

:deep(body.dark) .base-amount-section {
  background: var(--gray-200);
  border-bottom-color: var(--primary-light);
}

:deep(body.dark) .base-value {
  color: var(--primary-light);
}

:deep(body.dark) .detail-row {
  background: var(--gray-200);
}

:deep(body.dark) .row-number {
  background: var(--gray-300);
}

:deep(body.dark) .time-badge {
  background: var(--gray-300);
}

:deep(body.dark) .modal-footer {
  background: linear-gradient(to top, var(--gray-200), var(--surface-bg));
}

:deep(body.dark) .table-header {
  background: linear-gradient(135deg, var(--primary-dark), var(--primary));
}

:deep(body.dark) .detail-row:hover {
  background: linear-gradient(to left, rgba(var(--primary-rgb), 0.08), transparent);
}
</style>
