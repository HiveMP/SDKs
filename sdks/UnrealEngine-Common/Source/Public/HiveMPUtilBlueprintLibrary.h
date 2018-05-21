// Copyright Redpoint Games 2017 MIT Licensed

#pragma once

#include "CoreMinimal.h"
#include "UObject/ObjectMacros.h"
#include "Net/OnlineBlueprintCallProxyBase.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "DelegateCombinations.h"
#include "OnlineSubsystem.h"
#include "HiveMPBlueprintLibrary.h"
#include "HiveMPUtilBlueprintLibrary.generated.h"

/** Represents a nullable string */
USTRUCT(BlueprintType)
struct FNullableString 
{
	GENERATED_BODY()

	FNullableString();
 
	FNullableString(bool NewHasValue, FString NewValue)
	{
		HasValue = NewHasValue;
		Value = NewValue;
	}

	/** If true, the value is a string. If false, the value is null. */
	UPROPERTY(BlueprintReadWrite, meta = (DisplayName = "Has Value?"))
	bool HasValue;

	/** The string value. */
	UPROPERTY(BlueprintReadWrite, meta = (DisplayName = "Value"))
	FString Value;
};

/** Represents a nullable float */
USTRUCT(BlueprintType)
struct FNullableFloat
{
	GENERATED_BODY()

	FNullableFloat();
 
	FNullableFloat(bool NewHasValue, float NewValue)
	{
		HasValue = NewHasValue;
		Value = NewValue;
	}

	/** If true, the value is a float. If false, the value is null. */
	UPROPERTY(BlueprintReadWrite, meta = (DisplayName = "Has Value?"))
	bool HasValue;

	/** The float value. */
	UPROPERTY(BlueprintReadWrite, meta = (DisplayName = "Value"))
	float Value;
};

/** Represents a nullable int32 */
USTRUCT(BlueprintType)
struct FNullableInt32
{
	GENERATED_BODY()

	FNullableInt32();
 
	FNullableInt32(bool NewHasValue, int32 NewValue)
	{
		HasValue = NewHasValue;
		Value = NewValue;
	}

	/** If true, the value is a int32. If false, the value is null. */
	UPROPERTY(BlueprintReadWrite, meta = (DisplayName = "Has Value?"))
	bool HasValue;

	/** The int32 value. */
	UPROPERTY(BlueprintReadWrite, meta = (DisplayName = "Value"))
	int32 Value;
};

/** Represents a nullable bool */
USTRUCT(BlueprintType)
struct FNullableBoolean
{
	GENERATED_BODY()

	FNullableBoolean();
 
	FNullableBoolean(bool NewHasValue, bool NewValue)
	{
		HasValue = NewHasValue;
		Value = NewValue;
	}

	/** If true, the value is a bool. If false, the value is null. */
	UPROPERTY(BlueprintReadWrite, meta = (DisplayName = "Has Value?"))
	bool HasValue;

	/** The bool value. */
	UPROPERTY(BlueprintReadWrite, meta = (DisplayName = "Value"))
	bool Value;
};

/** Represents a nullable byte array */
USTRUCT(BlueprintType)
struct FNullableByteArray
{
	GENERATED_BODY()

	FNullableByteArray();
 
	FNullableByteArray(bool NewHasValue, const TArray<uint8>& NewValue)
	{
		HasValue = NewHasValue;
		Value = NewValue;
	}

	/** If true, the value is a byte array. If false, the value is null. */
	UPROPERTY(BlueprintReadWrite, meta = (DisplayName = "Has Value?"))
	bool HasValue;

	/** The byte array value. */
	UPROPERTY(BlueprintReadWrite, meta = (DisplayName = "Value"))
	TArray<uint8> Value;
};

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

	UFUNCTION(BlueprintCallable, BlueprintPure, meta = (Tooltip = "Cast Double to Nullable Double"), Category = "HiveMP|Utilities")
	static FNullableDouble CreateNullableDouble(double Value)
	{
		return FNullableDouble(true, Value);
	}

	UFUNCTION(BlueprintCallable, BlueprintPure, meta = (Tooltip = "Null Double"), Category = "HiveMP|Utilities")
	static FNullableDouble NullDouble()
	{
		return FNullableDouble(false, 0);
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
};