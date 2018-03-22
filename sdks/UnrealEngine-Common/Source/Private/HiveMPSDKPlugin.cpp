// Copyright Redpoint Games 2017 MIT Licensed

#include "CoreMinimal.h"
#include "Modules/ModuleManager.h"
#include "OnlineSubsystem.h"
#include "IHiveMPSDKPlugin.h"

IMPLEMENT_MODULE( FHiveMPSDKPlugin, HiveMPSDK )

void FHiveMPSDKPlugin::StartupModule()
{
	UE_LOG_ONLINE(Display, TEXT("FHiveMPSDKPlugin::StartupModule()"));
}

void FHiveMPSDKPlugin::ShutdownModule()
{
  UE_LOG_ONLINE(Display, TEXT("FHiveMPSDKPlugin::ShutdownModule()"));
}
