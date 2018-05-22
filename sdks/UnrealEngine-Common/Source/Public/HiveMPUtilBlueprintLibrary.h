// Copyright Redpoint Games 2017 MIT Licensed

#pragma once

#include "CoreMinimal.h"
#include "UObject/ObjectMacros.h"
#include "Net/OnlineBlueprintCallProxyBase.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "DelegateCombinations.h"
#include "OnlineSubsystem.h"
#include "HiveMPNullables.h"
#include "HiveMPBlueprintLibrary.h"
#include "HiveMPUtilBlueprintLibrary.generated.h"

UCLASS()
class UHiveMPUtilBlueprintLibrary : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

	UFUNCTION(BlueprintCallable, BlueprintPure, meta=(ToolTip = "Gets the URL of the currently running listen server", WorldContext = "WorldContextObject"), Category = "HiveMP|Utilities")
	static FString GetCurrentWorldUrl(UObject* WorldContextObject);

	UFUNCTION(BlueprintCallable, meta=(Tooltip = "Send NAT punchthrough request", WorldContext = "WorldContextObject"), Category = "HiveMP|Utilities")
	static void SendNatPunchthroughRequest(UObject* WorldContextObject, const struct FHivenat_punchthrough_NATNegotation& Negotiation);

	UFUNCTION(BlueprintCallable, meta = (Tooltip = "Accept NAT punchthrough connection from client", WorldContext = "WorldContextObject"), Category = "HiveMP|Utilities")
	static void SendNatPunchthroughRequestToClient(UObject* WorldContextObject, const struct FHivenat_punchthrough_NATEndpoint& Endpoint);

	UFUNCTION(BlueprintCallable, BlueprintPure, meta = (Tooltip = "Cast String to Nullable String"), Category = "HiveMP|Utilities")
	static FNullableString CreateNullableString(FString Value)
	{
		return FNullableString(true, Value);
	}

	UFUNCTION(BlueprintCallable, BlueprintPure, meta = (Tooltip = "Null String"), Category = "HiveMP|Utilities")
	static FNullableString NullString()
	{
		return FNullableString(false, TEXT(""));
	}

	UFUNCTION(BlueprintCallable, BlueprintPure, meta = (Tooltip = "Cast Float to Nullable Float"), Category = "HiveMP|Utilities")
	static FNullableFloat CreateNullableFloat(float Value)
	{
		return FNullableFloat(true, Value);
	}

	UFUNCTION(BlueprintCallable, BlueprintPure, meta = (Tooltip = "Null Float"), Category = "HiveMP|Utilities")
	static FNullableFloat NullFloat()
	{
		return FNullableFloat(false, 0);
	}

	UFUNCTION(BlueprintCallable, BlueprintPure, meta = (Tooltip = "Cast Int32 to Nullable Int32"), Category = "HiveMP|Utilities")
	static FNullableInt32 CreateNullableInt32(int32 Value)
	{
		return FNullableInt32(true, Value);
	}

	UFUNCTION(BlueprintCallable, BlueprintPure, meta = (Tooltip = "Null Int32"), Category = "HiveMP|Utilities")
	static FNullableInt32 NullInt32()
	{
		return FNullableInt32(false, 0);
	}

	UFUNCTION(BlueprintCallable, BlueprintPure, meta = (Tooltip = "Cast Boolean to Nullable Boolean"), Category = "HiveMP|Utilities")
	static FNullableBoolean CreateNullableBoolean(bool Value)
	{
		return FNullableBoolean(true, Value);
	}

	UFUNCTION(BlueprintCallable, BlueprintPure, meta = (Tooltip = "Null Boolean"), Category = "HiveMP|Utilities")
	static FNullableBoolean NullBoolean()
	{
		return FNullableBoolean(false, false);
	}

	UFUNCTION(BlueprintCallable, BlueprintPure, meta = (Tooltip = "Cast ByteArray to Nullable ByteArray"), Category = "HiveMP|Utilities")
	static FNullableByteArray CreateNullableByteArray(const TArray<uint8>& Value)
	{
		return FNullableByteArray(true, TArray<uint8>(Value));
	}

	UFUNCTION(BlueprintCallable, BlueprintPure, meta = (Tooltip = "Null ByteArray"), Category = "HiveMP|Utilities")
	static FNullableByteArray NullByteArray()
	{
		return FNullableByteArray(false, TArray<uint8>());
	}
};