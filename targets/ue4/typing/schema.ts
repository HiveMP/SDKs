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

  public emitStructureDefinition(spec: IDefinitionSpec): string | null {
    const friendlyName = isErrorStructure(spec.schema) ? '' : spec.apiFriendlyName + ', ';
    let structDeclName = 'struct HIVEMPSDK_API FHive' + this.getNamespace(spec) + '_' + normalizeTypeName(spec.schema);
    if (isErrorStructure(spec.schema) && spec.schema === 'HiveMPSystemError') {
      structDeclName = 'struct HIVEMPSDK_API FHiveApiError';
    }

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
      structure += `
  /** ${escapeForMultilineComment(property.description)} */
  UPROPERTY(EditAnywhere, BlueprintReadWrite)
  ${ueType.getCPlusPlusInType(property)} ${this.translateSpecialPropertyName(spec, property)};
`;
    }
    structure += `
};
`;
    return structure;
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
      code += ueType.emitDeserializationFragment({
        spec: property,
        from: name,
        into: `Target.${this.translateSpecialPropertyName(spec, property)}`,
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
      code += ueType.emitSerializationFragment({
        spec: property,
        into: name,
        from: `obj.${this.translateSpecialPropertyName(spec, property)}`,
        nestLevel: 0,
      });
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