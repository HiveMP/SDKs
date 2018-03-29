// Copyright Redpoint Games 2017 MIT Licensed

#pragma once

#include "CoreMinimal.h"
#include "UObject/ObjectMacros.h"
#include "IpConnection.h"
#include "HiveMPIpConnection.generated.h"

UCLASS(transient, config = Engine)
class UHiveMPIpConnection : public UIpConnection
{
	GENERATED_UCLASS_BODY()

	// Intercept NAT punchthrough packets and accept them silently.
	virtual void ReceivedRawPacket(void* Data, int32 Count) override;
};
