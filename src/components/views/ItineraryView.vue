<template>
  <div class="page-container">
    <PageHeader
      title="خط السير وخريطة العملاء"
      subtitle="إدارة وترتيب مسارات تحصيل العملاء"
      icon="🗺️"
    />

    <div class="tabs-container">
      <div class="tabs-wrapper">
        <button 
          :class="['tab-btn', { 'active': store.activeTab === 'list' }]" 
          @click="store.activeTab = 'list'"
        >
          <div class="tab-content-inner">
            <i class="fas fa-list-ul"></i>
            <span>القائمة والتحكم</span>
          </div>
          <div v-if="store.activeTab === 'list'" class="active-indicator"></div>
        </button>
        <button 
          :class="['tab-btn', { 'active': store.activeTab === 'map' }]" 
          @click="store.activeTab = 'map'"
        >
          <div class="tab-content-inner">
            <i class="fas fa-map-marked-alt"></i>
            <span>الخريطة التفاعلية</span>
          </div>
          <div v-if="store.activeTab === 'map'" class="active-indicator"></div>
        </button>
      </div>
    </div>

    <div v-if="store.activeTab === 'list'" class="tab-content-area fade-in">
      
      <div class="controls-bar">
        <div class="actions">
           <button class="btn-itinerary-action btn-templates" @click="store.showProfilesModal = true" title="حفظ/تحميل خطوط سير">
             <i class="fas fa-save"></i> <span>القوالب</span>
           </button>

           <button class="btn-itinerary-action btn-trash" @click="store.openIgnoredModal" title="المحلات المتجاهلة">
             <i class="fas fa-trash-restore"></i> <span>السلة</span>
           </button>

           <button 
             v-if="store.selectedIds.length > 0" 
             class="btn-itinerary-action btn-permanent-delete" 
             @click="store.confirmPermanentDelete"
             title="حذف نهائي من الجهاز والسيرفر"
           >
             <i class="fas fa-fire-alt"></i> <span>حذف ({{ store.selectedIds.length }})</span>
           </button>

           <button class="btn-itinerary-action btn-reorder" @click="store.reorderRoutesByInput" title="ترتيب حسب الإدخال">
             <i class="fas fa-sort-numeric-down"></i> <span>الترتيب</span>
           </button>
           
           <button 
             v-if="store.selectedIds.length > 0" 
             class="btn-itinerary-action btn-multi-trash" 
             @click="store.ignoreRoutes(store.selectedIds)"
             title="نقل للسلة"
           >
             <i class="fas fa-trash-alt"></i> <span>سلة ({{ store.selectedIds.length }})</span>
           </button>
        </div>
      </div>

      <div v-if="store.isLoading && store.routes.length === 0" class="loader-container">
        <div class="loading-spinner"></div>
        <p>جاري تحميل البيانات...</p>
      </div>
      
      <div v-else-if="store.routes.length === 0" class="no-data-card">
        <i class="fas fa-route"></i>
        <p>لا يوجد خط سير نشط. سيتم إضافة البيانات تلقائياً عند "حفظ وانتقال" من صفحة الإدخال.</p>
      </div>

      <div v-else>
          <div class="search-row">
            <div class="search-full">
              <div class="search-input-wrap search-full-wrap">
                <i class="fas fa-search search-icon" aria-hidden="true"></i>
                <input type="search" :value="store.searchQuery" @input="store.searchQuery = $event.target.value" placeholder="ابحث باسم المحل أو الكود..." class="search-input search-full-input" />
                <button v-if="store.searchQuery" class="search-clear" @click.stop="store.searchQuery = ''" title="مسح البحث">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>

            <div class="stats">
               <div class="total-sites" title="إجمالي العملاء">
                 <div class="ts-label"><i class="fas fa-map-marker-alt total-icon" aria-hidden="true"></i>إجمالي العملاء</div>
                 <div class="ts-value">{{ store.displayedRoutes.length }}</div>
               </div>
               <div class="total-balances" title="إجمالي تقريبي لعمود الرصيد الحالي">
                 <div class="tb-label"><i class="fas fa-wallet total-icon" aria-hidden="true"></i>إجمالي الأرصدة</div>
                 <div class="tb-value">{{ store.approxTotalBalance.toLocaleString() }}</div>
               </div>
            </div>
          </div>

        <div class="table-wrapper">
        <table class="modern-table auto-layout w-full">
          <thead>
            <tr>
              <th width="40">
                 <input type="checkbox" @change="store.toggleSelectAll" :checked="store.isAllSelected" />
              </th>
              <th width="40"></th> <th width="60" class="text-center">#</th>
              <th class="text-right">اسم المحل</th>
              <th class="code">الكود</th>
              <th class="text-center balance-header" width="110">
                الرصيد الحالي
                <button class="btn-sort-balance" @click.stop="store.toggleSortByBalance" :title="store.sortBalanceDir === 'asc' ? 'ترتيب تنازلي' : 'ترتيب تصاعدي'">
                  <i :class="store.sortBalanceDir === 'asc' ? 'fas fa-sort-amount-up' : (store.sortBalanceDir === 'desc' ? 'fas fa-sort-amount-down' : 'fas fa-sort')"></i>
                </button>
              </th>
              <th class="text-center">الموقع</th>
            </tr>
          </thead>
          <tbody @dragover.prevent @drop.prevent>
            <tr
              v-for="(route, index) in store.displayedRoutes"
              :key="route.id"
              class="draggable-row"
              :class="{ 'selected-row': store.selectedIds.includes(route.id), 'is-dragging': store.draggedIndex === index }"
              draggable="true"
              @dragstart="store.onDragStart($event, index)"
              @dragenter="store.onDragEnter($event, index)"
              @dragend="store.onDragEnd"
              @drop="store.onDrop($event, index)"
            >
              <td class="text-center">
                 <input type="checkbox" :value="route.id" v-model="store.selectedIds" />
              </td>
              <td class="drag-cell">
                <i class="fas fa-grip-vertical drag-handle"></i>
              </td>
              <td class="text-center">
                <input type="number" v-model.number="route.orderInput" class="order-input" @keyup.enter="store.reorderRoutesByInput" />
              </td>
              <td class="text-right font-bold shop-name-cell">
                <div class="shop-name-wrapper" :title="route.shop_name">
                  {{ route.shop_name }}
                </div>
              </td>
              <td class="code"><span class="code-badge">{{ route.shop_code }}</span></td>
               
              <td :class="['text-center', 'balance-cell', store.getBalanceClass(route.current_balance)]">
                <div class="balance-value">{{ route.current_balance ? Number(route.current_balance).toLocaleString() : '0' }}</div>
              </td>
             
              <td class="text-center">
                <div class="location-status-wrapper">
                  <div
                    v-if="route.latitude"
                    class="location-indicator has-coords"
                    @click.stop="store.goToLocation(route)"
                    title="الموقع محدد - عرض على الخريطة"
                  >
                    <i class="fas fa-map-marker-alt small-location-icon" aria-hidden="true"></i>
                    <span class="small-location-text">محدد</span>
                  </div>
                  <div
                    v-else
                    class="location-indicator no-coords"
                    title="الموقع غير محدد"
                  >
                    <i class="fas fa-times-circle"></i>
                    <span>غير محدد</span>
                  </div>
                   
                  <button class="btn-location-edit" @click.stop="store.openLocationModal(route)" title="تعديل الإحداثيات">
                    <i class="fas fa-pen"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    </div>

    <div v-if="store.activeTab === 'map'" class="tab-content-area fade-in">
       <div v-if="store.routesWithCoords.length === 0" class="no-data-card">
          <i class="fas fa-map-marker-alt"></i>
          <p>لا توجد إحداثيات مسجلة للعرض.</p>
       </div>
       <div v-else class="map-wrapper">
        <l-map ref="mapRef" v-model:zoom="store.zoom" :center="store.center" :use-global-leaflet="false">
          <l-tile-layer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            layer-type="base"
            name="OpenStreetMap"
          ></l-tile-layer>

          <l-polyline :lat-lngs="store.polylineCoords" color="var(--primary)" :weight="4" :opacity="0.8" dashArray="10, 10"></l-polyline>

          <l-marker 
            v-for="route in store.routesWithCoords" 
            :key="route.id" 
            :lat-lng="[route.latitude, route.longitude]"
          >
             <l-icon class-name="custom-div-icon" :icon-anchor="[15, 30]">
                <div class="custom-marker">
                  {{ route.originalIndex + 1 }}
                </div>
             </l-icon>
             <l-popup>
               <div class="marker-popup-content">
                 <strong>{{ route.shop_name }}</strong><br>
                 <span>الكود: {{ route.shop_code }}</span>
               </div>
             </l-popup>
          </l-marker>
        </l-map>
      </div>
    </div>

    <div v-if="store.showProfilesModal" class="modal-overlay" @click="store.showProfilesModal = false">
      <div class="modal-content profiles-modal" @click.stop>
        <div class="modal-header">
          <h3><i class="fas fa-save text-primary"></i> قوالب خطوط السير</h3>
          <button class="close-btn" @click="store.showProfilesModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <p class="hint-text">احفظ ترتيب القائمة الحالية في أحد القوالب، أو حمل ترتيباً محفوظاً.</p>
          
          <div class="profile-slot" v-for="slot in [1, 2, 3]" :key="slot">
            <div class="slot-header">
              <span class="slot-num">{{ slot }}</span>
              <input 
                type="text" 
                :value="store.profileNames[slot]"
                @input="store.profileNames[slot] = $event.target.value"
                class="slot-name-input"
                placeholder="اسم خط السير..." 
              />
            </div>
            <div class="slot-actions">
              <button class="btn-slot-save" @click="store.saveProfile(slot, store.profileNames[slot])">
                <i class="fas fa-cloud-upload-alt"></i> حفظ الحالي
              </button>
              <button class="btn-slot-load" @click="store.applyProfile(slot)" :disabled="!store.isSlotSaved(slot)">
                <i class="fas fa-sync-alt"></i> تحميل وتطبيق
              </button>
              <button class="btn-slot-delete" @click="store.deleteProfile(slot)" :disabled="!store.isSlotSaved(slot)" title="حذف القالب">
                <i class="fas fa-trash-alt"></i> حذف
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="store.showIgnoredModal" class="modal-overlay" @click="store.showIgnoredModal = false">
      <div class="modal-content ignored-modal" @click.stop>
        <div class="modal-header">
          <h3><i class="fas fa-trash-restore text-warning"></i> سلة المحذوفات</h3>
          <div class="header-actions">
             <button v-if="store.ignoredRoutes.length > 0" class="btn-empty-trash" @click="store.emptyTrash">
                <i class="fas fa-broom"></i> مسح الكل
             </button>
             <button class="close-btn" @click="store.showIgnoredModal = false">&times;</button>
          </div>
        </div>
        
        <div class="modal-body scrollable-list">
          <div v-if="store.isLoading" class="text-center p-4">جاري التحميل...</div>
          <div v-else-if="store.ignoredRoutes.length === 0" class="empty-state-modal">
             <i class="fas fa-check-circle"></i>
             <p>السلة فارغة</p>
          </div>
          
          <ul v-else class="ignored-list">
            <li v-for="item in store.ignoredRoutes" :key="item.id">
              <div class="item-info">
                <span class="item-name">{{ item.shop_name }}</span>
                <span class="item-code">{{ item.shop_code }}</span>
              </div>
              <button class="btn-restore" @click="store.restoreRoute(item.id)">
                <i class="fas fa-undo"></i> استعادة
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div v-if="store.showModal" class="modal-overlay" @click="store.closeModal">
      <div class="modal-content location-modal" @click.stop>
        <div class="modal-header">
          <h3>
            <i class="fas fa-map-marker-alt text-primary"></i>
            تحديث الموقع:
            <span class="shop-title">{{ store.editingRoute?.shop_name }}</span>
            <span v-if="store.editingRoute?.shop_code" class="code-badge-modal">{{ store.editingRoute.shop_code }}</span>
          </h3>
          <div class="header-actions">
            <button class="btn-icon" @click="store.copyCoords" title="نسخ الإحداثيات">
              <i class="fas fa-copy"></i>
            </button>
            <button class="btn-icon" @click="store.useGPS" title="التقاط الموقع الحالي">
              <i class="fas fa-location-arrow"></i>
            </button>
            <button class="close-btn" @click="store.closeModal">&times;</button>
          </div>
        </div>

        <div class="modal-body">
          <p class="hint-text">ادخل تحديث الموقع ان وجد (بنفس الصيغه)</p>

          <div class="input-group location-input-group">
            <input type="text" :value="store.coordsInput" @input="store.coordsInput = $event.target.value" placeholder="Lat, Lng" class="form-input" />
            <div class="btn-group-vertical">
              <button class="btn-save" @click="store.saveLocation"><i class="fas fa-check mr-2"></i>حفظ</button>
              <button class="btn-clear" @click="store.clearCoords" title="مسح الإحداثيات"><i class="fas fa-eraser mr-2"></i>مسح</button>
            </div>
          </div>

          <div v-if="store.editingRoute?.latitude" class="coords-display">
            <span class="mono">المخزن حالياً: {{ store.editingRoute.latitude }}, {{ store.editingRoute.longitude }}</span>
            <div v-if="store.editingRoute.location_updated_at" class="update-timestamp">
              <i class="fas fa-clock"></i>
              آخر تحديث: {{ formatTimestamp(store.editingRoute.location_updated_at) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  
  </div>
</template>

<script setup>
import { onMounted, watch, ref, nextTick } from 'vue';
import { useItineraryStore } from '@/stores/itineraryStore';
import PageHeader from '@/components/layout/PageHeader.vue';
import "leaflet/dist/leaflet.css";
import { LMap, LTileLayer, LMarker, LPolyline, LIcon, LPopup } from "@vue-leaflet/vue-leaflet";

const store = useItineraryStore();
const mapRef = ref(null);

const fitMapToBounds = () => {
  nextTick(() => {
    const map = mapRef.value?.leafletObject;
    const coords = store.polylineCoords;
    if (map && coords && coords.length > 0) {
      map.fitBounds(coords, { padding: [50, 50] });
    }
  });
};

onMounted(async () => {
  await store.fetchRoutes();
  store.initNetworkListener();
  // Initial fit if starting on map tab (or if data loads after)
  fitMapToBounds();
});

watch(() => store.activeTab, (newTab) => {
  if (newTab === 'map') {
    // Needs a slight delay for the map container to be visible and initialized
    setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
    }, 100);
  }
});

