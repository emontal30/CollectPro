import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/css/main.css'
import './assets/css/dark-mode.css'
import './assets/css/sidebar-dark-mode.css'
import './assets/css/unified-dark-mode.css'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// تهيئة المصادقة بعد تحميل التطبيق
const authStore = useAuthStore(pinia)
authStore.initializeAuth()

app.mount('#app')
