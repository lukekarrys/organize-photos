const ps = require('promise-streams')
const exiftool = require('node-exiftool')
const exiftoolBin = require('dist-exiftool')
const path = require('path')
const walk = require('klaw')
const fs = require('fs-promise')
const yargs = require('yargs')
const organizeFile = require('./lib/organize-file')

// Open exif process
const ep = new exiftool.ExiftoolProcess(exiftoolBin)
const cleanup = () => ep.close()

// Options
const {
  src,
  dest,
  verbose,
  real,
  ext,
  command
} = yargs
  .normalize('src')
  .demandOption('src')
  .describe('src', 'The directory to read from')
  .coerce('src', (arg) => path.resolve(process.cwd(), arg))

  .normalize('dest')
  .demandOption('dest')
  .describe('dest', 'The directory to write to')
  .coerce('dest', (arg) => path.resolve(process.cwd(), arg))

  .boolean('verbose')
  .default('verbose', false)

  .boolean('real')
  .describe('real', 'Whether to really alter the file system')
  .default('real', false)

  .array('ext')
  .describe('ext', 'These extensions will be the only ones processed with exiftool')
  .default('ext', ['gif', 'jpg', 'jpeg', 'png', 'mov', 'mp4'])
  .coerce('ext', (exts) => exts.map((e) => e.toLowerCase()))

  .describe('command', 'Which command to run on the src files')
  .default('command', 'copy')
  .choices('command', ['copy', 'move'])

  .help('help')
  .argv

ep.open().then(() => {
  if (real) fs.ensureDirSync(dest)

  const organize = organizeFile({
    ep,
    ext,
    real,
    verbose,
    dest,
    command,
    unsorted: path.join(dest, 'UNSORTED'),
    unknown: path.join(dest, 'UNKNOWN')
  })

  walk(src)
    // No directories
    .pipe(ps.filter((item) => !item.stats.isDirectory()))
    // No dotfiles
    .pipe(ps.filter((item) => path.basename(item.path) !== '.' && path.basename(item.path)[0] !== '.'))
    // One at a time, go through exif data and copy to new location
    .pipe(ps.through({ concurrent: 1 }, organize))
    // Pipe everything to stdout for visual progress
    .pipe(process.stdout)
    .on('end', cleanup) // TODO: why doesnt this ever get called
    .on('close', cleanup) // TODO: why doesnt this ever get called either

  process.on('SIGINT', cleanup)
  process.on('uncaughtException', cleanup)
})
