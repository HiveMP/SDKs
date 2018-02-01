// Copyright 1998-2017 Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "UObject/ObjectMacros.h"
#include "IpConnection.h"
#include "HiveIpConnection.generated.h"

UCLASS(transient, config = Engine)
class UHiveIpConnection : public UIpConnection
{
	GENERATED_UCLASS_BODY()

	// Intercept NAT punchthrough packets and accept them silently.
	virtual void ReceivedRawPacket(void* Data, int32 Count) override;
};
