import * as swagger from 'swagger2';
import * as schema from 'swagger2/src/schema';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as fragments from './csharp/fragments';
import { TargetGenerator, GeneratorUtility } from './TargetGenerator';
import { TargetOptions } from "./TargetOptions";
import { IApiSpec, loadApi } from './common/apiSpec';
import { generateCSharpNamespace } from './csharp/namespace';
import { emitCommonErrorStructures } from './csharp/error';
import { resolveType } from './csharp/typing';
import { emitControllerAndImplementation } from './csharp/controllers';

abstract class CSharpGenerator implements TargetGenerator {
  abstract get name(): string;

  abstract getDefines(): string;

  private writeFileContent(opts: TargetOptions, filename: string, code: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.writeFile(path.join(opts.outputDir, filename), code, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve();
      });
    });
  }

  async generate(documents: {[id: string]: swagger.Document}, opts: TargetOptions): Promise<void> {
    const apis = new Set<IApiSpec>();

    for (const apiId in documents) {
      apis.add(loadApi(apiId, documents[apiId], generateCSharpNamespace));
    }
    
    const defines = fragments.getDefines(this.getDefines(), opts);

    let code = fragments.getCodePrefix(defines);
    code += fragments.namespaceBegin('HiveMP.Api');
    code += emitCommonErrorStructures(apis.values().next().value);
    code += fragments.namespaceEnd;
    for (const api of apis) {
      code += fragments.namespaceBegin(api.namespace);
      for (const definition of api.definitions.values()) {
        const csType = resolveType(definition);
        code += csType.emitStructureDefinition(definition);
      }

      for (const tag of api.tags.values()) {
        code += emitControllerAndImplementation(
          api,
          tag,
          opts);
      }
      code += fragments.namespaceEnd;
    }

    const httpClientClass = fragments.getHttpClientClass(defines);
    const hiveExceptionClass = fragments.getExceptionClass(defines);
    const hivePromiseClass = fragments.getPromiseClass(defines);
    const hiveSdkSetup = fragments.getSdkSetup(defines);

    await this.writeFileContent(opts, 'HiveMP.cs', code);
    await this.writeFileContent(opts, 'RetryableHttpClient.cs', httpClientClass);
    await this.writeFileContent(opts, 'HiveMPException.cs', hiveExceptionClass);
    await this.writeFileContent(opts, 'HiveMPPromise.cs', hivePromiseClass);
    await this.writeFileContent(opts, 'HiveMPSDKSetup.cs', hiveSdkSetup);

    if (opts.enableClientConnect) {
      // Copy Client Connect SDK binaries.
      const copyClientConnectPlatformBinaries = async (platform: string) => {
        await new Promise<void>((resolve, reject) => {
          fs.mkdirp(opts.outputDir + "/" + platform, (err) => {
            if (err) {
              reject(err);
            }
            let src = "deps/HiveMP.ClientConnect/" + platform;
            if (opts.clientConnectSdkPath != null) {
              src = opts.clientConnectSdkPath + "/" + platform;
            }
            fs.copy(src, opts.outputDir + "/" + platform, { overwrite: true }, (err) => {
              if (err) {
                reject(err);
              }
              resolve();
            });
          });
        });
      }
      await copyClientConnectPlatformBinaries("Win32");
      await copyClientConnectPlatformBinaries("Win64");
      await copyClientConnectPlatformBinaries("Mac64");
      await copyClientConnectPlatformBinaries("Linux32");
      await copyClientConnectPlatformBinaries("Linux64");
    }
  }
}

export class CSharp35Generator extends CSharpGenerator {
  get name(): string {
    return 'CSharp-3.5';
  }

  getDefines(): string {
    return '#define NET35';
  }
  
  async postGenerate(opts: TargetOptions): Promise<void> {
    fs.copySync(path.join(__dirname, "../sdks/CSharp-3.5/HiveMP.csproj"), path.join(opts.outputDir, "HiveMP.csproj"));
    fs.copySync(path.join(__dirname, "../sdks/CSharp-3.5/HiveMP.sln"), path.join(opts.outputDir, "HiveMP.sln"));
    fs.copySync(path.join(__dirname, "../sdks/CSharp-3.5/packages.config"), path.join(opts.outputDir, "packages.config"));
  }
}

export class CSharp45Generator extends CSharpGenerator {
  get name(): string {
    return 'CSharp-4.5';
  }
  
  getDefines(): string {
    return '';
  }
  
  async postGenerate(opts: TargetOptions): Promise<void> {
    fs.copySync(path.join(__dirname, "../sdks/CSharp-4.5/HiveMP.csproj"), path.join(opts.outputDir, "HiveMP.csproj"));
    fs.copySync(path.join(__dirname, "../sdks/CSharp-4.5/HiveMP.sln"), path.join(opts.outputDir, "HiveMP.sln"));
    fs.copySync(path.join(__dirname, "../sdks/CSharp-4.5/HiveMP.nuspec"), path.join(opts.outputDir, "HiveMP.nuspec"));
  }
}

export class UnityGenerator extends CSharpGenerator {
  get name(): string {
    return 'Unity';
  }
  
  getDefines(): string {
    return '';
  }
  
  async postGenerate(opts: TargetOptions): Promise<void> {
    // Copy Unity-specific dependencies out.
    await new Promise<void>((resolve, reject) => {
      fs.copy("sdks/Unity/", opts.outputDir, { overwrite: true }, (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });

    if (opts.enableClientConnect) {
      await new Promise<void>((resolve, reject) => {
        fs.copy("sdks/Unity-ClientConnect/", opts.outputDir, { overwrite: true }, (err) => {
          if (err) {
            reject(err);
          }
          resolve();
        });
      });
    }
  }
}
