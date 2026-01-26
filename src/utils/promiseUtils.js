/**
 * Wraps a promise with a timeout.
 * If the promise doesn't resolve within the specified ms, it rejects with a timeout error.
 * @param {Promise} promise - The promise to wrap
 * @param {number} ms - Timeout in milliseconds
 * @param {string} errorMsg - Optional custom error message
 * @returns {Promise}
 */
export const withTimeout = (promise, ms, errorMsg = 'Operation timed out') => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(errorMsg));
        }, ms);
    });

    return Promise.race([
        promise,
        timeoutPromise
    ]).finally(() => {
        clearTimeout(timeoutId);
    });
};
