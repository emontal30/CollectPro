import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/css/main.css'
import './assets/css/dark-mode.css'
import './assets/css/sidebar-dark-mode.css'
import './assets/css/unified-dark-mode.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Global PWA Install Prompt Handler
// Capture beforeinstallprompt event at the application level to prevent race conditions
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('🚀 Global: Captured beforeinstallprompt event');
  e.preventDefault(); // Prevent the default browser prompt
  window.deferredPrompt = e; // Store the event globally for components to use
});

app.mount('#app')