const formatTimestamp = (isoString) => {
  if (!isoString) return '';
  const options = {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  };
  return new Date(isoString).toLocaleString('ar-EG', options);
};

// Watch for coordinate changes to refit the map
watch(() => store.polylineCoords, () => {
  if (store.activeTab === 'map') {
    fitMapToBounds();
  }
}, { deep: true });
</script>

<style scoped>
/* General Page & Tab Styles */
.page-container {
  padding: 1rem;
}
.tabs-container {
  margin-bottom: 1.5rem;
  background-color: var(--surface-bg);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  padding: 0.5rem;
}
.tabs-wrapper {
  display: flex;
  justify-content: center;
}
.tab-btn {
  flex: 1;
  padding: 1rem;
  border: none;
  background: none;
  color: var(--text-muted);
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s ease-in-out;
  font-size: 1rem;
  position: relative;
  border-bottom: 3px solid transparent;
}
.tab-btn.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}
.tab-btn:not(.active):hover {
  color: var(--text-main);
}
.tab-content-area {
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Map Styles */
.map-wrapper {
  height: 70vh;
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  border: 1px solid var(--border-color);
}
:deep(.custom-div-icon) {
  background: none;
  border: none;
}
.custom-marker {
  background-color: var(--primary);
  color: white;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  border: 2px solid white;
  box-shadow: 0 2px 5px rgba(0,0,0,0.3);
}
.marker-popup-content {
  text-align: center;
  font-family: var(--font-family);
}
.marker-popup-content strong {
  color: var(--primary);
  font-weight: 700;
}
.marker-popup-content span {
  font-size: 0.9rem;
}

/* Location Modal Styles */
.coords-display {
  margin-top: 15px;
  text-align: center;
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.5;
}
.update-timestamp {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 5px;
}
.update-timestamp i {
  margin-left: 4px;
}

/* Ignored Modal ("Trash") Professional Styles */
.ignored-modal .modal-header {
  align-items: center;
}
.ignored-modal .header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.btn-empty-trash {
  background: transparent;
  border: 1px solid var(--danger);
  color: var(--danger);
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-empty-trash:hover {
  background: var(--danger);
  color: white;
}
.empty-state-modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  color: var(--text-muted);
}
.empty-state-modal i {
  font-size: 3rem;
  color: var(--success);
  margin-bottom: 1rem;
  opacity: 0.8;
}
.empty-state-modal p {
  font-size: 1.1rem;
  font-weight: 600;
}
.ignored-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.ignored-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
  transition: background-color 0.2s ease;
}
.ignored-list li:last-child {
  border-bottom: none;
}
.ignored-list li:hover {
  background-color: var(--bg-secondary);
}
.item-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: flex-start;
}
.item-name {
  font-weight: 700;
  color: var(--text-main);
}
.item-code {
  font-size: 0.8rem;
  font-family: monospace;
  background-color: var(--bg-secondary);
  padding: 0.2rem 0.5rem;
  border-radius: var(--border-radius-sm);
  color: var(--text-muted);
}
.btn-restore {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.btn-restore:hover {
  background: var(--primary-dark);
}
.btn-restore i {
  margin-left: 0.5rem;
}
</style>
