<template>
  <div class="table-container">
    <table :class="tableClass">
      <thead>
        <tr>
          <th v-for="header in headers" :key="header.key" :class="header.class || ''">
            {{ header.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="index">
          <td v-for="header in headers" :key="header.key" :class="header.class || ''">
            <slot :name="header.key" :row="row" :value="row[header.key]">
              {{ row[header.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
const props = defineProps({
  headers: {
    type: Array,
    required: true
  },
  rows: {
    type: Array,
    required: true
  },
  tableClass: {
    type: String,
    default: 'modern-table'
  }
});
</script>

<style scoped>
@import url('../../../assets/css/variables.css');

.table-container {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: var(--spacing-lg) 0;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: var(--spacing-lg) 0;
  font-size: 0.9rem;
  background: white;
  border-radius: var(--border-radius);
  overflow: hidden;
  box-shadow: var(--shadow);
}

thead {
  background: var(--table-header-bg);
  color: white;
}

th {
  padding: var(--table-cell-padding);
  text-align: left;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.8em;
  letter-spacing: 0.5px;
}

td {
  padding: var(--table-cell-padding);
  border-bottom: 1px solid var(--gray-200);
  vertical-align: middle;
}

tbody tr:hover {
  background-color: var(--table-row-hover);
}

.modern-table {
  position: relative;
  border: 1px solid var(--gray-200);
  border-radius: var(--border-radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.modern-table th,
.modern-table td {
  padding: 12px 16px;
}

.striped tbody tr:nth-child(odd) {
  background-color: var(--gray-50);
}

.modern-table tbody tr:hover {
  box-shadow: var(--table-hover-shadow);
  position: relative;
  z-index: 1;
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: var(--spacing-md) 0;
}

.text-center {
  text-align: center !important;
}

.text-right {
  text-align: right !important;
}

.text-left {
  text-align: left !important;
}

.positive {
  color: var(--success);
  font-weight: 600;
}

.negative {
  color: var(--danger);
  font-weight: 600;
}

.neutral {
  color: var(--gray-600);
}

.table-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .modern-table {
    display: block;
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .modern-table th,
  .modern-table td {
    white-space: nowrap;
  }
}
</style>