/**
 * Generic retry wrapper with exponential backoff and jitter
 * Usage:
 *   await retry(() => fetchSomething(), { retries: 3, delay: 300 })
 */

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

export async function retry(fn, options = {}) {
  const {
    retries = 3,
    delay = 300,
    factor = 2,
    jitter = 0.2,
    onRetry = null,
  } = options;

  let attempt = 0;
  let currentDelay = delay;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;

      if (attempt > retries) {
        throw err;
      }

      // optional callback for logging
      if (typeof onRetry === 'function') {
        try { onRetry(attempt, err); } catch (e) { /* ignore */ }
      }

      // apply jitter +/-
      const jitterVal = Math.max(0, currentDelay * jitter * (Math.random() - 0.5));
      const wait = Math.round(currentDelay + jitterVal);
      await sleep(wait);
      currentDelay = Math.round(currentDelay * factor);
    }
  }
}

export default retry;
