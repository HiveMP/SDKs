import * as swagger from 'swagger2';
import * as schema from 'swagger2/src/schema';
import * as fs from 'fs-extra';
import * as path from 'path';
import { TargetGenerator } from './TargetGenerator';
import { TargetOptions } from "./TargetOptions";

export abstract class UnrealEngineGenerator implements TargetGenerator {
  abstract get name(): string;

  static stripDefinition(s: string): string {
    if (s.startsWith('#/definitions/')) {
      return s.substr('#/definitions/'.length).replace(/(\[|\])/g, '');
    }
    return s.replace(/(\[|\])/g, '');
  }

  static normalizeTypeName(s: string): string {
    return s.replace(/(\[|\])/g, '');
  }

  static avoidConflictingCPlusPlusNames(s: string): string {
    if (s == 'template') {
      return 'template_';
    }
    return s;
  }

  static getCPlusPlusTypeFromParameter(safeName: string, parameter: schema.Definition, useConst: boolean, useConstIn?: boolean): string {
    const constName = useConst ? 'const ' : '';
    const arrayConstName = useConstIn ? 'const ': '';
    const arrayConstSuffix = useConstIn ? '&' : '';
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
              arrayConstName + 
              'TArray<' + 
              UnrealEngineGenerator.getCPlusPlusTypeFromParameter(safeName, parameter.items, false, useConstIn) +
              '>' +
              arrayConstSuffix;
            break;
        }
      } else if (parameter.schema != null) {
        if (parameter.schema.type == 'array') {
          parameterType = 
            arrayConstName + 
            'TArray<' + 
            UnrealEngineGenerator.getCPlusPlusTypeFromParameter(safeName, parameter.schema.items, false, useConstIn) +
            '>' +
            arrayConstSuffix;
        } else if (parameter.schema.$ref != null) {
          parameterType = constName + 'FHive' + safeName + '_' + UnrealEngineGenerator.stripDefinition(parameter.schema.$ref);
        } else {
          return UnrealEngineGenerator.getCPlusPlusTypeFromParameter(safeName, parameter.schema, useConst, useConstIn);
        }
      } else if (parameter.$ref != null) {
        parameterType = constName + 'FHive' + safeName + '_' + UnrealEngineGenerator.stripDefinition(parameter.$ref);
      }
    } catch (ex) {
      console.warn(ex);
      parameterType = 'int32 /* unknown */';
    }
    return parameterType;
  }

  static getReferencedDefinitionName(safeName: string, parameter: schema.Definition) {
    try {
      if (parameter.type != null) {
        if (parameter.type == 'array') {
          return UnrealEngineGenerator.getReferencedDefinitionName(safeName, parameter.items);
        }
        return null;
      } else if (parameter.schema != null) {
        if (parameter.schema.type == 'array') {
          return UnrealEngineGenerator.getReferencedDefinitionName(safeName, parameter.schema.items);
        } else if (parameter.schema.$ref != null) {
          return UnrealEngineGenerator.stripDefinition(parameter.schema.$ref);
        } else {
          return UnrealEngineGenerator.getReferencedDefinitionName(safeName, parameter.schema);
        }
      } else if (parameter.$ref != null) {
        return UnrealEngineGenerator.stripDefinition(parameter.$ref);
      }
    } catch (ex) {
      console.error(ex);
      return null;
    }
    return null;
  }

  static getDeserializerName(safeName: string, parameter: schema.Definition): string {
    try {
      if (parameter.type != null) {
        if (parameter.type == 'array') {
          return 'array:' + UnrealEngineGenerator.getDeserializerName(safeName, parameter.items);
        }
        return null;
      } else if (parameter.schema != null) {
        if (parameter.schema.type == 'array') {
          return 'array:' + UnrealEngineGenerator.getDeserializerName(safeName, parameter.schema.items);
        } else if (parameter.schema.$ref != null) {
          return 'DeserializeFHive' + safeName + '_' + UnrealEngineGenerator.stripDefinition(parameter.schema.$ref);
        } else {
          return UnrealEngineGenerator.getDeserializerName(safeName, parameter.schema);
        }
      } else if (parameter.$ref != null) {
        return 'DeserializeFHive' + safeName + '_' + UnrealEngineGenerator.stripDefinition(parameter.$ref);
      }
    } catch (ex) {
      console.warn(ex);
      return null;
    }
    return null;
  }

  async generate(documents: {[id: string]: swagger.Document}, opts: TargetOptions): Promise<void> {
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
#include "HttpModule.h"
#include "GenericPlatformHttp.h"
#include "Base64.h"
#include "HiveMPBlueprintLibrary.generated.h"

#define UE_LOG_HIVE(Verbosity, Format, ...) \\
{ \\
  UE_LOG(LogOnline, Verbosity, TEXT("%s%s"), TEXT("HiveMP: "), *FString::Printf(Format, ##__VA_ARGS__)); \\
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
    for (let key in documents) {
      let api = documents[key];
      let safeName = key.replace('-', '_');

      let emittedDefinitions = [];
      let emitDefinition = (defName: string) => {
        if (emittedDefinitions.indexOf(defName) != -1) {
          return;
        }

        if (defName == 'HiveSystemError') {
          return;
        }

        let defValue = api.definitions[defName];

        for (let propName in defValue.properties) {
          let propValue = defValue.properties[propName];
          let refDefName = UnrealEngineGenerator.getReferencedDefinitionName(safeName, propValue);
          if (refDefName != null) {
            for (let defName2 in api.definitions) {
              if (defName2 == refDefName) {
                emitDefinition(defName2);
              }
            }
          }
        }

        emittedDefinitions.push(defName);

        header += `
USTRUCT(BlueprintType, meta=(DisplayName="HiveMP ${maps[key]} ${defName}"))
struct FHive${safeName}_${UnrealEngineGenerator.normalizeTypeName(defName)}
{
	GENERATED_BODY()

`;
        for (let propName in defValue.properties) {
          let propValue = defValue.properties[propName];
          let propType = UnrealEngineGenerator.getCPlusPlusTypeFromParameter(safeName, propValue, false, false);
          if (propType != null) {
            header += `
  UPROPERTY(BlueprintReadOnly)
  ${propType} ${UnrealEngineGenerator.avoidConflictingCPlusPlusNames(propName)};
`;
          }
        }

        header += `
};
`;
      };

      for (let defName in api.definitions) {
        let defValue = api.definitions[defName];
        if (defName == 'HiveSystemError') {
          continue;
        }

        emitDefinition(defName);

        header += `
struct FHive${safeName}_${UnrealEngineGenerator.normalizeTypeName(defName)} DeserializeFHive${safeName}_${UnrealEngineGenerator.normalizeTypeName(defName)}(TSharedPtr<FJsonObject> obj);
`;
      }

      for (let pathName in api.paths) {
        let pathValue = api.paths[pathName];
        for (let methodName in pathValue) {
          let methodValue = pathValue[methodName];
          try {
            let operationId = methodValue.operationId || "";
            let tag = methodValue.tags[0];
            let summary = methodValue.summary || "";
            let description = methodValue.description || "";
            let displayName = summary.replace(/(?:\r\n|\r|\n)/g, " ").replace(/\\/g, "\\\\").replace(/\"/g, "\\\"");
            if (displayName.indexOf(".") != -1) {
              displayName = displayName.substr(0, displayName.indexOf("."));
            }
            if (displayName.indexOf("  ") != -1) {
              displayName = displayName.substr(0, displayName.indexOf("  "));
            }
            let descriptionLimited = description.length > 1000 ? (description.substr(0, 1000) + "...") : description;
            let toolTip = descriptionLimited.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"").replace(/(?:\r\n|\r|\n)/g, '\\n');
            
            let implName = safeName + "_" + tag + "_" + operationId;

            try {
              if (methodValue.responses != null && methodValue.responses["200"] != null) {
                let parameterType = UnrealEngineGenerator.getCPlusPlusTypeFromParameter(safeName, methodValue.responses["200"], true, true);
                if (parameterType == null) {
                  header += `
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(F${implName}_Delegate, const FHiveApiError&, Error);
`;
                } else {
                  header += `
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(F${implName}_Delegate, ${parameterType}, Result, const FHiveApiError&, Error);
`;
                }
              } else {
                header += `
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(F${implName}_Delegate, const FHiveApiError&, Error);
`;
              }
            } catch (ex) {
              console.error("during callback generation:");
              console.error(ex);
              header += `
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(F${implName}_Delegate, const FHiveApiError&, Error);
`;
            }

            header += `
UCLASS(MinimalAPI)
class U${implName} : public UOnlineBlueprintCallProxyBase
{
	GENERATED_UCLASS_BODY()

	UPROPERTY(BlueprintAssignable)
	F${implName}_Delegate OnSuccess;

	UPROPERTY(BlueprintAssignable)
	F${implName}_Delegate OnFailure;

	UFUNCTION(BlueprintCallable, meta=(BlueprintInternalUseOnly = "true", WorldContext="WorldContextObject", DisplayName="${displayName}", ToolTip="${toolTip}"), Category="HiveMP|${maps[key]}")
	static U${implName}* PerformHiveCall(
		UObject* WorldContextObject,
    FString ApiKey
`;
            if (methodValue.parameters != null) {
              for (let parameter of methodValue.parameters) {
                let cppType = UnrealEngineGenerator.getCPlusPlusTypeFromParameter(safeName, parameter, true, false);
                header += `
    , ${cppType} ${UnrealEngineGenerator.avoidConflictingCPlusPlusNames(parameter.name)}
`;
              }
            }
            header += `
  );

	// UOnlineBlueprintCallProxyBase interface
	virtual void Activate() override;
	// End of UOnlineBlueprintCallProxyBase interface

private:
	// The world context object in which this call is taking place
	UObject* WorldContextObject;

  FString ApiKey;

`;
            if (methodValue.parameters != null) {
              for (let parameter of methodValue.parameters) {
                let cppType = UnrealEngineGenerator.getCPlusPlusTypeFromParameter(safeName, parameter, false, false);
                header += `
  ${cppType} Field_${parameter.name};
`;
              }
            }
            header += `
};

`;
          } catch (ex) {
            console.error("during header generation:");
            console.error(ex);
          }
        }
      }
    }

    let code = `
#pragma once

#include "HiveMPBlueprintLibrary.h"
#include "cchost/connect.impl.h"
#include "cchost/module/hotpatching/module.h"

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
struct FHive${safeName}_${UnrealEngineGenerator.normalizeTypeName(defName)} DeserializeFHive${safeName}_${UnrealEngineGenerator.normalizeTypeName(defName)}(const TSharedPtr<FJsonObject> obj)
{
  struct FHive${safeName}_${UnrealEngineGenerator.normalizeTypeName(defName)} Target;

`;
        for (let propName in defValue.properties) {
          let propValue = defValue.properties[propName] as schema.Parameter;
          let propType = UnrealEngineGenerator.getCPlusPlusTypeFromParameter(safeName, propValue, false);
          if (propType != null) {
            if (propType == 'TArray<uint8>') {
              code += `
  FString F_${propName};
  if (obj->TryGetStringField(TEXT("${propName}"), F_${propName}))
  {
    FBase64::Decode(F_${propName}, Target.${UnrealEngineGenerator.avoidConflictingCPlusPlusNames(propName)});
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
        Target.${UnrealEngineGenerator.avoidConflictingCPlusPlusNames(propName)}.Add(A_${propName});
      }
`;
              } else if (subsetPropType.startsWith('FHive')) {
                let deserializerName = UnrealEngineGenerator.getDeserializerName(safeName, propValue).substr('array:'.length);
                if (deserializerName != null) {
                  code += `
      const TSharedPtr<FJsonObject>* A_${propName};
      if ((*F_${propName})[i]->TryGetObject(A_${propName}))
      {
        Target.${UnrealEngineGenerator.avoidConflictingCPlusPlusNames(propName)}.Add(${deserializerName}(*A_${propName}));
      }
`;
                }
              } else if (subsetPropType == 'int32' || subsetPropType == 'int64' || subsetPropType == 'float' || subsetPropType == 'double') {
                code += `
      double A_${propName};
      if ((*F_${propName})[i]->TryGetNumber(A_${propName}))
      {
        Target.${UnrealEngineGenerator.avoidConflictingCPlusPlusNames(propName)}.Add((${subsetPropType})A_${propName});
      }
`;
              } else if (subsetPropType == 'bool') {
                code += `
      bool A_${propName};
      if ((*F_${propName})[i]->TryGetBool(A_${propName}))
      {
        Target.${UnrealEngineGenerator.avoidConflictingCPlusPlusNames(propName)}.Add(A_${propName});
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
            } else if (propType.startsWith('FString')) {
              code += `
  FString F_${propName};
  if (obj->TryGetStringField(TEXT("${propName}"), F_${propName}))
  {
    Target.${UnrealEngineGenerator.avoidConflictingCPlusPlusNames(propName)} = F_${propName};
  }
`;
            } else if (propType.startsWith('FHive')) {
              let deserializerName = UnrealEngineGenerator.getDeserializerName(safeName, propValue);
              if (deserializerName != null) {
                code += `
  const TSharedPtr<FJsonObject>* F_${propName};
  if (obj->TryGetObjectField(TEXT("${propName}"), F_${propName}))
  {
    Target.${UnrealEngineGenerator.avoidConflictingCPlusPlusNames(propName)} = ${deserializerName}(*F_${propName});
  }
`;
              }
            } else if (propType == 'int32' || propType == 'int64' || propType == 'float' || propType == 'double') {
              code += `
  double F_${propName};
  if (obj->TryGetNumberField(TEXT("${propName}"), F_${propName}))
  {
    Target.${UnrealEngineGenerator.avoidConflictingCPlusPlusNames(propName)} = (${propType})F_${propName};
  }
`;
            } else if (propType == 'bool') {
              code += `
  bool F_${propName};
  if (obj->TryGetBoolField(TEXT("${propName}"), F_${propName}))
  {
    Target.${UnrealEngineGenerator.avoidConflictingCPlusPlusNames(propName)} = (${propType})F_${propName};
  }
`;
            } else {
              code += `
    // Don't know how to handle '${propType||''}'
`;
            }
          }
        }
        code += `
  return Target;
}
`;
      }

      for (let pathName in api.paths) {
        let pathValue = api.paths[pathName];
        for (let methodName in pathValue) {
          try {
            let methodValue = pathValue[methodName];
            let operationId = methodValue.operationId || "";
            let tag = methodValue.tags[0];
            let implName = safeName + "_" + tag + "_" + operationId;

            let onlyError = false;
            let resultType = "";
            let deserializerName = "";
            try {
              if (methodValue.responses != null && methodValue.responses["200"] != null) {
                let parameterType = UnrealEngineGenerator.getCPlusPlusTypeFromParameter(safeName, methodValue.responses["200"], false);
                if (parameterType == null) {
                  onlyError = true;
                } else {
                  onlyError = false;
                  resultType = parameterType;
                  deserializerName = UnrealEngineGenerator.getDeserializerName(safeName, methodValue.responses["200"]);
                }
              } else {
                onlyError = true;
              }
            } catch (ex) {
              console.warn(ex);
              onlyError = true;
            }
            
            let defaultInitializer = "";
            if (resultType.startsWith("FString")) {
              defaultInitializer = 'TEXT("")';
            } else if (resultType.indexOf("FHive") != -1) {
              defaultInitializer = resultType + "()";
            } else {
              defaultInitializer = "0";
            }

            code += `

U${implName}::U${implName}(const FObjectInitializer& ObjectInitializer) : Super(ObjectInitializer), WorldContextObject(nullptr) { }

U${implName}* U${implName}::PerformHiveCall(
  UObject* WorldContextObject,
  FString ApiKey
`;
            if (methodValue.parameters != null) {
              for (let parameter of methodValue.parameters) {
                let cppType = UnrealEngineGenerator.getCPlusPlusTypeFromParameter(safeName, parameter, true);
                code += `
  , ${cppType} ${UnrealEngineGenerator.avoidConflictingCPlusPlusNames(parameter.name)}
`;
              }
            }
            
            code += `
)
{
  U${implName}* Proxy = NewObject<U${implName}>();
  
  Proxy->WorldContextObject = WorldContextObject;
  Proxy->ApiKey = ApiKey;
`;

            if (methodValue.parameters != null) {
              for (let parameter of methodValue.parameters) {
                let cppType = UnrealEngineGenerator.getCPlusPlusTypeFromParameter(safeName, parameter, true);
                if (cppType.indexOf("TArray") != -1) {
                  code += `
  Proxy->Field_${parameter.name} = ${cppType}(${UnrealEngineGenerator.avoidConflictingCPlusPlusNames(parameter.name)});
`;
                } else {
                  code += `
  Proxy->Field_${parameter.name} = ${UnrealEngineGenerator.avoidConflictingCPlusPlusNames(parameter.name)};
`;
                }
              }
            }

            code += `
  return Proxy;
}

void U${implName}::Activate()
{
  UE_LOG_HIVE(Display, TEXT("[start] ${key} ${pathName} ${methodName}"));

`;
            let queryStringPlacements = [];
            if (methodValue.parameters != null) {
              for (let parameter of methodValue.parameters) {
                try {
                  if (parameter.in == 'query') {
                    let cppType = UnrealEngineGenerator.getCPlusPlusTypeFromParameter(safeName, parameter, true);
                    if (cppType != null) {
                      if (cppType.startsWith("FString")) {
                        queryStringPlacements.push(parameter.name + "=%s");
                      } else if (cppType == 'int32') {
                        queryStringPlacements.push(parameter.name + "=%i");
                      } else if (cppType == 'float') {
                        queryStringPlacements.push(parameter.name + "=%f");
                      } else if (cppType == 'bool') {
                        // Converted to "true" and "false" below.
                        queryStringPlacements.push(parameter.name + "=%s");
                      } else {
                        // Unknown
                        queryStringPlacements.push(parameter.name + "=%s");
                      }
                    } else {
                      // Unknown
                      queryStringPlacements.push(parameter.name + "=%s");
                    }
                  }
                } catch (ex) {
                  console.error("error during query string building:");
                  console.error(ex);
                }
              }
            }
            
            code += `
  TSharedRef<IHttpRequest> HttpRequest = FHttpModule::Get().CreateRequest();
  HttpRequest->SetURL(FString::Printf(
    TEXT("https://${key}-api.hivemp.com${api.basePath}${pathName}?${queryStringPlacements.join('&')}")
`;

            if (methodValue.parameters != null) {
              for (let parameter of methodValue.parameters) {
                try {
                  if (parameter.in == 'query') {
                    let cppType = UnrealEngineGenerator.getCPlusPlusTypeFromParameter(safeName, parameter, true);
                    if (parameter.type === 'string' && parameter.format === 'byte') {
                      // parameter needs base64 encoding
                      code += `
    , *FGenericPlatformHttp::UrlEncode(FBase64::Encode(this->Field_${parameter.name}))
`;
                    } else if (cppType == null) {
                      code += `
    , TEXT("")
`;
                    } else if (cppType.startsWith("FString")) {
                      code += `
    , *FGenericPlatformHttp::UrlEncode(this->Field_${parameter.name})
`;
                    } else if (cppType == "bool") {
                      code += `
    , *FGenericPlatformHttp::UrlEncode(this->Field_${parameter.name} ? TEXT("true") : TEXT("false"))
`;
                    } else {
                      code += `
    , this->Field_${parameter.name}
`;
                    }
                  }
                } catch (ex) {
                  console.error("error during query string parameter building:");
                  console.error(ex);
                }
              }
            }
            
            code += `
  ));
  HttpRequest->SetHeader(TEXT("api_key"), this->ApiKey);
  HttpRequest->SetVerb(TEXT("${methodName}"));
  HttpRequest->OnProcessRequestComplete().BindLambda([this](FHttpRequestPtr HttpRequest, FHttpResponsePtr HttpResponse, bool bSucceeded, TWeakObjectPtr<U${implName}> SelfRef)
  {
    if (!SelfRef.IsValid())
    {
      UE_LOG_HIVE(Error, TEXT("[fail] ${key} ${pathName} ${methodName}: Callback proxy is invalid (did the game shutdown?)"));
      return;
    }

    if (!HttpResponse.IsValid())
    {
      struct FHiveApiError ResultError;
      ResultError.HttpStatusCode = 0;
      ResultError.ErrorCode = 0;
      ResultError.Message = TEXT("HTTP response was not valid!");
      ResultError.Parameter = TEXT("");
      UE_LOG_HIVE(Error, TEXT("[fail] ${key} ${pathName} ${methodName}: %s"), *(ResultError.Message));
      OnFailure.Broadcast(${(!onlyError) ? (defaultInitializer + ', ') : ''}ResultError);
      return;
    }

    auto Response = HttpResponse.Get();

    UE_LOG_HIVE(Warning, TEXT("[info] ${key} ${pathName} ${methodName}: %s"), *(Response->GetContentAsString()));

`;

            if (resultType == 'bool') {
              code += `
    if (Response->GetContentAsString().Equals(TEXT("true")))
    {
      struct FHiveApiError ResultError;
      UE_LOG_HIVE(Warning, TEXT("[success] ${key} ${pathName} ${methodName}"));
      OnSuccess.Broadcast(true, ResultError);
      return;
    }
    else if (Response->GetContentAsString().Equals(TEXT("false")))
    {
      struct FHiveApiError ResultError;
      UE_LOG_HIVE(Warning, TEXT("[success] ${key} ${pathName} ${methodName}"));
      OnSuccess.Broadcast(false, ResultError);
      return;
    }
`;
            }

            code += `

    TSharedPtr<FJsonValue> JsonValue;
    TSharedRef<TJsonReader<TCHAR>> Reader = TJsonReaderFactory<>::Create(Response->GetContentAsString());
    if (!FJsonSerializer::Deserialize(Reader, JsonValue) || !JsonValue.IsValid())
    {
      struct FHiveApiError ResultError;
      ResultError.HttpStatusCode = Response->GetResponseCode();
      ResultError.ErrorCode = 0;
      ResultError.Message = TEXT("Unable to deserialize JSON response!");
      ResultError.Parameter = TEXT("");
      UE_LOG_HIVE(Error, TEXT("[fail] ${key} ${pathName} ${methodName}: %s"), *(ResultError.Message));
      OnFailure.Broadcast(${(!onlyError) ? (defaultInitializer + ', ') : ''}ResultError);
      return;
    }
    
    if (!bSucceeded || HttpResponse->GetResponseCode() != 200)
    {
      const TSharedPtr<FJsonObject>* JsonObject;
      if (JsonValue->TryGetObject(JsonObject))
      {
        // Parse as Hive system error.
        FString Message, Parameter;
        double ErrorCode;
        auto GotMessage = (*JsonObject)->TryGetStringField(TEXT("message"), Message);
        auto GotParameter = (*JsonObject)->TryGetStringField(TEXT("fields"), Parameter);
        auto GotErrorCode = (*JsonObject)->TryGetNumberField(TEXT("code"), ErrorCode);

        struct FHiveApiError ResultError;
        ResultError.HttpStatusCode = Response->GetResponseCode();
        if (GotErrorCode)
        {
          ResultError.ErrorCode = (int32)ErrorCode;
        }
        if (GotMessage)
        {
          ResultError.Message = Message;
        }
        if (GotParameter)
        {
          ResultError.Parameter = Parameter;
        }
        UE_LOG_HIVE(Error, TEXT("[fail] ${key} ${pathName} ${methodName}: %s"), *(ResultError.Message));
        OnFailure.Broadcast(${(!onlyError) ? (defaultInitializer + ', ') : ''}ResultError);
        return;
      }
      else
      {
        struct FHiveApiError ResultError;
        ResultError.HttpStatusCode = Response->GetResponseCode();
        ResultError.ErrorCode = 0;
        ResultError.Message = TEXT("Unable to deserialize JSON response as Hive system error!");
        ResultError.Parameter = TEXT("");
        UE_LOG_HIVE(Error, TEXT("[fail] ${key} ${pathName} ${methodName}: %s"), *(ResultError.Message));
        OnFailure.Broadcast(${(!onlyError) ? (defaultInitializer + ', ') : ''}ResultError);
        return;
      }
    }

    {
      struct FHiveApiError ResultError;
`;
            if (!onlyError) {
              if (deserializerName != null && deserializerName != '' && !deserializerName.startsWith('array:')) {
                code += `
			const TSharedPtr<FJsonObject>* JsonObject;
			if (JsonValue->TryGetObject(JsonObject))
			{
				auto Result = ${deserializerName}(*JsonObject);
				UE_LOG_HIVE(Warning, TEXT("[success] ${key} ${pathName} ${methodName}"));
				OnSuccess.Broadcast(Result, ResultError);
			}
			else
			{
				ResultError.HttpStatusCode = Response->GetResponseCode();
				ResultError.ErrorCode = 0;
				ResultError.Message = TEXT("Unable to deserialize JSON response as expected type!");
				ResultError.Parameter = TEXT("");
				UE_LOG_HIVE(Error, TEXT("[fail] ${key} ${pathName} ${methodName}: %s"), *(ResultError.Message));
				OnFailure.Broadcast(${(!onlyError) ? (defaultInitializer + ', ') : ''}ResultError);
				return;
      }
`;
              } else if (deserializerName != null && deserializerName != '' && deserializerName.startsWith('array:')) {
                let tDeserializerName = deserializerName.substr("array:".length);
                if (tDeserializerName != null) {
                  code += `
			const TArray<TSharedPtr<FJsonValue>>* JsonArray;
			if (JsonValue->TryGetArray(JsonArray))
			{
				${resultType} Result;
				for (int i = 0; i < JsonArray->Num(); i++)
				{
					const TSharedPtr<FJsonObject>* JsonArrayObj;
					if ((*JsonArray)[i]->TryGetObject(JsonArrayObj))
					{
						Result.Add(${tDeserializerName}(*JsonArrayObj));
					}

				}
				UE_LOG_HIVE(Warning, TEXT("[success] ${key} ${pathName} ${methodName}"));
				OnSuccess.Broadcast(Result, ResultError);
			}
			else
			{
				ResultError.HttpStatusCode = Response->GetResponseCode();
				ResultError.ErrorCode = 0;
				ResultError.Message = TEXT("Unable to deserialize JSON response as expected type!");
				ResultError.Parameter = TEXT("");
				UE_LOG_HIVE(Error, TEXT("[fail] ${key} ${pathName} ${methodName}: %s"), *(ResultError.Message));
				OnFailure.Broadcast(${(!onlyError) ? (defaultInitializer + ', ') : ''}ResultError);
				return;
      }
`;
                } else {
                  code += `
			ResultError.HttpStatusCode = Response->GetResponseCode();
			ResultError.ErrorCode = 0;
			ResultError.Message = TEXT("No supported deserializer for this response");
			ResultError.Parameter = TEXT("");
			UE_LOG_HIVE(Error, TEXT("[fail] ${key} ${pathName} ${methodName}: %s"), *(ResultError.Message));
			OnFailure.Broadcast(${(!onlyError) ? (defaultInitializer + ', ') : ''}ResultError);
      return;
`;
                }
              } else if (resultType == 'int32' || resultType == 'int64' || resultType == 'float' || resultType == 'double') {
                code += `
			double Result;
			if (JsonValue->TryGetNumber(Result))
			{
				UE_LOG_HIVE(Warning, TEXT("[success] ${key} ${pathName} ${methodName}"));
				OnSuccess.Broadcast(Result, ResultError);
			}
			else
			{
				ResultError.HttpStatusCode = Response->GetResponseCode();
				ResultError.ErrorCode = 0;
				ResultError.Message = TEXT("Unable to deserialize JSON response as expected type!");
				ResultError.Parameter = TEXT("");
				UE_LOG_HIVE(Error, TEXT("[fail] ${key} ${pathName} ${methodName}: %s"), *(ResultError.Message));
				OnFailure.Broadcast(${(!onlyError) ? (defaultInitializer + ', ') : ''}ResultError);
				return;
      }
`;
              } else if (resultType == 'bool') {
                // Pretty sure we should never hit this block at runtime due to the
                // boolean value checks prior to JSON decoding?
                code += `
			bool Result;
			if (JsonValue->TryGetBool(Result))
			{
				UE_LOG_HIVE(Warning, TEXT("[success] ${key} ${pathName} ${methodName}"));
				OnSuccess.Broadcast(Result, ResultError);
			}
			else
			{
				ResultError.HttpStatusCode = Response->GetResponseCode();
				ResultError.ErrorCode = 0;
				ResultError.Message = TEXT("Unable to deserialize JSON response as expected type!");
				ResultError.Parameter = TEXT("");
				UE_LOG_HIVE(Error, TEXT("[fail] ${key} ${pathName} ${methodName}: %s"), *(ResultError.Message));
				OnFailure.Broadcast(${(!onlyError) ? (defaultInitializer + ', ') : ''}ResultError);
				return;
      }
`;
              } else if (resultType.startsWith('FString')) {
                code += `
		  FString Result;
			if (JsonValue->TryGetString(Result))
			{
				UE_LOG_HIVE(Warning, TEXT("[success] ${key} ${pathName} ${methodName}"));
				OnSuccess.Broadcast(Result, ResultError);
			}
			else
			{
				ResultError.HttpStatusCode = Response->GetResponseCode();
				ResultError.ErrorCode = 0;
				ResultError.Message = TEXT("Unable to deserialize JSON response as expected type!");
				ResultError.Parameter = TEXT("");
				UE_LOG_HIVE(Error, TEXT("[fail] ${key} ${pathName} ${methodName}: %s"), *(ResultError.Message));
				OnFailure.Broadcast(${(!onlyError) ? (defaultInitializer + ', ') : ''}ResultError);
				return;
      }
`;
              } else {
                code += `
			ResultError.HttpStatusCode = Response->GetResponseCode();
			ResultError.ErrorCode = 0;
			ResultError.Message = TEXT("No supported deserializer for this response");
			ResultError.Parameter = TEXT("");
			UE_LOG_HIVE(Error, TEXT("[fail] ${key} ${pathName} ${methodName}: %s"), *(ResultError.Message));
			OnFailure.Broadcast(${(!onlyError) ? (defaultInitializer + ', ') : ''}ResultError);
      return;
`;
              }
            } else {
              code += `
			UE_LOG_HIVE(Warning, TEXT("[success] ${key} ${pathName} ${methodName}"));
      OnSuccess.Broadcast(ResultError);
`;
            }

            code += `
    }
  }, TWeakObjectPtr<U${implName}>(this));
  HttpRequest->ProcessRequest();
}
`;
          } catch (ex) {
            console.error("error during implementations:");
            console.error(ex);
          }
        }
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