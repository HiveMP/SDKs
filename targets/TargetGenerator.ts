import * as swagger from 'swagger2';

export interface TargetGenerator {
  readonly name: string;
  generate(documents: {[id: string]: swagger.Document}, outputDir: string): Promise<void>;
}