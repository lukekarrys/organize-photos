const path = require('path')
const test = require('tape')
const fs = require('fs-promise')
const debug = require('debug')('organize-photos')
const spawn = require('child-process-promise').spawn
const exiftool = require('../lib/exiftool')
const organize = require('../lib/index')

const prefix = (f, ...prefixes) => path.join(process.cwd(), ...prefixes, f)
const prefixFiles = (files, ...prefixes) => files.map((f) => prefix(f, ...prefixes))

const destOnly = (obj) => Object.keys(obj).reduce((acc, k) => {
  acc[k] = obj[k].map(({ dest }) => dest)
  return acc
}, {})

const getFsDest = (dest) => prefixFiles(fs.walkSync(dest)).sort((a, b) => {
  if (a < b) return -1
  if (a > b) return 1
  return 0
})

const run = (src, dest, options) => organize(
  Object.assign({ src, dest, log: debug, clean: true, real: true, verbose: true }, options)
).then((resp) => ({ resp, files: getFsDest(dest) }))

const cli = (src, dest, ...args) => {
  const promise = spawn('./lib/cli.js', ['--src', src, '--dest', dest, '--clean', '--real', '--verbose', ...args])
  promise.childProcess.stdout.on('data', (data) => debug(data.toString()))
  return promise.then(() => getFsDest(dest))
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
        '2016/01/01/2016-01-01 12-22-45 a.jpg',
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
    .catch(noError(t))
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
    .catch(noError(t))
})

test('(Module) Photos can be organized by create date and have exif modified', (t) => {
  const src = 'test/fixtures'
  const dest = 'test/output'

  run(src, dest)
    .then(({ resp, files }) => {
      const destResp = destOnly(resp)

      t.deepEqual(Object.keys(destResp).sort(), ['SUCCESS', 'UNKNOWN', 'UNSORTED'])

      const expected = {
        SUCCESS: prefixFiles([
          '2012/11/03/2012-11-03 07-17-09.jpg',
          '2013/11/01/2013-11-01 17-33-56.png',
          '2016/01/01/2016-01-01 12-22-45 a.jpg',
          '2016/01/01/2016-01-01 12-22-45.jpg',
          '2016/11/21/2016-11-21 20-24-00.jpg'
        ], dest),
        UNKNOWN: prefixFiles([
          'UNKNOWN/test.txt'
        ], dest),
        UNSORTED: prefixFiles([
          'UNSORTED/IMG_0415 a.jpg',
          'UNSORTED/IMG_0415.jpg',
          'UNSORTED/IMG_6412 a.jpg',
          'UNSORTED/IMG_6412.jpg',
          'UNSORTED/Photo on.jpg'
        ], dest)
      }

      t.deepEqual(destResp, expected)
      t.deepEqual(files, [...expected.SUCCESS, ...expected.UNKNOWN, ...expected.UNSORTED])

      return resp
    })
    .then((resp) => {
      const ep = exiftool()
      return ep.open().then(() => ({ resp, ep }))
    })
    .then(({ resp, ep }) => {
      const exifFiles = [
        '2013/11/01/2013-11-01 17-33-56.png',
        '2016/01/01/2016-01-01 12-22-45 a.jpg',
        '2016/01/01/2016-01-01 12-22-45.jpg',
        '2016/11/21/2016-11-21 20-24-00.jpg'
      ].map((f) => resp.SUCCESS.find((r) => r.dest.endsWith(f)))

      const readPromises = exifFiles.map(({ src, dest }) => Promise.all([
        ep.readMetadata(src),
        ep.readMetadata(dest)
      ]).then((parts) => ({
        src: parts[0].data[0],
        dest: parts[1].data[0]
      })))

      return Promise.all(readPromises).then((resp) => {
        ep.close()
        return resp
      })
    })
    .then((resp) => {
      resp.forEach((item) => {
        const date = path.basename(item.dest.FileName, path.extname(item.dest.FileName)).replace(/-/g, ':').replace(/ [a-z]+$/, '')
        t.notOk(item.src.CreateDate)
        t.equal(item.dest.CreateDate, date)
      })
      t.end()
    })
    .catch(noError(t))
})

test('(Module) Photos can be organized by create date and modify date', (t) => {
  const src = 'test/fixtures'
  const dest = 'test/output'

  run(src, dest, { exifDate: ['CreateDate', 'FileModifyDate'] })
    .then(({ resp, files }) => {
      const destResp = destOnly(resp)

      t.deepEqual(Object.keys(destResp).sort(), ['SUCCESS', 'UNKNOWN'])
      t.deepEqual(files, [...destResp.SUCCESS, ...destResp.UNKNOWN])
      t.deepEqual(destResp.SUCCESS[0], prefix('2012/11/03/2012-11-03 07-17-09.jpg', dest))

      destResp.SUCCESS.slice(1).forEach((f) => {
        t.equal(f.indexOf('UNSORTED'), -1)
        t.equal(f.indexOf('UNKNOWN'), -1)
      })

      t.deepEqual(destResp.UNKNOWN, prefixFiles([
        'UNKNOWN/test.txt'
      ], dest))

      t.end()
    })
    .catch(noError(t))
})
