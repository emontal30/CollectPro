<template>
  <div v-if="show" class="cv-overlay" @click.self="close">
    <div class="cv-modal cv-elevated">
      <header class="cv-header">
        <div class="cv-title">
          <i class="fas fa-cog cv-gear"></i>
          <div>
            <h3>تخصيص الأعمدة</h3>
            <small class="cv-sub">اختر الأعمدة التي تريد عرضها في الجدول</small>
          </div>
        </div>
        <button class="cv-close" @click="close" aria-label="إغلاق">✕</button>
      </header>

      <div class="cv-body">
        <div class="cv-controls">
          <button class="cv-selectall-btn btn" :aria-pressed="allChecked" @click="toggleAll">
            <i class="fas" :class="allChecked ? 'fa-times' : 'fa-check'" aria-hidden="true"></i>
            <span class="cv-label">{{ allChecked ? 'إلغاء التحديد' : 'تحديد الكل' }}</span>
          </button>
        </div>

        <ul class="cv-list">
          <li v-for="col in columns" :key="col.key" class="cv-item">
            <label class="cv-checkbox">
              <input type="checkbox" v-model="visibleMap[col.key]" />
              <span class="checkmark"></span>
              <span class="cv-label">{{ col.label }}</span>
            </label>
          </li>
        </ul>
      </div>

      <footer class="cv-footer">
        <button class="btn btn-ghost" @click="close">إلغاء</button>
        <button class="btn btn-primary cv-save" @click="save">حفظ التغييرات</button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { reactive, toRefs, watch, computed } from 'vue';
const props = defineProps({
  columns: { type: Array, required: true },
  storageKey: { type: String, required: true },
  modelValue: { type: Boolean, default: false }
});
const emit = defineEmits(['update:modelValue','save']);

const show = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
});

const visibleMap = reactive({});

function loadFromStorage() {
  const raw = localStorage.getItem(props.storageKey);
  const saved = raw ? JSON.parse(raw) : null;
  props.columns.forEach(c => {
    visibleMap[c.key] = saved && typeof saved[c.key] === 'boolean' ? saved[c.key] : true;
  });
}

watch(() => props.modelValue, (val) => {
  if (val) loadFromStorage();
});

const allChecked = computed({
  get() {
    return props.columns.every(c => visibleMap[c.key]);
  },
  set(v) {
    props.columns.forEach(c => { visibleMap[c.key] = v; });
  }
});

function toggleAll() {
  allChecked.value = !allChecked.value;
}

function save() {
  const obj = {};
  props.columns.forEach(c => { obj[c.key] = !!visibleMap[c.key]; });
  localStorage.setItem(props.storageKey, JSON.stringify(obj));
  emit('save', obj);
  show.value = false;
}

function close() {
  show.value = false;
}
</script>

