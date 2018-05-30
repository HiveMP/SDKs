import * as swagger from 'swagger2';
import { TargetOptions } from "./TargetOptions";

export interface TargetGenerator {
  readonly name: string;
  generate(documents: {[id: string]: swagger.Document}, opts: TargetOptions): Promise<void>;
}

export class GeneratorUtility {
}