import { IUnrealEngineType, resolveType, IDeserializationInfo, ISerializationInfo } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from '../../common/typeSpec';
import { resolve } from "path";

export class ArrayType implements IUnrealEngineType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.type === 'array';
  }

  public getCPlusPlusInType(spec: ITypeSpec): string {
    return 'TArray<' + resolveType(spec.items).getCPlusPlusInType(spec.items) + '>';
  }

  public getCPlusPlusOutType(spec: ITypeSpec): string {
    return 'const TArray<' + resolveType(spec.items).getCPlusPlusInType(spec.items) + '>&';
  }

  public getNameForDependencyEmit(spec: ITypeSpec): string | null {
    return resolveType(spec.items).getNameForDependencyEmit(spec.items);
  }

  public getDependencies(spec: IDefinitionSpec): string[] {
    return [];
  }

  public getBaseFilenameForDependencyEmit(spec: ITypeSpec): string | null {
    return resolveType(spec.items).getBaseFilenameForDependencyEmit(spec.items);
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
    const arrayName = `_A${info.nestLevel}`;
    const itemName = `_I${info.nestLevel}`;
    const ueItemType = resolveType(info.spec.items);
    return `
if (!${info.from}.IsValid() || ${info.from}->IsNull())
{
  ${info.into}.Empty();
}
else
{
  const TArray<TSharedPtr<FJsonValue>> ${arrayName} = ${info.from}->AsArray();
  for (int i = 0; i < ${arrayName}.Num(); i++)
  {
    ${ueItemType.getCPlusPlusInType(info.spec.items)} ${itemName};
    ${ueItemType.emitDeserializationFragment({
      spec: info.spec.items,
      from: `${arrayName}[i]`,
      into: itemName,
      nestLevel: info.nestLevel + 1,
    })}
    ${info.into}.Add(${itemName});
  }
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
    const arrayName = `_A${info.nestLevel}`;
    const itemName = `_I${info.nestLevel}`;
    const ueItemType = resolveType(info.spec.items);
    return `
{
  TArray<TSharedPtr<FJsonValue>> ${arrayName};
  for (int i = 0; i < ${info.from}.Num(); i++)
  {
    TSharedPtr<FJsonValue> ${itemName};
    ${ueItemType.emitSerializationFragment({
      spec: info.spec.items,
      from: `${info.from}[i]`,
      into: itemName,
      nestLevel: info.nestLevel + 1,
    })}
    ${arrayName}.Add(${itemName});
  }
  ${info.into} = MakeShareable(new FJsonValueArray(${arrayName}));
}
`;
  }
  
  public requiresArrayContainerImplementation(spec: IDefinitionSpec): boolean {
    return false;
  }

  public emitStructureArrayContainerDefinition(spec: IDefinitionSpec): string | null {
    return null;
  }

  public emitStructureArrayContainerBPLDefinition(spec: IDefinitionSpec): string | null {
    return null;
  }

  public emitStructureArrayContainerBPLImplementation(spec: IDefinitionSpec): string | null {
    return null;
  }

  public getAssignmentFrom(spec: ITypeSpec, variable: string): string {
    return `${this.getCPlusPlusInType(spec)}(${variable})`;
  }

  public getDefaultInitialiser(spec: ITypeSpec): string {
    return `${this.getCPlusPlusInType(spec)}()`;
  }

  public pushOntoQueryStringArray(arrayVariable: string, spec: IParameterSpec): string | null {
    return '/* NOT IMPLEMENTED: Pushing array onto query string */';
  }

  public pushOntoHotpatchJson(jsonObjectVariable: string, spec: IParameterSpec): string | null {
    return `
  {
    TSharedPtr<FJsonValueArray> Target;
    ${this.emitSerializationFragment({
      nestLevel: 0,
      from: `this->Field_${spec.name}`,
      into: 'Target',
      spec: spec
    })}
    ${jsonObjectVariable}->SetField(TEXT("${spec.name}"), Target);
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