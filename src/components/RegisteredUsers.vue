<template>
  <div class="users-section p-4 bg-white rounded-lg shadow-md" dir="rtl">
    <div class="flex justify-between items-center mb-6 border-b pb-4">
      <div>
        <h2 class="text-2xl font-bold text-teal-700 flex items-center gap-2">
          <i class="fas fa-users-cog"></i> المستخدمون المسجلون
        </h2>
        <p class="text-gray-500 text-sm mt-1">إدارة المستخدمين الذين قاموا بتسجيل الدخول</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="bg-teal-600 text-white px-3 py-1 rounded-full text-sm font-bold">
          {{ users.length }} مستخدم
        </span>
        <button
          class="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition"
          :disabled="loading"
          @click="fetchUsers"
        >
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i>
        </button>
      </div>
    </div>

    <div class="flex flex-wrap gap-4 mb-4 bg-teal-50 p-4 rounded-lg border border-teal-100">
      <div class="flex-1 min-w-[250px]">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ابحث باسم المستخدم أو البريد الإلكتروني"
          class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-600"
        />
      </div>

      <div class="flex items-center gap-2">
        <input
          v-model.number="bulkDays"
          type="number"
          min="1"
          placeholder="أيام الاشتراك"
          class="w-24 p-2 text-center border border-gray-300 rounded-lg"
        />
        <button
          class="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          @click="handleBulkActivate"
        >
          <i class="fas fa-check-double"></i> تفعيل المحدد
        </button>
      </div>
    </div>

    <div class="table-wrap">
      <table class="w-full text-right border-collapse">
        <thead>
          <tr class="bg-gradient-to-r from-teal-700 to-teal-600 text-white">
            <th class="p-3 text-center w-12">
              <input v-model="selectAll" type="checkbox" class="w-4 h-4 cursor-pointer" @change="toggleSelectAll" />
            </th>
            <th class="p-3"><i class="fas fa-id-badge ml-2"></i> ID</th>
            <th class="p-3"><i class="fas fa-user ml-2"></i> الاسم</th>
            <th class="p-3"><i class="fas fa-envelope ml-2"></i> البريد</th>
            <th class="p-3"><i class="fas fa-calendar-alt ml-2"></i> التسجيل</th>
            <th class="p-3 text-center w-32"><i class="fas fa-clock ml-2"></i> المدة (أيام)</th>
            <th class="p-3 text-center"><i class="fas fa-cogs ml-2"></i> إجراء</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-if="loading" class="text-center">
            <td colspan="7" class="p-8 text-gray-500">جاري التحميل...</td>
          </tr>
          <tr v-else-if="filteredUsers.length === 0" class="text-center">
            <td colspan="7" class="p-8 text-gray-500">لا يوجد مستخدمون مطابقون للبحث</td>
          </tr>

          <tr
            v-for="user in filteredUsers"
            :key="user.id"
            class="hover:bg-teal-50 transition"
            :class="{ 'bg-teal-50': selectedUsers.has(user.id) }"
          >
            <td class="p-3 text-center">
              <input v-model="checkedUserIds" type="checkbox" :value="user.id" class="w-4 h-4 cursor-pointer text-teal-600" />
            </td>
            <td class="p-3 font-mono text-xs text-gray-500" :title="user.id">{{ user.id.slice(0, 8) }}...</td>
            <td class="p-3 font-semibold" :class="{'text-teal-700': user.hasActiveSubscription}">
              {{ user.full_name || 'مستخدم' }}
              <span v-if="user.hasActiveSubscription" class="mr-1 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">مشترك</span>
            </td>
            <td class="p-3 text-sm">
              <a :href="`mailto:${user.email}`" class="text-teal-600 hover:underline">{{ user.email }}</a>
            </td>
            <td class="p-3 text-sm text-gray-600">{{ formatDate(user.created_at) }}</td>
            <td class="p-3 text-center">
              <input
                v-model.number="user.manualDays"
                type="number"
                min="1"
                class="w-20 p-1 text-center border border-gray-300 rounded focus:border-teal-500"
                placeholder="أيام"
              />
            </td>
            <td class="p-3 text-center">
              <button
                class="bg-teal-100 text-teal-700 border border-teal-200 hover:bg-teal-600 hover:text-white p-2 rounded-lg transition shadow-sm"
                title="تفعيل اشتراك يدوي"
                @click="activateUserSubscription(user)"
              >
                <i class="fas fa-play-circle"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue';
