import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import MainLayout from '@/layouts/MainLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'

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
        name: 'Home',
        component: DashboardView,
        meta: { requiresAuth: true }
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
  { path: '/admin.html', redirect: '/app/admin' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Simplified Navigation guard - Single Source of Truth with Pinia
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  // Get auth store (imported directly for simplicity)
  const authStore = useAuthStore()

  console.log('Router guard - Path:', to.path, 'User:', authStore.user?.email || 'No user', 'Initialized:', authStore.isInitialized);

  // Handle post-login redirect when user just logged in
  if (authStore.user && (to.path === '/' || to.path === '/login')) {
    console.log('Authenticated user on login page, redirecting to app...');
    next('/app');
    return;
  }

  // Skip auth check for login page to prevent loops
  if (to.path === '/' || to.path === '/login') {
    console.log('Allowing access to login page');
    next()
    return
  }

  // If auth is not initialized yet, wait for it
  if (!authStore.isInitialized && !authStore.isLoading) {
    console.log('Auth not initialized yet, waiting...');
    try {
      await authStore.initializeAuth();
      console.log('Auth initialization completed, user:', authStore.user?.email || 'No user');
    } catch (error) {
      console.error('Auth initialization failed during navigation:', error);
    }
  } else if (authStore.isLoading) {
    // Wait for ongoing initialization to complete
    console.log('Auth initialization in progress, waiting...');
    while (authStore.isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.log('Auth initialization completed, user:', authStore.user?.email || 'No user');
  }

  // If user is already loaded in store, use that
  if (authStore.user !== null) {
    console.log('User found in store, allowing access');
    next()
    return
  }

  // Final check after initialization
  if (requiresAuth && authStore.user === null) {
    console.log('No user found after initialization, requiring auth - redirecting to login');
    next('/')
  } else {
    console.log('Allowing access');
    next()
  }
})

export default router
