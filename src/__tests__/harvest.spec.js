import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHarvestStore } from '@/stores/harvest'

// Mock dependencies
vi.mock('@/services/cacheManager', () => ({
    setLocalStorageCache: vi.fn(),
    getLocalStorageCache: vi.fn(),
    removeFromAllCaches: vi.fn()
}))

vi.mock('@/services/archiveSyncQueue', () => ({
    addToSyncQueue: vi.fn()
}))

vi.mock('@/stores/auth', () => ({
    useAuthStore: () => ({
        isAuthenticated: true,
        user: { id: 'test-user-123' }
    })
}))

describe('HarvestStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    describe('calculateNet', () => {
        it('should calculate net correctly for positive values', () => {
            const store = useHarvestStore()

            const row = {
                amount: 1000,
                extra: 200,
                collector: 1500
            }

            const net = store.calculateNet(row)
            expect(net).toBe(300) // 1500 - (1000 + 200) = 300
        })

        it('should handle negative extra values', () => {
            const store = useHarvestStore()

            const row = {
                amount: 1000,
                extra: -200,
                collector: 1000
            }

            const net = store.calculateNet(row)
            expect(net).toBe(200) // 1000 - (1000 + (-200)) = 200
        })

        it('should handle zero values', () => {
            const store = useHarvestStore()

            const row = {
                amount: 0,
                extra: 0,
                collector: 0
            }

            const net = store.calculateNet(row)
            expect(net).toBe(0)
        })

        it('should handle null/undefined values as zero', () => {
            const store = useHarvestStore()

            const row = {
                amount: null,
                extra: undefined,
                collector: 500
            }

            const net = store.calculateNet(row)
            expect(net).toBe(500)
        })

        it('should handle string numbers', () => {
            const store = useHarvestStore()

            const row = {
                amount: '1000',
                extra: '200',
                collector: '1500'
            }

            const net = store.calculateNet(row)
            expect(net).toBe(300)
        })
    })

    describe('totals', () => {
        it('should calculate totals correctly', () => {
            const store = useHarvestStore()

            store.rows = [
                { amount: 1000, extra: 100, collector: 1200 },
                { amount: 2000, extra: 200, collector: 2500 },
                { amount: 1500, extra: 150, collector: 1800 }
            ]

            const totals = store.totals
            expect(totals.amount).toBe(4500)
            expect(totals.extra).toBe(450)
            expect(totals.collector).toBe(5500)
            expect(totals.net).toBe(550) // 5500 - 4950
        })

        it('should handle empty rows', () => {
            const store = useHarvestStore()
            store.rows = []

            const totals = store.totals
            expect(totals.amount).toBe(0)
            expect(totals.extra).toBe(0)
            expect(totals.collector).toBe(0)
            expect(totals.net).toBe(0)
        })
    })

    describe('resetStatus', () => {
        it('should calculate reset status correctly when balanced', () => {
            const store = useHarvestStore()
            store.masterLimit = 10000
            store.extraLimit = 1000
            store.currentBalance = 5000
            store.rows = [
                { amount: 1000, extra: 0, collector: 1000 }
            ]

            const status = store.resetStatus
            expect(status.val).toBe(0)
            expect(status.text).toContain('متوازن')
        })

        it('should show deficit when collector is less than required', () => {
            const store = useHarvestStore()
            store.masterLimit = 10000
            store.extraLimit = 0
            store.currentBalance = 5000
            store.rows = [
                { amount: 1000, extra: 0, collector: 500 }
            ]

            const status = store.resetStatus
            expect(status.val).toBeLessThan(0)
            expect(status.text).toContain('عجز')
        })

        it('should show surplus when collector exceeds required', () => {
            const store = useHarvestStore()
            store.masterLimit = 10000
            store.extraLimit = 0
            store.currentBalance = 5000
            store.rows = [
                { amount: 1000, extra: 0, collector: 2000 }
            ]

            const status = store.resetStatus
            expect(status.val).toBeGreaterThan(0)
            expect(status.text).toContain('فائض')
        })
    })

    describe('addRow', () => {
        it('should add new empty row', () => {
            const store = useHarvestStore()
            const initialLength = store.rows.length

            store.addRow()

            expect(store.rows.length).toBe(initialLength + 1)
            const newRow = store.rows[store.rows.length - 1]
            expect(newRow.shop).toBe('')
            expect(newRow.code).toBe('')
            expect(newRow.amount).toBeNull()
        })

        it('should generate unique IDs for new rows', () => {
            const store = useHarvestStore()

            store.addRow()
            const id1 = store.rows[store.rows.length - 1].id

            store.addRow()
            const id2 = store.rows[store.rows.length - 1].id

            expect(id1).not.toBe(id2)
        })
    })

    describe('deleteRow', () => {
        it('should delete row by index', () => {
            const store = useHarvestStore()
            store.rows = [
                { id: 1, shop: 'Shop 1' },
                { id: 2, shop: 'Shop 2' },
                { id: 3, shop: 'Shop 3' }
            ]

            store.deleteRow(1)

            expect(store.rows.length).toBe(2)
            expect(store.rows.find(r => r.id === 2)).toBeUndefined()
        })

        it('should not delete if only one row remains', () => {
            const store = useHarvestStore()
            store.rows = [{ id: 1, shop: 'Shop 1' }]

            store.deleteRow(0)

            expect(store.rows.length).toBe(1)
        })
    })

    describe('searchQuery', () => {
        it('should filter rows by shop name', () => {
            const store = useHarvestStore()
            store.rows = [
                { shop: 'محل الأمل', code: '1001' },
                { shop: 'محل النور', code: '1002' },
                { shop: 'السلام', code: '1003' }
            ]

            store.searchQuery = 'الأمل'

            const filtered = store.filteredRows
            expect(filtered.length).toBe(1)
            expect(filtered[0].shop).toBe('محل الأمل')
        })

        it('should filter rows by code', () => {
            const store = useHarvestStore()
            store.rows = [
                { shop: 'Shop 1', code: '1001' },
                { shop: 'Shop 2', code: '2002' },
                { shop: 'Shop 3', code: '1003' }
            ]

            store.searchQuery = '100'

            const filtered = store.filteredRows
            expect(filtered.length).toBe(2)
        })

        it('should be case-insensitive', () => {
            const store = useHarvestStore()
            store.rows = [
                { shop: 'SHOP ONE', code: '1001' },
                { shop: 'shop two', code: '2002' }
            ]

            store.searchQuery = 'shop'

            const filtered = store.filteredRows
            expect(filtered.length).toBe(2)
        })
    })

    describe('archiveTodayData', () => {
        it('should reject archiving without date', async () => {
            const store = useHarvestStore()

            const result = await store.archiveTodayData(null)

            expect(result.success).toBe(false)
            expect(result.message).toContain('Date is required')
        })

        it('should reject archiving with no valid rows', async () => {
            const store = useHarvestStore()
            store.rows = [
                { shop: '', code: '', amount: 0, collector: 0 }
            ]

            const result = await store.archiveTodayData('2026-01-19')

            expect(result.success).toBe(false)
            expect(result.message).toContain('لا توجد بيانات صالحة')
        })

        it('should successfully archive valid data', async () => {
            const store = useHarvestStore()
            store.rows = [
                { shop: 'Test Shop', code: '1001', amount: 1000, collector: 1200, extra: 0 }
            ]

            const result = await store.archiveTodayData('2026-01-19')

            expect(result.success).toBe(true)
        })
    })
})
