import { IUnrealEngineType, IDeserializationInfo } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from "../../common/typeSpec";

export class ByteArrayType implements IUnrealEngineType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'string' &&
      spec.format === 'byte';
  }

  public getCPlusPlusInType(spec: ITypeSpec): string {
    return 'FNullableByteArray';
  }

  public getCPlusPlusOutType(spec: ITypeSpec): string {
    return 'const FNullableByteArray&';
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
  ${info.into}.Value.Empty();
}
else
{
  ${info.into}.HasValue = true;
  FBase64::Decode(${info.from}->AsString(), ${info.into}.Value);
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
  ${info.into} = MakeShareable(new FJsonValueString(FBase64::Encode(${info.from}.Value)));
}
else
{
  ${info.into} = MakeShareable(new FJsonValueNull());
}
`;
  }

  public getAssignmentFrom(spec: ITypeSpec, variable: string): string {
    return `FNullableByteArray(${variable}.HasValue, TArray<uint8>(${variable}.Value))`;
  }

  public getDefaultInitialiser(spec: ITypeSpec): string {
    return `FNullableByteArray(false, TArray<uint8>())`;
  }

  public getQueryStringEncodingParameter(spec: IParameterSpec): string | null {
    return null;
  }

  public pushOntoQueryStringArray(arrayVariable: string, spec: IParameterSpec): string | null {
    return `
if (this->Field_${spec.name}.HasValue)
{
  ${arrayVariable}.Add(FString::Printf(TEXT("${spec.name}=%s"), *FGenericPlatformHttp::UrlEncode(FBase64::Encode(this->Field_${spec.name}.Value))));
}
`;
  }

  public getCustomResponseHandler(spec: ITypeSpec): string {
    return '';
  }
}