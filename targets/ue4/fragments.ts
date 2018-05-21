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
#include "HiveMPBlueprintLibrary.generated.h"

#define UE_LOG_HIVE(Verbosity, Format, ...) \\
{ \\
  UE_LOG(LogOnline, Verbosity, TEXT("%s%s"), TEXT("HiveMP: "), *FString::Printf(Format, ##__VA_ARGS__)); \\
}

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

export const cppCode = `
#pragma once

#include "HiveMPBlueprintLibrary.h"
#include "cchost/connect.impl.h"
#include "cchost/module/hotpatching/module.h"

`;