import { IUnrealEngineType, IDeserializationInfo, ISerializationInfo } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from "../../common/typeSpec";

export class StringType implements IUnrealEngineType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'string' &&
      spec.format !== 'byte';
  }

  public getCPlusPlusInType(spec: ITypeSpec): string {
    return 'FNullableString';
  }

  public getCPlusPlusOutType(spec: ITypeSpec): string {
    return 'const FNullableString&';
  }

  public getNameForDependencyEmit(spec: ITypeSpec): string | null {
    return null;
  }

  public getDependencies(spec: IDefinitionSpec): string[] {
    return [];
  }

  public getBaseFilenameForDependencyEmit(spec: ITypeSpec): string | null {
    return null;
  }

  public getDependenciesBaseFilenames(spec: IDefinitionSpec): string[] {
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
  ${info.into}.Value = TEXT("");
}
else
{
  ${info.into}.HasValue = true;
  ${info.into}.Value = ${info.from}->AsString();
}
`;
  }

  public emitSerializationHeader(spec: IDefinitionSpec): string | null {
    return null;
  }

  public emitSerializationImplementation(spec: IDefinitionSpec): string | null {
    return null;
  }

  public emitSerializationFragment(info: ISerializationInfo): string {
    return `
if (${info.from}.HasValue)
{
  ${info.into} = MakeShareable(new FJsonValueString(${info.from}.Value));
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
    return `FNullableString(false, TEXT(""))`;
  }

  public pushOntoQueryStringArray(arrayVariable: string, spec: IParameterSpec): string | null {
    return `
if (this->Field_${spec.name}.HasValue)
{
  ${arrayVariable}.Add(FString::Printf(TEXT("${spec.name}=%s"), *FGenericPlatformHttp::UrlEncode(this->Field_${spec.name}.Value)));
}
`;
  }

  public pushOntoHotpatchJson(jsonObjectVariable: string, spec: IParameterSpec): string | null {
    return `
if (this->Field_${spec.name}.HasValue)
{
  ${jsonObjectVariable}->SetStringField(TEXT("${spec.name}"), this->Field_${spec.name}.Value);
}
else
{
  ${jsonObjectVariable}->SetField(TEXT("${spec.name}"), MakeShareable(new FJsonValueNull()));
}
`;
  }

  public getCustomResponseHandler(spec: ITypeSpec): string {
    return '';
  }

  public getCustomHotpatchResponseHandler(spec: ITypeSpec): string {
    return '';
  }
}