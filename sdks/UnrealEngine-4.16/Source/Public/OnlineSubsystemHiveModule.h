// Copyright Redpoint Games 2017 MIT Licensed

#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleInterface.h"

/**
* Online subsystem module class  (Null Implementation)
* Code related to the loading of the Null module
*/
class FOnlineSubsystemHiveModule : public IModuleInterface
{
private:

	/** Class responsible for creating instance(s) of the subsystem */
	class FOnlineFactoryHive* HiveFactory;

public:

	FOnlineSubsystemHiveModule() :
		HiveFactory(NULL)
	{}

	virtual ~FOnlineSubsystemHiveModule() {}

	// IModuleInterface

	virtual void StartupModule() override;
	virtual void ShutdownModule() override;
	virtual bool SupportsDynamicReloading() override
	{
		return false;
	}

	virtual bool SupportsAutomaticShutdown() override
	{
		return false;
	}
};
