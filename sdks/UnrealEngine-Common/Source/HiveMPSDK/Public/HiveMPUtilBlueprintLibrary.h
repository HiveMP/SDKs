// Copyright Redpoint Games 2017 MIT Licensed

#pragma once

#include "CoreMinimal.h"
#include "UObject/ObjectMacros.h"
#include "Net/OnlineBlueprintCallProxyBase.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "Delegates/DelegateCombinations.h"
#include "OnlineSubsystem.h"
#include "HiveMPNullables.h"
#include "Generated/Struct_nat_punchthrough_NATEndpoint.h"
#include "Generated/Struct_nat_punchthrough_NATNegotation.h"
#include "HiveMPUtilBlueprintLibrary.generated.h"

UCLASS()
class UHiveMPUtilBlueprintLibrary : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

public:

	UFUNCTION(BlueprintCallable, BlueprintPure, meta=(ToolTip = "Gets the URL of the currently running listen server", WorldContext = "WorldContextObject"), Category = "HiveMP|Utilities")
	static FString GetCurrentWorldUrl(UObject* WorldContextObject);

	UFUNCTION(BlueprintCallable, meta=(Tooltip = "Send NAT punchthrough request", WorldContext = "WorldContextObject"), Category = "HiveMP|Utilities")
	static void SendNatPunchthroughRequest(UObject* WorldContextObject, const struct FHivenat_punchthrough_NATNegotation& Negotiation);

	UFUNCTION(BlueprintCallable, meta = (Tooltip = "Accept NAT punchthrough connection from client", WorldContext = "WorldContextObject"), Category = "HiveMP|Utilities")
	static void SendNatPunchthroughRequestToClient(UObject* WorldContextObject, const struct FHivenat_punchthrough_NATEndpoint& Endpoint);
};