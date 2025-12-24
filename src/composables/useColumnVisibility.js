import { ref, reactive } from 'vue';

/**
 * Composable for managing column visibility in tables
 * @param {Array} columns - List of column objects { key, label }
 * @param {string} storageKey - localStorage key to save visibility state
 * @returns {Object}
 */
export function useColumnVisibility(columns, storageKey) {
  const showSettings = ref(false);
  const visibility = reactive({});

  // Initialize visibility
  const load = () => {
    const raw = localStorage.getItem(storageKey);
    const saved = raw ? JSON.parse(raw) : null;
    columns.forEach(c => {
      visibility[c.key] = saved && typeof saved[c.key] === 'boolean' ? saved[c.key] : true;
    });
  };

  const isVisible = (key) => visibility[key] !== false;

  const apply = (obj) => {
    Object.keys(obj || {}).forEach(k => {
      visibility[k] = !!obj[k];
    });
  };

  return {
    showSettings,
    visibility,
    load,
    isVisible,
    apply
  };
}
