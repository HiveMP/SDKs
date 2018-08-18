import { IUnrealEngineType, resolveType, IDeserializationInfo } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from '../../common/typeSpec';

export class ObjectType implements IUnrealEngineType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'object' &&
      spec.mapValue === undefined;
  }

  public getCPlusPlusInType(spec: ITypeSpec): string {
    return 'FString /* JSON STRING */';
  }

  public getCPlusPlusOutType(spec: ITypeSpec): string {
    return 'const FString /* JSON STRING */';
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
// Don't know how to handle
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
// Don't know how to handle
`;
  }

  public getAssignmentFrom(spec: ITypeSpec, variable: string): string {
    return variable;
  }

  public getDefaultInitialiser(spec: ITypeSpec): string {
    return `TEXT("null")`;
  }

  public pushOntoQueryStringArray(arrayVariable: string, spec: IParameterSpec): string | null {
    return `
${arrayVariable}.Add(FString::Printf(TEXT("${spec.name}=%s"), *FGenericPlatformHttp::UrlEncode(this->Field_${spec.name})));
`;
  }

  public pushOntoHotpatchJson(jsonObjectVariable: string, spec: IParameterSpec): string | null {
    return `
{
  TSharedPtr<FJsonValue> ObjectJsonValue;
  TSharedRef<TJsonReader<TCHAR>> ObjectReader = TJsonReaderFactory<>::Create(this->Field_${spec.name});
  if (!FJsonSerializer::Deserialize(ObjectReader, ObjectJsonValue) || !ObjectJsonValue.IsValid())
  {
    ${jsonObjectVariable}->SetField(TEXT("${spec.name}"), MakeShareable(new FJsonValueNull()));
  }
  else
  {
    ${jsonObjectVariable}->SetField(TEXT("${spec.name}"), ObjectJsonValue);
  }
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