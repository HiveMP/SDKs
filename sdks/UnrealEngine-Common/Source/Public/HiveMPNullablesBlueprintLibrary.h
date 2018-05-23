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

// This is REQUIRED. Without the public accessibility declaration here, the functions will still be available in
// the blueprint editor by searching for them by name, but the autocasting functionality won't work.
public:

	// --- Implict Casts ---

	UFUNCTION(BlueprintPure, meta = (DisplayName = "ToNullableString (String)", CompactNodeTitle = "->", Keywords = "null nullable string cast convert from create", BlueprintAutocast), Category = "HiveMP|Utilities")
	static FNullableString Conv_StringToNullableString(const FString& InString);

	UFUNCTION(BlueprintPure, meta = (DisplayName = "ToString (NullableString)", CompactNodeTitle = "->", Keywords = "null nullable string cast convert from", BlueprintAutocast), Category = "HiveMP|Utilities")
	static FString Conv_NullableStringToString(const FNullableString& InNullableString);

	UFUNCTION(BlueprintPure, meta = (DisplayName = "ToNullableFloat (Float)", CompactNodeTitle = "->", Keywords = "null nullable float cast convert from create", BlueprintAutocast), Category = "HiveMP|Utilities")
	static FNullableFloat Conv_FloatToNullableFloat(float InFloat);

	UFUNCTION(BlueprintPure, meta = (DisplayName = "ToFloat (NullableFloat)", CompactNodeTitle = "->", Keywords = "null nullable float cast convert from", BlueprintAutocast), Category = "HiveMP|Utilities")
	static float Conv_NullableFloatToFloat(const FNullableFloat& InNullableFloat);

	UFUNCTION(BlueprintPure, meta = (DisplayName = "ToNullableInt32 (Int32)", CompactNodeTitle = "->", Keywords = "null nullable int int32 cast convert from create", BlueprintAutocast), Category = "HiveMP|Utilities")
	static FNullableInt32 Conv_IntToNullableInt(int32 InInt32);

	UFUNCTION(BlueprintPure, meta = (DisplayName = "ToInt32 (NullableInt32)", CompactNodeTitle = "->", Keywords = "null nullable int int32 cast convert from", BlueprintAutocast), Category = "HiveMP|Utilities")
	static int32 Conv_NullableIntToInt(const FNullableInt32& InNullableInt32);

	UFUNCTION(BlueprintPure, meta = (DisplayName = "ToNullableBoolean (Boolean)", CompactNodeTitle = "->", Keywords = "null nullable bool boolean cast convert from create", BlueprintAutocast), Category = "HiveMP|Utilities")
	static FNullableBoolean Conv_BoolToNullableBoolean(bool InBool);

	UFUNCTION(BlueprintPure, meta = (DisplayName = "ToBoolean (NullableBoolean)", CompactNodeTitle = "->", Keywords = "null nullable bool boolean cast convert from", BlueprintAutocast), Category = "HiveMP|Utilities")
	static bool Conv_NullableBooleanToBool(const FNullableBoolean& InNullableBool);

	UFUNCTION(BlueprintPure, meta = (DisplayName = "ToNullableByteArray (Bytes)", Keywords = "null nullable byte array cast convert from create"), Category = "HiveMP|Utilities")
	static FNullableByteArray Conv_BytesToNullableBytes(const TArray<uint8>& InBytes);

	UFUNCTION(BlueprintPure, meta = (DisplayName = "ToBytes (NullableByteArray)", Keywords = "null nullable byte array cast convert from"), Category = "HiveMP|Utilities")
	static TArray<uint8> Conv_NullableBytesToBytes(const FNullableByteArray& InNullableBytes);

	// --- Nullable Create ---

	UFUNCTION(BlueprintPure, meta = (DisplayName = "Null String", Keywords = "create null nullable string"), Category = "HiveMP|Utilities")
	static struct FNullableString NullString();

	UFUNCTION(BlueprintPure, meta = (DisplayName = "Null Float", Keywords = "create null nullable float"), Category = "HiveMP|Utilities")
	static struct FNullableFloat NullFloat();

	UFUNCTION(BlueprintPure, meta = (DisplayName = "Null Int32", Keywords = "create null nullable int int32"), Category = "HiveMP|Utilities")
	static FNullableInt32 NullInt32();

	UFUNCTION(BlueprintPure, meta = (DisplayName = "Null Boolean", Keywords = "create null nullable bool boolean"), Category = "HiveMP|Utilities")
	static FNullableBoolean NullBoolean();

	UFUNCTION(BlueprintPure, meta = (DisplayName = "Null ByteArray", Keywords = "create null nullable byte array"), Category = "HiveMP|Utilities")
	static FNullableByteArray NullByteArray();
};