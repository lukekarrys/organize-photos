#!/usr/bin/env node

const env = process.env.NODE_ENV
const c = require('colors/safe')
const boxen = require('boxen')
const organize = require('./index')
const CODES = organize.CODES
const argv = require('./options').argv()
const log = console.log.bind(console)
const singleLog = env === 'test' ? log : require('single-line-log').stdout
const cwd = process.cwd()

const logColor = (code) => ({
  [CODES.SUCCESS]: 'green',
  [CODES.SUCCESS_METADATA]: 'green',
  [CODES.UNSORTED]: 'blue',
  [CODES.METADATA]: 'blue',
  [CODES.UNKNOWN]: 'yellow',
  [CODES.ERROR]: 'red'
})[code]

// Log helpers
const delay = (t = 1) => new Promise((resolve) => setTimeout(resolve, t))
const logPath = ({ src, dest }) => src.replace(cwd, '.') + ' --> ' + dest.replace(cwd, '.')
const logMessage = (item, long) => item instanceof Error ? item.message + (long ? '\n' + item.stack : '') : logPath(item)
const logByCode = (code, str) => c[logColor(code)](str || code)
const box = (str, o = {}) => boxen(str, Object.assign({ padding: 1, margin: { top: 1, bottom: 0 }, borderStyle: 'double' }, o))
const colorBox = (color, ...lines) => box(lines.map((l) => c[color](l)).join('\n'), { borderColor: color })

// Runs as each item of the stream is processed
let count = 0
const quickLog = (item) => {
  const message = logByCode(item.code, logMessage(item.data, false))
  singleLog(`(${++count}) ${message}`)
}

// Make everything pretty based on verbosity
const prettify = (codes) => {
  const items = Object.keys(codes).map((code) => {
    const data = codes[code]
    return {
      color: logColor(code),
      title: logByCode(code),
      count: data.length,
      body: Array.isArray(data) ? data.map((item) => logMessage(item, true)).join('\n') : JSON.stringify(data, null, 2)
    }
  })

  return argv.verbose
    ? items.map((item) => box(`${item.title}${item.count ? ` (${item.count})` : ''}\n\n${item.body}`, { borderColor: item.color })).join('\n')
    : box(items.filter((item) => item.count).map((item) => `${item.title}: ${item.count}`).join('\n'))
}

// Log warnings if altering the fs
if (argv.real) {
  log(colorBox('red', 'Doing the real thing!', 'Starting in 5 seconds!', 'Use ^C to cancel!'))
} else {
  log(colorBox('blue', 'Doing a dry run', 'Relax :)'))
}

// Log the legend to view streaming logs with
log(box(`${Object.keys(CODES).map((c) => logByCode(c)).join(' -- ')}`), '\n')

// Start the process
delay(argv.real ? env === 'test' ? 1 : 5000 : 1)
  .then(() => organize(Object.assign({ log: quickLog }, argv)))
  .then((res) => ((singleLog(logByCode(CODES.SUCCESS, 'All done!')), res)))
  .then(prettify)
  .then((result) => log('\n', result, '\n'))
  .catch((err) => log('\n', err, '\n'))

