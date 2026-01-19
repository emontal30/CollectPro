import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { addToSyncQueue, processQueue, clearSyncQueue } from '@/services/archiveSyncQueue'
import localforage from 'localforage'

// Mock dependencies
vi.mock('@/stores/archiveStore', () => ({
    useArchiveStore: () => ({
        loadAvailableDates: vi.fn()
    })
}))

vi.mock('@/stores/auth', () => ({
    useAuthStore: () => ({
        isAuthenticated: true,
        user: { id: 'test-user-123' }
    })
}))

vi.mock('@/stores/syncStore', () => ({
    useSyncStore: () => ({
        checkQueue: vi.fn()
    })
}))

vi.mock('@/composables/useNotifications', () => ({
    useNotifications: () => ({
        addNotification: vi.fn()
    })
}))

vi.mock('@/services/api', () => ({
    default: {
        archive: {
            saveDailyArchive: vi.fn().mockResolvedValue({ error: null })
        }
    }
}))

describe('ArchiveSyncQueue', () => {
    beforeEach(async () => {
        await clearSyncQueue()
        vi.clearAllMocks()
    })

    afterEach(async () => {
        await clearSyncQueue()
    })

    describe('addToSyncQueue', () => {
        it('should add item to queue', async () => {
            const item = {
                type: 'daily_archive',
                payload: {
                    user_id: 'test-user',
                    archive_date: '2026-01-19',
                    data: [{ shop: 'Test Shop', amount: 100 }]
                }
            }

            await addToSyncQueue(item)

            const queue = await localforage.getItem('archive_sync_queue')
            expect(queue).toHaveLength(1)
            expect(queue[0]).toEqual(item)
        })

        it('should not add duplicate items for same date', async () => {
            const item1 = {
                type: 'daily_archive',
                payload: {
                    archive_date: '2026-01-19',
                    data: [{ shop: 'Shop 1' }]
                }
            }

            const item2 = {
                type: 'daily_archive',
                payload: {
                    archive_date: '2026-01-19',
                    data: [{ shop: 'Shop 2' }]
                }
            }

            await addToSyncQueue(item1)
            await addToSyncQueue(item2)

            const queue = await localforage.getItem('archive_sync_queue')
            expect(queue).toHaveLength(1)
            expect(queue[0].payload.data[0].shop).toBe('Shop 2') // Should be updated
        })

        it('should skip items without date', async () => {
            const invalidItem = {
                type: 'daily_archive',
                payload: {
                    data: [{ shop: 'Test' }]
                    // Missing archive_date
                }
            }

            await addToSyncQueue(invalidItem)

            const queue = await localforage.getItem('archive_sync_queue')
            expect(queue).toBeNull()
        })

        it('should handle multiple different dates', async () => {
            const item1 = {
                type: 'daily_archive',
                payload: { archive_date: '2026-01-19', data: [] }
            }

            const item2 = {
                type: 'daily_archive',
                payload: { archive_date: '2026-01-20', data: [] }
            }

            await addToSyncQueue(item1)
            await addToSyncQueue(item2)

            const queue = await localforage.getItem('archive_sync_queue')
            expect(queue).toHaveLength(2)
        })
    })

    describe('processQueue - Race Condition Protection', () => {
        it('should prevent concurrent processing', async () => {
            // Add test items
            await addToSyncQueue({
                type: 'daily_archive',
                payload: { archive_date: '2026-01-19', data: [] }
            })

            // Call processQueue multiple times concurrently
            const promises = [
                processQueue(),
                processQueue(),
                processQueue()
            ]

            await Promise.all(promises)

            // Queue should be processed only once
            const queue = await localforage.getItem('archive_sync_queue')
            expect(queue).toEqual([]) // Should be empty after processing
        })

        it('should wait for existing processing to complete', async () => {
            let processingStarted = false
            let processingCompleted = false

            // Mock a slow API call
            const api = await import('@/services/api')
            api.default.archive.saveDailyArchive.mockImplementation(async () => {
                processingStarted = true
                await new Promise(resolve => setTimeout(resolve, 100))
                processingCompleted = true
                return { error: null }
            })

            await addToSyncQueue({
                type: 'daily_archive',
                payload: { archive_date: '2026-01-19', data: [] }
            })

            // Start first processing
            const firstProcess = processQueue()

            // Wait a bit, then start second
            await new Promise(resolve => setTimeout(resolve, 10))
            const secondProcess = processQueue()

            await Promise.all([firstProcess, secondProcess])

            expect(processingStarted).toBe(true)
            expect(processingCompleted).toBe(true)
        })
    })

    describe('processQueue - Re-check Logic', () => {
        it('should re-check queue after processing', async () => {
            // Add initial item
            await addToSyncQueue({
                type: 'daily_archive',
                payload: { archive_date: '2026-01-19', data: [] }
            })

            // Mock API to add new item during processing
            const api = await import('@/services/api')
            api.default.archive.saveDailyArchive.mockImplementation(async () => {
                // Add new item while processing
                await addToSyncQueue({
                    type: 'daily_archive',
                    payload: { archive_date: '2026-01-20', data: [] }
                })
                return { error: null }
            })

            await processQueue()

            // Wait for re-check timeout
            await new Promise(resolve => setTimeout(resolve, 1500))

            // Queue should eventually be empty
            const queue = await localforage.getItem('archive_sync_queue')
            expect(queue).toEqual([])
        })
    })

    describe('clearSyncQueue', () => {
        it('should clear all items from queue', async () => {
            await addToSyncQueue({
                type: 'daily_archive',
                payload: { archive_date: '2026-01-19', data: [] }
            })

            await addToSyncQueue({
                type: 'daily_archive',
                payload: { archive_date: '2026-01-20', data: [] }
            })

            const result = await clearSyncQueue()
            expect(result).toBe(true)

            const queue = await localforage.getItem('archive_sync_queue')
            expect(queue).toBeNull()
        })
    })

    describe('Error Handling', () => {
        it('should keep failed items in queue', async () => {
            const api = await import('@/services/api')
            api.default.archive.saveDailyArchive.mockRejectedValue(new Error('Network error'))

            await addToSyncQueue({
                type: 'daily_archive',
                payload: { archive_date: '2026-01-19', data: [] }
            })

            await processQueue()

            const queue = await localforage.getItem('archive_sync_queue')
            expect(queue).toHaveLength(1) // Should still be in queue
        })

        it('should remove successful items even if others fail', async () => {
            const api = await import('@/services/api')

            // First call succeeds, second fails
            api.default.archive.saveDailyArchive
                .mockResolvedValueOnce({ error: null })
                .mockRejectedValueOnce(new Error('Network error'))

            await addToSyncQueue({
                type: 'daily_archive',
                payload: { archive_date: '2026-01-19', data: [] }
            })

            await addToSyncQueue({
                type: 'daily_archive',
                payload: { archive_date: '2026-01-20', data: [] }
            })

            await processQueue()

            const queue = await localforage.getItem('archive_sync_queue')
            expect(queue).toHaveLength(1) // Only failed item remains
        })
    })
})
