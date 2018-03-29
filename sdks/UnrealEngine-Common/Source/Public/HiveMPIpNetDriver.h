// Copyright Redpoint Games 2017 MIT Licensed

#pragma once

#include "CoreMinimal.h"
#include "UObject/ObjectMacros.h"
#include "IpNetDriver.h"
#include "HiveMPBaseGameInstance.h"
#include "HiveMPIpNetDriver.generated.h"

UCLASS(transient, config = Engine)
class UHiveMPIpNetDriver : public UIpNetDriver
{
	GENERATED_BODY()

	// Use the shared socket that we also use for NAT punchthrough.
	virtual FSocket* CreateSocket() override;

	virtual bool InitBase(bool bInitAsClient, FNetworkNotify* InNotify, const FURL& URL, bool bReuseAddressAndPort, FString& Error) override;

	virtual void LowLevelDestroy() override;

	UPROPERTY()
	UHiveMPBaseGameInstance* CachedGameInstance;

	UPROPERTY()
	bool DidTakeOwnershipOfSocketForNetworking;
};
