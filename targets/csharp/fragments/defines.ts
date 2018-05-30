import { TargetOptions } from "../../TargetOptions";

export function getDefines(baseDefines: string, opts: TargetOptions): string[] {
  let clientConnectDefines = '';
  if (opts.enableClientConnect) {
    clientConnectDefines = `
#define ENABLE_CLIENT_CONNECT_SDK`;
  }
  const commonDefines = `
#if UNITY_5 || UNITY_5_3_OR_NEWER
#define IS_UNITY
#endif
#if !(NET35 || (IS_UNITY && !NET_4_6))
#define HAS_TASKS
#endif
#if !NET35 && !IS_UNITY
#define HAS_HTTPCLIENT
#endif
#if IS_UNITY && NET_4_6 && UNITY_2017_1
#error Unity 2017.1 with a .NET 4.6 runtime is not supported due to known bugs in Unity (bit.ly/2xeicxY). Either upgrade to 2017.2 or use the .NET 2.0 runtime.
#endif
`;
  return [baseDefines, clientConnectDefines, commonDefines];
}