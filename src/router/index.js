import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import logger from '@/utils/logger.js'

// Lazy Loading Components
const LoginView = () => import('@/components/views/LoginView.vue')
const MainLayout = () => import('@/layouts/MainLayout.vue')
const DashboardView = () => import('@/components/views/DashboardView.vue')
const HarvestView = () => import('@/components/views/HarvestView.vue')
const ArchiveView = () => import('@/components/views/ArchiveView.vue')
const CounterView = () => import('@/components/views/CounterView.vue')
const SubscriptionsView = () => import('@/components/views/SubscriptionsView.vue')
const MySubscriptionView = () => import('@/components/views/MySubscriptionView.vue')
const PaymentView = () => import('@/components/views/PaymentView.vue')
const AdminView = () => import('@/components/views/AdminView.vue')

const routes = [
  {
    path: '/',
    name: 'Login',
    component: LoginView,
    meta: { requiresGuest: true }
  },
  {
    path: '/app',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      { 
        path: '', 
        redirect: { name: 'Dashboard' } 
      },
      { 
        path: 'dashboard', 
        name: 'Dashboard', 
        component: DashboardView 
      },
      { 
        path: 'harvest', 
        name: 'Harvest', 
        component: HarvestView 
      },
      { 
        path: 'archive', 
        name: 'Archive', 
        component: ArchiveView 
      },
      { 
        path: 'counter', 
        name: 'Counter', 
        component: CounterView 
      },
      { 
        path: 'subscriptions', 
        name: 'Subscriptions', 
        component: SubscriptionsView 
      },
      { 
        path: 'my-subscription', 
        name: 'MySubscription', 
        component: MySubscriptionView 
      },
      { 
        path: 'payment', 
        name: 'Payment', 
        component: PaymentView 
      },
      { 
        path: 'admin', 
        name: 'Admin', 
        component: AdminView,
        meta: { requiresAdmin: true } 
      }
    ]
  },
  // Catch All
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// --- Smart Navigation Guard ---
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 1. Ensure Auth Initialized
  if (!authStore.isInitialized) {
    await authStore.initializeAuth()
  }

  const isLoggedIn = authStore.isAuthenticated
  const requiresAuth = to.matched.some(r => r.meta.requiresAuth)
  const requiresGuest = to.matched.some(r => r.meta.requiresGuest)
  const requiresAdmin = to.matched.some(r => r.meta.requiresAdmin)

  // 2. Already Logged In -> Redirect to last page
  if (isLoggedIn && requiresGuest) {
    const lastRoute = localStorage.getItem('app_last_route') || '/app/dashboard';
    logger.info(`👤 User logged in, restoring to: ${lastRoute}`);
    return next(lastRoute);
  }

  // 3. Protected Routes
  if (requiresAuth) {
    if (!isLoggedIn) {
      logger.warn('🛡️ Access denied. Redirecting to Login.')
      return next('/')
    }

    // Admin Check
    if (requiresAdmin && !authStore.isAdmin) {
      logger.warn('⚠️ Admin access denied.')
      return next({ name: 'Dashboard' })
    }
  }

  next()
})

// --- Page Tracker ---
router.afterEach((to) => {
  if (to.path.startsWith('/app')) {
    localStorage.setItem('app_last_route', to.fullPath);
  }
})

export default router
