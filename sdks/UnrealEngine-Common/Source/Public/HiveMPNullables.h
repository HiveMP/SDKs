// Copyright Redpoint Games 2017 MIT Licensed

#pragma once

#include "CoreMinimal.h"
#include "UObject/ObjectMacros.h"
#include "HiveMPNullables.generated.h"

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