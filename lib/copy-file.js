const path = require('path')
const fs = require('fs-promise')

// Ability to do a dry run and only log everything
const testCopy = (metaOptions = {}) => (src, dest, options) => {
  if (metaOptions.real) return fs[metaOptions.command || 'copy'](src, dest, options)

  return fs.exists(dest).then((exists) => {
    if (!options.clobber && exists) {
      throw new Error('EEXIST')
    }

    return `${src} --> ${path.relative(src, dest)}`
  })
}

// Letters to add to the end of a filename to disambiguate it from other files
// This can only be letters since the filename will previoulsy only have numbers
const CHARS = 'abcdefghijklmnopqrstuvwxyz'

// Character to preceed the other characters
const PREFIX = ' '

// The disambiguation will always come at the end of the filename
const HAS_CHARS = new RegExp(PREFIX + `([${CHARS[0]}-${CHARS[CHARS.length - 1]}]+)$`)

// Takes a file path and appends a disambiguator to the end of the file before the extension
// Will go in order of CHARS and once those are exhausted will start increasing the number of characters used
const appendFileName = (file) => {
  const dir = path.dirname(file)
  const ext = path.extname(file)
  let base = path.basename(file, ext)

  const matched = base.match(HAS_CHARS)
  if (matched) {
    const matchChars = matched[1]
    const nextChar = CHARS[CHARS.indexOf(matchChars[0]) + 1]
    const nextLength = nextChar ? matchChars.length : matchChars.length + 1
    base = base.replace(HAS_CHARS, PREFIX + (nextChar || CHARS[0]).repeat(nextLength))
  } else {
    base = base + PREFIX + CHARS[0]
  }

  return path.join(dir, base + ext)
}

// Recursively try to copy a file until it works
// Only retries of EEXIST errors
const copyFile = (src, dest, options, metaOptions) => testCopy(metaOptions)(
    src,
    dest,
    Object.assign({ clobber: false, preserveTimestamps: true }, options)
  ).then((resp) => resp || dest).catch((err) => {
    if (err && err.message.startsWith('EEXIST')) {
      return copyFile(src, appendFileName(dest), options, metaOptions)
    }
    throw err
  })

module.exports = copyFile
