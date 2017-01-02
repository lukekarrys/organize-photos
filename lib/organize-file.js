const path = require('path')
const dateformat = require('dateformat')
const c = require('colors/safe')
const copyFile = require('./copy-file')

// Helpers
const copyTo = (baseDest, real, command) => (src, dest, options) => copyFile(src, path.join(baseDest, dest), options, real, command)
const passCode = (code) => (data) => ({ code, data })

// Single char codes for non-verbose mode
const CODES = {
  SUCCESS: c.green('.'),
  NO_DATA: c.red('X'),
  NO_DATE: c.blue('U'),
  BAD: '💀'
}

module.exports = ({ ep, dest, ext, unsorted, unknown, real, verbose, command }) => {
  const copyDest = copyTo(dest, real, command)
  const copyUnsorted = copyTo(unsorted, real, command)
  const copyUnknown = copyTo(unknown, real, command)

  // This is not an arrow function because it needs access to `this` to pass
  // data through to the stream
  return function (file) {
    const ogPath = file.path
    const ogFile = path.basename(file.path)
    const ogExt = path.extname(file.path).slice(1).toLowerCase()

    return ep.readMetadata(ogPath)

      // See if exiftool could read the file
      .then((data) => {
        if (!data || !data.data || !data.data.length) {
          throw new Error(`ENODATA: No data for ${ogPath}`)
        }

        return data.data[0]
      })

      .then((item) => {
        if (ext && !ext.includes(ogExt)) {
          throw new Error(`ENODATA: Wrong extension for ${ogPath}`)
        }

        return item
      })

      // If there is no date then throw which will cause it to be unsorted
      .then((item) => {
        const date = item.CreateDate// || item.MetadataDate

        if (!date) {
          throw new Error(`ENODATE: No date for ${ogPath}`)
        }

        // Put the date into a format that dateformat can understand
        return date.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
      })

      // Create path for the new file
      .then((date) => path.join(
        path.join(...['yyyy', 'mm', 'dd'].map((f) => dateformat(date, f))),
        dateformat(date, 'yyyy-mm-dd HH-MM-ss') + path.extname(ogPath)
      ))

      // Copy file to the new location
      .then((destPath) => copyDest(ogPath, destPath).then(passCode(CODES.SUCCESS)))

      // If at any point there was an error on the file, copy it to the unsorted dir
      // Note that this just swallows these errors so processing will continue
      .catch((err) => {
        if (err.message.startsWith('ENODATA')) {
          return copyUnknown(ogPath, ogFile).then(passCode(CODES.NO_DATA))
        }

        if (err.message.startsWith('ENODATE')) {
          return copyUnsorted(ogPath, ogFile).then(passCode(CODES.NO_DATE))
        }

        return passCode(CODES.BAD)(err.message)
      })

      // Push to the stream based on verbosity
      .then(({ data, code }) => this.push(verbose ? data + '\n' : code))
  }
}
