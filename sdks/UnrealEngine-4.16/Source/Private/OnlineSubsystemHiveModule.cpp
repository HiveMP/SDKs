// Copyright Redpoint Games 2017 MIT Licensed

#include "OnlineSubsystemHiveModule.h"
#include "CoreMinimal.h"
#include "Modules/ModuleManager.h"
//#include "OnlineSubsystemModule.h"
#include "OnlineSubsystemHiveNames.h"
#include "OnlineSubsystem.h"
//#include "OnlineSubsystemNull.h"

IMPLEMENT_MODULE(FOnlineSubsystemHiveModule, OnlineSubsystemHive);

/**
* Class responsible for creating instance(s) of the subsystem
*/
class FOnlineFactoryHive : public IOnlineFactory
{
public:

	FOnlineFactoryHive() {}
	virtual ~FOnlineFactoryHive() {}

	virtual IOnlineSubsystemPtr CreateSubsystem(FName InstanceName)
	{
		UE_LOG_ONLINE(Display, TEXT("FOnlineFactoryHive::CreateSubsystem()"));

		FOnlineSubsystemHivePtr OnlineSub = MakeShareable(new FOnlineSubsystemHive(InstanceName));
		if (OnlineSub->IsEnabled())
		{
			if (!OnlineSub->Init())
			{
				UE_LOG_ONLINE(Warning, TEXT("Hive API failed to initialize!"));
				OnlineSub->Shutdown();
				OnlineSub = NULL;
			}
		}
		else
		{
			UE_LOG_ONLINE(Warning, TEXT("Hive API disabled!"));
			OnlineSub->Shutdown();
			OnlineSub = NULL;
		}

		return OnlineSub;
	}
};

void FOnlineSubsystemHiveModule::StartupModule()
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHiveModule::StartupModule()"));

	HiveFactory = new FOnlineFactoryHive();

	// Create and register our singleton factory with the main online subsystem for easy access
	FOnlineSubsystemModule& OSS = FModuleManager::GetModuleChecked<FOnlineSubsystemModule>("OnlineSubsystem");
	OSS.RegisterPlatformService(HIVE_SUBSYSTEM, HiveFactory);
}

void FOnlineSubsystemHiveModule::ShutdownModule()
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHiveModule::ShutdownModule()"));

	FOnlineSubsystemModule& OSS = FModuleManager::GetModuleChecked<FOnlineSubsystemModule>("OnlineSubsystem");
	OSS.UnregisterPlatformService(HIVE_SUBSYSTEM);

	delete HiveFactory;
	HiveFactory = NULL;
}
