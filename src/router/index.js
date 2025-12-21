import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
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

  try {
    // 1. Ensure Auth Initialized
    if (!authStore.isInitialized) {
      await authStore.initializeAuth()
    }

    const requiresAuth = to.matched.some(r => r.meta.requiresAuth)
    const requiresGuest = to.matched.some(r => r.meta.requiresGuest)

    // 2. Check session only if needed to avoid hanging
    if (requiresAuth) {
      // نستخدم getSession() فقط إذا لم يكن هناك مستخدم في الستور أو للتأكد من صلاحية الجلسة
      // قمنا بإضافة محاولة سريعة لتجنب التعليق
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        logger.warn('🔒 Session invalid or expired. Redirecting to login.');
        authStore.user = null;
        authStore.userProfile = null;
        if (to.path !== '/') return next('/');
        return next();
      } else {
        authStore.user = session.user;
      }
    }

    const isLoggedIn = authStore.isAuthenticated

    // 3. Already Logged In -> Redirect to last page
    if (isLoggedIn && requiresGuest) {
      const lastRoute = localStorage.getItem('app_last_route') || '/app/dashboard';
      // تجنب حلقة مفرغة إذا كان lastRoute هو نفس الصفحة الحالية
      if (lastRoute === to.path) return next();
      return next(lastRoute);
    }

    // 4. Admin Check
    if (requiresAuth) {
      const requiresAdmin = to.matched.some(r => r.meta.requiresAdmin)
      if (requiresAdmin && !authStore.isAdmin) {
        logger.warn('⚠️ Admin access denied.')
        return next({ name: 'Dashboard' })
      }
    }

    next()
  } catch (err) {
    logger.error('🚀 Router Guard Error:', err);
    // في حالة حدوث خطأ كارثي، اسمح بالانتقال لتجنب تجميد الواجهة أو وجه للرئيسية
    next();
  }
})

// --- Page Tracker ---
router.afterEach((to) => {
  if (to.path.startsWith('/app')) {
    localStorage.setItem('app_last_route', to.fullPath);
  }
})

export default router
