#!/usr/bin/env node

import * as program from 'commander';
import * as swagger from 'swagger2';
import * as mkdirp from 'mkdirp';
import fetch from 'node-fetch';
import {
  CSharp35Generator,
  CSharp45Generator,
  UnityGenerator,
} from './targets/csharp';
import {
  UnrealEngine418Generator,
  UnrealEngine419Generator,
  UnrealEngine420Generator,
} from './targets/ue4';
import {
  MuJsTypeScriptGenerator
} from './targets/mujs';
import {
  TypeScriptGenerator
} from './targets/typescript';
import { apiNames } from './targets/common/apiNames';

let targets = [
  new CSharp35Generator(),
  new CSharp45Generator(),
  new UnityGenerator(),
  new UnrealEngine418Generator(),
  new UnrealEngine419Generator(),
  new UnrealEngine420Generator(),
  new MuJsTypeScriptGenerator(),
  new TypeScriptGenerator(),
];

let apis = [];
for (const apiKey in apiNames) {
  if (apiNames.hasOwnProperty(apiKey)) {
    apis.push(apiKey);
  }
}

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
  .option(
    '--skip-supporting-files',
    'skip copying supporting files (such as build script files) to the output directory'
  )
  .action((target: string, outputDir: string, options: any) => {
    command = 'generate';
    (async(): Promise<void> => {
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
            mkdirp(outputDir, (err) => {
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
              skipSupportingFiles: options.skipSupportingFiles,
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