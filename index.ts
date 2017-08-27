#!/usr/bin/env node

import * as program from 'commander';
import * as swagger from 'swagger2';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import fetch from 'node-fetch';
import {
  CSharp35Generator,
  CSharp45Generator,
} from './targets/csharp';
import {
  UnrealEngine416Generator,
} from './targets/ue4';

let targets = [
  new CSharp35Generator(),
  new CSharp45Generator(),
  new UnrealEngine416Generator(),
];

let apis = [
  'admin-session',
  'attribute',
  //'audit',
  //'error',
  'event',
  'game-server',
  'integration',
  'lobby',
  'reporting',
  'revenue-share',
  //'matchmaking',
  'nat-punchthrough',
  'temp-session',
  'pos',
  'ugc-cache',
  'user-session',
  'search',
];

let command = null;

program.version('0.1.0');

program
  .command('generate <target> <outputDir>')
  .description('generate an SDK')
  .option(
    '-e, --endpoint <endpoint>', 
    'the endpoint to generate from (can be "prod", ' +
    '"dev" or a string with "{api}" in it)')
  .action((target: string, outputDir: string, options: any) => {
    let t = target;
    let found = false;
    for (let target of targets) {
      if (target.name == t) {
        // download swagger documents first.
        let endpoint = options.endpoint || 'prod';
        if (endpoint == 'prod') {
          endpoint = 'https://{api}-api.hivemp.com'
        } else if (endpoint == 'dev') {
          endpoint = 'https://dev-{api}-api.hivemp.com'
        }

        command = 'generate';
        (async(): Promise<void> => {
          let documents: {[id: string]: swagger.Document} = {};
          let documentPromises = [];
          for (let api of apis) {
            documentPromises.push((async(api: string) => {
              let swaggerUri = endpoint.replace('{api}', api) + '/swagger.json';
              console.log('downloading \'' + swaggerUri + '\'...');
              let documentContent = await fetch(swaggerUri);
              let document = JSON.parse(await documentContent.text());
              /*if (!swagger.validateDocument(document)) {
                console.error('unable to validate document at ' + swaggerUri);
                process.exit(1);
              }*/
              documents[api] = document as swagger.Document;
            })(api));
          }
          await Promise.all(documentPromises);
  
          console.log('generating for target \'' + t + '\'...');
          await new Promise((resolve, reject) => {
            mkdirp(outputDir, (err, made) => {
              if (err) {
                reject(err);
              }
              resolve();
            });
          });
          await target.generate(documents, outputDir);
        })()
          .then(() => {
            console.log('generated for target \'' + t + '\'');
            process.exit(0);
          })
          .catch((ex) => {
            console.error(ex);
            process.exit(1);
          });
        found = true;
        break;
      }
    }

    if (!found) {
      console.error('target \'' + t + '\' not supported');
      process.exit(1);
    }
  });

program
  .command('list-targets')
  .description('list available targets')
  .action(() => {
    console.log('the following targets are supported:');
    for (let target of targets) {
      console.log(target.name);
    }
    command = 'list-targets';
    process.exit(0);
  });

program.parse(process.argv);

if (command == null) {
  program.help();
  if (process.argv.length === 0) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}