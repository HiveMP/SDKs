// Copyright Redpoint Games 2017 MIT Licensed

using UnrealBuildTool;
using System.IO;

namespace UnrealBuildTool.Rules
{
	public class HiveMPSDK : ModuleRules
	{
		public HiveMPSDK(ReadOnlyTargetRules Target) : base(Target)
        {
            string SteamVersion = "Steamv139";
            bool bSteamSDKFound = Directory.Exists(Target.UEThirdPartySourceDirectory + "Steamworks/" + SteamVersion) == true;

            PublicDefinitions.Add("STEAMSDK_FOUND=" + (bSteamSDKFound ? "1" : "0"));
            PublicDefinitions.Add("WITH_STEAMWORKS=" + (bSteamSDKFound ? "1" : "0"));

            PublicDefinitions.Add("HIVEMPSDK_PACKAGE=1");
            PublicDefinitions.Add("CLIENT_CONNECT_TARGETING_UNREAL=1");
            PublicDefinitions.Add("HAVE_LIBINTL_H=0");
            PublicDefinitions.Add("HAVE_STRING_H=0");
            PCHUsage = ModuleRules.PCHUsageMode.UseExplicitOrSharedPCHs;

            PublicDependencyModuleNames.AddRange(
                new string[] {
                "Core",
                "CoreUObject",
                "Engine",
                "Sockets",
                "OnlineSubsystem",
                "OnlineSubsystemUtils",
                "Json",
                "Http",
                "PacketHandler",
                "WebSocket"
                }
                );

            AddEngineThirdPartyPrivateStaticDependencies(Target, "Steamworks");
        }
	}
}