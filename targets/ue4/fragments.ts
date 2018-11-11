import { IDefinitionSpec } from "../common/typeSpec";
import { IUnrealEngineType } from "./typing";

export const cppHeader = `
#pragma once

#include "CoreMinimal.h"
#include "UObject/ObjectMacros.h"
#include "Net/OnlineBlueprintCallProxyBase.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "Delegates/DelegateCombinations.h"
#include "OnlineSubsystem.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "IHttpResponse.h"
#include "HttpModule.h"
#include "GenericPlatformHttp.h"
#include "Misc/Base64.h"
#include "HiveMPNullables.h"
#include "HiveMPBlueprintLibrary.generated.h"

USTRUCT(BlueprintType)
struct FHiveApiError
{
  GENERATED_BODY()

  UPROPERTY(BlueprintReadWrite)
  int32 HttpStatusCode;

  UPROPERTY(BlueprintReadWrite)
  int32 ErrorCode;

  UPROPERTY(BlueprintReadWrite)
  FString Message;

  UPROPERTY(BlueprintReadWrite)
  FString Parameter;
};

`;

export function getCppStructHeader(dependencies: string[], baseFilename: string, ueType: IUnrealEngineType, definitionValue: IDefinitionSpec) {
  return `
#pragma once

#include "CoreMinimal.h"
#include "UObject/ObjectMacros.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "Misc/Base64.h"
#include "HiveMPNullables.h"
${dependencies.filter(x => x != baseFilename).map(x => `#include "${x}.h"
`).join("")}
#include "${baseFilename}.generated.h"

`;
}

export function getCppStructCode(baseFilename: string, ueType: IUnrealEngineType, definitionValue: IDefinitionSpec) {
  return `
#include "${baseFilename}.h"
${ueType.requiresArrayContainerImplementation(definitionValue) ? `#include "ArrayContainer_${baseFilename}.h"` : ''}

`;
}

export function getCppStructArrayContainerHeader(dependencies: string[], baseFilename: string) {
  return `
#pragma once

#include "CoreMinimal.h"
#include "UObject/ObjectMacros.h"
#include "${baseFilename}.h"
#include "ArrayContainer_${baseFilename}.generated.h"

`;
}

export function getCppStructArrayContainerCode(baseFilename: string) {
  return `
#include "ArrayContainer_${baseFilename}.h"

`;
}

export function getCppStructArrayContainerBPLHeader(dependencies: string[], baseFilename: string) {
  return `
#pragma once

#include "CoreMinimal.h"
#include "UObject/ObjectMacros.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "${baseFilename}.h"
#include "ArrayContainer_${baseFilename}.h"
#include "ArrayContainerBPL_${baseFilename}.generated.h"

`;
}

export function getCppStructArrayContainerBPLCode(baseFilename: string) {
  return `
#include "ArrayContainerBPL_${baseFilename}.h"

`;
}

export function getCppMethodHeader(dependencies: string[], baseFilename: string, isWebSocket: boolean) {
  return `
#pragma once

#include "CoreMinimal.h"
#include "UObject/ObjectMacros.h"
#include "Net/OnlineBlueprintCallProxyBase.h"
#include "Delegates/DelegateCombinations.h"
#include "HiveMPNullables.h"
#include "Struct__common_HiveMPSystemError.h"
${isWebSocket ? '#include "WebSocketBase.h"\n#include "HiveMPWebSocketContext.h"' : ''}
${dependencies.map(x => `#include "${x}.h"
`).join("")}
#include "${baseFilename}.generated.h"

`;
}

export function getCppMethodCode(baseFilename: string) {
  return `
#include "${baseFilename}.h"
#include "IHttpResponse.h"
#include "HttpModule.h"
#include "GenericPlatformHttp.h"
#include "Runtime/Engine/Classes/Engine/World.h"
#include "Runtime/Engine/Classes/Engine/GameInstance.h"
#include "HiveMPBaseGameInstance.h"
#include "../cchost/connect.impl.h"
#include "../cchost/module/hotpatching/module.h"
#include "../HiveMPLogging.h"
#include "../cchost/ue4log.h"
#include <cstdint>

#define UE_LOG_HIVE(Verbosity, Format, ...) \\
{ \\
  UE_LOG(LogHiveMP, Verbosity, TEXT("%s%s"), TEXT("HiveMP: "), *FString::Printf(Format, ##__VA_ARGS__)); \\
}

`;
}