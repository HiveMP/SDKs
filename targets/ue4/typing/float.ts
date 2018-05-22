import { IUnrealEngineType, IDeserializationInfo } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from "../../common/typeSpec";

export class FloatType implements IUnrealEngineType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'number' &&
      (spec.format === 'float' ||
      spec.format === 'double');
  }

  public getCPlusPlusInType(spec: ITypeSpec): string {
    return 'FNullableFloat';
  }

  public getCPlusPlusOutType(spec: ITypeSpec): string {
    return 'const FNullableFloat&';
  }

  public getNameForDependencyEmit(spec: ITypeSpec): string | null {
    return null;
  }

  public getDependencies(spec: IDefinitionSpec): string[] {
    return [];
  }

  public emitStructureDefinition(spec: IDefinitionSpec): string | null {
    return null;
  }

  public emitDeserializationHeader(spec: IDefinitionSpec): string | null {
    return null;
  }

  public emitDeserializationImplementation(spec: IDefinitionSpec): string | null {
    return null;
  }

  public emitDeserializationFragment(info: IDeserializationInfo): string {
    return `
if (!${info.from}.IsValid() || ${info.from}->IsNull())
{
  ${info.into}.HasValue = false;
  ${info.into}.Value = 0;
}
else
{
  ${info.into}.HasValue = true;
  ${info.into}.Value = (float)(${info.from}->AsNumber());
}
`;
  }

  public emitSerializationHeader(spec: IDefinitionSpec): string | null {
    return null;
  }

  public emitSerializationImplementation(spec: IDefinitionSpec): string | null {
    return null;
  }

  public emitSerializationFragment(info: IDeserializationInfo): string {
    return `
if (${info.from}.HasValue)
{
  ${info.into} = MakeShareable(new FJsonValueNumber(${info.from}.Value));
}
else
{
  ${info.into} = MakeShareable(new FJsonValueNull());
}
`;
  }

  public getAssignmentFrom(spec: ITypeSpec, variable: string): string {
    return variable;
  }

  public getDefaultInitialiser(spec: ITypeSpec): string {
    return `FNullableFloat(false, 0)`;
  }

  public pushOntoQueryStringArray(arrayVariable: string, spec: IParameterSpec): string | null {
    return `
if (this->Field_${spec.name}.HasValue)
{
  ${arrayVariable}.Add(FString::Printf(TEXT("${spec.name}=%f"), (float)(this->Field_${spec.name}.Value)));
}
`;
  }

  public getCustomResponseHandler(spec: ITypeSpec): string {
    return '';
  }
}