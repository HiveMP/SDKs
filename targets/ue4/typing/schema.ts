import { IUnrealEngineType, resolveType, IDeserializationInfo, ISerializationInfo } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec, IPropertySpec } from '../../common/typeSpec';
import { normalizeTypeName } from "../../common/normalize";
import { escapeForMultilineComment } from "../../cpp/escape";
import { isErrorStructure } from "../../common/error";
import { avoidConflictingCPlusPlusNames } from "../../cpp/naming";

export class SchemaType implements IUnrealEngineType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.schema !== undefined;
  }

  private getNamespace(spec: ITypeSpec): string {
    if (isErrorStructure(spec.schema)) {
      return '';
    } else {
      return spec.namespace;
    }
  }

  private translateSpecialPropertyName(spec: ITypeSpec, property: IPropertySpec) {
    if (spec.schema === 'HiveMPSystemError') {
      switch (property.name) {
        case 'code':
          return 'ErrorCode';
        case 'message':
          return 'Message';
        case 'fields':
          return 'Parameter';
        default:
          return avoidConflictingCPlusPlusNames(property.name);
      }
    }
    return avoidConflictingCPlusPlusNames(property.name);
  }

  public getCPlusPlusInType(spec: ITypeSpec): string {
    if (isErrorStructure(spec.schema) && spec.schema === 'HiveMPSystemError') {
      return 'struct FHiveApiError';
    }
    
    return 'struct FHive' + this.getNamespace(spec) + '_' + normalizeTypeName(spec.schema);
  }

  public getCPlusPlusOutType(spec: ITypeSpec): string {
    if (isErrorStructure(spec.schema) && spec.schema === 'HiveMPSystemError') {
      return 'const struct FHiveApiError&';
    }
    
    return 'const struct FHive' + this.getNamespace(spec) + '_' + normalizeTypeName(spec.schema) + '&';
  }

  public getNameForDependencyEmit(spec: ITypeSpec): string | null {
    return spec.schema;
  }

  public getDependencies(spec: IDefinitionSpec): string[] {
    return spec.properties.map(value => resolveType(value).getNameForDependencyEmit(value)).filter(x => x !== null);
  }

  public getBaseFilenameForDependencyEmit(spec: ITypeSpec): string | null {
    if (isErrorStructure(spec.schema)) {
      return 'Struct__common_' + normalizeTypeName(spec.schema);
    }
    
    return 'Struct_' + spec.namespace + '_' + normalizeTypeName(spec.schema);
  }

  public getDependenciesBaseFilenames(spec: IDefinitionSpec): string[] {
    return spec.properties.map(value => resolveType(value).getBaseFilenameForDependencyEmit(value)).filter(x => x !== null);
  }

  private getContainerClassName(spec: IDefinitionSpec): string {
    return `UHive${this.getNamespace(spec)}_ArrayContainer_${normalizeTypeName(spec.schema)}`;
  }

  public emitStructureDefinition(spec: IDefinitionSpec): string | null {
    const friendlyName = isErrorStructure(spec.schema) ? '' : spec.apiFriendlyName + ', ';
    let structDeclName = 'struct HIVEMPSDK_API FHive' + this.getNamespace(spec) + '_' + normalizeTypeName(spec.schema);
    if (isErrorStructure(spec.schema) && spec.schema === 'HiveMPSystemError') {
      structDeclName = 'struct HIVEMPSDK_API FHiveApiError';
    }

    const containerClassName = this.getContainerClassName(spec);

    let structure = `
USTRUCT(BlueprintType, meta=(DisplayName="${spec.name} (${friendlyName}HiveMP)"))
${structDeclName}
{
  GENERATED_BODY()
  
  /** In HiveMP, all structs can be nullable in API requests and responses. This property allows you to set or get whether or not the struct is actually null. */
  UPROPERTY(BlueprintReadWrite, meta = (DisplayName = "Has Value?"))
  bool _HasValue;

`;
    if (spec.schema === 'HiveMPSystemError') {
      structure += `
  /** The HTTP status code associated with this error, or 0 if there is no HTTP status code. */
  UPROPERTY(EditAnywhere, BlueprintReadWrite, meta = (DisplayName = "HTTP Status Code"))
  FNullableInt32 HttpStatusCode;
`;
    }
    for (const property of spec.properties) {
      const ueType = resolveType(property);
      let cPlusPlusType = this.isSelfReferencingArrayProperty(spec, property) ? (containerClassName + '*') : ueType.getCPlusPlusInType(property);
      structure += `
  /** ${escapeForMultilineComment(property.description)} */
  UPROPERTY(EditAnywhere, BlueprintReadWrite)
  ${cPlusPlusType} ${this.translateSpecialPropertyName(spec, property)};
`;
    }
    structure += `
};
`;

    if (this.isSelfReferencingWithArrays(spec)) {
      structure = `
class ${containerClassName};
`;
    }

    return structure;
  }

  public isSelfReferencingArrayProperty(spec: IDefinitionSpec, property: IPropertySpec): boolean {
    if (property.type === 'array') {
      if (resolveType(property.items).getCPlusPlusInType(property.items) == this.getCPlusPlusInType(spec)) {
        return true;
      }
    }
    return false;
  }

  public isSelfReferencingWithArrays(spec: IDefinitionSpec): boolean {
    for (const property of spec.properties) {
      if (this.isSelfReferencingArrayProperty(spec, property)) {
        return true;
      }
    }
    return false;
  }
  
  public requiresArrayContainerImplementation(spec: IDefinitionSpec): boolean {
    return this.isSelfReferencingWithArrays(spec);
  }

  public emitStructureArrayContainerDefinition(spec: IDefinitionSpec): string | null {
    const containerClassName = this.getContainerClassName(spec);
    return `
UCLASS()
class HIVEMPSDK_API ${containerClassName} : public UObject
{
	GENERATED_BODY()

public:

  UPROPERTY()
	TArray<${this.getCPlusPlusInType(spec)}> _Data;
};
`;
  }

  public emitStructureArrayContainerBPLDefinition(spec: IDefinitionSpec): string | null {
    const containerClassName = this.getContainerClassName(spec);
    return `
UCLASS()
class HIVEMPSDK_API ${containerClassName}_BPL : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

public:

	UFUNCTION(BlueprintPure, meta = (DisplayName = "ToArrayContainer (${spec.name})", Keywords = "array cast convert from create"), Category = "HiveMP|Utilities")
  static ${containerClassName}* Conv_${spec.name}sTo${spec.name}ArrayContainer(const TArray<${this.getCPlusPlusInType(spec)}>& InArray);

	UFUNCTION(BlueprintPure, meta = (DisplayName = "FromArrayContainer (${spec.name})", Keywords = "array cast convert from create"), Category = "HiveMP|Utilities")
  static TArray<${this.getCPlusPlusInType(spec)}> Conv_${spec.name}ArrayContainerTo${spec.name}s(const ${containerClassName}* InContainer);

};
`;
  }

  public emitStructureArrayContainerBPLImplementation(spec: IDefinitionSpec): string | null {
    const containerClassName = this.getContainerClassName(spec);
    return `
${containerClassName}* ${containerClassName}_BPL::Conv_${spec.name}sTo${spec.name}ArrayContainer(const TArray<${this.getCPlusPlusInType(spec)}>& InArray)
{
  auto Container = NewObject<${containerClassName}>();
  Container->_Data = InArray;
  return Container;
}

TArray<${this.getCPlusPlusInType(spec)}> ${containerClassName}_BPL::Conv_${spec.name}ArrayContainerTo${spec.name}s(const ${containerClassName}* InContainer)
{
  TArray<${this.getCPlusPlusInType(spec)}> Arr;
  Arr.Append(InContainer->_Data);
  return Arr;
}
`;
  }

  public emitDeserializationHeader(spec: IDefinitionSpec): string | null {
    return `
${this.getCPlusPlusInType(spec)} DeserializeFHive${this.getNamespace(spec)}_${spec.normalizedName}(TSharedPtr<FJsonObject> obj);
`;
  }

  public emitDeserializationImplementation(spec: IDefinitionSpec): string | null {
    let code = `
${this.getCPlusPlusInType(spec)} DeserializeFHive${this.getNamespace(spec)}_${spec.normalizedName}(TSharedPtr<FJsonObject> obj)
{
  ${this.getCPlusPlusInType(spec)} Target;

  Target._HasValue = true;

`;
    for (const property of spec.properties) {
      const ueType = resolveType(property);
      const name = `F_${property.name}_0`;
      code += `
  const TSharedPtr<FJsonValue> ${name} = obj->TryGetField(TEXT("${property.name}"));
`;
      if (this.isSelfReferencingArrayProperty(spec, property)) {
        code += `
  Target.${this.translateSpecialPropertyName(spec, property)} = NewObject<${this.getContainerClassName(spec)}>();
`;
      }
      code += ueType.emitDeserializationFragment({
        spec: property,
        from: name,
        into: `Target.${this.translateSpecialPropertyName(spec, property)}` + (this.isSelfReferencingArrayProperty(spec, property) ? '->_Data' : ''),
        nestLevel: 0,
      });
    }
    code += `
  return Target;
}
`;
    return code;
  }

  public emitDeserializationFragment(info: IDeserializationInfo): string {
    return `
if (!${info.from}.IsValid() || ${info.from}->IsNull())
{
  ${info.into}._HasValue = false;
}
else
{
  const TSharedPtr<FJsonObject> _O = ${info.from}->AsObject(); 
  ${info.into} = DeserializeFHive${this.getNamespace(info.spec)}_${normalizeTypeName(info.spec.schema)}(_O);
}
`;
  }

  public emitSerializationHeader(spec: IDefinitionSpec): string | null {
    return `
TSharedPtr<FJsonObject> SerializeFHive${this.getNamespace(spec)}_${spec.normalizedName}(${this.getCPlusPlusInType(spec)} obj);
`;
  }

  public emitSerializationImplementation(spec: IDefinitionSpec): string | null {
    let code = `
TSharedPtr<FJsonObject> SerializeFHive${this.getNamespace(spec)}_${spec.normalizedName}(${this.getCPlusPlusInType(spec)} obj)
{
  TSharedPtr<FJsonObject> Target = MakeShareable(new FJsonObject());

`;
    for (const property of spec.properties) {
      const ueType = resolveType(property);
      const name = `F_${property.name}_0`;
      code += `
  TSharedPtr<FJsonValue> ${name};
`;
      if (this.isSelfReferencingArrayProperty(spec, property)) {
        code += `
  if (obj.${this.translateSpecialPropertyName(spec, property)} != nullptr)
  {
`;
      }
      code += ueType.emitSerializationFragment({
        spec: property,
        into: name,
        from: `obj.${this.translateSpecialPropertyName(spec, property)}` + (this.isSelfReferencingArrayProperty(spec, property) ? '->_Data' : ''),
        nestLevel: 0,
      });
      if (this.isSelfReferencingArrayProperty(spec, property)) {
        code += `
  }
`;
      }
      code += `
  Target->SetField(TEXT("${property.name}"), ${name});
`;
    }
    code += `

  return Target;
}
`;
    return code;
  }

  public emitSerializationFragment(info: ISerializationInfo): string {
    return `
if (${info.from}._HasValue)
{
  ${info.into} = MakeShareable(new FJsonValueObject(SerializeFHive${this.getNamespace(info.spec)}_${normalizeTypeName(info.spec.schema)}(${info.from})));
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
    return `FHive${spec.namespace}_${normalizeTypeName(spec.schema)}()`;
  }

  public pushOntoQueryStringArray(arrayVariable: string, spec: IParameterSpec): string | null {
    return '/* NOT IMPLEMENTED: Pushing schema onto query string */';
  }

  public pushOntoHotpatchJson(jsonObjectVariable: string, spec: IParameterSpec): string | null {
    return `
{
  TSharedPtr<FJsonValue> TargetValue;
  ${this.emitSerializationFragment({
    nestLevel: 0,
    from: `this->Field_${spec.name}`,
    into: 'TargetValue',
    spec: spec
  })}
  ${jsonObjectVariable}->SetField(TEXT("${spec.name}"), TargetValue);
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