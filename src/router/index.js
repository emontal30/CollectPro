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
        meta: { requiresSubscription: true } // محمية
      },
      { 
        path: 'harvest', 
        name: 'Harvest', 
        component: HarvestView,
        meta: { requiresSubscription: true } // محمية
      },
      { 
        path: 'archive', 
        name: 'Archive', 
        component: ArchiveView,
        meta: { requiresSubscription: true } // محمية
      },
      { 
        path: 'counter', 
        name: 'Counter', 
        component: CounterView,
        meta: { requiresSubscription: true } // محمية
      },
      { 
        path: 'subscriptions', 
        name: 'Subscriptions', 
        component: SubscriptionsView 
        // مفتوحة (لشراء باقة)
      },
      { 
        path: 'my-subscription', 
        name: 'MySubscription', 
        component: MySubscriptionView 
        // مفتوحة (لمعرفة الحالة)
      },
      { 
        path: 'payment', 
        name: 'Payment', 
        component: PaymentView 
        // مفتوحة
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

    // 2. Check session only if needed
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

    // 3. Already Logged In -> Redirect to last page
    if (isLoggedIn && requiresGuest) {
      const lastRoute = localStorage.getItem('app_last_route') || '/app/dashboard';
      if (lastRoute === to.path) return next();
      return next(lastRoute);
    }

    // 4. Admin Check
    if (requiresAuth) {
      const requiresAdmin = to.matched.some(r => r.meta.requiresAdmin)
      if (requiresAdmin && !authStore.isAdmin) {
         // إذا لم يكن أدمن، لا يدخل
         return next({ name: 'Dashboard' }); // أو صفحة أخرى آمنة
      }
    }

    // 5. Subscription Protection Check (New Feature) 🛡️
    const requiresSub = to.matched.some(r => r.meta.requiresSubscription);
    if (requiresSub && isLoggedIn && !authStore.isAdmin) {
        // التحقق مما إذا كان النظام محمياً
        // نستخدم cache لتجنب الطلبات المتكررة، لكن مع التحقق الدوري
        let isEnforced = false;
        
        try {
            // محاولة قراءة الإعداد من الـ localStorage أولاً للسرعة
            // ويجب تحديث هذا الـ cache عند بدء التطبيق في مكان ما
            const cachedConfig = localStorage.getItem('sys_config_enforce');
            if (cachedConfig) {
                isEnforced = cachedConfig === 'true';
            } else {
                // إذا لم يوجد، نطلبه من الشبكة (مرة واحدة ثم نخزنه)
                // الأفضل: أن يتم تحميله في الـ authStore عند البدء
                const { data: config } = await supabase
                    .from('system_config')
                    .select('value')
                    .eq('key', 'enforce_subscription')
                    .maybeSingle();
                
                isEnforced = config?.value === 'true' || config?.value === true;
                localStorage.setItem('sys_config_enforce', String(isEnforced));
            }
        } catch (e) {
            // فشل القراءة (أوفلاين مثلاً)، نعتمد على الكاش أو نسمح بالمرور
        }

        if (isEnforced) {
            const subStore = useMySubscriptionStore();
            // تأكد من تحميل بيانات الاشتراك
            if (!subStore.isInitialized) await subStore.init(authStore.user);
            
            if (!subStore.isSubscribed) {
                // إذا لم يكن مشتركاً، حوله لصفحة اشتراكي
                // مع رسالة (يمكن تمريرها كـ query param أو عبر الستور)
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
