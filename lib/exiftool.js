const exiftool = require('node-exiftool')
const exiftoolBin = require('dist-exiftool')

module.exports = () => new exiftool.ExiftoolProcess(exiftoolBin)
