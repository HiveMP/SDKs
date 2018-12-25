export interface TargetOptions {
  outputDir: string;
  includeClusterOnly: boolean;
  enableClientConnect: boolean;
  clientConnectSdkPath: string;
  skipSupportingFiles: boolean;
  isolatedNamespace: boolean;
}