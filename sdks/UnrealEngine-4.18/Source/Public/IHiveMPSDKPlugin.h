// Copyright Redpoint Games 2017 MIT Licensed

#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleInterface.h"
#include "Modules/ModuleManager.h"

class FHiveMPSDKPlugin : public IModuleInterface
{

public:

	FHiveMPSDKPlugin()
	{}

  virtual ~FHiveMPSDKPlugin() {}
  
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

