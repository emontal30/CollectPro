import { supabase } from '@/supabase';

const isProd = typeof import.meta !== 'undefined' ? !!import.meta.env?.PROD : process.env.NODE_ENV === 'production'

function formatArgs(args) {
  return args
}

// Allow logger to use a provided console-like target to avoid recursion
let targetConsole = typeof console !== 'undefined' ? console : null
function setConsole(target) {
  if (target && typeof target === 'object') targetConsole = target
}

// Remote Logging Queue to prevent flooding
const errorQueue = [];
let isProcessingQueue = false;

async function processErrorQueue() {
  if (isProcessingQueue || errorQueue.length === 0) return;
  isProcessingQueue = true;

  try {
    // Take batch of errors
    const batch = errorQueue.splice(0, 5);

    // Get current user if possible (async)
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;

    const payload = batch.map(err => ({
      user_id: userId,
      error_message: typeof err.msg === 'string' ? err.msg : JSON.stringify(err.msg),
      stack_trace: err.stack || null,
      context: {
        url: window.location.href,
        agent: navigator.userAgent,
        ...err.context
      },
      severity: 'error'
    }));

    // Fire and forget - do not await strictly to avoid blocking UI
    await supabase.from('app_errors').insert(payload);

  } catch (e) {
    // If remote logging fails, fallback to console ONLY, dont recursive log
    if (targetConsole) targetConsole.error('Failed to send logs to remote:', e);
  } finally {
    isProcessingQueue = false;
    // If more errors came in, process them
    if (errorQueue.length > 0) setTimeout(processErrorQueue, 2000);
  }
}

function logToRemote(args) {
  try {
    // Convert args to message
    const msg = args.map(a => (a instanceof Error ? a.message : JSON.stringify(a))).join(' ');
    const stack = args.find(a => a instanceof Error)?.stack;

    errorQueue.push({ msg, stack, context: {} });

    // Debounce processing
    if (!isProcessingQueue) setTimeout(processErrorQueue, 1000);
  } catch (e) {
    // Safety catch
  }
}

const logger = {
  info: (...args) => {
    if (!isProd && targetConsole && typeof targetConsole.info === 'function') targetConsole.info(...formatArgs(args))
  },
  warn: (...args) => {
    if (!isProd && targetConsole && typeof targetConsole.warn === 'function') targetConsole.warn(...formatArgs(args))
  },
  error: (...args) => {
    // 1. Log to console for dev/debugging
    if (targetConsole && typeof targetConsole.error === 'function') targetConsole.error(...formatArgs(args))

    // 2. Log to Remote (Supabase)
    // We log to remote even in Dev to test the feature, or restrict to Prod if desired.
    // User wants to see internal errors, so we enable it.
    logToRemote(args);
  },
  debug: (...args) => {
    if (!isProd && targetConsole && typeof targetConsole.debug === 'function') targetConsole.debug(...formatArgs(args))
  }
}

// Simple assert helper compatible with console.assert behaviour
logger.assert = (condition, ...args) => {
  if (isProd) return
  if (!condition) {
    if (args.length && targetConsole && typeof targetConsole.error === 'function') targetConsole.error(...formatArgs(args))
    else if (targetConsole && typeof targetConsole.error === 'function') targetConsole.error('Assertion failed')
  }
}

// expose setConsole for bootstrap code to provide original console to avoid recursion
logger.setConsole = setConsole

export default logger
