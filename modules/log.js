const LOG_LEVELS = ['debug', 'info', 'warn', 'error']
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'
const log = (logLevel, ...str) => {
  if (LOG_LEVELS.indexOf(LOG_LEVEL) > LOG_LEVELS.indexOf(logLevel)) {
    return
  }
  console.log(`[${new Date().toISOString()}]`, ...str)
}
LOG_LEVELS.forEach(logLevel => {
  log[logLevel] = (...str) => log(logLevel, ...str)
})

exports.log = log
exports.logLevels = LOG_LEVELS