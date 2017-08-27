import * as swagger from 'swagger2';
import * as schema from 'swagger2/src/schema';
import * as fs from 'fs';
import * as path from 'path';
import { TargetGenerator } from './TargetGenerator';

export class UnrealEngine416Generator implements TargetGenerator {
  get name(): string {
    return 'UnrealEngine-4.16';
  }

  static stripDefinition(s: string): string {
    if (s.startsWith('#/definitions/')) {
      return s.substr('#/definitions/'.length);
    }
    return s;
  }

  static getCPlusPlusTypeFromParameter(safeName: string, parameter: schema.Definition, useConst: boolean): string {
    const constName = useConst ? 'const ' : '';
    let parameterType = null;
    try {
      if (parameter.type != null) {
        switch (parameter.type as string|null) {
          case 'string':
            switch (parameter.format) {
              case 'byte':
                parameterType = 'TArray<uint8>';
                break;
              default:
                parameterType = 'FString';
                break;
            }
            break;
          case 'integer':
            switch (parameter.format) {
              case 'int32':
                parameterType = 'int32';
                break;
              case 'int64':
                // long is not supported in blueprints
                parameterType = 'int32';
                break;
            }
            break;
          case 'number':
            switch (parameter.format) {
              case 'float':
                parameterType = 'float';
                break;
              case 'double':
                // double not supported in blueprints
                parameterType = 'float';
                break;
            }
            break;
          case 'boolean':
            parameterType = 'bool';
            break;
          case 'object':
            parameterType = 'FString /* JSON STRING */';
            break;
          case 'array':
            parameterType = 
              'TArray<' + 
              UnrealEngine416Generator.getCPlusPlusTypeFromParameter(safeName, parameter.items, false) +
              '>';
            break;
        }
      } else if (parameter.schema != null) {
        if (parameter.schema.type == 'array') {
          parameterType = 
            'TArray<' + 
            UnrealEngine416Generator.getCPlusPlusTypeFromParameter(safeName, parameter.items, false) +
            '>';
        } else if (parameter.schema.$ref != null) {
          parameterType = constName + 'FHive' + safeName + '_' + UnrealEngine416Generator.stripDefinition(parameter.schema.$ref);
        } else {
          return UnrealEngine416Generator.getCPlusPlusTypeFromParameter(safeName, parameter.schema, useConst);
        }
      } else if (parameter.$ref != null) {
        parameterType = constName + 'FHive' + safeName + '_' + UnrealEngine416Generator.stripDefinition(parameter.$ref);
      }
    } catch (ex) {
      console.warn(ex);
      parameterType = 'int32 /* unknown */';
    }
    return parameterType;
  }

  static getDeserializerName(safeName: string, parameter: schema.Definition): string {
    try {
      if (parameter.type != null) {
        if (parameter.type == 'array') {
          return 'array:' + UnrealEngine416Generator.getDeserializerName(safeName, parameter.items);
        }
        return null;
      } else if (parameter.schema != null) {
        if (parameter.schema.type == 'array') {
          return 'array:' + UnrealEngine416Generator.getDeserializerName(safeName, parameter.schema.items);
        } else if (parameter.schema.$ref != null) {
          return 'DeserializeFHive' + safeName + '_' + UnrealEngine416Generator.stripDefinition(parameter.schema.$ref);
        } else {
          return UnrealEngine416Generator.getDeserializerName(safeName, parameter.schema);
        }
      } else if (parameter.$ref != null) {
        return 'DeserializeFHive' + safeName + '_' + UnrealEngine416Generator.stripDefinition(parameter.$ref);
      }
    } catch (ex) {
      console.warn(ex);
      return null;
    }
    return null;
  }

