# organize-photos

Organizes your photos and videos.

[![NPM](https://nodei.co/npm/@lukekarrys/organize-photos.png)](https://nodei.co/npm/@lukekarrys/organize-photos/)
[![Build Status](https://travis-ci.org/lukekarrys/organize-photos.png?branch=master)](https://travis-ci.org/lukekarrys/organize-photos)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)
[![Greenkeeper badge](https://badges.greenkeeper.io/lukekarrys/organize-photos.svg)](https://greenkeeper.io/)

## Overview

1. Takes a `src` dir and copies *everything* to a `dest` dir
1. Every file copied is cleaned up with the following
    1. Lowercase file extension
    1. Removes trailing ` #5` and ` (3)` from filenames
1. If a file is not a recognized type it is moved to `dest/UNKNOWN`
1. If a file has no date associated, it is moved to `dest/UNSORTED`
1. If a file does have a date, it is moved to `dest/yyyy/mm/dd/yyyy-mm-dd hh:mm:ss.ext`
1. Dates are found by the following
    1. exif `CreateDate` field
    1. Any other exif fields passed in with `exifDate`
    1. Some special filenames like screenshots or photobooth files
    1. If the file is named like `yyyy-mm-dd hh?:mm?:ss?`
    1. A parent directory that is named like `yyyy-mm-dd hh?:mm?:ss?`
1. If no exif dates are found, but a date is found from the path, that will be written to exif data
1. Files are never clobbered but instead `a-z` is appended to the destination until there are no conflicts
1. By default, everything is a dry run (can be changed with `real`)
1. By default, `dest` is never cleared but always added to (can be changed with `clean`)
1. Can optionally `move` all the files instead

## Installation

### CLI
```
npm install @lukekarrys/organize-photos -g
```

### Module
```
npm install @lukekarrys/organize-photos --save
```

## Development

### Prerequisites

#### Windows

##### win-node-env

On Windows, you will encounter the error "'NODE_ENV' is not recognized as an internal or external command, operable program or batch file." when running npm scripts. 

[win-node-env](https://github.com/laggingreflex/win-node-env) creates a NODE_ENV.cmd that sets the NODE_ENV environment variable and spawns a child process with the rest of the command and its args.

`npm install -g win-node-env`

## Testing

`npm test`

### License

MIT

## Contributors

### Brendan Conrad

* GitHub - <https://github.com/brencon>
* Twitter - <https://twitter.com/symBrendan>


