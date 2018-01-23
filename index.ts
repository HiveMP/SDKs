#!/usr/bin/env node

import * as program from 'commander';
import * as swagger from 'swagger2';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as request from 'request';
import * as targz from 'node-tar.gz';
import * as path from 'path';
import fetch from 'node-fetch';
import {
  CSharp35Generator,
  CSharp45Generator,
  UnityGenerator,
} from './targets/csharp';
import {
  UnrealEngine416Generator,
  UnrealEngine417Generator,
} from './targets/ue4';

let targets = [
  new CSharp35Generator(),
  new CSharp45Generator(),
  new UnityGenerator(),
  new UnrealEngine416Generator(),
  new UnrealEngine417Generator(),
];

let apis = [
  'admin-session',
  'api-key',
  'attribute',
  'billing',
  //'audit',
  'client-connect',
  //'error',
  'event',
  'game-server',
  'integration',
  'lobby',
  'reporting',
  'revenue-share',
  //'matchmaking',
  'nat-punchthrough',
  'netcode',
  'temp-session',
  'pos',
  'ugc-cache',
  'user-session',
  'search',
  'scheduling',
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
  .option(
    '--include-cluster-only',
    'include API calls that can only be made with intracluster API keys'
  )
  .option(
    '-c, --enable-client-connect',
    'enable experimental Client Connect support if this target allows it'
  )
  .option(
    '--client-connect-sdk-path <dir>',
    'path to the compiled Client Connect SDK, if not provided downloads the latest SDK'
  )
  .action((target: string, outputDir: string, options: any) => {
    command = 'generate';
    (async(): Promise<void> => {
      let t = target;
      let found = false;
      if (options.enableClientConnect &&
          options.clientConnectSdkPath == null) {
        console.log("Downloading and extracting HiveMP Client Connect SDK...")
        await new Promise((resolve, reject) => {
          fetch('https://github.com/HiveMP/HiveMP.ClientConnect/releases/download/latest/HiveMP.ClientConnect-SDK.tar.gz')
            .then(function(res) {
              try {
                fs.mkdirSync(path.join(__dirname, 'deps'));
              } catch (e) {}
              let write = targz().createWriteStream(path.join(__dirname, 'deps/HiveMP.ClientConnect'));
              let stream = res.body.pipe(write);
              stream.on('finish', function () {
                resolve();
              });
            })
            .catch(reject);
        });
        options.clientConnectSdkPath = path.join(__dirname, 'deps/HiveMP.ClientConnect/sdk');
      }
      for (let target of targets) {
        if (target.name == t) {
          // download swagger documents first.
          let endpoint = options.endpoint || 'prod';
          if (endpoint == 'prod') {
            endpoint = 'https://{api}-api.hivemp.com'
          } else if (endpoint == 'dev') {
            endpoint = 'https://dev-{api}-api.hivemp.com'
          }
  
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
          await target.generate(
            documents,
            {
              outputDir: outputDir,
              includeClusterOnly: options.includeClusterOnly,
              enableClientConnect: options.enableClientConnect,
              clientConnectSdkPath: options.clientConnectSdkPath,
            });
          found = true;
          break;
        }
      }
  
      if (!found) {
        console.error('target \'' + t + '\' not supported');
        process.exit(1);
      }
    })()
      .then(() => {
        process.exit(0);
      })
      .catch((ex) => {
        console.error(ex);
        process.exit(1);
      });
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