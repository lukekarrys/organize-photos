const path = require('path')

const filename = (item) => path.basename(item.SourceFile, path.extname(item.SourceFile))
const dirname = (item) => path.basename(item.Directory)
const pad = (val, len = 2, char = '0') => !val ? char.repeat(len) : char.repeat(len - val.toString().length) + val.toString()

const outFormat = ({ year, month, day, hour, minute, second, meridiem = '' }) => {
  if (meridiem.toLowerCase() === 'pm' && hour !== '12') hour = (parseInt(hour, 10) + 12).toString()
  return `${year.length === 2 ? '20' : ''}${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`
}

const dateRegexes = [
  // yyyy-m(m)-d(d) h(h)-m(m)-d(d) - all time parts optional
  /^(\d{4})-(\d{1,2})-(\d{1,2}) ?(\d{1,2})?-?(\d{1,2})?-?(\d{1,2})?$/,
  // 20121215.002106
  /(\d{4})(\d{2})(\d{2})[._](\d{2})(\d{2})(\d{2})$/
]

const dateParsers = {
  photoBooth (item) {
    const matched = filename(item).match(/^Photo on (\d{1,2})-(\d{1,2})-(\d{2}) at (\d{1,2})\.(\d{1,2}) ([AP]M)/)
    if (matched) {
      const [, month, day, year, hour, minute, meridiem] = matched
      return { year, month, day, hour, minute, meridiem }
    }
    return null
  },

  screenShot (item) {
    const matched = filename(item).match(/^Screen Shot (\d{4})-(\d{1,2})-(\d{1,2}) at (\d{1,2})\.(\d{1,2})\.(\d{1,2}) ([AP]M)/)
    if (matched) {
      const [, year, month, day, hour, minute, second, meridiem] = matched
      return { year, month, day, hour, minute, second, meridiem }
    }
    return null
  },

  directory (item) {
    const dir = dirname(item)
    const regex = dateRegexes.find((r) => dir.match(r))
    if (regex) {
      const [, year, month, day, hour, minute, second] = dir.match(regex)
      return { year, month, day, hour, minute, second }
    }
    return null
  },

  filename (item) {
    const file = filename(item)
    const regex = dateRegexes.find((r) => file.match(r))
    if (regex) {
      const [, year, month, day, hour, minute, second] = file.match(regex)
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
