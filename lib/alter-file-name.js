const path = require('path')

module.exports = (file, fn) => {
  let dir = path.dirname(file)
  let ext = path.extname(file)
  let base = path.basename(file, ext)
  let altered = { dir, ext, base }

  if (typeof fn === 'function') {
    altered = Object.assign({}, altered, fn({ dir, ext, base }))
  }

  return path.join(altered.dir, altered.base + altered.ext)
}
