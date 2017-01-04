const path = require('path')
const dateformat = require('dateformat')

const copyFile = require('./copy-file')

// Helpers
const copyTo = (baseDest, metaOptions) => (src, dest, options) => copyFile(src, path.join(baseDest, dest), options, metaOptions)
const passCode = (code) => (data) => ({ code, data })

module.exports = ({ ep, dest, ext, exifDate, real, command, constants }) => {
  const copyDest = copyTo(dest, { real, command })
  const copyUnsorted = copyTo(path.join(dest, constants.UNSORTED), { real, command })
  const copyUnknown = copyTo(path.join(dest, constants.UNKNOWN), { real, command })

  return (file) => {
    const ogPath = file.path
    const ogFile = path.basename(file.path)
    const ogExt = path.extname(file.path).slice(1)

    return ep.readMetadata(ogPath)

      // See if exiftool could read the file
      .then((data) => {
        if (!data || !data.data || !data.data.length) {
          throw new Error(`ENODATA: No data for ${ogPath}`)
        }

        return data.data[0]
      })

      .then((item) => {
        if (ext && !ext.includes(ogExt.toLowerCase())) {
          throw new Error(`ENODATA: Wrong extension for ${ogPath}`)
        }

        return item
      })

      // If there is no date then throw which will cause it to be unsorted
      .then((item) => {
        const date = item[exifDate.find((prop) => item[prop])]

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
      .then((destPath) => copyDest(ogPath, destPath).then(passCode(constants.SUCCESS)))

      // If at any point there was an error on the file, copy it to the unsorted dir
      // Note that this just swallows these errors so processing will continue
      .catch((err) => {
        if (err.message.startsWith('ENODATA')) {
          return copyUnknown(ogPath, ogFile).then(passCode(constants.UNKNOWN))
        }

        if (err.message.startsWith('ENODATE')) {
          return copyUnsorted(ogPath, ogFile).then(passCode(constants.UNSORTED))
        }

        return passCode(constants.ERROR)(err)
      })
  }
}
