// Copyright Redpoint Games 2017 MIT Licensed

namespace UnrealBuildTool.Rules
{
	public class OnlineSubsystemHive : ModuleRules
	{
		public OnlineSubsystemHive(ReadOnlyTargetRules Target) : base(Target)
        {
            Definitions.Add("ONLINESUBSYSTEMHIVE_PACKAGE=1");
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
                "PacketHandler"
                }
                );
        }
	}
}