
#pragma once

#include "CoreMinimal.h"
#include "UObject/ObjectMacros.h"
#include "Net/OnlineBlueprintCallProxyBase.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "DelegateCombinations.h"
#include "OnlineSubsystem.h"
#include "HiveBlueprintLibrary.h"
#include "HiveUtilBlueprintLibrary.generated.h"

UCLASS()
class UHiveUtilBlueprintLibrary : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

	UFUNCTION(BlueprintCallable, BlueprintPure, meta=(ToolTip = "Gets the URL of the currently running listen server", WorldContext = "WorldContextObject"), Category = "HiveMP|Utilities")
	static FString GetCurrentWorldUrl(UObject* WorldContextObject);

	UFUNCTION(BlueprintCallable, meta=(Tooltip = "Send NAT punchthrough request", WorldContext = "WorldContextObject"), Category = "HiveMP|Utilities")
	static void SendNatPunchthroughRequest(UObject* WorldContextObject, const struct FHivenat_punchthrough_NATNegotation& Negotiation);

	UFUNCTION(BlueprintCallable, meta = (Tooltip = "Accept NAT punchthrough connection from client", WorldContext = "WorldContextObject"), Category = "HiveMP|Utilities")
	static void SendNatPunchthroughRequestToClient(UObject* WorldContextObject, const struct FHivenat_punchthrough_NATEndpoint& Endpoint);
};