import { supabase } from '../supabase'; // تأكد من مسار ملف supabase.js

// نظام الإشعارات الموحد
const { confirm, success, error, addNotification } = inject('notifications');

// --- الحالة (State) ---
const users = ref([]);
const loading = ref(false);
const searchQuery = ref('');
const checkedUserIds = ref([]); // للمستخدمين المحددين بالـ Checkbox
const selectAll = ref(false);
const bulkDays = ref(null); // عدد الأيام للتفعيل الجماعي

// --- الحوسبة (Computed) ---
const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value;
  const query = searchQuery.value.toLowerCase();
  return users.value.filter(user =>
    (user.full_name && user.full_name.toLowerCase().includes(query)) ||
    (user.email && user.email.toLowerCase().includes(query))
  );
});

// تحديث مجموعة المستخدمين المحددين (Set) لسهولة التعامل
const selectedUsers = computed(() => new Set(checkedUserIds.value));

// --- الدوال (Functions) ---

// 1. جلب المستخدمين (منطق مستورد من loadLoggedInUsers في admin.js)
const fetchUsers = async () => {
  loading.value = true;
  try {
    // جلب المستخدمين
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, email, created_at')
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;

    // جلب الاشتراكات النشطة لمعرفة من لديه اشتراك
    const { data: activeSubs, error: subsError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('status', 'active');

    if (subsError) console.error('Error fetching active subs:', subsError);

    // إنشاء Set للمشتركين النشطين للبحث السريع
    const activeUserIds = new Set(activeSubs?.map(sub => sub.user_id) || []);

    // دمج البيانات
    users.value = usersData.map(user => ({
      ...user,
      hasActiveSubscription: activeUserIds.has(user.id),
      manualDays: null // حقل محلي لإدخال الأيام
    }));

  } catch (error) {
    console.error('Error loading users:', error);
    addNotification('فشل تحميل قائمة المستخدمين: ' + error.message, 'error', {
      suggestion: 'تحقق من اتصال الإنترنت وحاول مرة أخرى'
    });
  } finally {
    loading.value = false;
    checkedUserIds.value = [];
    selectAll.value = false;
  }
};

// 2. تفعيل اشتراك لمستخدم واحد (منطق createManualSubscriptionForUser)
const activateUserSubscription = async (user) => {
  const days = user.manualDays;

  if (!days || days <= 0) {
    addNotification('يرجى إدخال عدد أيام صحيح (أكبر من 0).', 'warning');
    return;
  }

  const result = await confirm({
    title: 'تأكيد تفعيل الاشتراك',
    text: `هل أنت متأكد من تفعيل اشتراك لمدة ${days} يوم للمستخدم ${user.full_name || user.email}؟`,
    icon: 'question',
    confirmButtonText: 'تفعيل',
    confirmButtonColor: '#007965'
  });

  if (!result.isConfirmed) return;

  await performActivation(user.id, days);
};

// 3. التفعيل الجماعي (منطق handleBulkActivateUsers)
const handleBulkActivate = async () => {
  if (!bulkDays.value || bulkDays.value <= 0) {
    addNotification('يرجى إدخال عدد أيام صحيح للتفعيل الجماعي.', 'warning');
    return;
  }

  if (checkedUserIds.value.length === 0) {
    addNotification('يرجى تحديد مستخدم واحد على الأقل.', 'warning');
    return;
  }

  const result = await confirm({
    title: 'تأكيد التفعيل الجماعي',
    text: `سيتم تفعيل الاشتراك لمدة ${bulkDays.value} يوم لعدد ${checkedUserIds.value.length} مستخدم. هل أنت متأكد؟`,
    icon: 'question',
    confirmButtonText: 'تفعيل الجميع',
    confirmButtonColor: '#007965'
  });

  if (!result.isConfirmed) return;

  loading.value = true;
  try {
    // تنفيذ التفعيل لكل مستخدم محدد بالتوازي
    const promises = checkedUserIds.value.map(userId =>
      performActivation(userId, bulkDays.value, true) // true = صامت (بدون alert لكل واحد)
    );

    await Promise.all(promises);

    addNotification('تم تنفيذ التفعيل الجماعي بنجاح!', 'success');
    bulkDays.value = null;
    await fetchUsers(); // تحديث البيانات
  } catch (error) {
    console.error('Bulk activation error:', error);
    addNotification('حدث خطأ أثناء التفعيل الجماعي.', 'error', {
      suggestion: 'تحقق من صحة البيانات وحاول مرة أخرى'
    });
  } finally {
    loading.value = false;
  }
};

// المنطق الفعلي لإنشاء الاشتراك في Supabase
const performActivation = async (userId, days, silent = false) => {
  try {
    // التحقق من وجود اشتراك نشط لتمديده
    const { data: activeSubs } = await supabase
      .from('subscriptions')
      .select('id, end_date')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1);

    const activeSub = activeSubs?.[0];
    const now = new Date();

    if (activeSub) {
      // تمديد الاشتراك الحالي
      let currentEnd = new Date(activeSub.end_date);
      // إذا كان منتهي الصلاحية لكن حالته نشط (خطأ ما)، نمدد من الآن
      let baseDate = currentEnd > now ? currentEnd : now;
      baseDate.setDate(baseDate.getDate() + days);

      await supabase
        .from('subscriptions')
        .update({ end_date: baseDate.toISOString() })
        .eq('id', activeSub.id);

    } else {
      // إنشاء اشتراك جديد
      // حذف أي اشتراكات معلقة (Pending) أولاً
      await supabase
        .from('subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('status', 'pending');

      const startDate = now;
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + days);

      // جلب خطة افتراضية للسعر (اختياري) أو وضع سعر 0
      const { data: plans } = await supabase
        .from('subscription_plans')
        .select('id, name, price_egp')
        .limit(1);

      const defaultPlan = plans?.[0];

      await supabase.from('subscriptions').insert({
        user_id: userId,
        plan_id: defaultPlan?.id || null,
        plan_name: defaultPlan?.name || 'اشتراك يدوي',
        plan_period: `${days} يوم`,
        price: defaultPlan?.price_egp || 0,
        transaction_id: `MANUAL-${Date.now()}`,
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      });
    }

    if (!silent) {
      addNotification('تم تفعيل/تمديد الاشتراك بنجاح!', 'success');
      await fetchUsers(); // تحديث الواجهة
    }

   } catch (error) {
     console.error('Activation failed:', error);
     if (!silent) addNotification('فشل تفعيل الاشتراك: ' + error.message, 'error', {
       suggestion: 'تحقق من صحة البيانات وحاول مرة أخرى'
     });
     throw error; // لكي يمسكه Promise.all في التفعيل الجماعي
   }
};

// أدوات مساعدة
const toggleSelectAll = () => {
  if (selectAll.value) {
    checkedUserIds.value = filteredUsers.value.map(u => u.id);
  } else {
    checkedUserIds.value = [];
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
};

// مراقبة التحديد لتحديث حالة Checkbox "الكل"
watch(checkedUserIds, (newVal) => {
  if (newVal.length === filteredUsers.value.length && filteredUsers.value.length > 0) {
    selectAll.value = true;
  } else {
    selectAll.value = false;
  }
});

// عند تحميل المكون
onMounted(() => {
  fetchUsers();
  // بدون إشعارات عند الدخول - تحميل صامت
});
</script>

<style scoped>
/* تحسينات إضافية للتنسيق */
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>