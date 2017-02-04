const path = require('path')
const yargs = require('yargs')
const cwd = process.cwd()

const args = () => yargs
  .normalize('src')
  .demandOption('src')
  .describe('src', 'The directory to read from')
  .coerce('src', (arg) => path.resolve(cwd, arg))

  .normalize('dest')
  .demandOption('dest')
  .describe('dest', 'The directory to write to')
  .coerce('dest', (arg) => path.resolve(cwd, arg))

  .string('device')
  .describe('device', 'The device that these pictures are coming from')
  .default('device', '')

  .array('ext')
  .describe('ext', 'These extensions will be the only ones processed with exiftool')
  .default('ext', ['gif', 'jpg', 'jpeg', 'png', 'mov', 'mp4', 'm4v'])
  .coerce('ext', (exts) => exts.map((e) => e.toLowerCase()))

  .array('exif-date')
  .describe('exif-date', 'These properties will be used in order to try and find the date from the exif data')
  .default('exif-date', ['CreationDate', 'CreateDate'])
  .coerce('exif-date', (arr) => [...new Set(arr)])

  .boolean('real')
  .describe('real', 'Whether to really alter the file system')
  .default('real', false)

  .boolean('clean')
  .describe('clean', 'Whether to empty the dest directory first')
  .default('clean', false)

  .describe('command', 'Which command to run on the src files')
  .default('command', 'copy')
  .choices('command', ['copy', 'move'])

  .boolean('verbose')
  .default('verbose', false)

  .wrap(yargs.terminalWidth())
  .help('help')

// For cli mode
module.exports.argv = () => args().argv

// Pass in an object and parse it as cli style args
module.exports.parse = (options) => {
  const keys = Object.keys(options)

  // Filter options based on if they are parseable by the cli
  const notCliable = (k) => typeof options[k] === 'function'
  const cliKeys = keys.filter((k) => !notCliable(k) && k !== '_' && k.charAt(0) !== '$')
  const otherKeys = keys.filter(notCliable)

  // Parse some args the same as they would be on the cli by yargs
  const argv = args().parse(cliKeys.map((k) => {
    const value = options[k]
    return `--${k}=${Array.isArray(value) ? value.join(' ') : value}`
  }).join(' '))

  // Add back in other args
  return Object.assign({}, argv, otherKeys.reduce((acc, k) => {
    acc[k] = options[k]
    return acc
  }, {}))
}
