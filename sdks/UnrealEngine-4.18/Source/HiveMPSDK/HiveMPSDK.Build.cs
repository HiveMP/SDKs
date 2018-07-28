// Copyright Redpoint Games 2017 MIT Licensed

using UnrealBuildTool;
using System.IO;

namespace UnrealBuildTool.Rules
{
	public class HiveMPSDK : ModuleRules
	{
		public HiveMPSDK(ReadOnlyTargetRules Target) : base(Target)
        {
            Definitions.Add("HIVEMPSDK_PACKAGE=1");
            Definitions.Add("CLIENT_CONNECT_TARGETING_UNREAL=1");
            Definitions.Add("HAVE_LIBINTL_H=0");
            Definitions.Add("HAVE_STRING_H=0");
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

            string SdkBase = Path.GetFullPath(Path.Combine(ModuleDirectory, "Private/steam"));

            PrivateIncludePaths.Add(Path.Combine(SdkBase, "public"));

            string LibraryPath = SdkBase;
            string LibraryName = "steam_api";
            
            if (Target.Platform == UnrealTargetPlatform.Win32)
            {
                Definitions.Add("STEAMSDK_FOUND=1");
                Definitions.Add("WITH_STEAMWORKS=1");
                PublicLibraryPaths.Add(Path.Combine(LibraryPath, "win32"));
                PublicAdditionalLibraries.Add(LibraryName + ".lib");
                PublicDelayLoadDLLs.Add(LibraryName + ".dll");
                RuntimeDependencies.Add(new RuntimeDependency(Path.Combine(LibraryPath, "win32/" + LibraryName + ".dll")));
            }
            else if (Target.Platform == UnrealTargetPlatform.Win64)
            {
                Definitions.Add("STEAMSDK_FOUND=1");
                Definitions.Add("WITH_STEAMWORKS=1");
                PublicLibraryPaths.Add(Path.Combine(LibraryPath, "win64"));
                PublicAdditionalLibraries.Add(LibraryName + "64.lib");
                PublicDelayLoadDLLs.Add(LibraryName + "64.dll");
                RuntimeDependencies.Add(new RuntimeDependency(Path.Combine(LibraryPath, "win64/" + LibraryName + "64.dll")));
            }
            else if (Target.Platform == UnrealTargetPlatform.Mac)
            {
                Definitions.Add("STEAMSDK_FOUND=1");
                Definitions.Add("WITH_STEAMWORKS=1");
                PublicDelayLoadDLLs.Add(Path.Combine(LibraryPath, "osx/lib" + LibraryName + ".dylib"));
                PublicAdditionalShadowFiles.Add(LibraryPath);
                AdditionalBundleResources.Add(new UEBuildBundleResource(LibraryPath, "MacOS"));
            }
            else if (Target.Platform == UnrealTargetPlatform.Linux)
            {
                Definitions.Add("STEAMSDK_FOUND=1");
                Definitions.Add("WITH_STEAMWORKS=1");

                if (Target.LinkType == TargetLinkType.Monolithic)
                {
                    PublicLibraryPaths.Add(Path.Combine(LibraryPath, "linux64"));
                    PublicAdditionalLibraries.Add(LibraryName);
                }
                else
                {
                    PublicDelayLoadDLLs.Add(Path.Combine(LibraryPath, "linux64/lib" + LibraryName + ".so"));
                }
                PublicAdditionalLibraries.Add(Path.Combine(LibraryPath, "linux64/lib" + LibraryName + ".so"));
                RuntimeDependencies.Add(new RuntimeDependency(Path.Combine(LibraryPath, "linux64/lib" + LibraryName + ".so")));
            }
        }
	}
}