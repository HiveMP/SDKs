// Copyright 2017 Redpoint Games. MIT Licensed.

#pragma once

#include "CoreMinimal.h"
#include "OnlineAsyncTaskManager.h"

class FOnlineAsyncTaskManagerHive : public FOnlineAsyncTaskManager
{
protected:

	/** Cached reference to the main online subsystem */
	class FOnlineSubsystemHive* HiveSubsystem;

public:

	FOnlineAsyncTaskManagerHive(class FOnlineSubsystemHive* InOnlineSubsystem)
		: HiveSubsystem(InOnlineSubsystem)
	{
	}

	~FOnlineAsyncTaskManagerHive()
	{
	}

	// FOnlineAsyncTaskManager
	virtual void OnlineTick() override;
};