<style scoped>
.cv-overlay{
  position:fixed; inset:0; background:rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; z-index:1100;
}
.cv-modal{ width:380px; background:var(--bg, #fff); border-radius:12px; overflow:hidden; color:var(--text, #111); transform-origin:center; }
.cv-elevated{ box-shadow: 0 10px 40px rgba(2,6,23,0.18); }
.cv-header{ display:flex; align-items:center; justify-content:space-between; padding:14px 18px; background:linear-gradient(90deg,var(--primary,#007965), rgba(0,121,101,0.85)); color:#fff; }
.cv-title{ display:flex; gap:12px; align-items:center }
.cv-gear{ font-size:20px; opacity:0.95 }
.cv-header h3{ margin:0; font-size:15px; font-weight:700 }
.cv-sub{ display:block; font-size:12px; opacity:0.9 }
.cv-close{ background:rgba(255,255,255,0.12); border:none; color:#fff; width:34px; height:34px; border-radius:8px; cursor:pointer }
.cv-body{ padding:16px; background:var(--surface, #fff); }
.cv-list{ list-style:none; padding:0; margin:8px 0 0 0; max-height:300px; overflow:auto; }
.cv-item{ padding:10px 0; border-bottom:1px solid rgba(15,15,15,0.03); }
.cv-label{ margin-left:12px; font-weight:600 }
.cv-selectall-btn{ display:inline-flex; gap:10px; align-items:center; border:1px solid rgba(0,0,0,0.06); background:transparent; padding:8px 10px; border-radius:8px; cursor:pointer; font-weight:700 }
.cv-selectall-btn i{ width:18px; text-align:center }
.cv-selectall-btn[aria-pressed="true"]{ background:linear-gradient(90deg,var(--primary,#007965), var(--primary-dark)); color:#fff; border-color:transparent }

/* custom checkbox */
.cv-checkbox{ display:flex; align-items:center; gap:12px; cursor:pointer; position:relative }
.cv-checkbox input{ position:absolute; left:0; top:0; width:18px; height:18px; opacity:0; margin:0; }
.cv-checkbox .checkmark{ width:22px; height:22px; display:inline-block; border-radius:8px; border:2px solid rgba(0,0,0,0.12); background:var(--surface, #fff); transition:all 0.18s ease; box-sizing: border-box; position:relative }
.cv-checkbox input:focus + .checkmark{ box-shadow:0 0 0 4px rgba(0,121,101,0.12); }
.cv-checkbox input:checked + .checkmark{ background:linear-gradient(180deg,var(--primary,#007965), #005b45); border-color:transparent; box-shadow: 0 6px 18px rgba(2,6,23,0.12); }
/* rounded tick made with borders */
.cv-checkbox .checkmark::after{ content:''; position:absolute; left:50%; top:50%; width:10px; height:6px; transform:translate(-50%,-55%) rotate(-45deg); border-left:2.5px solid transparent; border-bottom:2.5px solid transparent; opacity:0; transition:opacity 0.12s ease; }
.cv-checkbox input:checked + .checkmark::after{ border-left-color:#fff; border-bottom-color:#fff; opacity:1 }

.cv-footer{ display:flex; gap:10px; justify-content:flex-end; padding:12px 16px; background:linear-gradient(180deg, rgba(0,0,0,0.02), transparent); }
.cv-save{ /* use global btn-primary for visuals */ }
.cv-save:hover{ filter:brightness(0.96); }
.btn-ghost{ background:#ffffff; border:1px solid rgba(0,0,0,0.12); color:var(--text,#111); border-radius:8px; padding:8px 12px }
.btn-ghost:hover{ background:rgba(0,0,0,0.03); }
.cv-selectall-btn{ background:#ffffff; border:1px solid rgba(0,0,0,0.12); color:var(--text,#111); border-radius:8px; padding:8px 10px; }
.cv-selectall-btn:hover{ background:rgba(0,0,0,0.03); }
.cv-selectall-btn[aria-pressed="true"]{ background: linear-gradient(90deg,var(--primary,#007965), var(--primary-dark)); color:#fff }

@media (max-width:420px){ .cv-modal { width:92%; } }
/* dark theme support: prefers-color-scheme and .dark-mode fallback */
@media (prefers-color-scheme: dark) {
  .cv-overlay{ background:rgba(0,0,0,0.6); }
  .cv-modal{ background:var(--bg, #0f1720); color:var(--text, #e6eef0); }
  .cv-body{ background:transparent }
  .cv-item{ border-bottom:1px solid rgba(255,255,255,0.04); }
  .cv-checkbox .checkmark{ border-color:rgba(255,255,255,0.08); background:var(--surface, #0f1720); }
  .cv-checkbox input:focus + .checkmark{ box-shadow:0 0 0 4px rgba(0,121,101,0.12); }
  .cv-footer .btn--ghost{ border-color: rgba(255,255,255,0.06); color: var(--text, #e6eef0); }
  .cv-save{ background: linear-gradient(90deg,var(--primary,#007965), #006a56); color:#fff }
  .cv-selectall-btn{ border-color: rgba(255,255,255,0.06); color: var(--text, #e6eef0); }
  .cv-selectall-btn[aria-pressed="true"]{ background: linear-gradient(90deg,var(--primary,#007965), #006a56); color:#fff }
  .cv-close{ background: rgba(255,255,255,0.08); color:#fff }
}
.dark-mode .cv-overlay{ background:rgba(0,0,0,0.6); }
.dark-mode .cv-modal{ background:var(--bg, #0f1720); color:var(--text, #e6eef0); }
.dark-mode .cv-body{ background:transparent }
.dark-mode .cv-item{ border-bottom:1px solid rgba(255,255,255,0.04); }
.dark-mode .cv-checkbox .checkmark{ border-color:rgba(255,255,255,0.08); background:var(--surface, #0f1720); }
/* dark-mode button variants */
.dark-mode .cv-footer .btn--ghost{ border-color: rgba(255,255,255,0.06); color: var(--text, #e6eef0); }
.dark-mode .cv-save{ background: linear-gradient(90deg,var(--primary,#007965), #006a56); color:#fff }
.dark-mode .cv-selectall-btn{ border-color: rgba(255,255,255,0.06); color: var(--text, #e6eef0); }
.dark-mode .cv-selectall-btn[aria-pressed="true"]{ background: linear-gradient(90deg,var(--primary,#007965), #006a56); color:#fff }
.dark-mode .cv-close{ background: rgba(255,255,255,0.08); color:#fff }
</style>
