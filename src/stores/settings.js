import { defineStore } from 'pinia'

import logger from '@/utils/logger.js'
import { setLocalStorageCache, getLocalStorageCache } from '@/services/cacheManager';

// إصدار الإعدادات - يتم تغييره عند حدوث تغييرات جذرية في التنسيقات لضمان تحديث كاش المستخدم
const SETTINGS_VERSION = '1.1'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    darkMode: false,
    zoomLevel: 5, // 2 to 12 scale, 5 is the default (18px)
    version: SETTINGS_VERSION,
    // يمكن إضافة مصفوفة للألوان المخصصة هنا مستقبلاً
    themeConfig: {
      primaryColor: null,
      sidebarColor: null
    }
  }),

  getters: {
    zoomClass: (state) => `zoom-lvl${state.zoomLevel}`,
    isDarkMode: (state) => state.darkMode
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
      this.zoomLevel = Math.max(2, Math.min(12, level))
      this.applySettings()
    },

    /**
     * تطبيق الإعدادات على مستند الـ DOM
     * يتم استدعاؤها عند التغيير وعند تحميل التطبيق
     */
    applySettings() {
      try {
        const html = document.documentElement
        const body = document.body

        // 1. تطبيق الوضع الليلي (على الـ html والـ body لضمان التوافق)
        if (this.darkMode) {
          html.classList.add('dark')
          body.classList.add('dark')
        } else {
          html.classList.remove('dark')
          body.classList.remove('dark')
        }

        // 2. تطبيق مستويات الزوم
        // إزالة أي كلاسات زوم قديمة
        const classes = Array.from(html.classList)
        classes.forEach(cls => {
          if (cls.startsWith('zoom-lvl')) {
            html.classList.remove(cls)
          }
        })
        // إضافة الكلاس الجديد
        html.classList.add(`zoom-lvl${this.zoomLevel}`)

        // 3. تطبيق أي ألوان مخصصة إذا وجدت (مستقبلاً)
        if (this.themeConfig.primaryColor) {
          html.style.setProperty('--primary', this.themeConfig.primaryColor)
        }

        // 4. تحديث لون شريط الحالة للموبايل (theme-color) ليتوافق مع الوضع
        const themeColorMeta = document.querySelector('meta[name="theme-color"]')
        if (themeColorMeta) {
          // اللون #0f172a للوضع الليلي، و #007965 للوضع النهاري
          themeColorMeta.setAttribute('content', this.darkMode ? '#0f172a' : '#007965')
        }

        // تحديث لون شريط الحالة لأجهزة iOS (apple-mobile-web-app-status-bar-style)
        // في الوضع الليلي نستخدم black-translucent أو black، وفي النهاري default
        const appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
        if (appleMeta) {
          appleMeta.setAttribute('content', this.darkMode ? 'black-translucent' : 'default')
        }

        this.saveSettings()
      } catch (error) {
        logger.error('Error applying settings:', error)
      }
    },

    async saveSettings() {
      const dataToSave = {
        darkMode: this.darkMode,
        zoomLevel: this.zoomLevel,
        version: this.version,
        themeConfig: this.themeConfig
      }
      await setLocalStorageCache('app_settings_v1', dataToSave);
    },

    async loadSettings() {
      const saved = await getLocalStorageCache('app_settings_v1');
      if (saved) {
        try {
          // cacheManager parses JSON automatically if needed, but if encryption returns object, we use it directly
          const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;

          // التحقق من الإصدار - إذا كان هناك تحديث جوهري يمكننا إعادة تعيين بعض القيم
          if (parsed.version !== SETTINGS_VERSION) {
            logger.info('New settings version detected, migrating...')
            // منطق الترحيل (Migration) إذا لزم الأمر
          }

          this.darkMode = typeof parsed.darkMode === 'boolean' ? parsed.darkMode : false
          this.zoomLevel = (typeof parsed.zoomLevel === 'number' && parsed.zoomLevel >= 2 && parsed.zoomLevel <= 12) ? parsed.zoomLevel : 5
          this.themeConfig = parsed.themeConfig || { primaryColor: null, sidebarColor: null }

          this.applySettings()
        } catch (error) {
          logger.error('Error parsing settings:', error)
          this.resetToDefaults()
        }
      } else {
        // إذا لم توجد إعدادات، نحاول كشف تفضيلات النظام
        this.detectSystemPreferences()
        this.applySettings()
      }
    },

    detectSystemPreferences() {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this.darkMode = true
      }
    },

    resetToDefaults() {
      this.darkMode = false
      this.zoomLevel = 5
      this.themeConfig = { primaryColor: null, sidebarColor: null }
      this.applySettings()
    }
  }
})
