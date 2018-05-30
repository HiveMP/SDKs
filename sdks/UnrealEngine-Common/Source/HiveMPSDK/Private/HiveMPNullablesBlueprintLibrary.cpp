// Copyright Redpoint Games 2017 MIT Licensed

#include "HiveMPNullablesBlueprintLibrary.h"

FNullableString UHiveMPNullableBlueprintLibrary::Conv_StringToNullableString(const FString& InString)
{
	return FNullableString(true, InString);
}

FString UHiveMPNullableBlueprintLibrary::Conv_NullableStringToString(const FNullableString& InNullableString)
{
	if (InNullableString.HasValue)
	{
		return InNullableString.Value;
	}
	else
	{
		// UE_LOG_HIVE(Warning, TEXT("[cast warning] Attempt to cast null value from nullable string to string, returning default value \"\"!"));
		return TEXT("");
	}
}

struct FNullableString UHiveMPNullableBlueprintLibrary::NullString()
{	
	return FNullableString(false, TEXT(""));
}

struct FNullableFloat UHiveMPNullableBlueprintLibrary::Conv_FloatToNullableFloat(float Value)
{
	return FNullableFloat(true, Value);
}

struct FNullableFloat UHiveMPNullableBlueprintLibrary::NullFloat()
{
	return FNullableFloat(false, 0);
}

float UHiveMPNullableBlueprintLibrary::Conv_NullableFloatToFloat(const FNullableFloat& Value)
{
	if (Value.HasValue)
	{
		return Value.Value;
	}
	else
	{
		// UE_LOG_HIVE(Warning, TEXT("[cast warning] Attempt to cast null value from nullable float to float, returning default value 0!"));
		return 0;
	}
}

FNullableInt32 UHiveMPNullableBlueprintLibrary::Conv_IntToNullableInt(int32 Value)
{
	return FNullableInt32(true, Value);
}

FNullableInt32 UHiveMPNullableBlueprintLibrary::NullInt32()
{
	return FNullableInt32(false, 0);
}

int32 UHiveMPNullableBlueprintLibrary::Conv_NullableIntToInt(const FNullableInt32& Value)
{
	if (Value.HasValue)
	{
		return Value.Value;
	}
	else
	{
		// UE_LOG_HIVE(Warning, TEXT("[cast warning] Attempt to cast null value from nullable int32 to int32, returning default value 0!"));
		return 0;
	}
}

FNullableBoolean UHiveMPNullableBlueprintLibrary::Conv_BoolToNullableBoolean(bool Value)
{
	return FNullableBoolean(true, Value);
}

FNullableBoolean UHiveMPNullableBlueprintLibrary::NullBoolean()
{
	return FNullableBoolean(false, false);
}

bool UHiveMPNullableBlueprintLibrary::Conv_NullableBooleanToBool(const FNullableBoolean& Value)
{
	if (Value.HasValue)
	{
		return Value.Value;
	}
	else
	{
		// UE_LOG_HIVE(Warning, TEXT("[cast warning] Attempt to cast null value from nullable boolean to boolean, returning default value false!"));
		return 0;
	}
}

FNullableByteArray UHiveMPNullableBlueprintLibrary::Conv_BytesToNullableBytes(const TArray<uint8>& Value)
{
	return FNullableByteArray(true, Value);
}

FNullableByteArray UHiveMPNullableBlueprintLibrary::NullByteArray()
{
	return FNullableByteArray(false, TArray<uint8>());
}

TArray<uint8> UHiveMPNullableBlueprintLibrary::Conv_NullableBytesToBytes(const FNullableByteArray& Value)
{
	if (Value.HasValue)
	{
		return Value.Value;
	}
	else
	{
		// UE_LOG_HIVE(Warning, TEXT("[cast warning] Attempt to cast null value from nullable byte array to byte array, returning default value (empty array)!"));
		return TArray<uint8>();
	}
}