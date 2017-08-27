import * as swagger from 'swagger2';
import { TargetGenerator } from './TargetGenerator';

export class CSharp35Generator implements TargetGenerator {
  get name(): string {
    return 'CSharp-3.5';
  }

  async generate(documents: swagger.Document[], outputDir: string): Promise<void> {

  }
}

export class CSharp45Generator implements TargetGenerator {
  get name(): string {
    return 'CSharp-4.5';
  }
  
  async generate(documents: swagger.Document[], outputDir: string): Promise<void> {

  }
}