import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setLocalStorageCache, getLocalStorageCache, removeFromAllCaches } from '@/services/cacheManager'

describe('CacheManager - Encryption & Decryption', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear()
        vi.clearAllMocks()
    })

    describe('setLocalStorageCache', () => {
        it('should encrypt and store data in localStorage', async () => {
            const testData = { name: 'Test User', balance: 1000 }
            const key = 'test_user_data'

            await setLocalStorageCache(key, testData)

            const stored = localStorage.getItem(key)
            expect(stored).toBeTruthy()
            expect(stored).not.toContain('Test User') // Should be encrypted
            expect(stored).toContain('isEncrypted') // Should have encryption flag
        })

        it('should handle null values correctly', async () => {
            await setLocalStorageCache('null_test', null)
            const result = await getLocalStorageCache('null_test')
            expect(result).toBeNull()
        })

        it('should handle empty strings', async () => {
            await setLocalStorageCache('empty_test', '')
            const result = await getLocalStorageCache('empty_test')
            expect(result).toBe('')
        })

        it('should handle arrays correctly', async () => {
            const testArray = [1, 2, 3, 4, 5]
            await setLocalStorageCache('array_test', testArray)
            const result = await getLocalStorageCache('array_test')
            expect(result).toEqual(testArray)
        })

        it('should handle complex nested objects', async () => {
            const complexData = {
                user: {
                    name: 'أحمد',
                    profile: {
                        age: 30,
                        settings: {
                            darkMode: true,
                            language: 'ar'
                        }
                    }
                },
                items: [1, 2, 3]
            }

            await setLocalStorageCache('complex_test', complexData)
            const result = await getLocalStorageCache('complex_test')
            expect(result).toEqual(complexData)
        })
    })

    describe('getLocalStorageCache', () => {
        it('should decrypt and return stored data', async () => {
            const testData = { balance: 5000, limit: 10000 }
            await setLocalStorageCache('balance_test', testData)

            const retrieved = await getLocalStorageCache('balance_test')
            expect(retrieved).toEqual(testData)
        })

        it('should return null for non-existent keys', async () => {
            const result = await getLocalStorageCache('non_existent_key')
            expect(result).toBeNull()
        })

        it('should handle legacy plain-text data gracefully', async () => {
            // Simulate old plain-text data
            const legacyData = JSON.stringify({ oldData: 'plain text' })
            localStorage.setItem('legacy_key', legacyData)

            const result = await getLocalStorageCache('legacy_key')
            // Should either parse it or return null without crashing
            expect(result).toBeDefined()
        })

        it('should return null for corrupted encrypted data', async () => {
            // Simulate corrupted data
            localStorage.setItem('corrupted_key', 'invalid_encrypted_data')

            const result = await getLocalStorageCache('corrupted_key')
            expect(result).toBeNull() // Should not crash
        })
    })

    describe('removeFromAllCaches', () => {
        it('should remove data from localStorage', async () => {
            await setLocalStorageCache('remove_test', { data: 'test' })
            expect(localStorage.getItem('remove_test')).toBeTruthy()

            await removeFromAllCaches('remove_test')
            expect(localStorage.getItem('remove_test')).toBeNull()
        })

        it('should not throw error for non-existent keys', async () => {
            await expect(removeFromAllCaches('non_existent')).resolves.not.toThrow()
        })
    })

    describe('Encryption Key Stability', () => {
        it('should use the same encryption key across multiple operations', async () => {
            const testData = { value: 'consistency test' }

            // Store data
            await setLocalStorageCache('consistency_test', testData)
            const first = await getLocalStorageCache('consistency_test')

            // Retrieve again
            const second = await getLocalStorageCache('consistency_test')

            expect(first).toEqual(second)
            expect(first).toEqual(testData)
        })

        it('should encrypt same data differently each time (due to IV)', async () => {
            const testData = { value: 'same data' }

            await setLocalStorageCache('test1', testData)
            const encrypted1 = localStorage.getItem('test1')

            await setLocalStorageCache('test2', testData)
            const encrypted2 = localStorage.getItem('test2')

            // Encrypted values should be different (due to random IV)
            expect(encrypted1).not.toBe(encrypted2)

            // But decrypted values should be the same
            const decrypted1 = await getLocalStorageCache('test1')
            const decrypted2 = await getLocalStorageCache('test2')
            expect(decrypted1).toEqual(decrypted2)
        })
    })

    describe('Performance', () => {
        it('should encrypt/decrypt large data efficiently', async () => {
            const largeData = {
                rows: Array.from({ length: 1000 }, (_, i) => ({
                    id: i,
                    shop: `محل ${i}`,
                    code: `${1000 + i}`,
                    amount: Math.random() * 1000,
                    collector: Math.random() * 1000
                }))
            }

            const startTime = performance.now()
            await setLocalStorageCache('large_test', largeData)
            const retrieved = await getLocalStorageCache('large_test')
            const endTime = performance.now()

            expect(retrieved).toEqual(largeData)
            expect(endTime - startTime).toBeLessThan(500) // Should complete in under 500ms
        })
    })

    describe('Edge Cases', () => {
        it('should handle Arabic text correctly', async () => {
            const arabicData = {
                name: 'محمد أحمد',
                address: 'شارع النصر، القاهرة',
                notes: 'ملاحظات باللغة العربية'
            }

            await setLocalStorageCache('arabic_test', arabicData)
            const result = await getLocalStorageCache('arabic_test')
            expect(result).toEqual(arabicData)
        })

        it('should handle special characters', async () => {
            const specialData = {
                text: '!@#$%^&*()_+-=[]{}|;:,.<>?',
                emoji: '😀🎉✅❌'
            }

            await setLocalStorageCache('special_test', specialData)
            const result = await getLocalStorageCache('special_test')
            expect(result).toEqual(specialData)
        })

        it('should handle very long strings', async () => {
            const longString = 'a'.repeat(10000)
            await setLocalStorageCache('long_test', longString)
            const result = await getLocalStorageCache('long_test')
            expect(result).toBe(longString)
        })
    })
})
