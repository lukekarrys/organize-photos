const path = require('path')

module.exports = (file, fn) => {
  const dir = path.dirname(file)
  const ext = path.extname(file)
  const base = path.basename(file, ext)

  const altered = Object.assign({ dir, ext, base }, fn({ dir, ext, base }))

  return path.join(altered.dir, altered.base + altered.ext)
}
