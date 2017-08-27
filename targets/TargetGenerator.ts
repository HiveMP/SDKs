import * as swagger from 'swagger2';

export interface TargetGenerator {
  readonly name: string;
  generate(documents: swagger.Document[], outputDir: string): Promise<void>;
}