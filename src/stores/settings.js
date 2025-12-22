import { defineStore } from 'pinia'
import logger from '@/utils/logger.js'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    darkMode: false,
    zoomLevel: 5 // 0 to 10 scale, 5 is the new default (14px)
  }),

  getters: {
    zoomClass: (state) => {
      return `zoom-lvl${state.zoomLevel}`
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

      // Apply zoom level to HTML element
      const html = document.documentElement;
      
      // Remove any class starting with zoom-lvl
      const classes = Array.from(html.classList);
      classes.forEach(cls => {
        if (cls.startsWith('zoom-lvl')) {
          html.classList.remove(cls);
        }
      });
      
      // Add current zoom class
      html.classList.add(`zoom-lvl${this.zoomLevel}`);

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
          // التأكد من أن الزوم القديم (إذا كان مخزناً) سيتم تحويله للقيمة الافتراضية الجديدة 5 إذا لم يكن صالحاً
          this.zoomLevel = (typeof parsed.zoomLevel === 'number' && parsed.zoomLevel >= 0 && parsed.zoomLevel <= 10) ? parsed.zoomLevel : 5
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