  async generate(documents: {[id: string]: swagger.Document}, outputDir: string): Promise<void> {
    let maps = {
      "admin-session": "Administrative Sessions",
      "attribute": "Attributes",
      "event": "Events",
      "game-server": "Game Servers",
      "integration": "Integrations",
      "lobby": "Game Lobbies",
      "nat-punchthrough": "NAT Punchthrough",
      "reporting": "Reporting",
      "revenue-share": "Revenue Share",
      "pos": "Point of Sale",
      "temp-session": "Temporary Sessions",
      "ugc-cache": "UGC Cache",
      "user-session": "User Sessions",
      "search": "Search",
    };

    let header = `
#pragma once

#include "CoreMinimal.h"
#include "UObject/ObjectMacros.h"
#include "Net/OnlineBlueprintCallProxyBase.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "DelegateCombinations.h"
#include "OnlineSubsystem.h"
#include "JsonReader.h"
#include "JsonSerializer.h"
#include "IHttpResponse.h"
#include "GenericPlatformHttp.h"
#include "Base64.h"
#include "HiveBlueprintLibrary.generated.h"

#define UE_LOG_HIVE(Verbosity, Format, ...) \
{ \
	UE_LOG(LogOnline, Verbosity, TEXT("%s%s"), TEXT("HiveMP: "), *FString::Printf(Format, ##__VA_ARGS__)); \
}

USTRUCT(BlueprintType)
struct FHiveApiError
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly)
	int32 HttpStatusCode;

	UPROPERTY(BlueprintReadOnly)
	int32 ErrorCode;

	UPROPERTY(BlueprintReadOnly)
	FString Message;

	UPROPERTY(BlueprintReadOnly)
	FString Parameter;
};

`;
    let code = `
#pragma once

#include "HiveBlueprintLibrary.h"

`;
    for (let key in documents) {
      let api = documents[key];
      let safeName = key.replace('-', '_');

      for (let defName in api.definitions) {
        let defValue = api.definitions[defName];
        if (defName == 'HiveSystemError') {
          continue;
        }

        code += `
struct FHive${safeName}_${defName} DeserializeFHive${safeName}_${defName}(const TSharedPtr<FJsonObject> obj)
{
  struct FHive${safeName}_${defName} Target;

`;
        for (let propName in defValue.properties) {
          let propValue = defValue.properties[propName] as schema.Parameter;
          let propType = UnrealEngine416Generator.getCPlusPlusTypeFromParameter(safeName, propValue, false);
          if (propType != null) {
            if (propType == 'TArray<uint8>') {
              code += `
  FString F_${propName};
  if (obj->TryGetStringField(TEXT("${propName}"), F_${propName}))
  {
    FBase64::Decode(F_${propName}, Target.${propName});
  }
`;
            } else if (propType.startsWith('TArray<')) {
              code += `
  const TArray<TSharedPtr<FJsonValue>>* F_${propName};
  if (obj->TryGetArrayField(TEXT("${propName}"), F_${propName}))
  {
    for (int i = 0; i < F_${propName}->Num(); i++)
    {
`;
              let subsetPropType = propType.substr('TArray<'.length);
              subsetPropType = subsetPropType.substr(0, subsetPropType.length - 1);
              if (subsetPropType.startsWith('FString')) {
                code += `
      FString A_${propName};
      if ((*F_${propName})[i]->TryGetString(A_${propName}))
      {
        Target.${propName}.Add(A_${propName});
      }
`;
              } else if (subsetPropType.startsWith('FHive')) {
                let deserializerName = UnrealEngine416Generator.getDeserializerName(safeName, propValue).substr('array:'.length);
                if (deserializerName != null) {
                  code += `
      const TSharedPtr<FJsonObject>* A_${propName};
      if ((*F_${propName})[i]->TryGetObject(A_${propName}))
      {
        Target.${propName}.Add(${deserializerName}(*A_${propName}));
      }
`;
                }
              } else if (subsetPropType == 'int32' || subsetPropType == 'int64' || subsetPropType == 'float' || subsetPropType == 'double') {
                code += `
      double A_${propName};
      if ((*F_${propName})[i]->TryGetNumber(A_${propName}))
      {
        Target.${propName}.Add((${subsetPropType})A_${propName});
      }
`;
              } else if (subsetPropType == 'bool') {
                code += `
      bool A_${propName};
      if ((*F_${propName})[i]->TryGetBool(A_${propName}))
      {
        Target.${propName}.Add(A_${propName});
      }
`;
              } else {
                code += `
      // Don't know how to handle '${subsetPropType||''}'
`;
              }
              code += `
    }
  }
`;
            }
          }
        }
        code += `
}
`;
      }
    }

    await new Promise((resolve, reject) => {
      fs.writeFile(path.join(outputDir, 'HiveBlueprintLibraryImpl.cpp'), code, (err) => {
        if (err) {
          reject(err);
          return;
        }
        fs.writeFile(path.join(outputDir, 'HiveBlueprintLibrary.h'), header, (err) => {
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