#!/usr/bin/env node

const c = require('colors/safe')
const boxen = require('boxen')
const singleLog = require('single-line-log').stdout
const organize = require('./index')
const CODES = organize.CODES
const argv = require('./options').argv()
const cwd = process.cwd()

const logColor = (code) => ({
  [CODES.SUCCESS]: 'green',
  [CODES.UNSORTED]: 'blue',
  [CODES.UNKNOWN]: 'yellow',
  [CODES.ERROR]: 'red'
})[code]

// Log helpers
const logPath = ({ src, dest }) => src.replace(cwd, '.') + ' --> ' + dest.replace(cwd, '.')
const logMessage = (item) => item instanceof Error ? item.message : logPath(item)
const logByCode = (code, str) => c[logColor(code)](str || code)
const box = (str, o = {}) => boxen(str, Object.assign({ padding: 1, margin: { top: 1, bottom: 0 }, borderStyle: 'double' }, o))

// Runs as each item of the stream is processed
let count = 0
const quickLog = (item) => {
  const message = logByCode(item.code, logMessage(item.data))
  singleLog(`(${++count}) ${message}`)
}

// Make everything pretty based on verbosity
const prettify = (codes) => {
  const items = Object.keys(codes).map((code) => ({
    color: logColor(code),
    title: logByCode(code),
    count: codes[code].length,
    body: codes[code].map(logMessage).join('\n')
  }))

  return argv.verbose
    ? items.map((item) => box(`${item.title}\n\n${item.body}`, { borderColor: item.color })).join('\n')
    : box(items.map((item) => `${item.title}: ${item.count}`).join('\n'))
}

// Log the legend to view streaming logs with
console.log(box(`${Object.keys(CODES).map((c) => logByCode(c)).join(' -- ')}`), '\n')

// Start the process
organize(Object.assign({ log: quickLog }, argv))
  .then((res) => ((singleLog(logByCode(CODES.SUCCESS, 'All done!')), res)))
  .then(prettify)
  .then((result) => console.log('\n', result, '\n'))
  .catch((err) => console.error('\n', err, '\n'))
