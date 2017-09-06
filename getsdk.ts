#!/usr/bin/env node

import * as targz from 'node-tar.gz';
import * as path from 'path';
import fetch from 'node-fetch';

fetch('https://github.com/HiveMP/HiveMP.ClientConnect/releases/download/latest/HiveMP.ClientConnect-SDK.tar.gz')
  .then(function(res) {
    let write = targz().createWriteStream(path.join(__dirname, 'deps/HiveMP.ClientConnect'));
    let stream = res.body.pipe(write);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });