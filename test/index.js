const path = require('path')
const test = require('tape')
const fs = require('fs-promise')
const debug = require('debug')('organize-photos')
const spawn = require('child-process-promise').spawn
const organize = require('../lib/index')

const prefix = (f, ...prefixes) => path.join(process.cwd(), ...prefixes, f)
const prefixFiles = (files, ...prefixes) => files.map((f) => prefix(f, ...prefixes))

const run = (src, dest, options) => organize(
  Object.assign({ src, dest, log: debug, clean: true, real: true, verbose: true }, options)
)

const cli = (src, dest, ...args) => {
  const promise = spawn('./lib/cli.js', ['--src', src, '--dest', dest, '--clean', '--real', '--verbose', ...args])
  promise.childProcess.stdout.on('data', (data) => debug(data.toString()))
  return promise.then(() => prefixFiles(fs.walkSync(dest)).sort())
}

const noError = (t) => (err) => {
  t.ok(false, `Should not error: ${err}`)
  t.end()
}

test('(CLI) Photos can be organized by create date', (t) => {
  const src = 'test/fixtures'
  const dest = 'test/output'

  cli(src, dest)
    .then((files) => {
      const expected = [
        '2012/11/03/2012-11-03 07-17-09.jpg',
        '2013/11/01/2013-11-01 17-33-56.png',
        '2016/01/01/2016-01-01 12-22-45.jpg',
        '2016/11/21/2016-11-21 20-24-00.jpg',
        'UNKNOWN/test.txt',
        'UNSORTED/IMG_0415 a.jpg',
        'UNSORTED/IMG_0415.jpg',
        'UNSORTED/IMG_6412 a.jpg',
        'UNSORTED/IMG_6412.jpg',
        'UNSORTED/Photo on.jpg'
      ]

      files.forEach((f, i) => {
        t.equal(f, prefix(expected[i], dest))
      })

      t.end()
    })
    .catch(noError)
})

test('(CLI) Photos can be organized by create date and modify date', (t) => {
  const src = 'test/fixtures'
  const dest = 'test/output'

  cli(src, dest, '--exif-date', 'CreateDate', 'FileModifyDate')
    .then((files) => {
      t.equal(files[0], prefix('2012/11/03/2012-11-03 07-17-09.jpg', dest))
      t.equal(files[files.length - 1], prefix('UNKNOWN/test.txt', dest))
      files.slice(1, -1).forEach((f) => {
        t.equal(f.indexOf('UNSORTED'), -1)
        t.equal(f.indexOf('UNKNOWN'), -1)
      })
      t.end()
    })
    .catch(noError)
})

test('(Module) Photos can be organized by create date', (t) => {
  const src = 'test/fixtures'
  const dest = 'test/output'

  run(src, dest)
    .then((resp) => {
      t.deepEqual(Object.keys(resp).sort(), ['SUCCESS', 'UNKNOWN', 'UNSORTED'])

      t.deepEqual(resp.SUCCESS.map(({ dest }) => dest), prefixFiles([
        '2012/11/03/2012-11-03 07-17-09.jpg',
        '2013/11/01/2013-11-01 17-33-56.png',
        '2016/01/01/2016-01-01 12-22-45.jpg',
        '2016/11/21/2016-11-21 20-24-00.jpg'
      ], dest))

      t.deepEqual(resp.UNKNOWN.map(({ dest }) => dest), prefixFiles([
        'UNKNOWN/test.txt'
      ], dest))

      t.deepEqual(resp.UNSORTED.map(({ dest }) => dest), prefixFiles([
        'UNSORTED/IMG_0415 a.jpg',
        'UNSORTED/IMG_0415.jpg',
        'UNSORTED/IMG_6412 a.jpg',
        'UNSORTED/IMG_6412.jpg',
        'UNSORTED/Photo on.jpg'
      ], dest))

      t.end()
    })
    .catch(noError)
})

test('(Module) Photos can be organized by create date and modify date', (t) => {
  const src = 'test/fixtures'
  const dest = 'test/output'

  run(src, dest, { exifDate: ['CreateDate', 'FileModifyDate'] })
    .then((resp) => {
      t.deepEqual(Object.keys(resp), ['SUCCESS', 'UNKNOWN'])

      t.deepEqual(resp.SUCCESS[0].dest, prefix('2012/11/03/2012-11-03 07-17-09.jpg', dest))

      resp.SUCCESS.slice(1).forEach((f) => {
        t.equal(f.dest.indexOf('UNSORTED'), -1)
        t.equal(f.dest.indexOf('UNKNOWN'), -1)
      })

      t.deepEqual(resp.UNKNOWN.map(({ dest }) => dest), prefixFiles([
        'UNKNOWN/test.txt'
      ], dest))

      t.end()
    })
    .catch(noError)
})
