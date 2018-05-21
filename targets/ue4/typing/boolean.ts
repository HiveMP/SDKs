import { IUnrealEngineType, IDeserializationInfo } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from '../../common/typeSpec';

export class BooleanType implements IUnrealEngineType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'boolean';
  }

  public getCPlusPlusInType(spec: ITypeSpec): string {
    return 'FNullableBoolean';
  }

  public getCPlusPlusOutType(spec: ITypeSpec): string {
    return 'const FNullableBoolean&';
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
if (!${info.from}}.IsValid() || ${info.from}->IsNull())
{
  ${info.into}.HasValue = false;
  ${info.into}.Value = false;
}
else
{
  ${info.into}.HasValue = true;
  ${info.into}.Value = ${info.from}->AsBool();
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
  ${info.into} = MakeShareable(new FJsonValueBool(${info.from}.Value));
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
    return `false`;
  }

  public pushOntoQueryStringArray(arrayVariable: string, spec: IParameterSpec): string | null {
    return `
if (this->Field_${spec.name}.HasValue)
{
  ${arrayVariable}.Add(FString::Printf("${spec.name}=%s", this->Field_${spec.name}.Value ? TEXT("true") : TEXT("false")));
}
`;
  }

  public getCustomResponseHandler(spec: ITypeSpec, logContext: string): string {
    return  `
if (Response->GetContentAsString().Equals(TEXT("true")))
{
  struct FHiveApiError ResultError;
  UE_LOG_HIVE(Warning, TEXT("[success] ${logContext}"));
  OnSuccess.Broadcast(true, ResultError);
  return;
}
else if (Response->GetContentAsString().Equals(TEXT("false")))
{
  struct FHiveApiError ResultError;
  UE_LOG_HIVE(Warning, TEXT("[success] ${logContext}"));
  OnSuccess.Broadcast(false, ResultError);
  return;
}
`
  }
}