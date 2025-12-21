import { defineStore } from 'pinia'
import logger from '@/utils/logger.js'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    darkMode: false,
    zoomLevel: 5 // 0 to 10 scale, 5 = normal (16px)
  }),

  getters: {
    zoomClass: (state) => {
      const levels = ['6xs', '5xs', 'xs', 'sm', 'base', 'normal', 'lg', 'xl', '2xl', '3xl', '4xl']
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
      this.zoomLevel = Math.max(0, Math.min(10, level))
      this.applySettings()
    },

    zoomIn() {
      if (this.zoomLevel < 10) {
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
      // Apply dark mode to body
      if (this.darkMode) {
        document.body.classList.add('dark')
      } else {
        document.body.classList.remove('dark')
      }

      // Apply zoom level to HTML element for rem scaling
      const zoomClasses = ['zoom-6xs', 'zoom-5xs', 'zoom-xs', 'zoom-sm', 'zoom-base', 'zoom-normal', 'zoom-lg', 'zoom-xl', 'zoom-2xl', 'zoom-3xl', 'zoom-4xl']
      
      const html = document.documentElement;
      // Remove all zoom classes
      zoomClasses.forEach(cls => html.classList.remove(cls));
      // Add current zoom class
      html.classList.add(zoomClasses[this.zoomLevel] || 'zoom-normal');

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
          this.darkMode = typeof parsed.darkMode === 'boolean' ? parsed.darkMode : false
          this.zoomLevel = typeof parsed.zoomLevel === 'number' ? parsed.zoomLevel : 5
          this.applySettings()
        } catch (error) {
          logger.error('Error loading settings:', error)
          this.applySettings()
        }
      } else {
        this.applySettings()
      }
    }
  }
})
