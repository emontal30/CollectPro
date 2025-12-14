// Lightweight logger utility
// - In production it is a no-op to avoid leaking logs and improve perf
// - In development it forwards to console with appropriate levels

const isProd = typeof import.meta !== 'undefined' ? !!import.meta.env?.PROD : process.env.NODE_ENV === 'production'

function formatArgs(args) {
  return args
}

// Allow logger to use a provided console-like target to avoid recursion
let targetConsole = typeof console !== 'undefined' ? console : null
function setConsole(target) {
  if (target && typeof target === 'object') targetConsole = target
}

const logger = {
  info: (...args) => {
    if (!isProd && targetConsole && typeof targetConsole.info === 'function') targetConsole.info(...formatArgs(args))
  },
  warn: (...args) => {
    if (!isProd && targetConsole && typeof targetConsole.warn === 'function') targetConsole.warn(...formatArgs(args))
  },
  error: (...args) => {
    if (!isProd && targetConsole && typeof targetConsole.error === 'function') targetConsole.error(...formatArgs(args))
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
