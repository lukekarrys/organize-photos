const ps = require('promise-streams')
const exiftool = require('node-exiftool')
const exiftoolBin = require('dist-exiftool')
const path = require('path')
const walk = require('klaw')
const fs = require('fs-promise')
const organizeFile = require('./organize-file')
const getOptions = require('./options').parse

const constants = {
  // Constants for accumulation later
  SUCCESS: 'SUCCESS',
  UNSORTED: 'UNSORTED',
  UNKNOWN: 'UNKNOWN',
  ERROR: 'ERROR'
}

// Pushes a promise onto the stream with the latest item
const push = (promise) => function (item) { return this.push(promise(item)) }

// Does something alongside the stream
const side = (fn) => function (item) {
  if (typeof fn === 'function') fn(item)
  return this.push(item)
}

// Group each stream by its output code
const reduceByCode = (codes, stream) => {
  if (stream) {
    const { code, data } = stream
    if (!codes[code]) codes[code] = []
    codes[code].push(data)
  }
  return codes
}

const sortResp = (resp) => Object.keys(resp).reduce((acc, key) => {
  acc[key] = resp[key].sort(({ dest: aDest }, { dest: bDest }) => {
    if (aDest < bDest) return -1
    if (aDest > bDest) return 1
    return 0
  })
  return acc
}, {})

module.exports = (o) => {
  const options = getOptions(o)

  // The exiftool process which will stay open the whole time
  const ep = new exiftool.ExiftoolProcess(exiftoolBin)
  const cleanup = () => ep.close()

  // FIXME: https://github.com/spion/promise-streams/issues/14
  // This bug causes reduce to swallow the first chunk so we offset it by adding
  // one chunk to the stream at the very beginning
  let hasFirstChunk = false
  const fixFirstChunk = function (item) {
    if (!hasFirstChunk) {
      hasFirstChunk = true
      this.push('')
    }
    this.push(item)
  }

  return ep.open().then((pid) => {
    if (options.real) fs[options.clean ? 'emptyDirSync' : 'ensureDirSync'](options.dest)

    const organize = organizeFile(Object.assign({ ep, constants }, options))

    return walk(options.src)
      // No directories or dotfiles
      .pipe(ps.filter((item) => !item.stats.isDirectory()))
      .pipe(ps.filter((item) => path.basename(item.path) !== '.' && path.basename(item.path)[0] !== '.'))
      // Exiftool can only handle one read at a time so thats why all concurrency is 1
      .pipe(ps.through({ concurrent: 1 }, push(organize)))
      .pipe(ps.through({ concurrent: 1 }, side(options.log)))
      .pipe(ps.through({ concurrent: 1 }, fixFirstChunk))
      // Reduce streams to some useful data to output at the end
      .pipe(ps.reduce(reduceByCode, {}))
      // After all the pipes convert it to a promise to get end result
      .promise()
      // Sort each array of files
      .then(sortResp)
      // Always close the exiftool stream
      .then((res) => {
        cleanup()
        return res
      })
      .catch((err) => {
        cleanup()
        throw err
      })
  })
}

module.exports.CODES = constants

