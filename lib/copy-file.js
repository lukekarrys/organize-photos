const fs = require('fs-promise')
const alterFileName = require('./alter-file-name')

// When running in fake mode, keep used files around to test renaming
const fakeFs = {}

// Ability to do a dry run and only log everything
const testCopy = (metaOptions = {}) => (src, dest, options) => {
  if (metaOptions.real) return fs[metaOptions.command || 'copy'](src, dest, options)

  return new Promise((resolve, reject) => {
    if (fakeFs[dest]) {
      reject(new Error('EEXIST'))
    } else {
      fakeFs[dest] = true
      resolve()
    }
  })
}

// The disambiguation will always come at the end of the filename
const HAS_CHARS = / ([1-9]+)$/

// Takes a file path and appends a disambiguator to the end of the file before the extension
const appendFileName = (file) => alterFileName(file, ({ base }) => {
  const matched = base.match(HAS_CHARS)
  return {
    base: matched
      ? base.replace(HAS_CHARS, ` ${parseInt(matched[1], 10) + 1}`)
      : base + ' 1'
  }
})

// Eliminate this from the end of each file. This is the way that the macOS
// filesystem disambiguates files with the same name but we will create a new way
// using the chars above
const fixDestFileName = (file) => alterFileName(file, ({ base, ext }) => ({
  ext: ext.replace(/^\.jpeg$/i, '.jpg').toLowerCase(),
  base: base.split(' ').filter((part) => {
    if (/^\(\d+\)$/.test(part)) return false    // (9)
    if (/^#\d+$/.test(part)) return false       // #9
    if (/^[a-z]$/.test(part)) return false      // a
    if (/^([a-z])\1+$/.test(part)) return false // aaa
    return true
  }).join(' ')
}))

// Recursively try to copy a file until it works
// Only retries for EEXIST errors
const copyFile = (src, dest, options = {}, metaOptions = {}) => {
  if (!metaOptions.retry) dest = fixDestFileName(dest)

  return testCopy(metaOptions)(
    src,
    dest,
    Object.assign({ clobber: false, preserveTimestamps: true }, options)
  ).then((resp) => ({ src, dest })).catch((err) => {
    if (err && err.message.startsWith('EEXIST')) {
      const retry = metaOptions.retry ? metaOptions.retry + 1 : 1
      return copyFile(src, appendFileName(dest), options, Object.assign({ retry }, metaOptions))
    }
    // If its not an expected error, then rethrow to catch later on
    throw err
  })
}

module.exports = copyFile
