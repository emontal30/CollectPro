import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import logger from '@/utils/logger.js';
import localforage from 'localforage';

export const useReportsStore = defineStore('reports', () => {
    // --- State ---
    const allArchiveData = ref([]);
    const isLoading = ref(true);
    const selectedPeriod = ref('week'); // week is now default
    const selectedDate = ref(null);
    const customerNotes = ref([]);
    const allNotes = ref([]);

    const authStore = useAuthStore();

    /**
     * بريفكس الأرشيف والملاحظات
     */
    const BASE_PREFIX = 'arch_data_';
    const NOTES_PREFIX = 'customer_notes_';

    const DB_PREFIX = computed(() => {
        const userId = authStore.user?.id;
        return userId ? `u_${userId}_${BASE_PREFIX}` : BASE_PREFIX;
    });

    const NOTES_DB_PREFIX = computed(() => {
        const userId = authStore.user?.id;
        return userId ? `u_${userId}_${NOTES_PREFIX}` : NOTES_PREFIX;
    });

    /**
     * تحميل جميع بيانات الأرشيف المحلي
     */
    async function loadAllLocalArchives() {
        isLoading.value = true;
        const currentPrefix = DB_PREFIX.value;

        try {
            const allKeys = await localforage.keys();
            const archKeys = allKeys.filter(k => k.startsWith(currentPrefix));

            logger.info(`📊 ReportsStore: Found ${archKeys.length} archive keys`);

            const results = await Promise.allSettled(
                archKeys.map(async (key) => {
                    const data = await localforage.getItem(key);
                    const dateStr = key.replace(currentPrefix, '').replace(BASE_PREFIX, '');
                    const records = Array.isArray(data) ? data : (data?.rows || []);

                    return records.map(r => ({ ...r, date: dateStr }));
                })
            );

            // Filter only successful reads
            const allData = results
                .filter(r => r.status === 'fulfilled')
                .map(r => r.value);

            allArchiveData.value = allData.flat();
            logger.info(`✅ ReportsStore: Loaded ${allArchiveData.value.length} total records`);
        } catch (err) {
            logger.error('❌ ReportsStore: Error loading archives:', err);
            allArchiveData.value = [];
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * الحصول على نطاق التواريخ بناءً على الفترة المختارة
     */
    function getDateRange() {
        let targetDate = new Date();

        // في حالة العرض اليومي، نستخدم أحدث تاريخ موجود في الأرشيف
        if (selectedPeriod.value === 'day' && allArchiveData.value.length > 0) {
            // استخراج جميع التواريخ وتحويلها لكائنات Date
            const allDates = allArchiveData.value
                .map(r => r.date ? new Date(r.date).getTime() : 0)
                .filter(d => d > 0);

            if (allDates.length > 0) {
                const maxDate = Math.max(...allDates);
                targetDate = new Date(maxDate);
            }
        }

        const endDate = new Date(targetDate);
        endDate.setHours(23, 59, 59, 999);

        let startDate = new Date(targetDate);
        startDate.setHours(0, 0, 0, 0);

        switch (selectedPeriod.value) {
            case 'day':
                // نفس اليوم (تم تحديده بالأعلى ليكون أحدث تاريخ)
                break;
            case 'week':
                // آخر 7 أيام من تاريخ اليوم الحالي (وليس الأرشيف)
                const todayForWeek = new Date();
                endDate.setTime(todayForWeek.getTime());
                endDate.setHours(23, 59, 59, 999);

                startDate.setTime(todayForWeek.getTime());
                startDate.setHours(0, 0, 0, 0);
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                // آخر 30 يوم من تاريخ اليوم الحالي
                const todayForMonth = new Date();
                endDate.setTime(todayForMonth.getTime());
                endDate.setHours(23, 59, 59, 999);

                startDate.setTime(todayForMonth.getTime());
                startDate.setHours(0, 0, 0, 0);
                startDate.setDate(startDate.getDate() - 30);
                break;
        }

        return { startDate, endDate };
    }

    /**
     * تصفية البيانات حسب الفترة
     */
    const filteredData = computed(() => {
        // إذا كان الفلترة باليوم ولم يتم تحديد تاريخ، نختار أحدث تاريخ تلقائياً
        if (selectedPeriod.value === 'day') {
            if (selectedDate.value) {
                return allArchiveData.value.filter(r => r.date === selectedDate.value);
            }

            // البحث عن أحدث تاريخ نصي في البيانات
            if (allArchiveData.value.length > 0) {
                const dates = allArchiveData.value.map(r => r.date).sort();
                const latestDate = dates[dates.length - 1];
                return allArchiveData.value.filter(r => r.date === latestDate);
            }
            return [];
        }

        const { startDate, endDate } = getDateRange();

        return allArchiveData.value.filter(record => {
            if (!record.date) return false;
            // إضافة التوقيت لضمان التحليل بالتوقيت المحلي
            const recordDate = new Date(record.date + 'T00:00:00');
            return recordDate >= startDate && recordDate <= endDate;
        });
    });

    /**
     * حساب الإحصائيات الأساسية
     */
    const totalStats = computed(() => {
        const data = selectedDate.value
            ? allArchiveData.value.filter(r => r.date === selectedDate.value)
            : filteredData.value;

        return data.reduce((acc, record) => {
            acc.totalAmount += Number(record.amount) || 0;
            acc.totalExtra += Number(record.extra) || 0;
            acc.totalCollector += Number(record.collector) || 0;
            acc.totalNet += Number(record.net) || 0;
            acc.recordCount++;
            return acc;
        }, {
            totalAmount: 0,
            totalExtra: 0,
            totalCollector: 0,
            totalNet: 0,
            recordCount: 0
        });
    });

    /**
     * أفضل 10 عملاء (الأكثر تحصيلاً)
     */
    const top10Customers = computed(() => {
        const data = selectedDate.value
            ? allArchiveData.value.filter(r => r.date === selectedDate.value)
            : filteredData.value;

        const customerMap = new Map();

        data.forEach(record => {
            const key = record.shop || 'غير محدد';
            if (!customerMap.has(key)) {
                customerMap.set(key, {
                    shop: record.shop,
                    code: record.code,
                    totalNet: 0,
                    totalAmount: 0,
                    count: 0
                });
            }

            const customer = customerMap.get(key);
            customer.totalNet += Number(record.net) || 0;
            customer.totalAmount += (Number(record.amount) || 0) + (Number(record.extra) || 0);
            customer.count++;
        });

        return Array.from(customerMap.values())
            .sort((a, b) => b.totalAmount - a.totalAmount) // الترتيب حسب إجمالي التحويلات (الأكثر تحصيلاً)
            .slice(0, 10);
    });

    /**
     * أسوأ 10 عملاء (الأكثر تأخيراً - أقل صافي)
     */
    const worst10Customers = computed(() => {
        const data = selectedDate.value
            ? allArchiveData.value.filter(r => r.date === selectedDate.value)
            : filteredData.value;

        const customerMap = new Map();

        data.forEach(record => {
            const key = record.shop || 'غير محدد';
            if (!customerMap.has(key)) {
                customerMap.set(key, {
                    shop: record.shop,
                    code: record.code,
                    totalNet: 0,
                    count: 0
                });
            }

            const customer = customerMap.get(key);
            customer.totalNet += Number(record.net) || 0;
            customer.count++;
        });

        return Array.from(customerMap.values())
            .filter(c => c.totalNet < 0) // فقط العملاء اللي عليهم ديون
            .sort((a, b) => a.totalNet - b.totalNet)
            .slice(0, 10);
    });

    /**
     * أعلى عملاء بتحويلات الرصيد
     */
    const topTransferCustomers = computed(() => {
        const data = selectedDate.value
            ? allArchiveData.value.filter(r => r.date === selectedDate.value)
            : filteredData.value;

        const customerMap = new Map();

        data.forEach(record => {
            const key = record.shop || 'غير محدد';
            if (!customerMap.has(key)) {
                customerMap.set(key, {
                    shop: record.shop,
                    code: record.code,
                    totalTransfer: 0,
                    count: 0
                });
            }

            const customer = customerMap.get(key);
            customer.totalTransfer += (Number(record.amount) || 0) + (Number(record.extra) || 0); // amount + extra = التحويل الإجمالي
            customer.count++;
        });

        return Array.from(customerMap.values())
            .sort((a, b) => b.totalTransfer - a.totalTransfer)
            .slice(0, 10);
    });

    /**
     * أقل عملاء بتحويلات الرصيد
     */
    const lowestTransferCustomers = computed(() => {
        const data = selectedDate.value
            ? allArchiveData.value.filter(r => r.date === selectedDate.value)
            : filteredData.value;

        const customerMap = new Map();

        data.forEach(record => {
            const key = record.shop || 'غير محدد';
            if (!customerMap.has(key)) {
                customerMap.set(key, {
                    shop: record.shop,
                    code: record.code,
                    totalTransfer: 0,
                    count: 0
                });
            }

            const customer = customerMap.get(key);
            customer.totalTransfer += (Number(record.amount) || 0) + (Number(record.extra) || 0);
            customer.count++;
        });

        return Array.from(customerMap.values())
            .sort((a, b) => a.totalTransfer - b.totalTransfer)
            .slice(0, 10);
    });

    /**
     * بيانات الرسم البياني - اتجاهات التحصيل
     */
    const chartData = computed(() => {
        const data = selectedDate.value
            ? allArchiveData.value.filter(r => r.date === selectedDate.value)
            : filteredData.value;

        const dateMap = new Map();

        data.forEach(record => {
            const date = record.date || 'غير محدد';
            if (!dateMap.has(date)) {
                dateMap.set(date, {
                    date,
                    totalNet: 0,
                    totalTransfers: 0,
                    totalCollector: 0,
                    count: 0
                });
            }

            const dayData = dateMap.get(date);
            dayData.totalNet += Number(record.net) || 0;
            dayData.totalTransfers += (Number(record.amount) || 0) + (Number(record.extra) || 0);
            dayData.totalCollector += Number(record.collector) || 0;
            dayData.count++;
        });

        return Array.from(dateMap.values())
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    });

    /**
     * إضافة ملاحظة لعميل
     */
    async function addCustomerNote(customerShop, noteText, category = 'normal') {
        try {
            const note = {
                id: Date.now(),
                customerShop,
                text: noteText,
                category, // important, normal, warning
                createdAt: new Date().toISOString(),
                userId: authStore.user?.id
            };

            const notesKey = `${NOTES_DB_PREFIX.value}${customerShop}`;
            const existingNotes = await localforage.getItem(notesKey) || [];
            existingNotes.push(note);

            await localforage.setItem(notesKey, existingNotes);

            // تحديث الحالة
            await loadCustomerNotes(customerShop);

            return { success: true, message: 'تم إضافة الملاحظة بنجاح' };
        } catch (err) {
            logger.error('❌ ReportsStore: Error adding note:', err);
            return { success: false, message: 'فشل إضافة الملاحظة' };
        }
    }

    /**
     * تحميل ملاحظات عميل معين
     */
    async function loadCustomerNotes(customerShop) {
        try {
            const notesKey = `${NOTES_DB_PREFIX.value}${customerShop}`;
            const notes = await localforage.getItem(notesKey) || [];
            customerNotes.value = notes.sort((a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
            );
            return notes;
        } catch (err) {
            logger.error('❌ ReportsStore: Error loading notes:', err);
            return [];
        }
    }

    /**
     * حذف ملاحظة
     */
    async function deleteCustomerNote(customerShop, noteId) {
        try {
            const notesKey = `${NOTES_DB_PREFIX.value}${customerShop}`;
            const existingNotes = await localforage.getItem(notesKey) || [];
            const updatedNotes = existingNotes.filter(n => n.id !== noteId);

            await localforage.setItem(notesKey, updatedNotes);
            await loadCustomerNotes(customerShop);

            return { success: true, message: 'تم حذف الملاحظة بنجاح' };
        } catch (err) {
            logger.error('❌ ReportsStore: Error deleting note:', err);
            return { success: false, message: 'فشل حذف الملاحظة' };
        }
    }

    /**
     * البحث في الملاحظات
     */
    async function searchNotes(query) {
        try {
            const allKeys = await localforage.keys();
            const notesKeys = allKeys.filter(k => k.startsWith(NOTES_DB_PREFIX.value));

            const allNotes = await Promise.all(
                notesKeys.map(key => localforage.getItem(key))
            );

            const flatNotes = allNotes.flat().filter(note =>
                note && (
                    note.text?.toLowerCase().includes(query.toLowerCase()) ||
                    note.customerShop?.toLowerCase().includes(query.toLowerCase())
                )
            );

            return flatNotes.sort((a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
            );
        } catch (err) {
            logger.error('❌ ReportsStore: Error searching notes:', err);
            return [];
        }
    }

    /**
     * جلب جميع الملاحظات لجميع العملاء مع إثراء البيانات
     */
    const fetchAllNotes = async () => {
        try {
            const allKeys = await localforage.keys();
            const notesKeys = allKeys.filter(k => k.startsWith(NOTES_DB_PREFIX.value));

            const allData = await Promise.all(
                notesKeys.map(async key => {
                    const notes = await localforage.getItem(key);
                    return notes || [];
                })
            );

            // تجميع وتسطيح الملاحظات
            let flattened = allData.flat();

            // إثراء الملاحظات ببيانات التاجر من الأرشيف (الكود)
            flattened = flattened.map(note => {
                const customerRecord = allArchiveData.value.find(r => r.shop === note.customerShop);
                return {
                    ...note,
                    merchantCode: customerRecord ? customerRecord.code : '---'
                };
            });

            // ترتيب حسب الأحدث
            allNotes.value = flattened.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } catch (err) {
            logger.error('❌ ReportsStore: Error fetching all notes:', err);
            allNotes.value = [];
        }
    };

    /**
     * جلب إحصائيات الملاحظات
     */
    const loadNotesStats = async () => {
        if (allNotes.value.length === 0) {
            await fetchAllNotes();
        }
        return {
            total: allNotes.value.length,
            important: allNotes.value.filter(n => n.category === 'important').length,
            warning: allNotes.value.filter(n => n.category === 'warning').length
        };
    };

    return {
        // State
        allArchiveData,
        isLoading,
        selectedPeriod,
        selectedDate,
        customerNotes,
        allNotes,

        // Computed
        filteredData,
        totalStats,
        top10Customers,
        worst10Customers,
        topTransferCustomers,
        lowestTransferCustomers,
        chartData,

        // Actions
        loadAllLocalArchives,
        addCustomerNote,
        loadCustomerNotes,
        deleteCustomerNote,
        searchNotes,
        fetchAllNotes,
        loadNotesStats
    };
});
