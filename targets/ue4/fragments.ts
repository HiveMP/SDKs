export const cppHeader = `
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

export function getCppStructHeader(dependencies: string[], baseFilename: string) {
  return `
#pragma once

#include "CoreMinimal.h"
#include "UObject/ObjectMacros.h"
#include "JsonReader.h"
#include "JsonSerializer.h"
#include "Base64.h"
#include "HiveMPNullables.h"
${dependencies.map(x => `#include "${x}.h"
`).join("")}
#include "${baseFilename}.generated.h"

`;
}

export function getCppStructCode(baseFilename: string) {
  return `
#include "${baseFilename}.h"

`;
}

export function getCppMethodHeader(dependencies: string[], baseFilename: string, isWebSocket: boolean) {
  return `
#pragma once

#include "CoreMinimal.h"
#include "UObject/ObjectMacros.h"
#include "Net/OnlineBlueprintCallProxyBase.h"
#include "DelegateCombinations.h"
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
#include "../cchost/connect.impl.h"
#include "../cchost/module/hotpatching/module.h"
#include "../HiveMPLogging.h"

#define UE_LOG_HIVE(Verbosity, Format, ...) \\
{ \\
  UE_LOG(LogHiveMP, Verbosity, TEXT("%s%s"), TEXT("HiveMP: "), *FString::Printf(Format, ##__VA_ARGS__)); \\
}

`;
}