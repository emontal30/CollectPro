import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMySubscriptionStore } from '@/stores/mySubscriptionStore'
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
        component: DashboardView,
        meta: { requiresSubscription: true } 
      },
      { 
        path: 'harvest', 
        name: 'Harvest', 
        component: HarvestView,
        meta: { requiresSubscription: true } 
      },
      { 
        path: 'archive', 
        name: 'Archive', 
        component: ArchiveView,
        meta: { requiresSubscription: true } 
      },
      { 
        path: 'counter', 
        name: 'Counter', 
        component: CounterView,
        meta: { requiresSubscription: true } 
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
  // --- Intelligent Catch-all Route ---
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    beforeEnter: (to, from, next) => {
      logger.warn(`🚀 Route Not Found: ${to.path}. Redirecting...`);
      const authStore = useAuthStore();
      // Must ensure auth is initialized to make a correct decision
      if (!authStore.isInitialized) {
        authStore.initializeAuth().then(() => {
          if (authStore.isAuthenticated) {
            next({ name: 'Dashboard' });
          } else {
            next({ name: 'Login' });
          }
        });
      } else {
        if (authStore.isAuthenticated) {
          next({ name: 'Dashboard' });
        } else {
          next({ name: 'Login' });
        }
      }
    },
    // No component is needed for a redirect-only route
    component: { template: '' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  try {
    // Ensure auth state is initialized before any navigation
    if (!authStore.isInitialized) {
      await authStore.initializeAuth();
    }

    const isLoggedIn = authStore.isAuthenticated;
    const requiresAuth = to.matched.some(r => r.meta.requiresAuth);
    const requiresGuest = to.matched.some(r => r.meta.requiresGuest);
    
    // The NotFound route now handles its own logic, so we can ignore it here.
    if (to.name === 'NotFound') {
        return next();
    }

    // Redirect unauthenticated users trying to access protected routes
    if (requiresAuth && !isLoggedIn) {
      return next({ path: '/' }); // Redirect to login
    }

    // Redirect authenticated users trying to access guest-only routes (like login)
    if (requiresGuest && isLoggedIn) {
      const lastRoute = localStorage.getItem('app_last_route') || '/app/dashboard';
      return next(lastRoute);
    }
    
    // --- Post-Authentication Checks (Admin & Subscription) ---
    if (requiresAuth && isLoggedIn) {
      // Admin Role Check
      const requiresAdmin = to.matched.some(r => r.meta.requiresAdmin);
      if (requiresAdmin && !authStore.isAdmin) {
        return next({ name: 'Dashboard' }); // Redirect non-admins
      }

      // Subscription Protection Check
      const requiresSub = to.matched.some(r => r.meta.requiresSubscription);
      if (requiresSub && !authStore.isAdmin && authStore.isSubscriptionEnforced) {
        const subStore = useMySubscriptionStore();
        if (!subStore.isInitialized) {
          await subStore.init(authStore.user);
        }
        
        if (!subStore.isSubscribed) {
          return next({ name: 'MySubscription', query: { access: 'denied' } });
        }
      }
    }

    // If all checks pass, proceed to the route
    next();

  } catch (err) {
    logger.error('🚀 Router Guard Error:', err);
    // In case of error during initialization, prevent navigation to protected routes
    if (to.meta.requiresAuth) {
      next('/');
    } else {
      next();
    }
  }
});


router.afterEach((to) => {
  if (to.path.startsWith('/app')) {
    localStorage.setItem('app_last_route', to.fullPath);
  }
})

export default router
