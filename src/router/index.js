import { createRouter, createWebHistory } from 'vue-router'
import api from '@/services/api'
import MainLayout from '@/layouts/MainLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'

// Cache for authentication state to avoid repeated API calls
let authCache = {
  isAuthenticated: null,
  lastCheck: null,
  cacheTimeout: 60000 // Increased from 30 to 60 seconds
}

// Function to check authentication with caching
async function checkAuth() {
  const now = Date.now()

  // Return cached value if still valid
  if (authCache.isAuthenticated !== null &&
      authCache.lastCheck &&
      (now - authCache.lastCheck) < authCache.cacheTimeout) {
    return authCache.isAuthenticated
  }

  // Check authentication and cache the result
  try {
    const isAuthenticated = await api.auth.isAuthenticated()
    authCache.isAuthenticated = isAuthenticated
    authCache.lastCheck = now
    return isAuthenticated
  } catch (error) {
    console.error('Auth check error:', error)
    authCache.isAuthenticated = false
    authCache.lastCheck = now
    return false
  }
}

// Function to invalidate cache (call after login/logout)
function invalidateAuthCache() {
  authCache.isAuthenticated = null
  authCache.lastCheck = null
}

// Lazy load components with prefetch for better performance
const LoginView = () => import(/* webpackPrefetch: true */ '@/components/views/LoginView.vue')
const DashboardView = () => import(/* webpackPrefetch: true */ '@/components/views/DashboardView.vue')
const HarvestView = () => import(/* webpackPrefetch: true */ '@/components/views/HarvestView.vue')
const ArchiveView = () => import(/* webpackPrefetch: true */ '@/components/views/ArchiveView.vue')
const CounterView = () => import(/* webpackPrefetch: true */ '@/components/views/CounterView.vue')
const AdminView = () => import(/* webpackPrefetch: true */ '@/components/views/AdminView.vue')
const SubscriptionsView = () => import(/* webpackPrefetch: true */ '@/components/views/SubscriptionsView.vue')
const MySubscriptionView = () => import(/* webpackPrefetch: true */ '@/components/views/MySubscriptionView.vue')
const PaymentView = () => import(/* webpackPrefetch: true */ '@/components/views/PaymentView.vue')

const routes = [
  {
    path: '/',
    name: 'Login',
    component: LoginView,
    meta: { requiresAuth: false }
  },
  {
    path: '/app',
    component: MainLayout,
    children: [
      {
        path: '',
        redirect: '/app/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: DashboardView,
        meta: { requiresAuth: true }
      },
      {
        path: 'harvest',
        name: 'Harvest',
        component: HarvestView,
        meta: { requiresAuth: true }
      },
      {
        path: 'archive',
        name: 'Archive',
        component: ArchiveView,
        meta: { requiresAuth: true }
      },
      {
        path: 'counter',
        name: 'Counter',
        component: CounterView,
        meta: { requiresAuth: true }
      },
      {
        path: 'subscriptions',
        name: 'Subscriptions',
        component: SubscriptionsView,
        meta: { requiresAuth: true }
      },
      {
        path: 'my-subscription',
        name: 'MySubscription',
        component: MySubscriptionView,
        meta: { requiresAuth: true }
      },
      {
        path: 'payment',
        name: 'Payment',
        component: PaymentView,
        meta: { requiresAuth: true }
      },
      {
        path: 'admin',
        name: 'Admin',
        component: AdminView,
        meta: { requiresAuth: true }
      }
    ]
  },
  // Redirect legacy routes
  { path: '/index.html', redirect: '/' },
  { path: '/dashboard.html', redirect: '/app/dashboard' },
  { path: '/harvest.html', redirect: '/app/harvest' },
  { path: '/archive.html', redirect: '/app/archive' },
  { path: '/counter.html', redirect: '/app/counter' },
  { path: '/admin.html', redirect: '/app/admin' },
  { path: '/subscriptions.html', redirect: '/app/subscriptions' },
  { path: '/my-subscription.html', redirect: '/app/my-subscription' },
  { path: '/payment.html', redirect: '/app/payment' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Optimized Navigation guard - حماية المسارات مع كاشينج
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  
  // Skip auth check for login page to prevent loops
  if (to.path === '/' || to.path === '/login') {
    next()
    return
  }
  
  // Use cached auth check to avoid repeated API calls
  const isAuthenticated = await checkAuth()

  if (requiresAuth && !isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router
export { invalidateAuthCache }
