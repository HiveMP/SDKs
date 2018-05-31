import { stripDefinition } from '../common/definition';
import { ITypeSpec, IDefinitionSpec, IPropertySpec, IParameterSpec } from '../common/typeSpec';
import { ArrayType } from './typing/array';
import { BooleanType } from './typing/boolean';
import { ByteArrayType } from './typing/byteArray';
import { FloatType } from './typing/float';
import { IntegerType } from './typing/integer';
import { StringType } from './typing/string';
import { SchemaType } from './typing/schema';
import { MapType } from './typing/map';
import { ObjectType } from './typing/object';

const types: IUnrealEngineType[] = [
  new ArrayType(),
  new BooleanType(),
  new ByteArrayType(),
  new FloatType(),
  new IntegerType(),
  new MapType(),
  new ObjectType(),
  new SchemaType(),
  new StringType(),
];

export interface IDeserializationInfo {
  spec: ITypeSpec;
  from: string;
  into: string;
  nestLevel: number;
}

export interface ISerializationInfo {
  spec: ITypeSpec;
  from: string;
  into: string;
  nestLevel: number;
}

export interface IUnrealEngineType {
  doesHandleType(spec: ITypeSpec): boolean;

  getCPlusPlusInType(spec: ITypeSpec): string;

  getCPlusPlusOutType(spec: ITypeSpec): string;

  getNameForDependencyEmit(spec: ITypeSpec): string | null;

  getDependencies(spec: IDefinitionSpec): string[];

  getBaseFilenameForDependencyEmit(spec: ITypeSpec): string | null;

  getDependenciesBaseFilenames(spec: IDefinitionSpec): string[];

  emitStructureDefinition(spec: IDefinitionSpec): string | null;

  emitDeserializationHeader(spec: IDefinitionSpec): string | null;

  emitDeserializationImplementation(spec: IDefinitionSpec): string | null;

  emitDeserializationFragment(info: IDeserializationInfo): string;

  emitSerializationHeader(spec: IDefinitionSpec): string | null;

  emitSerializationImplementation(spec: IDefinitionSpec): string | null;

  emitSerializationFragment(info: ISerializationInfo): string;

  getAssignmentFrom(spec: ITypeSpec, variable: string): string;

  getDefaultInitialiser(spec: ITypeSpec): string;

  pushOntoQueryStringArray(arrayVariable: string, spec: IParameterSpec): string | null;
  
  getCustomResponseHandler(spec: ITypeSpec, logContext: string): string;
}

export function resolveType(spec: ITypeSpec): IUnrealEngineType {
  for (const type of types) {
    if (type.doesHandleType(spec)) {
      return type;
    }
  }

  throw new Error('Unable to resolve type for spec: ' + JSON.stringify(spec, null, 2));
}