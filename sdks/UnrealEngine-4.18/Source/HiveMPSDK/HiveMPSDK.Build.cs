// Copyright Redpoint Games 2017 MIT Licensed

namespace UnrealBuildTool.Rules
{
	public class HiveMPSDK : ModuleRules
	{
		public HiveMPSDK(ReadOnlyTargetRules Target) : base(Target)
        {
            Definitions.Add("HIVEMPSDK_PACKAGE=1");
            Definitions.Add("CLIENT_CONNECT_TARGETING_UNREAL=1");
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
        }
	}
}