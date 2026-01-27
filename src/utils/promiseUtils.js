/**
 * Wraps a promise with a timeout.
 * If the promise doesn't resolve within the specified ms, it rejects with a timeout error.
 * @param {Promise} promise - The promise to wrap
 * @param {number} ms - Timeout in milliseconds
 * @param {string} errorMsg - Optional custom error message
 * @returns {Promise}
 */
/**
 * Wraps a promise with a timeout.
 * Now supports persistent abortion by rejecting the promise AND potentially triggering a signal.
 * @param {Function|Promise} promiseOrFn - The promise to wrap, or a function that receives (signal) and returns a promise.
 * @param {number} ms - Timeout in milliseconds
 * @param {string} errorMsg - Optional custom error message
 * @returns {Promise}
 */
export const withTimeout = (promiseOrFn, ms, errorMsg = 'Operation timed out') => {
    const controller = new AbortController();
    let timeoutId;

    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            controller.abort(); // Actually abort the fetch if supported
            reject(new Error(errorMsg));
        }, ms);
    });

    // If it's a function, call it with the signal
    const mainPromise = typeof promiseOrFn === 'function'
        ? promiseOrFn(controller.signal)
        : promiseOrFn;

    return Promise.race([
        mainPromise,
        timeoutPromise
    ]).finally(() => {
        clearTimeout(timeoutId);
    });
};
