const path = require('path')

const filename = (item) => path.basename(item.SourceFile, path.extname(item.SourceFile).slice(1))
const dirname = (item) => path.basename(item.Directory)
const pad = (val, len = 2, char = '0') => !val ? char.repeat(len) : char.repeat(len - val.toString().length) + val.toString()

const outFormat = ({ year, month, day, hour, minute, second, meridiem = '' }) => {
  if (meridiem.toLowerCase() === 'pm' && hour !== '12') hour = (parseInt(hour, 10) + 12).toString()
  return `${year.length === 2 ? '20' : ''}${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`
}

const dateParsers = {
  photoBooth (item) {
    const matched = filename(item).match(/ on (\d{1,2})-(\d{1,2})-(\d{2}) at (\d{1,2})\.(\d{1,2}) ([AP]M)/)
    if (matched) {
      const [, month, day, year, hour, minute, meridiem] = matched
      return { year, month, day, hour, minute, meridiem }
    }
    return null
  },

  screenShot (item) {
    const matched = filename(item).match(/Screen Shot (\d{4})-(\d{1,2})-(\d{1,2}) at (\d{1,2})\.(\d{1,2})\.(\d{1,2}) ([AP]M)/)
    if (matched) {
      const [, year, month, day, hour, minute, second, meridiem] = matched
      return { year, month, day, hour, minute, second, meridiem }
    }
    return null
  },

  directory (item) {
    const matched = dirname(item).match(/^(\d{4})-(\d{1,2})-(\d{1,2}) (\d{1,2})-(\d{1,2})-(\d{1,2})$/)
    if (matched) {
      const [, year, month, day, hour, minute, second] = matched
      return { year, month, day, hour, minute, second }
    }
    return null
  },

  exif (item, props) {
    const date = item[props.find((prop) => item[prop])]
    const matched = date && date.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/)
    if (matched) {
      const [, year, month, day, hour, minute, second] = matched
      return { year, month, day, hour, minute, second }
    }
    return null
  }
}

module.exports = (item, exifDate) => {
  const exif = dateParsers.exif(item, exifDate)
  const parsers = Object.keys(dateParsers).filter((k) => k !== 'exif')

  if (exif) {
    return { date: outFormat(exif), fromExif: true }
  }

  for (let i = 0, m = parsers.length; i < m; i++) {
    const value = dateParsers[parsers[i]](item)
    if (value) {
      return { date: outFormat(value), fromExif: false }
    }
  }

  return { date: null, fromExif: false }
}
