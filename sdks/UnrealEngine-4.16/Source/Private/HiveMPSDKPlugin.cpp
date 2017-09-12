// Copyright Redpoint Games 2017 MIT Licensed

#include "CoreMinimal.h"
#include "Modules/ModuleManager.h"
#include "IHiveMPSDKPlugin.h"

class FHiveMPSDKPlugin : public IHiveMPSDKPlugin
{
	virtual void StartupModule() override;
	virtual void ShutdownModule() override;
};

IMPLEMENT_MODULE( FHiveMPSDKPlugin, IHiveMPSDKPlugin )

void FHiveMPSDKPlugin::StartupModule()
{
}

void FHiveMPSDKPlugin::ShutdownModule()
{
}



