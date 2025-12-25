import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMySubscriptionStore } from '@/stores/mySubscriptionStore'
import { supabase } from '@/supabase'
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
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  try {
    if (!authStore.isInitialized) {
      await authStore.initializeAuth()
    }

    const requiresAuth = to.matched.some(r => r.meta.requiresAuth)
    const requiresGuest = to.matched.some(r => r.meta.requiresGuest)

    if (requiresAuth) {
      const { data: { session }, error } = await supabase.auth.getSession();
      const isNetworkError = error && (error.message?.includes('fetch') || !navigator.onLine);
      
      if (!session && !isNetworkError) {
        authStore.user = null;
        authStore.userProfile = null;
        if (to.path !== '/') return next('/');
        return next();
      } 
      
      if (session) {
        authStore.user = session.user;
      } else if (isNetworkError && !authStore.user) {
        return next('/');
      }
    }

    const isLoggedIn = authStore.isAuthenticated

    if (isLoggedIn && requiresGuest) {
      const lastRoute = localStorage.getItem('app_last_route') || '/app/dashboard';
      if (lastRoute === to.path) return next();
      return next(lastRoute);
    }

    if (requiresAuth) {
      const requiresAdmin = to.matched.some(r => r.meta.requiresAdmin)
      if (requiresAdmin && !authStore.isAdmin) {
         return next({ name: 'Dashboard' });
      }
    }

    // --- Subscription Protection Check (Optimized) ---
    const requiresSub = to.matched.some(r => r.meta.requiresSubscription);
    if (requiresSub && isLoggedIn && !authStore.isAdmin) {
        // نستخدم الإعداد المحمل مسبقاً في authStore بدلاً من الاستعلام المباشر
        if (authStore.isSubscriptionEnforced) {
            const subStore = useMySubscriptionStore();
            if (!subStore.isInitialized) await subStore.init(authStore.user);
            
            if (!subStore.isSubscribed) {
                return next({ name: 'MySubscription', query: { access: 'denied' } });
            }
        }
    }

    next()
  } catch (err) {
    logger.error('🚀 Router Guard Error:', err);
    next();
  }
})

router.afterEach((to) => {
  if (to.path.startsWith('/app')) {
    localStorage.setItem('app_last_route', to.fullPath);
  }
})

export default router
