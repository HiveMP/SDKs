// Copyright Redpoint Games 2017 MIT Licensed

#pragma once

#include "CoreMinimal.h"
#include "UObject/ObjectMacros.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "HiveMPNullables.h"
#include "HiveMPNullablesBlueprintLibrary.generated.h"

UCLASS()
class UHiveMPNullableBlueprintLibrary : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

public:

	// --- Implict Casts ---

	UFUNCTION(BlueprintPure, meta = (DisplayName = "ToNullableString (String)", CompactNodeTitle = "->", Keywords = "null nullable string cast convert", BlueprintAutocast), Category = "HiveMP|Utilities")
	static FNullableString Conv_StringToNullableString(const FString& InString);

	UFUNCTION(BlueprintPure, meta = (DisplayName = "ToString (NullableString)", CompactNodeTitle = "->", Keywords = "null nullable string cast convert", BlueprintAutocast), Category = "HiveMP|Utilities")
	static FString Conv_NullableStringToString(const FNullableString& InNullableString);

	UFUNCTION(BlueprintPure, meta = (Tooltip = "Cast Float to Nullable Float", CompactNodeTitle = "->", Keywords = "null nullable float cast convert", BlueprintAutocast), Category = "HiveMP|Utilities")
	static FNullableFloat Conv_FloatToNullableFloat(float InFloat);

	UFUNCTION(BlueprintPure, meta = (Tooltip = "Cast Nullable Float to Float", CompactNodeTitle = "->", Keywords = "null nullable float cast convert", BlueprintAutocast), Category = "HiveMP|Utilities")
	static float Conv_NullableFloatToFloat(const FNullableFloat& InNullableFloat);

	UFUNCTION(BlueprintPure, meta = (Tooltip = "Cast Int32 to Nullable Int32", CompactNodeTitle = "->", Keywords = "null nullable int int32 cast convert", BlueprintAutocast), Category = "HiveMP|Utilities")
	static FNullableInt32 Conv_IntToNullableInt(int32 InInt32);

	UFUNCTION(BlueprintPure, meta = (Tooltip = "Cast Nullable Int32 to Int32", CompactNodeTitle = "->", Keywords = "null nullable int int32 cast convert", BlueprintAutocast), Category = "HiveMP|Utilities")
	static int32 Conv_NullableIntToInt(const FNullableInt32& InNullableInt32);

	UFUNCTION(BlueprintPure, meta = (Tooltip = "Cast Boolean to Nullable Boolean", CompactNodeTitle = "->", Keywords = "null nullable bool boolean cast convert", BlueprintAutocast), Category = "HiveMP|Utilities")
	static FNullableBoolean Conv_BoolToNullableBoolean(bool InBool);

	UFUNCTION(BlueprintPure, meta = (Tooltip = "Cast Nullable Boolean to Boolean", CompactNodeTitle = "->", Keywords = "null nullable bool boolean cast convert", BlueprintAutocast), Category = "HiveMP|Utilities")
	static bool Conv_NullableBooleanToBool(const FNullableBoolean& InNullableBool);

	UFUNCTION(BlueprintPure, meta = (Tooltip = "Cast ByteArray to Nullable ByteArray", Keywords = "null nullable byte array cast convert"), Category = "HiveMP|Utilities")
	static FNullableByteArray Conv_BytesToNullableBytes(const TArray<uint8>& InBytes);

	UFUNCTION(BlueprintPure, meta = (Tooltip = "Cast Nullable ByteArray to ByteArray", Keywords = "null nullable byte array cast convert"), Category = "HiveMP|Utilities")
	static TArray<uint8> Conv_NullableBytesToBytes(const FNullableByteArray& InNullableBytes);

	// --- Nullable Create ---

	UFUNCTION(BlueprintPure, meta = (Tooltip = "Null String", Keywords = "create null nullable string"), Category = "HiveMP|Utilities")
	static struct FNullableString NullString();

	UFUNCTION(BlueprintPure, meta = (Tooltip = "Null Float", Keywords = "create null nullable float"), Category = "HiveMP|Utilities")
	static struct FNullableFloat NullFloat();

	UFUNCTION(BlueprintPure, meta = (Tooltip = "Null Int32", Keywords = "create null nullable int int32"), Category = "HiveMP|Utilities")
	static FNullableInt32 NullInt32();

	UFUNCTION(BlueprintPure, meta = (Tooltip = "Null Boolean", Keywords = "create null nullable bool boolean"), Category = "HiveMP|Utilities")
	static FNullableBoolean NullBoolean();

	UFUNCTION(BlueprintPure, meta = (Tooltip = "Null ByteArray", Keywords = "create null nullable byte array"), Category = "HiveMP|Utilities")
	static FNullableByteArray NullByteArray();
};