HiveMP SDK for Unreal Engine 4
=======================================

This is the integrated HiveMP SDK for Unreal Engine 4.

This SDK makes all of HiveMP's APIs available as blueprints in Unreal Engine 4.

## Installation

Download the latest release from https://github.com/HiveMP/UnrealEngine4-SDK/releases/tag/latest for the version of Unreal Engine 4 that you are using in your project.

Extract the ZIP file somewhere and place the `HiveMPSDK` folder underneath the `Plugins` folder in your project. You may need to create it if it doesn't exist.

**IMPORTANT:** Your UE4 project must have some C++ in it, or Unreal Engine 4 will refuse to load any C++-based plugins. To workaround this issue, add a single C++ class from `File -> New C++ Class...` before adding this plugin, and just accept all the default values.

When everything is setup, the file `<yourproject>\Plugins\HiveMPSDK\HiveMPSDK.uplugin` should exist. You can then open your project from the Epic Games launcher.

## Documentation

### API Documentation

Please refer to the [online HiveMP documentation](https://hivemp.com/docs/) website for information on the available API methods, including copy-and-paste blueprint examples for every API call that HiveMP makes available.

### NAT Punchthrough

If you're interested in using HiveMP's NAT Punchthrough service, you need to configure UE4 to use the HiveMP networking drivers included in this SDK. Update your `DefaultEngine.ini` file to include the following lines:

```
[OnlineSubsystem]
DefaultPlatformService=Null

[/Script/Engine.GameEngine]
!NetDriverDefinitions=ClearArray
+NetDriverDefinitions=(DefName="GameNetDriver",DriverClassName="/Script/HiveMPSDK.HiveIpNetDriver",DriverClassNameFallback="/Script/HiveMPSDK.HiveIpNetDriver")

[/Script/HiveMPSDK.HiveIpNetDriver]
NetConnectionClassName="/Script/HiveMPSDK.HiveIpConnection"
```
