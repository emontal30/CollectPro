import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    darkMode: false,
    zoomLevel: 4 // 0-8 scale, 4 = normal
  }),

  getters: {
    zoomClass: (state) => {
      const levels = ['8xs', '7xs', '6xs', '5xs', 'xs', 'sm', 'base', 'normal', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl']
      return `zoom-${levels[state.zoomLevel] || 'normal'}`
    }
  },

  actions: {
    toggleDarkMode() {
      this.darkMode = !this.darkMode
      this.applySettings()
    },

    setDarkMode(isDark) {
      this.darkMode = isDark
      this.applySettings()
    },

    setZoomLevel(level) {
      this.zoomLevel = Math.max(0, Math.min(8, level))
      this.applySettings()
    },

    zoomIn() {
      if (this.zoomLevel < 8) {
        this.zoomLevel++
        this.applySettings()
      }
    },

    zoomOut() {
      if (this.zoomLevel > 0) {
        this.zoomLevel--
        this.applySettings()
      }
    },

    applySettings() {
      // Apply dark mode
      if (this.darkMode) {
        document.body.classList.add('dark')
      } else {
        document.body.classList.remove('dark')
      }

      // Apply zoom level
      const zoomClasses = ['zoom-8xs', 'zoom-7xs', 'zoom-6xs', 'zoom-5xs', 'zoom-xs', 'zoom-sm', 'zoom-base', 'zoom-normal', 'zoom-lg', 'zoom-xl', 'zoom-2xl', 'zoom-3xl', 'zoom-4xl', 'zoom-5xl', 'zoom-6xl']
      document.body.className = document.body.className.replace(/zoom-\w+/g, '').trim()
      document.body.classList.add(zoomClasses[this.zoomLevel] || 'zoom-normal')

      this.saveSettings()
    },

    saveSettings() {
      localStorage.setItem('settings', JSON.stringify({
        darkMode: this.darkMode,
        zoomLevel: this.zoomLevel
      }))
    },

    loadSettings() {
      const settings = localStorage.getItem('settings')
      if (settings) {
        try {
          const parsed = JSON.parse(settings)
          this.darkMode = parsed.darkMode || false
          this.zoomLevel = parsed.zoomLevel || 4
          this.applySettings()
        } catch (error) {
          console.error('Error loading settings:', error)
        }
      } else {
        this.applySettings()
      }
    }
  }
})