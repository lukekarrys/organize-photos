const path = require('path')
const dateformat = require('dateformat')
const copyFile = require('./copy-file')
const parseDate = require('./parse-date')

// Helpers
const copyTo = (baseDest, metaOptions) => (src, dest, options) => copyFile(src, path.join(baseDest, dest), options, metaOptions)
const passCode = (code) => (data) => ({ code, data })

// const exifFormat = ({ year, month, day, hour, minute, second, meridiem, tz }) => {
//   if (meridiem.toLowerCase() === 'pm' && hour !== '12') hour = parseInt(hour, 10) + 12
//   return `${year.length === 2 ? '20' : ''}${year}:${month}:${day} ${hour}:${minute}:${second}${tz}`
// }

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
        const { date, fromExif } = parseDate(item, exifDate)

        if (!date) {
          throw new Error(`ENODATE: No date for ${ogPath}`)
        }

        return { date, writeExif: !fromExif }
      })

      // Create path for the new file
      .then((item) => {
        const destPath = path.join(
          path.join(...['yyyy', 'mm', 'dd'].map((f) => dateformat(item.date, f))),
          dateformat(item.date, 'yyyy-mm-dd HH-MM-ss') + path.extname(ogPath)
        )

        return Object.assign({ dest: destPath }, item)
      })

      // Copy file to the new location
      .then((item) => copyDest(ogPath, item.dest).then((resp) => Object.assign(item, resp)))

      .then((item) => {
        const passData = () => ({ src: item.src, dest: item.dest })

        // Write exifdata to destination if we gleaned the date in some other way
        // if (real && item.writeExif) {
        //   return ep.writeMetadata(item.dest, { [exifDate[0]]: exifFormat(item.date) }, ['overwrite_original'])
        //     .then(passData)
        //     .catch(passData)
        // }

        return passData()
      })

      // Pass along data with the success code
      .then(passCode(constants.SUCCESS))

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
