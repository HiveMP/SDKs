import * as swagger from 'swagger2';

export interface TargetGenerator {
  readonly name: string;
  generate(documents: {[id: string]: swagger.Document}, outputDir: string, includeClusterOnly: boolean, enableClientConnect: boolean): Promise<void>;
}

export class GeneratorUtility {
  static isClusterOnlyMethod(method: any): boolean {
    return method["x-accepted-api-key-types"].length == 1 &&
           method["x-accepted-api-key-types"][0] == "__cluster_only__";
  }
}