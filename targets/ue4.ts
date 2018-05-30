import * as swagger from 'swagger2';
import * as schema from 'swagger2/src/schema';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as fragments from './ue4/fragments';
import { TargetGenerator } from './TargetGenerator';
import { TargetOptions } from "./TargetOptions";
import { resolveType } from './ue4/typing';
import { convertDefinition, IDefinitionSpec } from './common/typeSpec';
import { IApiSpec, loadApi } from './common/apiSpec';
import { emitMethodResultDelegateDefinition, emitMethodProxyHeaderDeclaration, emitMethodProxyConstructorImplementation, emitMethodProxyCallImplementation } from './ue4/methods';
import { emitDefinitionAndDependencies } from './ue4/definitions';
import { generateUe4Namespace } from './ue4/namespace';

export abstract class UnrealEngineGenerator implements TargetGenerator {
  abstract get name(): string;

  async generate(documents: {[id: string]: swagger.Document}, opts: TargetOptions): Promise<void> {
    const apis = new Set<IApiSpec>();

    for (const apiId in documents) {
      apis.add(loadApi(apiId, documents[apiId], generateUe4Namespace));
    }

    let header = fragments.cppHeader;
    for (const api of apis) {
      const emittedDefinitions = new Set<string>()
      for (const definitionName of api.definitions.keys()) {
        header += emitDefinitionAndDependencies(
          emittedDefinitions,
          api.definitions,
          definitionName
        );
      }

      for (const definitionValue of api.definitions.values()) {
        const ueType = resolveType(definitionValue);
        header += ueType.emitDeserializationHeader(definitionValue);
        header += ueType.emitSerializationHeader(definitionValue);
      }
      
      for (const method of api.methods) {
        header += emitMethodResultDelegateDefinition(method);
      }

      for (const method of api.methods) {
        header += emitMethodProxyHeaderDeclaration(method);
      }
    }

    let code = fragments.cppCode;
    for (const api of apis) {
      for (const definitionValue of api.definitions.values()) {
        const ueType = resolveType(definitionValue);
        code += ueType.emitDeserializationImplementation(definitionValue);
        code += ueType.emitSerializationImplementation(definitionValue);
      }

      for (const method of api.methods) {
        code += emitMethodProxyConstructorImplementation(method);
        code += emitMethodProxyCallImplementation(method);
      }
    }
    
    await new Promise<void>((resolve, reject) => {
      fs.copy("sdks/UnrealEngine-Common/", opts.outputDir, { overwrite: true }, (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      fs.copy("sdks/" + this.name + "/", opts.outputDir, { overwrite: true }, (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      fs.copy("client_connect/cchost/", opts.outputDir + "/Source/Private/cchost", { overwrite: true }, (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      fs.copy("client_connect/mujs/", opts.outputDir + "/Source/Private/mujs", { overwrite: true }, (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      fs.unlink(opts.outputDir + "/Source/Private/mujs/one.c", (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      fs.unlink(opts.outputDir + "/Source/Private/mujs/main.c", (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      fs.copy("client_connect/polyfill/", opts.outputDir + "/Source/Private/polyfill", { overwrite: true }, (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });

    await new Promise((resolve, reject) => {
      fs.writeFile(path.join(opts.outputDir, 'Source/Private/HiveMPBlueprintLibrary.cpp'), code, (err) => {
        if (err) {
          reject(err);
          return;
        }
        fs.writeFile(path.join(opts.outputDir, 'Source/Public/HiveMPBlueprintLibrary.h'), header, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    });
  }
}

export class UnrealEngine417Generator extends UnrealEngineGenerator {
  get name(): string {
    return "UnrealEngine-4.17";
  }
}

export class UnrealEngine418Generator extends UnrealEngineGenerator {
  get name(): string {
    return "UnrealEngine-4.18";
  }
}

export class UnrealEngine419Generator extends UnrealEngineGenerator {
  get name(): string {
    return "UnrealEngine-4.19";
  }
}