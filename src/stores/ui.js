import { defineStore } from 'pinia'
import { useSettingsStore } from './settings'

export const useUIStore = defineStore('ui', {
  state: () => ({
    isSidebarOpen: false
  }),

  actions: {
    toggleSidebar() {
      this.isSidebarOpen = !this.isSidebarOpen
    },

    openSidebar() {
      this.isSidebarOpen = true
    },

    closeSidebar() {
      this.isSidebarOpen = false
    },

    // Delegate dark mode and zoom to settings store
    toggleDarkMode() {
      const settingsStore = useSettingsStore()
      settingsStore.toggleDarkMode()
    },

    setDarkMode(isDark) {
      const settingsStore = useSettingsStore()
      settingsStore.setDarkMode(isDark)
    },

    setZoomLevel(level) {
      const settingsStore = useSettingsStore()
      settingsStore.setZoomLevel(level)
    },

    zoomIn() {
      const settingsStore = useSettingsStore()
      settingsStore.zoomIn()
    },

    zoomOut() {
      const settingsStore = useSettingsStore()
      settingsStore.zoomOut()
    },

    loadFromLocalStorage() {
      const settingsStore = useSettingsStore()
      settingsStore.loadSettings()
    },

    showAlert(message, type = 'info', duration = 4000) {
      const container = document.getElementById('alert-container')
      if (!container) return

      const alert = document.createElement('div')
      alert.className = `alert alert-${type} show`
      alert.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`

      container.prepend(alert)

      setTimeout(() => {
        alert.classList.remove('show')
        setTimeout(() => alert.remove(), 500)
      }, duration)
    }
  }
})