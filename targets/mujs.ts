import * as swagger from 'swagger2';
import * as schema from 'swagger2/src/schema';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as xmlescape from 'xml-escape';
import { TargetGenerator, GeneratorUtility } from './TargetGenerator';
import { TargetOptions } from "./TargetOptions";

export class MuJsTypeScriptGenerator implements TargetGenerator {
  get name(): string {
    return 'MuJS-TypeScript';
  }

  static stripDefinition(s: string): string {
    if (s.startsWith('#/definitions/')) {
      return s.substr('#/definitions/'.length).replace(/(\[|\])/g, '');
    }
    return s.replace(/(\[|\])/g, '');
  }

  static getTypeScriptTypeFromDefinition(namespace: string, nameHint: string, definition: schema.Definition, useConst: boolean, useConstIn?: boolean, isResponse?: boolean): string {
    const constName = useConst ? 'const ' : '';
    const arrayConstName = useConstIn ? 'const ': '';
    const arrayConstSuffix = useConstIn ? '&' : '';
    const nullableSuffix = (definition.required || isResponse) ? '' : ' | null';
    let type = null;
    try {
      if (definition.type != null) {
        switch (definition.type as string|null) {
          case 'string':
            switch (definition.format) {
              case 'byte':
                type = 'Buffer';
                break;
              default:
                type = 'string';
                break;
            }
            break;
          case 'integer':
            if (nameHint.endsWith('Utc')) {
              type = 'moment.Moment';
            } else {
              switch (definition.format) {
                case 'int32':
                  type = 'number' + nullableSuffix;
                  break;
                case 'int64':
                  type = 'number' + nullableSuffix;
                  break;
              }
            }
            break;
          case 'number':
            switch (definition.format) {
              case 'float':
                type = 'number' + nullableSuffix;
                break;
              case 'double':
                type = 'number' + nullableSuffix;
                break;
            }
            break;
          case 'boolean':
            type = 'boolean' + nullableSuffix;
            break;
          case 'object':
            if ((definition as any).additionalProperties != null) {
              // This is a dictionary.
              type = '{ [key: string]: ' + MuJsTypeScriptGenerator.getTypeScriptTypeFromDefinition(namespace, nameHint, (definition as any).additionalProperties, false, useConstIn) + ' }';
            } else {
              type = 'any';
            }
            break;
          case 'array':
            type = 
            MuJsTypeScriptGenerator.getTypeScriptTypeFromDefinition(namespace, nameHint, definition.items, false, useConstIn, isResponse) +
              '[]';
            break;
        }
      } else if (definition.schema != null) {
        if (definition.schema.type == 'array') {
          type = 
            MuJsTypeScriptGenerator.getTypeScriptTypeFromDefinition(namespace, nameHint, definition.schema.items, false, useConstIn, isResponse) +
            '[]';
        } else if (definition.schema.$ref != null) {
          type = namespace + '.' + MuJsTypeScriptGenerator.stripDefinition(definition.schema.$ref);
        } else {
          return MuJsTypeScriptGenerator.getTypeScriptTypeFromDefinition(namespace, nameHint, definition.schema, useConst, useConstIn, isResponse);
        }
      } else if (definition.$ref != null) {
        type = namespace + '.' + MuJsTypeScriptGenerator.stripDefinition(definition.$ref);
      }
    } catch (ex) {
      console.warn(ex);
      type = 'any' + nullableSuffix + ' /* unknown */';
    }
    if (type != null && type.endsWith(".HiveMPSystemError")) {
      // Temporary workaround until we can use the common TypeScript infrastructure.
      type = "HiveMPSystemError";
    }
    return type;
  }

  static getParametersFromMethodParameter(namespace: string, parameters: any): string {
    let parametersArr = [];
    if (parameters != null) {
      for (let parameter of parameters) {
        let name = parameter.name;
        if (name == "cancellationToken") {
          name = "_cancellationToken";
        }
        parametersArr.push(
          MuJsTypeScriptGenerator.getTypeScriptTypeFromDefinition(namespace, name, parameter, false) +
          " @" + 
          name
        );
      }
    }
    return parametersArr.join(", ");
  }

