﻿<template>
  <div class="harvest-page">
    
    <div v-if="isLoading" class="loading-overlay">
      <div class="loader"></div>
      <p>جاري تحميل البيانات...</p>
    </div>

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
        <div class="count-value">{{ displayFilteredRows ? displayFilteredRows.filter(r => r.shop).length : 0 }}</div>
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
          <tr v-for="(row, index) in displayFilteredRows" :key="row.id">
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

          <tr class="total-row" v-if="displayFilteredRows.length > 0">
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
      
      <div v-if="!isLoading && displayFilteredRows.length === 0" class="no-results">
        لا توجد نتائج تطابق بحثك...
      </div>
    </div>

    <div class="export-container" v-if="!isSharedView && displayFilteredRows.length > 0">
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
                <div class="modal-header" style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                      <h3 style="margin:0; display:flex; align-items:center; gap:8px;"><i class="fas fa-history text-danger"></i> المديونيات المتأخرة</h3>
                      <button class="btn btn-sm btn-outline-primary" type="button" @click="toggleSelectAllOverdue" title="تحديد الكل">تحديد الكل</button>
                    </div>
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
                  <button class="btn btn-danger" @click="deleteSelectedOverdue" :disabled="selectedOverdueStores.length === 0">
                    <i class="fas fa-trash"></i> حذف المحدد ({{ selectedOverdueStores.length }})
                  </button>
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
                :value="displayMasterLimit !== 100000 ? formatInputNumber(displayMasterLimit) : ''"
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
                :value="displayExtraLimit ? formatInputNumber(displayExtraLimit) : ''"
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
                :value="displayCurrentBalance ? formatInputNumber(displayCurrentBalance) : ''"
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
              <div class="calc-field" :class="{ 'text-success': displayResetAmount > 0, 'text-danger': displayResetAmount < 0 }">
                 {{ store.formatNumber(displayResetAmount) }}
              </div>
            </div>

            <div class="summary-item">
              <div class="field-header">
                <i class="fas fa-coins text-warning"></i>
                <strong class="mx-2">إجمالي المحصل</strong>
              </div>
              <div class="calc-field text-primary">{{ store.formatNumber(displayTotals.collector) }}</div>
            </div>
          </div>

          <div class="summary-row full">
            <div class="summary-item">
              <div class="field-header">
                <i class="fas fa-check-circle text-success"></i>
                <strong class="mx-2">حالة التصفيرة</strong>
              </div>
              <div class="calc-field" :style="{ color: displayResetStatus.color, fontSize: '1.3rem', fontWeight: '800' }">
                {{ displayResetStatus.val !== 0 ? store.formatNumber(displayResetStatus.val) : '' }}
                &nbsp;{{ displayResetStatus.text }}
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

      <div class="buttons-row">
        <button class="btn btn-dashboard btn-dashboard--clear" @click="confirmClearAll">
          <i class="fas fa-broom"></i>
          <span>تفريغ الحقول</span>
        </button>
        <router-link to="/app/share" class="btn btn-dashboard btn-dashboard--share">
            <i class="fas fa-users"></i>
            <span>مشاركة التحصيل</span>
        </router-link>
      </div>
      <div class="buttons-row">
        <button class="btn btn-dashboard btn-dashboard--archive btn--archive-today" :disabled="isArchiving || displayRows.length === 0" @click="archiveToday">
          <i :class="isArchiving ? 'fas fa-spinner fa-spin' : 'fas fa-folder'"></i>
          <span>{{ isArchiving ? 'جاري الأرشفة...' : 'أرشفة اليوم' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';
import { useHarvest } from '@/composables/useHarvest';
import PageHeader from '@/components/layout/PageHeader.vue';
import ColumnVisibility from '@/components/ui/ColumnVisibility.vue';

// --- Props Definition ---
const props = defineProps({
  isSharedView: {
    type: Boolean,
    default: false
  }
});

const {
  // Stores
  store,
  collabStore,
  // Column Visibility
  showSettings,
  isVisible,
  apply,
  harvestColumns,
  // State
  searchQueryLocal,
  showCustomTooltip,
  customTooltipText,
  customTooltipRef,
  currentDay,
  currentDate,
  showProfileDropdown,
  isArchiving,
  isMissingModalOpen,
  missingCenters,
  isOverdueModalOpen,
  overdueStores,
  selectedOverdueStores,
  allOverdueSelected, // Included from Code 2
  // Bridge computeds (From Code 2 - Crucial for Shared View)
  isLoading, 
  isReadOnly, 
  displayRows, 
  displayFilteredRows, 
  displayTotals, 
  displayMasterLimit, 
  displayExtraLimit, 
  displayCurrentBalance, 
  displayResetStatus, displayResetAmount,
  // Computed (Legacy/Shared)
  savedItineraryProfiles,
  filteredTotals,
  filteredTotalNetValue,
  getFilteredTotalNetClass,
  getFilteredTotalNetIcon,
  // Methods
  calculateNet,
  getRowNetStatus,
  getRowNetIcon,
  exitSession,
  showMissingCenters,
  showOverdueModal,
  applyOverdue,
  deleteSelectedOverdue,
  toggleProfileDropdown,
  applyItineraryProfile,
  handleSearchInput,
  clearSearch,
  updateShop,
  updateCode,
  updateAmount,
  updateExtra,
  updateCollector,
  updateSummaryField,
  toggleSign,
  confirmClearAll,
  archiveToday,
  handleExport,
  handleSummaryExport,
  showTooltip,
  formatInputNumber,
} = useHarvest(props);

// Toggle select/deselect all overdue stores
const toggleSelectAllOverdue = () => {
  try {
    if (typeof allOverdueSelected === 'object' && 'value' in allOverdueSelected) {
      allOverdueSelected.value = !allOverdueSelected.value;
    } else {
      // Fallback if it's not a ref (though useHarvest should return a ref)
      // This part ensures compatibility with how Code 1 handled it locally
      allOverdueSelected = !allOverdueSelected;
    }
  } catch (e) {
    console.warn('Failed to toggle select all overdue', e);
  }
};
</script>

<script>
export default {
  name: 'HarvestView'
}
</script>

<style scoped>
/* Code 2 Styles */
.loading-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 100;
}
.loader {
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--primary);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Original Styles (Implied to be global or inherited, but preserving scoped if any existed in Code 1 context) */
/* Assuming Code 1 relied on global styles mostly, but keeping the structure intact */
</style>