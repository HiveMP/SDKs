import * as swagger from 'swagger2';
import { TargetOptions } from "./TargetOptions";

export interface TargetGenerator {
  readonly name: string;
  readonly supportsMultitargeting: boolean;
  generate(documents: {[id: string]: swagger.Document}, opts: TargetOptions): Promise<void>;
}

export class GeneratorUtility {
  static isClusterOnlyMethod(method: any): boolean {
    return method["x-accepted-api-key-types"].length == 1 &&
           method["x-accepted-api-key-types"][0] == "__cluster_only__";
  }

  static isCommonDefinitionName(name: string): boolean {
    return name == 'HiveSystemError' ||
      name == 'HiveMPSystemError' ||
      name == 'HiveSystemErrorData' ||
      name == 'HiveMPSystemErrorData' ||
      name == 'HiveMPSystemQueryError';
  }
}