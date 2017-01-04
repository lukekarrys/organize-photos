const path = require('path')
const test = require('tape')
const fs = require('fs-promise')
const debug = require('debug')('organize-photos')
const spawn = require('child-process-promise').spawn
const organize = require('../lib/index')
const cwd = process.cwd()

const getOptions = (src, dest, o = {}) => Object.assign({ src, dest, clean: true, real: true, verbose: true }, o)
const prefix = (files, ...prefixes) => files.map((f) => path.join(...prefixes, f))
const dasherize = (str) => str.replace(/([a-z\d])([A-Z])/g, (__, sm, lg) => sm + '-' + lg.toLowerCase())
const objToCli = (obj) => Object.keys(obj).reduce((acc, k) => {
  acc.push('--' + dasherize(k))
  if (Array.isArray(obj[k])) {
    acc.push(...obj[k])
  } else {
    acc.push(obj[k])
  }
  return acc
}, [])

const run = (src, dest, options) => organize(getOptions(src, dest, Object.assign({ log: debug }, options)))

const cli = (src, dest, options) => {
  const promise = spawn('./lib/cli.js', objToCli(getOptions(src, dest, options)))
  promise.childProcess.stdout.on('data', (data) => debug(data.toString()))
  return promise.then(() => prefix(fs.walkSync(dest), cwd).sort())
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
      t.deepEqual(files, prefix([
        '2012/11/03/2012-11-03 07-17-09.jpg',
        'UNKNOWN/test.txt',
        'UNSORTED/IMG_0415 a.jpg',
        'UNSORTED/IMG_0415.jpg',
        'UNSORTED/IMG_6412 a.jpg',
        'UNSORTED/IMG_6412.jpg'
      ], cwd, dest))
      t.end()
    })
    .catch(noError)
})

test('(CLI) Photos can be organized by create date and modify date', (t) => {
  const src = 'test/fixtures'
  const dest = 'test/output'

  cli(src, dest, { exifDate: ['CreateDate', 'FileModifyDate'] })
    .then((files) => {
      t.deepEqual(files, prefix([
        '2012/11/03/2012-11-03 07-17-09.jpg',
        '2013/01/14/2013-01-14 21-13-02 a.jpg',
        '2013/01/14/2013-01-14 21-13-02.jpg',
        '2016/08/14/2016-08-14 10-48-21 a.jpg',
        '2016/08/14/2016-08-14 10-48-21.jpg',
        'UNKNOWN/test.txt'
      ], cwd, dest))
      t.end()
    })
    .catch(noError)
})

test('(Module) Photos can be organized by create date', (t) => {
  const src = 'test/fixtures'
  const dest = 'test/output'

  run(src, dest)
    .then((resp) => {
      t.deepEqual(Object.keys(resp), ['SUCCESS', 'UNKNOWN', 'UNSORTED'])

      t.deepEqual(resp.SUCCESS.map(({ dest }) => dest), prefix([
        '2012/11/03/2012-11-03 07-17-09.jpg'
      ], cwd, dest))

      t.deepEqual(resp.UNKNOWN.map(({ dest }) => dest), prefix([
        'UNKNOWN/test.txt'
      ], cwd, dest))

      t.deepEqual(resp.UNSORTED.map(({ dest }) => dest), prefix([
        'UNSORTED/IMG_0415 a.jpg',
        'UNSORTED/IMG_0415.jpg',
        'UNSORTED/IMG_6412 a.jpg',
        'UNSORTED/IMG_6412.jpg'
      ], cwd, dest))

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

      t.deepEqual(resp.SUCCESS.map(({ dest }) => dest), prefix([
        '2012/11/03/2012-11-03 07-17-09.jpg',
        '2013/01/14/2013-01-14 21-13-02 a.jpg',
        '2013/01/14/2013-01-14 21-13-02.jpg',
        '2016/08/14/2016-08-14 10-48-21 a.jpg',
        '2016/08/14/2016-08-14 10-48-21.jpg'
      ], cwd, dest))

      t.deepEqual(resp.UNKNOWN.map(({ dest }) => dest), prefix([
        'UNKNOWN/test.txt'
      ], cwd, dest))

      t.end()
    })
    .catch(noError)
})
