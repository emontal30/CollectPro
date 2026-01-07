<template>
  <div class="harvest-page">
    
    <div v-if="collabStore.activeSessionId && !isSharedView" class="collab-banner animate-slide-down">
      <div class="banner-content">
        <i class="fas fa-eye pulse-icon"></i>
        <span>
          أنت تشاهد تحصيلات: <strong>{{ collabStore.activeSessionName }}</strong>
          <span v-if="isReadOnly" class="badge-viewer">(وضع المشاهدة فقط)</span>
        </span>
      </div>
      <button @click="exitSession" class="btn-exit">
        <i class="fas fa-sign-out-alt"></i> خروج
      </button>
    </div>

    <PageHeader 
      v-if="!isSharedView"
      title="التحصيلات" 
      subtitle="إدارة وتتبع جميع تحصيلات العملاء"
      icon="💰"
    />

    <div v-if="!isSharedView" class="date-display">
      <i class="fas fa-calendar-alt calendar-icon"></i>
      <span class="label">اليوم:</span>
      <span class="value">{{ currentDay }}</span>
      <span class="separator">|</span>
      <span class="label">التاريخ:</span>
      <span class="value">{{ currentDate }}</span>
    </div>

    <div class="action-bar mb-3 flex gap-2 justify-center flex-wrap" v-if="!isSharedView">
       <button class="btn btn-sm btn-outline-warning" @click="showMissingCenters" title="عرض المحلات الموجودة في خط السير ولم يتم العمل عليها اليوم">
          <i class="fas fa-eye-slash"></i> مراكز لم يتم التحويل لها
       </button>

       <button class="btn btn-sm btn-outline-danger" @click="showOverdueModal" title="عرض مديونيات الأيام السابقة">
          <i class="fas fa-history"></i> المتأخرات
       </button>

       <div class="relative" v-click-outside="() => showProfileDropdown = false">
         <button class="btn btn-sm btn-outline-primary" @click="toggleProfileDropdown" title="ترتيب الجدول حسب قالب خط سير محفوظ">
            <i class="fas fa-sort-amount-down"></i> ترتيب حسب خط السير
            <i class="fas fa-chevron-down text-xs ml-2"></i>
         </button>
         <div v-if="showProfileDropdown" class="profile-dropdown">
            <div v-if="savedItineraryProfiles.length === 0" class="dropdown-item disabled">
              لا توجد قوالب محفوظة
            </div>
            <a 
              v-for="profile in savedItineraryProfiles" 
              :key="profile.slot_number" 
              class="dropdown-item"
              @click="applyItineraryProfile(profile)"
            >
              {{ profile.profile_name }}
            </a>
         </div>
       </div>
    </div>

    <ColumnVisibility
      v-model="showSettings"
      :columns="harvestColumns"
      storage-key="columns.visibility.harvest"
      @save="apply"
    />

    <div class="search-control">
      <div class="customer-count-badge" v-show="isVisible('shop')">
        <div class="count-label">عدد العملاء</div>
        <div class="count-value">{{ store.customerCount }}</div>
      </div>
      
      <div class="search-input-wrapper relative">
        <i class="fas fa-search control-icon pr-2"></i>
        <input
          v-model="searchQueryLocal"
          type="text"
          placeholder="ابحث في المحل أو الكود..."
          class="search-input w-full"
          @input="handleSearchInput"
        />
        <button 
          v-if="searchQueryLocal" 
          class="clear-search-btn" 
          @click="clearSearch"
          type="button"
          title="حذف البحث"
        >
          <i class="fas fa-times-circle"></i>
        </button>
      </div>

      <button class="btn-settings-table" title="عرض/اخفاء الأعمدة" @click="showSettings = true">
        <i class="fas fa-cog"></i>
      </button>
    </div>

    <div id="harvest-table-container" class="table-wrapper">
      <table class="modern-table w-full">
        <thead>
          <tr>
            <th v-show="isVisible('shop')" class="shop">🏪 المحل</th>
            <th v-show="isVisible('code')" class="code">🔢 الكود</th>
            <th v-show="isVisible('amount')" class="amount">💵 التحويل</th>
            <th v-show="isVisible('extra')" class="extra">📌 اخرى</th>
            <th v-show="isVisible('collector')" class="collector">👤 المحصل</th>
            <th v-show="isVisible('net')" class="net highlight">✅ الصافي</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in localFilteredRows" :key="row.id">
            <td v-show="isVisible('shop')" class="shop no-wrap-cell" :class="{ 'negative-net-border': getRowNetStatus(row) === 'negative', 'has-overdue': row.hasOverdue, 'has-overpayment': row.hasOverpayment }">
              <input 
                v-if="!row.isImported" 
                :id="'shop-' + row.id" 
                :value="row.shop" 
                type="text" 
                placeholder="اسم المحل" 
                class="editable-input" 
                :disabled="isReadOnly"
                @input="updateShop(row, index, $event)" 
                @click="showTooltip($event.target, row.shop)" 
              />
              <span v-else class="readonly-field" @click="showTooltip($event.target, row.shop)">{{ row.shop }}</span>
            </td>

            <td v-show="isVisible('code')" class="code">
              <input 
                v-if="!row.isImported"
                :value="row.code" 
                type="text" 
                inputmode="decimal"
                placeholder="الكود" 
                class="editable-input" 
                :disabled="isReadOnly"
                @input="updateCode(row, index, $event)" 
              />
              <span v-else class="readonly-field">{{ row.code }}</span>
            </td>

            <td v-show="isVisible('amount')" class="amount">
              <input
                v-if="!row.isImported"
                :id="'amount-' + row.id"
                type="text"
                inputmode="decimal"
                :value="formatInputNumber(row.amount)"
                class="amount-input centered-input"
                lang="en"
                :disabled="isReadOnly"
                @input="updateAmount(row, index, $event)"
              />
              <span v-else class="readonly-amount">{{ formatInputNumber(row.amount) }}</span>
            </td>

            <td v-show="isVisible('extra')" class="extra">
              <div class="input-with-action">
                <input
                  :id="'extra-' + row.id"
                  type="text"
                  inputmode="decimal"
                  :value="formatInputNumber(row.extra)"
                  class="centered-input text-center-important"
                  :class="{ 'negative-extra': (parseFloat(row.extra) || 0) < 0 }"
                  lang="en"
                  :disabled="isReadOnly"
                  @focus="showTooltip($event.target, row.shop)"
                  @input="updateExtra(row, index, $event)"
                />
                <button v-if="!isReadOnly" class="btn-toggle-sign" @click="toggleSign(row, 'extra')" title="إضافة سالب">-</button>
              </div>
            </td>

            <td v-show="isVisible('collector')" class="collector">
              <input
                :id="'collector-' + row.id"
                type="text"
                inputmode="decimal"
                :value="formatInputNumber(row.collector)"
                class="centered-input"
                lang="en"
                :disabled="isReadOnly"
                @focus="showTooltip($event.target, row.shop)"
                @input="updateCollector(row, index, $event)"
              />
            </td>

            <td v-show="isVisible('net')" class="net numeric" :class="getRowNetStatus(row)">
              {{ store.formatNumber(calculateNet(row)) }}
              <i :class="getRowNetIcon(row)"></i>
            </td>
          </tr>

          <tr class="total-row" v-if="localFilteredRows.length > 0">
            <td v-show="isVisible('shop')" class="shop">الإجمالي </td>
            <td v-show="isVisible('code')" class="code"></td>
            <td v-show="isVisible('amount')" class="amount text-center">{{ store.formatNumber(filteredTotals.amount) }}</td>
            <td v-show="isVisible('extra')" class="extra text-center">{{ store.formatNumber(filteredTotals.extra) }}</td>
            <td v-show="isVisible('collector')" class="collector text-center">{{ store.formatNumber(filteredTotals.collector) }}</td>
            <td v-show="isVisible('net')" class="net numeric" :class="getFilteredTotalNetClass">
              {{ store.formatNumber(filteredTotalNetValue) }}
              <i :class="getFilteredTotalNetIcon"></i>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="localFilteredRows.length === 0" class="no-results">
        لا توجد نتائج تطابق بحثك...
      </div>
    </div>

    <div class="export-container" v-if="localFilteredRows.length > 0">
      <button class="btn-export-share" @click="handleExport" title="مشاركة الجدول كصورة">
        <i class="fas fa-share-alt"></i>
        <span>مشاركة الجدول</span>
      </button>
      <button class="btn-export-share btn-export-summary" @click="handleSummaryExport" title="مشاركة ملخص البيان كصورة">
        <i class="fas fa-receipt"></i>
        <span>مشاركة ملخص البيان</span>
      </button>
    </div>

    <teleport to="body">
      <div v-if="showCustomTooltip" class="custom-tooltip" ref="customTooltipRef">
        {{ customTooltipText }}
      </div>
    </teleport>

    <teleport to="body" v-if="!isSharedView">
        <div v-if="isMissingModalOpen" class="modal-overlay" @click="isMissingModalOpen = false">
            <div class="modal-content missing-modal" @click.stop>
                <div class="modal-header">
                    <h3><i class="fas fa-eye-slash text-warning"></i> مراكز لم يتم التحويل لها</h3>
                    <button class="close-btn" @click="isMissingModalOpen = false">&times;</button>
                </div>
                <div class="modal-body scrollable-list">
                    <div v-if="missingCenters.length === 0" class="text-center text-success p-4">
                        <i class="fas fa-check-circle fa-2x mb-2"></i>
                        <p>ممتاز! جميع عملاء خط السير تم العمل عليهم.</p>
                    </div>
                    <ul v-else class="missing-list">
                        <li v-for="center in missingCenters" :key="center.shop_code">
                            <span class="center-name">{{ center.shop_name || 'بدون اسم' }}</span>
                            <span class="center-code">{{ center.shop_code }}</span>
                        </li>
                    </ul>
                </div>
                <div class="modal-footer">
                    <span class="text-muted text-sm">عدد المراكز: {{ missingCenters.length }}</span>
                </div>
            </div>
        </div>
    </teleport>

    <teleport to="body" v-if="!isSharedView">
        <div v-if="isOverdueModalOpen" class="modal-overlay" @click="isOverdueModalOpen = false">
            <div class="modal-content overdue-modal" @click.stop>
                <div class="modal-header">
                    <h3><i class="fas fa-history text-danger"></i> المديونيات المتأخرة</h3>
                    <button class="close-btn" @click="isOverdueModalOpen = false">&times;</button>
                </div>
                <div class="modal-body scrollable-list">
                    <div v-if="overdueStores.length === 0" class="text-center text-success p-4">
                        <i class="fas fa-check-circle fa-2x mb-2"></i>
                        <p>لا توجد مديونيات متأخرة من اليوم السابق.</p>
                    </div>
                    <div v-else class="overdue-table">
                        <div class="overdue-header">
                            <input type="checkbox" v-model="allOverdueSelected" />
                            <span class="header-item">المحل</span>
                            <span class="header-item text-center">الكود</span>
                            <span class="header-item text-center">المديونية</span>
                        </div>
                        <div class="overdue-body">
                            <div v-for="store in overdueStores" :key="store.code" class="overdue-row">
                                <input type="checkbox" v-model="selectedOverdueStores" :value="store" />
                                <span class="cell-item">{{ store.shop || 'بدون اسم' }}</span>
                                <span class="cell-item text-center">{{ store.code }}</span>
                                <span 
                                    class="cell-item text-center font-bold"
                                    :class="store.net > 0 ? 'text-primary' : 'text-danger'"
                                >
                                    {{ store.net > 0 ? '+' : '' }}{{ store.net }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer" v-if="overdueStores.length > 0">
                    <button class="btn btn-secondary" @click="isOverdueModalOpen = false">إلغاء</button>
                    <button class="btn btn-primary" @click="applyOverdue" :disabled="selectedOverdueStores.length === 0">
                        <i class="fas fa-plus"></i> إضافة المحدد ({{ selectedOverdueStores.length }})
                    </button>
                </div>
            </div>
        </div>
    </teleport>

    <div class="summary-container">
      <section id="summary">
        <h2 class="summary-title"><i class="fas fa-file-invoice-dollar summary-title-icon text-primary"></i> ملخص البيان</h2>
        <div class="summary-divider" aria-hidden="true"></div>
        <div class="summary-grid">
          
          <div class="summary-row two-cols">
            <div class="summary-item">
              <div class="field-header">
                <i class="fas fa-crown crown-gold"></i>
                <strong class="mx-2">ليمت الماستر <span class="small-label">( أساسي )</span></strong>
              </div>
              <input
                id="master-limit"
                type="text"
                inputmode="decimal"
                :value="store.masterLimit !== 100000 ? formatInputNumber(store.masterLimit) : ''"
                class="bold-input text-center font-bold master-limit-input"
                lang="en"
                placeholder="ادخل ليمت الماستر"
                :disabled="isReadOnly"
                @input="updateSummaryField($event, 'masterLimit', 'ليمت الماستر')"
              />
            </div>

            <div class="summary-item">
              <div class="field-header">
                <i class="fas fa-plus-circle text-primary"></i>
                <strong class="mx-2">ليمت اضافى <span class="small-text">(رصيد اضافى كولكتور , شركه )</span></strong>
              </div>
               <input
                id="extra-limit"
                type="text"
                inputmode="decimal"
                :value="store.extraLimit ? formatInputNumber(store.extraLimit) : ''"
                class="bold-input text-center font-bold"
                lang="en"
                placeholder="ادخل الليمت الإضافي"
                :disabled="isReadOnly"
                @input="updateSummaryField($event, 'extraLimit', 'الليمت الإضافي')"
              />
            </div>
          </div>

          <div class="summary-row full">
            <div class="summary-item">
              <div class="field-header">
                <i class="fas fa-wallet text-primary"></i>
                <strong class="mx-2">رصيد الماستر الحالي</strong>
              </div>
               <input
                id="current-balance"
                type="text"
                inputmode="decimal"
                :value="store.currentBalance ? formatInputNumber(store.currentBalance) : ''"
                class="bold-input text-center font-bold"
                lang="en"
                placeholder="ادخل رصيد الماستر الحالي"
                :disabled="isReadOnly"
                @input="updateSummaryField($event, 'currentBalance', 'رصيد الماستر الحالي')"
              />
            </div>
          </div>

          <div class="summary-row two-cols">
            <div class="summary-item">
              <div class="field-header">
                <i class="fas fa-undo-alt text-warning"></i>
                <strong class="mx-2">مبلغ التصفيرة</strong>
              </div>
              <div class="calc-field" :class="{ 'text-success': store.resetAmount > 0, 'text-danger': store.resetAmount < 0 }">
                {{ store.formatNumber(store.resetAmount) }}
              </div>
            </div>

            <div class="summary-item">
              <div class="field-header">
                <i class="fas fa-coins text-warning"></i>
                <strong class="mx-2">إجمالي المحصل</strong>
              </div>
              <div class="calc-field text-primary">{{ store.formatNumber(store.totals.collector) }}</div>
            </div>
          </div>

          <div class="summary-row full">
            <div class="summary-item">
              <div class="field-header">
                <i class="fas fa-check-circle text-success"></i>
                <strong class="mx-2">حالة التصفيرة</strong>
              </div>
              <div class="calc-field" :style="{ color: store.resetStatus.color, fontSize: '1.3rem', fontWeight: '800' }">
                {{ store.resetStatus.val !== 0 ? store.formatNumber(store.resetStatus.val) : '' }}
                &nbsp;{{ store.resetStatus.text }}
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>

    <div class="buttons-container" v-if="!isSharedView">
      <div class="buttons-row">
        <router-link to="/app/dashboard" class="btn btn-dashboard btn-dashboard--home">
          <i class="fas fa-home"></i>
          <span>صفحة الإدخال</span>
        </router-link>

        <router-link to="/app/archive" class="btn btn-dashboard btn-dashboard--archive">
          <i class="fas fa-archive"></i>
          <span>الذهاب للأرشيف</span>
        </router-link>
      </div>

      <div class="buttons-row" v-if="!collabStore.activeSessionId">
        <button class="btn btn-dashboard btn-dashboard--clear" @click="confirmClearAll">
          <i class="fas fa-broom"></i>
          <span>تفريغ الحقول</span>
        </button>
        <button class="btn btn-dashboard btn-dashboard--archive btn--archive-today" :disabled="isArchiving || store.rows.length === 0" @click="archiveToday">
          <i :class="isArchiving ? 'fas fa-spinner fa-spin' : 'fas fa-folder'"></i>
          <span>{{ isArchiving ? 'جاري الأرشفة...' : 'أرشفة اليوم' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, watch, inject, onBeforeUnmount, onDeactivated, nextTick, defineProps } from 'vue';
import { useRoute } from 'vue-router';
import { useHarvestStore } from '@/stores/harvest';
import { useArchiveStore } from '@/stores/archiveStore';
import { useAuthStore } from '@/stores/auth';
import { useItineraryStore } from '@/stores/itineraryStore';
import { useCollaborationStore } from '@/stores/collaborationStore'; // Store الجديد
import PageHeader from '@/components/layout/PageHeader.vue';
import ColumnVisibility from '@/components/ui/ColumnVisibility.vue';
import localforage from 'localforage';
import logger from '@/utils/logger.js';
import { formatInputNumber, getNetClass, getNetIcon } from '@/utils/formatters.js';
import { useColumnVisibility } from '@/composables/useColumnVisibility.js';
import { exportAndShareTable } from '@/utils/exportUtils.js';
import { handleMoneyInput } from '@/utils/validators.js';

// --- Props Definition ---
// تعريف الخاصية لاستقبال ما إذا كنا في وضع المشاركة
const props = defineProps({
  isSharedView: {
    type: Boolean,
    default: false
  }
});

// --- Definitions ---
const store = useHarvestStore();
const archiveStore = useArchiveStore();
const authStore = useAuthStore();
const itineraryStore = useItineraryStore();
const collabStore = useCollaborationStore();
const route = useRoute();
const { confirm, addNotification } = inject('notifications');

// --- Columns ---
const harvestColumns = [
  { key: 'shop', label: '🏪 المحل' },
  { key: 'code', label: '🔢 الكود' },
  { key: 'amount', label: '💵 مبلغ التحويل' },
  { key: 'extra', label: '📌 اخرى' }
];
const { showSettings, isVisible, apply, load: loadColumns } = useColumnVisibility(harvestColumns, 'columns.visibility.harvest');

// --- State ---
const searchQueryLocal = ref('');
const showCustomTooltip = ref(false);
const customTooltipText = ref('');
const tooltipTargetElement = ref(null);
const customTooltipRef = ref(null);
const currentDate = ref(new Date().toLocaleDateString("en-GB", { day: '2-digit', month: '2-digit', year: 'numeric' }));
const currentDay = ref(new Date().toLocaleDateString("ar-EG", { weekday: 'long' }));
const showProfileDropdown = ref(false);
const isArchiving = ref(false);

// Modal Missing Centers State
const isMissingModalOpen = ref(false);
const missingCenters = ref([]);

// Overdue Modal State
const isOverdueModalOpen = ref(false);
const overdueStores = ref([]);
const selectedOverdueStores = ref([]);

// --- Computed ---
// حساب صلاحيات المستخدم في وضع المشاركة
const isReadOnly = computed(() => {
  if (!collabStore.activeSessionId) return false; // بياناتي أنا (تعديل مسموح)
  
  // البحث عن دوري في هذا التحصيل
  // إذا كنت أنا المشرف (Sender)، فغالباً لدي صلاحية، ولكن نتحقق من الدور
  const collabSession = collabStore.collaborators.find(c => c.userId === collabStore.activeSessionId);
  return collabSession && collabSession.role === 'viewer';
});

const allOverdueSelected = computed({
  get: () => overdueStores.value.length > 0 && selectedOverdueStores.value.length === overdueStores.value.length,
  set: (value) => {
    selectedOverdueStores.value = value ? [...overdueStores.value] : [];
  }
});

const localFilteredRows = computed(() => {
  const data = store.rows || [];
  const query = searchQueryLocal.value?.toLowerCase().trim();
  if (!query) return data;
  return data.filter(row => 
    (row.shop && row.shop.toLowerCase().includes(query)) || 
    (row.code && row.code.toString().toLowerCase().includes(query))
  );
});

const savedItineraryProfiles = computed(() => {
  return itineraryStore.profiles.filter(p => p.shops_order && p.shops_order.length > 0);
});

const filteredTotals = computed(() => {
  return localFilteredRows.value.reduce((acc, row) => {
    acc.amount += parseFloat(row.amount) || 0;
    acc.extra += parseFloat(row.extra) || 0;
    acc.collector += parseFloat(row.collector) || 0;
    return acc;
  }, { amount: 0, extra: 0, collector: 0 });
});

const calculateNet = (row) => {
  const collector = parseFloat(row.collector) || 0;
  const amount = parseFloat(row.amount) || 0;
  const extra = parseFloat(row.extra) || 0;
  return collector - (amount + extra);
};

const filteredTotalNetValue = computed(() => {
  const totals = filteredTotals.value;
  return totals.collector - (totals.amount + totals.extra);
});

const getRowNetStatus = (row) => getNetClass(calculateNet(row));
const getRowNetIcon = (row) => getNetIcon(calculateNet(row));
const getFilteredTotalNetClass = computed(() => getNetClass(filteredTotalNetValue.value));
const getFilteredTotalNetIcon = computed(() => getNetIcon(filteredTotalNetValue.value));

// --- Logic Methods ---

// 0. Collaboration Exit
const exitSession = () => {
  collabStore.setActiveSession(null, null);
  store.switchToUserSession(null); // العودة للمحلي
  addNotification('تمت العودة إلى تحصيلاتك الخاصة', 'success');
};

// 1. Overdue Logic
const showOverdueModal = async () => {
  overdueStores.value = await store.fetchOverdueStores();
  selectedOverdueStores.value = [];
  isOverdueModalOpen.value = true;
};

const applyOverdue = async () => {
  if (selectedOverdueStores.value.length === 0) {
    addNotification('لم يتم تحديد أي متاجر', 'warning');
    return;
  }
  await store.applyOverdueStores(selectedOverdueStores.value);
  isOverdueModalOpen.value = false;
  addNotification('تمت إضافة المديونيات بنجاح!', 'success');
};


// 2. Missing Centers Logic
const showMissingCenters = () => {
  const currentCodes = new Set(store.rows.map(r => String(r.code).trim()));
  missingCenters.value = itineraryStore.routes.filter(route => {
    return !currentCodes.has(String(route.shop_code).trim());
  });
  isMissingModalOpen.value = true;
};

// 3. Sort Logic
const toggleProfileDropdown = () => {
  if (savedItineraryProfiles.value.length === 0) {
    addNotification('لا توجد قوالب خط سير محفوظة للعرض.', 'warning');
    return;
  }
  showProfileDropdown.value = !showProfileDropdown.value;
};

const applyItineraryProfile = (profile) => {
  store.sortRowsByItineraryProfile(profile.shops_order);
  showProfileDropdown.value = false;
  addNotification(`تم الترتيب حسب قالب "${profile.profile_name}"`, 'success');
};


// 4. Tooltip
const showTooltip = (element, text) => {
  if (!element || !text) return;
  if (showCustomTooltip.value && tooltipTargetElement.value === element) {
    hideTooltip();
    return;
  }
  customTooltipText.value = text;
  tooltipTargetElement.value = element;
  showCustomTooltip.value = true;
  nextTick(() => {
    if (customTooltipRef.value) {
      const rect = element.getBoundingClientRect();
      const tooltip = customTooltipRef.value;
      tooltip.style.top = `${rect.top - 8}px`;
      tooltip.style.left = `${rect.left + rect.width / 2}px`;
      tooltip.style.transform = 'translate(-50%, -100%)';
    }
  });
};
const hideTooltip = () => { showCustomTooltip.value = false; };

// 5. Update Logic & Smart Add
const handleSearchInput = (e) => { searchQueryLocal.value = e.target.value; };
const clearSearch = () => { searchQueryLocal.value = ''; };

const syncWithCounterStore = () => {
  try {
    const totalCollected = store.totals?.collector || 0;
    localStorage.setItem('totalCollected', totalCollected.toString());
    window.dispatchEvent(new CustomEvent('harvestDataUpdated', { detail: { totalCollected } }));
  } catch (error) {
    logger.error('Sync error:', error);
  }
};

const checkAndAddEmptyRow = (index) => {
  if (searchQueryLocal.value) return; 
  if (index === store.rows.length - 1) store.addRow();
};

const updateField = (row, index, field, value, syncCounter = false) => {
  row[field] = value;
  store.saveRowsToStorage();
  checkAndAddEmptyRow(index);
  if (syncCounter) syncWithCounterStore();
};

const updateShop = (row, index, e) => { updateField(row, index, 'shop', e.target.value); hideTooltip(); };
const updateCode = (row, index, e) => updateField(row, index, 'code', e.target.value);
const updateAmount = (row, index, e) => handleMoneyInput(e, (val) => updateField(row, index, 'amount', val ? parseFloat(val) : null), { fieldName: 'مبلغ التحويل', maxLimit: 9999 });
const updateExtra = (row, index, e) => handleMoneyInput(e, (val) => {
    if (val === '-') row.extra = '-';
    else updateField(row, index, 'extra', (val !== '' && val !== null && !isNaN(parseFloat(val))) ? parseFloat(val) : null);
  }, { allowNegative: true, fieldName: 'المبلغ الإضافي', maxLimit: 9999 });

// ** دالة المحصل الذكية (مجمعة ومنظفة) **
const updateCollector = async (row, index, e) => {
  const amountVal = parseFloat(row.amount) || 0;
  const collectorMaxLimit = amountVal + 2999;
  
  handleMoneyInput(e, (val) => {
    updateField(row, index, 'collector', val ? parseFloat(val) : null, true);
    
    // --- منطق تحديث الموقع وإضافة خط السير (فقط إذا كان هناك قيمة) ---
    if (val && row.code) {
        const existingRoute = itineraryStore.routes.find(r => String(r.shop_code) === String(row.code));
        
        const handlePositionSuccess = (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            
            if (existingRoute) {
                if (itineraryStore.updateLocation) {
                    itineraryStore.updateLocation(existingRoute.id, lat, lng);
                }
            } else {
                itineraryStore.addRoute({
                    shop_code: row.code.toString(),
                    shop_name: row.shop,
                    latitude: lat,
                    longitude: lng
                });
            }
        };

        const handlePositionError = (err) => {
            console.warn("GPS failed:", err.message);
            // إذا فشل الـ GPS ولم يكن المسار موجوداً، نضيفه بدون إحداثيات
            if (!existingRoute) {
                itineraryStore.addRoute({
                    shop_code: row.code.toString(),
                    shop_name: row.shop,
                    latitude: null, longitude: null
                });
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                handlePositionSuccess, 
                (err) => {
                    console.warn("High Accuracy GPS failed, trying Low Accuracy...");
                    navigator.geolocation.getCurrentPosition(
                        handlePositionSuccess,
                        handlePositionError,
                        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
                    );
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
            );
        } else {
            handlePositionError({ message: "Geolocation not supported" });
        }
    }

  }, { fieldName: 'مبلغ المحصل', maxLimit: collectorMaxLimit });
  hideTooltip();
};

// Summary & Formatting
const updateSummaryField = (e, storeKey, fieldLabel) => {
  const maxLimit = 499999;
  handleMoneyInput(e, (val) => {
    const numVal = parseFloat(val) || 0;
    if (storeKey === 'masterLimit') store.setMasterLimit(numVal);
    else if (storeKey === 'extraLimit') store.setExtraLimit(numVal);
    else if (storeKey === 'currentBalance') store.setCurrentBalance(numVal);
  }, { fieldName: fieldLabel, maxLimit: storeKey !== 'currentBalance' ? maxLimit : undefined });
};

const toggleSign = (row, field) => {
  const currentVal = row[field];
  if (!currentVal || currentVal === '') row[field] = '-';
  else if (currentVal === '-') row[field] = null;
  else row[field] = parseFloat(String(currentVal).replace(/,/g, '')) * -1;
  store.saveRowsToStorage();
  if (field === 'collector') syncWithCounterStore();
};

// Actions
const confirmClearAll = async () => {
  if ((await confirm({ title: 'مسح الكل', text: 'تأكيد؟' })).isConfirmed) {
    store.clearAll();
    searchQueryLocal.value = '';
    addNotification('تم المسح', 'info');
  }
};

const archiveToday = async () => {
  isArchiving.value = true;
  try {
    // Load local dates quickly (don't force a cloud fetch) to avoid blocking UI
    await archiveStore.loadAvailableDates(false);
    const dateToSave = await store.getSecureCairoDate();
    const exists = archiveStore.dateExists(dateToSave);
    
    let confirmationMessage = {
      title: 'تأكيد الأرشفة',
      text: 'هل أنت متأكد أنك تريد أرشفة بيانات اليوم؟',
      confirmButtonText: 'نعم، أرشفة'
    };

    if (exists) {
      confirmationMessage = {
        title: 'تنبيه: الأرشيف موجود',
        text: `يوجد أرشيف محفوظ بالفعل بتاريخ "${dateToSave}". هل تريد استبداله بالبيانات الحالية؟`,
        confirmButtonText: 'نعم، استبدال',
        icon: 'warning'
      };
    }
    
    const { isConfirmed } = await confirm(confirmationMessage);
    
    if (!isConfirmed) {
      addNotification('تم إلغاء الأرشفة.', 'info');
      return;
    }
    
    const res = await store.archiveTodayData();
    if (res.success) {
      addNotification(res.message, 'success');
      store.clearAll();
      searchQueryLocal.value = '';
    } else {
      addNotification(res.message, 'error');
    }
  } catch (error) {
    logger.error('Unhandled error during archive process:', error);
    addNotification('حدث خطأ غير متوقع أثناء محاولة الأرشفة.', 'error');
  } finally {
    isArchiving.value = false;
  }
};

const handleExport = async () => {
  const fileName = searchQueryLocal.value ? `تحصيلات_بحث_${searchQueryLocal.value}` : `تحصيلات_${currentDate.value.replace(/\//g, '-')}`;
  const result = await exportAndShareTable('harvest-table-container', fileName);
  if (result.success) addNotification(result.message, 'success');
  else addNotification(result.message, 'error');
};

const handleSummaryExport = async () => {
  const fileName = `ملخص_بيان_${currentDate.value.replace(/\//g, '-')}`;
  const result = await exportAndShareTable('summary', fileName, { backgroundColor: 'var(--surface-bg)' });
  if (result.success) addNotification(result.message, 'success');
  else addNotification(result.message, 'error');
};

const handleOutsideClick = (e) => {
  const target = e.target;
  const isTooltipTrigger = target.matches('input[id^="shop-"], input[id^="extra-"], input[id^="collector-"]') || target.classList.contains('readonly-field');
  if (!isTooltipTrigger) hideTooltip();
};

// Lifecycle
onMounted(() => {
  store.initialize?.();
  loadColumns();
  store.loadDataFromStorage();
  syncWithCounterStore();
  searchQueryLocal.value = store.searchQuery || '';
  
  itineraryStore.fetchProfiles(); 
  itineraryStore.fetchRoutes(); 

  window.addEventListener('focus', syncWithCounterStore);
  document.addEventListener('click', handleOutsideClick);
});

onActivated(() => { store.initialize?.(); searchQueryLocal.value = store.searchQuery || ''; itineraryStore.fetchProfiles(); });
onBeforeUnmount(() => { store.searchQuery = searchQueryLocal.value; window.removeEventListener('focus', syncWithCounterStore); document.removeEventListener('click', handleOutsideClick); });
onDeactivated(() => { store.searchQuery = searchQueryLocal.value; });
watch(() => route.name, (newName) => { if (newName === 'Harvest') store.initialize?.(); });
</script>

<script>
export default {
  name: 'HarvestView'
}
</script>

<style scoped>
/* Collab Banner */
.collab-banner {
  background: linear-gradient(to right, #fff7ed, #ffedd5);
  border-bottom: 2px solid #fdba74;
  color: #9a3412;
  padding: 10px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.banner-content { display: flex; align-items: center; gap: 10px; font-size: 0.95rem; }
.pulse-icon { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; color: #ea580c; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.badge-viewer { background: #fee2e2; color: #ef4444; font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; border: 1px solid #fca5a5; margin-right: 5px; }
.btn-exit { background: white; border: 1px solid #fdba74; color: #c2410c; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.btn-exit:hover { background: #fff7ed; transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.animate-slide-down { animation: slideDown 0.3s ease-out; }
@keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

/* Dropdown Styles */
.relative { position: relative; }
.profile-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1000;
  background-color: var(--surface-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-lg);
  min-width: 200px;
  padding: 8px 0;
  margin-top: 4px;
}
.dropdown-item {
  display: block;
  padding: 10px 15px;
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.2s;
}
.dropdown-item:hover {
  background-color: var(--bg-secondary);
}
.dropdown-item.disabled {
  color: var(--text-muted);
  cursor: not-allowed;
}

/* Original Styles */
.action-bar { margin-bottom: 10px; display: flex; justify-content: flex-end; }
.btn-sm { padding: 6px 12px; font-size: 0.85rem; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: 0.2s; font-weight: 600; }
.btn-outline-primary { border: 1px solid var(--primary); background: transparent; color: var(--primary); }
.btn-outline-primary:hover { background: var(--primary); color: white; }
.btn-outline-warning { border: 1px solid #f39c12; background: transparent; color: #f39c12; }
.btn-outline-warning:hover { background: #f39c12; color: white; }
.btn-outline-danger { border: 1px solid var(--danger); background: transparent; color: var(--danger); }
.btn-outline-danger:hover { background: var(--danger); color: white; }


/* Modal Styles */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px); animation: fadeIn 0.2s; }
.missing-modal, .overdue-modal { width: 90%; max-width: 500px; background: var(--surface-bg); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; max-height: 80vh; border: 1px solid var(--border-color); box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
.modal-header { padding: 15px; background: var(--bg-secondary); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { font-size: 1.1rem; margin: 0; display: flex; align-items: center; gap: 10px; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted); }
.scrollable-list { overflow-y: auto; padding: 0; flex: 1; }
.missing-list { list-style: none; padding: 0; margin: 0; }
.missing-list li { padding: 12px 15px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
.missing-list li:last-child { border-bottom: none; }
.center-name { font-weight: bold; color: var(--text-primary); }
.center-code { background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9rem; }
.modal-footer { padding: 10px 15px; background: var(--bg-secondary); text-align: center; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 10px; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* Overdue Modal Table Styles */
.overdue-table { display: flex; flex-direction: column; }
.overdue-header, .overdue-row {
  display: grid;
  grid-template-columns: 40px 1fr 100px 100px;
  align-items: center;
  gap: 10px;
  padding: 12px 15px;
  border-bottom: 1px solid var(--border-color);
}
.overdue-header {
  font-weight: 700;
  background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.1), rgba(var(--primary-rgb), 0.05));
  color: var(--primary);
  border-top: 1px solid var(--border-color);
}
.overdue-row:hover { background-color: var(--bg-secondary); }
.overdue-body { overflow-y: auto; }
.text-center { text-align: center; }
.font-bold { font-weight: bold; }

/* has-overdue class */
.has-overdue input, .has-overdue span {
  color: #e53935 !important;
  font-weight: 700 !important;
}
:deep(body.dark) .has-overdue input, :deep(body.dark) .has-overdue span {
  color: #ff8a80 !important;
}

/* has-overpayment class */
.has-overpayment input, .has-overpayment span {
  color: var(--primary) !important;
  font-weight: 700 !important;
}
:deep(body.dark) .has-overpayment input, :deep(body.dark) .has-overpayment span {
  color: #69b4ff !important;
}


.modern-table thead th { font-size: 0.85rem !important; }
.no-wrap-cell { white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
.mx-2 { margin: 0 8px; }
.ml-2 { margin-left: 8px; }
.text-xs { font-size: 0.75rem; }
.small-text { font-size: 0.75rem; font-weight: 500; opacity: 0.8; display: block; pointer-events: none; }
.small-label { font-size: 0.7rem; font-weight: normal; opacity: 0.7; margin-right: 4px; }
.master-limit-input { border: 2px solid var(--primary-light) !important; background-color: rgba(var(--primary-rgb), 0.05) !important; }
.crown-gold { color: #ffc107; filter: drop-shadow(0 0 1px rgba(0,0,0,0.2)); }
.input-with-action { position: relative; display: flex; align-items: center; width: 100%; height: 100%; }
.text-center-important { text-align: center !important; }
.negative-extra { color: #ff6b6b !important; font-weight: bold; }
:deep(body.dark) .negative-extra { color: #ff8e8e !important; }
.btn-toggle-sign { position: absolute; left: 0; bottom: 0; background: var(--border-color); color: var(--primary); border: none; border-radius: 0 var(--border-radius-sm) 0 0; width: 20px; height: 14px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 18px; cursor: pointer; z-index: 5; opacity: 0.5; transition: var(--transition-fast); padding: 0; line-height: 0; }
:deep(body.dark) .btn-toggle-sign { background: rgba(255, 255, 255, 0.1); color: var(--gray-400); }
.btn-toggle-sign:hover, .btn-toggle-sign:active { opacity: 1; background: var(--primary); color: white; }
.date-display { display: flex; align-items: center; gap: 15px; justify-content: center; margin-bottom: 25px; padding: 15px 20px; background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.08), rgba(var(--primary-rgb), 0.03)); border-radius: var(--border-radius-lg); border: 1px solid var(--border-color); }
.calendar-icon { color: var(--primary); font-size: 1.1rem; }
.date-display .label { font-weight: 700; color: var(--text-muted); }
.date-display .value { color: var(--primary); font-weight: 800; }
.date-display .separator { color: var(--gray-400); font-weight: 300; }
.customer-count-badge { display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--border-radius); padding: 4px 12px; min-width: 80px; box-shadow: var(--shadow-sm); }
.count-label { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; }
.count-value { font-size: 1.1rem; font-weight: 800; color: var(--primary); }
.no-results { text-align: center; padding: 40px; color: var(--text-muted); font-style: italic; background: var(--bg-primary); border-bottom: 1px solid var(--border-color); }
.export-container { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; margin-bottom: 15px; padding: 0 5px; }
.btn-export-share { background: linear-gradient(135deg, var(--success) 0%, #059669 100%); color: white; border: none; padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 5px rgba(16, 185, 129, 0.3); transition: var(--transition); }
.btn-export-share:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(16, 185, 129, 0.4); }
.btn-export-summary { background: linear-gradient(135deg, var(--primary) 0%, #2980b9 100%); box-shadow: 0 2px 5px rgba(var(--primary-rgb), 0.3); }
.btn-export-summary:hover { box-shadow: 0 4px 10px rgba(var(--primary-rgb), 0.4); }
.clear-search-btn { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); background: transparent; border: none; color: var(--gray-500); cursor: pointer; padding: 5px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; z-index: 10; font-size: 1.2rem; }
.clear-search-btn:hover { color: var(--danger); transform: translateY(-50%) scale(1.1); }
.relative { position: relative; }
.w-full { width: 100%; }
.pr-2 { padding-right: 8px; }
.custom-tooltip { position: fixed; background: var(--bg-primary); color: var(--text-primary); padding: 5px 10px; border-radius: 6px; z-index: 9999; border: 1px solid var(--border-color); pointer-events: none; }
</style>