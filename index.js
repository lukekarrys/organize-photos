#!/usr/bin/env node

const ps = require('promise-streams')
const exiftool = require('node-exiftool')
const exiftoolBin = require('dist-exiftool')
const path = require('path')
const walk = require('klaw')
const fs = require('fs-promise')
const yargs = require('yargs')
const organizeFile = require('./lib/organize-file')

// Helpers for the exiftool process which will stay open the whole time
const ep = new exiftool.ExiftoolProcess(exiftoolBin)
const cleanup = () => ep.close()

const argv = yargs
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
  if (argv.real) fs.ensureDirSync(argv.dest)

  const organize = organizeFile(Object.assign({ ep }, argv))

  walk(argv.src)
    // No directories
    .pipe(ps.filter((item) => !item.stats.isDirectory()))
    // No dotfiles
    .pipe(ps.filter((item) => path.basename(item.path) !== '.' && path.basename(item.path)[0] !== '.'))
    // Exiftool can only handle one read at a time here
    .pipe(ps.through({ concurrent: 1 }, organize))
    // Pipe everything to stdout for visual progress
    .pipe(process.stdout)
     // TODO: why dont these ever get called
    .on('end', cleanup)
    .on('close', cleanup)

  process.on('SIGINT', cleanup)
  process.on('uncaughtException', cleanup)
})
