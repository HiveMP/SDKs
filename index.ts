#!/usr/bin/env node

import * as program from 'commander';
import * as swagger from 'swagger2';
import * as mkdirp from 'mkdirp';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
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
import { mkdirpSync } from 'fs-extra';

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
    '"dev" or a string with "{api}" in it)'
  )
  .option(
    '-l, --endpoint-local', 
    'treat the provided endpoint as a local folder'
  )
  .option(
    '-i, --isolated-namespace', 
    'use an alternate namespace for generated code where supported'
  )
  .option(
    '--include-cluster-only',
    'include API calls that can only be made with intracluster API keys'
  )
  .option(
    '-c, --enable-client-connect',
    'enable Client Connect support if this target allows it'
  )
  .option(
    '-m, --enable-multitargeting',
    'enable generating code for all available versions, instead of just the latest version'
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
  
          let fetchDocumentFromPathOrUrl = async (pathOrUrl: string) => {
            let content = await fetch(pathOrUrl);
            return await content.text();
          }
          if (options.endpointLocal) {
            fetchDocumentFromPathOrUrl = async (pathOrUrl: string) => {
              return fs.readFileSync(pathOrUrl, 'utf8');
            }
          }

          let documents: {[id: string]: swagger.Document} = {};
          let documentPromises = [];
          for (let api of apis) {
            if (target.supportsMultitargeting && options.enableMultitargeting) {
              documentPromises.push((async(api: string) => {
                let swaggerUri = endpoint.replace('{api}', api) + '/metadata.json';
                console.log('downloading \'' + swaggerUri + '\'...');
                let metadataText = await fetchDocumentFromPathOrUrl(swaggerUri);
                let metadata = JSON.parse(metadataText);
                
                for (const version of metadata.allVersions) {
                  let swaggerUri = endpoint.replace('{api}', api) + '/' + version + '/swagger.json';
                  console.log('downloading \'' + swaggerUri + '\'...');
                  let documentText = await fetchDocumentFromPathOrUrl(swaggerUri);
                  let document = JSON.parse(documentText);
                  documents[api + ':' + version] = document as swagger.Document;
                }
              })(api));
            } else if (target.supportsMultitargeting) {
              let swaggerUri = endpoint.replace('{api}', api) + '/metadata.json';
              console.log('downloading \'' + swaggerUri + '\'...');
              let metadataText = await fetchDocumentFromPathOrUrl(swaggerUri);
              let metadata = JSON.parse(metadataText);

              swaggerUri = endpoint.replace('{api}', api) + '/' + metadata.latestVersion + '/swagger.json';
              console.log('downloading \'' + swaggerUri + '\'...');
              let documentText = await fetchDocumentFromPathOrUrl(swaggerUri);
              let document = JSON.parse(documentText);
              documents[api + ':' + metadata.latestVersion] = document as swagger.Document;
            } else {
              documentPromises.push((async(api: string) => {
                let swaggerUri = endpoint.replace('{api}', api) + '/latest/swagger.json';
                console.log('downloading \'' + swaggerUri + '\'...');
                let documentText = await fetchDocumentFromPathOrUrl(swaggerUri);
                let document = JSON.parse(documentText);
                documents[api] = document as swagger.Document;
              })(api));
            }
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
              isolatedNamespace: options.isolatedNamespace,
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
  .command('fetch-api-desc <outputDir>')
  .description('fetch the API description (Swagger) files, and cache them')
  .option(
    '-e, --endpoint <endpoint>', 
    'the endpoint to fetch from (can be "prod", ' +
    '"dev" or a string with "{api}" in it)'
  )
  .action((outputDir: string, options: any) => {
    command = 'fetch-api-desc';
    (async(): Promise<void> => {
      // download swagger documents first.
      let endpoint = options.endpoint || 'prod';
      if (endpoint == 'prod') {
        endpoint = 'https://{api}-api.hivemp.com'
      } else if (endpoint == 'dev') {
        endpoint = 'https://dev-{api}-api.hivemp.com'
      }

      mkdirpSync(path.join(outputDir));

      let documentPromises = [];
      for (let api of apis) {
        documentPromises.push((async(api: string) => {
          let swaggerUri = endpoint.replace('{api}', api) + '/metadata.json';
          console.log('downloading \'' + swaggerUri + '\'...');
          let metadataContent = await fetch(swaggerUri);
          let metadataText = await metadataContent.text();
          let metadata = JSON.parse(metadataText);
          mkdirpSync(path.join(outputDir, api));
          const existingMetadata = fs.existsSync(path.join(outputDir, api, 'metadata.json')) ? fs.readFileSync(path.join(outputDir, api, 'metadata.json'), 'utf8') : '';
          if (existingMetadata !== metadataText) {
            console.log(`updated: ${path.join(outputDir, api, 'metadata.json')}`)
            fs.writeFileSync(
              path.join(outputDir, api, 'metadata.json'),
              metadataText
            );
          } else {
            console.log(`already matching: ${path.join(outputDir, api, 'metadata.json')}`)
          }
          
          for (const version of metadata.allVersions) {
            let swaggerUri = endpoint.replace('{api}', api) + '/' + version + '/swagger.json';
            console.log('downloading \'' + swaggerUri + '\'...');
            let documentContent = await fetch(swaggerUri);
            let documentText = await documentContent.text();
            mkdirpSync(path.join(outputDir, api, version));
            const existingDocument = fs.existsSync(path.join(outputDir, api, version, 'swagger.json')) ? fs.readFileSync(path.join(outputDir, api, version, 'swagger.json'), 'utf8') : '';
            if (existingDocument !== documentText) {
              console.log(`updated: ${path.join(outputDir, api, version, 'swagger.json')}`)
              fs.writeFileSync(
                path.join(outputDir, api, version, 'swagger.json'),
                documentText
              );
            } else {
              console.log(`already matching: ${path.join(outputDir, api, version, 'swagger.json')}`)
            }
          }
        })(api));
      }
      await Promise.all(documentPromises);
  
      console.error('cached api files');
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