  static getArgumentsFromMethodParameter(namespace: string, parameters: any): string {
    let argumentsArr = [];
    if (parameters != null) {
      for (let parameter of parameters) {
        let name = parameter.name;
        if (name == "cancellationToken") {
          name = "_cancellationToken";
        }
        argumentsArr.push(
          name
        );
      }
    }
    return argumentsArr.join(", ");
  }

  static applyCommentLines(s: string, i: string): string {
    if (s == null) {
      return "";
    }
    return xmlescape(s).replace(/(?:\r\n|\r|\n)/g, "\n" + i);
  }

  async generate(documents: {[id: string]: swagger.Document}, opts: TargetOptions): Promise<void> {
    let code = `
/**
 * Generated with the HiveMP SDK Generator
 */

import * as curl from '../curl';
import { Buffer } from '../buffer';
import * as moment from 'moment';
import * as qs from 'query-string';

export namespace HiveMP {
  export class HiveMPError {
    public constructor(response: curl.Response) {
      let error: HiveMPSystemError | null = null;
      let message = 'An unknown error occurred while retrieving data from the HiveMP API';
      let responseTextIsValid = false
      try {
        error = JSON.parse(response.responseText) as HiveMPSystemError;
        message = error.message;
        responseTextIsValid = true;
      } catch (e) {
        message = response.responseText;
      }

      this.httpStatusCode = response.statusCode;
      this.error = error;
      this.originalResponse = response;
      this.responseTextIsValid = responseTextIsValid;
    }

    public httpStatusCode: number;
    public error: HiveMPSystemError | null;
    public originalResponse: curl.Response;
    public responseTextIsValid: boolean;
  }

  export interface HiveMPSystemError {
    code: number;
    message: string;
    fields: string | null;
    data: HiveMPSystemErrorData;
  }

  export interface HiveMPSystemErrorData {
    internalExceptionMessage?: string;
    internalExceptionStackTrace?: string;
    unauthorizedAdditionalInfo?: string;
    queryFailureMessage?: string;
    objectType?: string;
    objectContext?: string;
    invalidIdentifier?: string;
    parameterName?: string;
    parameterInvalidReason?: string;
    objectNotEditableReason?: string;
    invalidConfigurationReason?: string;
    amount?: number;
    amountFractionalDivisor?: number;
    queryFailureCode?: number;
    invalidSessionId?: string;
    expectedSessionType?: string;
    parameterIsMissing?: boolean;
    invalidIdentifierReason?: string;
    invalidIdentifierExpectedType?: string;
    internalSentryErrorId?: string;
    queryFailureErrors?: HiveMPSystemQueryError[];
  }

  export interface HiveMPSystemQueryError {
    domain: string;
    location: string;
    locationType: string;
    message: string;
    reason: string;
  }

  export interface RequestOptions {
    apiKey: string;
    baseUrl: string;
  }

`;

    for (let apiId in documents) {
      let api = documents[apiId];
      let csharpName = api.info["x-sdk-csharp-package-name"];
      let namespace = csharpName.substr("HiveMP.".length);

      let isFirstEntryInNamespace = true;

      code += `  export namespace ${namespace} {
`;

      let tags = {};
      for (let pathName in api.paths) {
        for (let methodName in api.paths[pathName]) {
          let tag = api.paths[pathName][methodName].tags[0];
          if (tags[tag] == undefined) {
            tags[tag] = [];
          }
          tags[tag].push({
            pathName: pathName,
            methodName: methodName
          });
        }
      }

      let orderedDefinitionNames = Object.keys(api.definitions);
      orderedDefinitionNames.sort();

      for (let definitionName of orderedDefinitionNames) {
        if (GeneratorUtility.isCommonDefinitionName(definitionName)) {
          continue;
        }

        if (isFirstEntryInNamespace) {
          isFirstEntryInNamespace = false;
        } else {
          code += `
`;        
        }

        const className = definitionName.replace(/(\[|\])/g, '');
        code += `    export interface ${className} {
`;
        for (let propertyName in api.definitions[definitionName].properties) {
          let propertyValue = api.definitions[definitionName].properties[propertyName];
          let propertyType = MuJsTypeScriptGenerator.getTypeScriptTypeFromDefinition(namespace, propertyName, propertyValue, false);
          code += `      ${propertyName}: ${propertyType};
`;
        }
        code += `    }
`;
      }

      for (let tag in tags) {
        if (isFirstEntryInNamespace) {
          isFirstEntryInNamespace = false;
        } else {
          code += `
`;
        }

        code += `    export namespace ${tag}Client {
`;

        let isFirstEntryInClient = true;

        for (let el of tags[tag]) {
          let methodValue = api.paths[el.pathName][el.methodName];
          if (GeneratorUtility.isClusterOnlyMethod(methodValue) && !opts.includeClusterOnly) {
            continue;
          }
          let methodName = methodValue.operationId;
          let requestInterfaceName = methodValue.operationId[0].toUpperCase() + methodValue.operationId.substr(1);
          let returnValue = 'Promise<void>';
          if (methodValue.responses != null && methodValue.responses["200"] != null) {
            returnValue = MuJsTypeScriptGenerator.getTypeScriptTypeFromDefinition(namespace, '', methodValue.responses["200"], false, false, true);
            if (returnValue == null) {
              returnValue = 'Promise<void>';
            } else {
              returnValue = 'Promise<' + returnValue + '>';
            }
          }

          if (isFirstEntryInClient) {
            isFirstEntryInClient = false;
          } else {
            code += `
`;
          }

          code += `      export interface ${requestInterfaceName}Request {
`;        
          if (methodValue.parameters != null) {
            for (let parameter of methodValue.parameters) {
              let parameterType = MuJsTypeScriptGenerator.getTypeScriptTypeFromDefinition(namespace, parameter.name, parameter, false);
              code += `        ${parameter.name}: ${parameterType};
`;
            }
          }
          code += `      }

      export async function ${methodName}(options: RequestOptions, request: ${requestInterfaceName}Request): ${returnValue} {
        let apiKey = options.apiKey || '';
        let baseUrl = options.baseUrl || 'https://${api.host}${api.basePath}';

        let queryParameters: { [name: string]: string } = {};
        let body: string = '';
`;
          if (methodValue.parameters != null) {
            for (let parameter of methodValue.parameters) {
              let parameterType = MuJsTypeScriptGenerator.getTypeScriptTypeFromDefinition(namespace, parameter.name, parameter, false);
              if (parameter.in == "body") {
                code += `
        body = JSON.stringify(request.${parameter.name});
`;
              } else {
                let valueAccess = `request.${parameter.name}.toString()`;
                if (parameter.type === 'string' && parameter.format === 'byte') {
                  valueAccess = `request.${parameter.name}.toBase64String()`;
                }
                valueAccess = `encodeURIComponent(${valueAccess})`;
                if (parameter.required) {
                  code += `        queryParameters['${parameter.name}'] = ${valueAccess};
`;
                } else {
                  code += `        if (request.${parameter.name} !== null && request.${parameter.name} !== undefined) {
          queryParameters['${parameter.name}'] = ${valueAccess};
        }
`;              
                }
              }
            }
          }

          code += `
        let response = await curl.fetch({
          url: baseUrl + '${el.pathName}?' + qs.stringify(queryParameters),
          method: "${el.methodName.toUpperCase()}",
          body: body,
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
            'Content-Length': body.length.toString(),
          }
        });

        if (response.statusCode == 200) {
          return JSON.parse(response.responseText);
        } else {
          throw new HiveMPError(response);
        }
      }
`;
        }

        code += `    }
`;
      }

      code += `  }

`;
    }

    code += `}
`;

    await new Promise((resolve, reject) => {
      console.log('writing to ' + path.join(opts.outputDir, 'index.ts'));
      fs.writeFile(path.join(opts.outputDir, 'index.ts'), code, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

