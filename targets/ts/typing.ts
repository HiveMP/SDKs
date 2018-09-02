import { stripDefinition } from '../common/definition';
import { ITypeSpec, IDefinitionSpec, IPropertySpec, IParameterSpec } from '../common/typeSpec';
import { ArrayType } from './typing/array';
import { BooleanType } from './typing/boolean';
import { ByteArrayType } from './typing/byteArray';
import { EnumType } from './typing/enum';
import { FloatType } from './typing/float';
import { IntegerType } from './typing/integer';
import { StringType } from './typing/string';
import { SchemaType } from './typing/schema';
import { MapType } from './typing/map';
import { ObjectType } from './typing/object';
import { TimestampType } from './typing/timestamp';

const types: ITypeScriptType[] = [
  new ArrayType(),
  new BooleanType(),
  new ByteArrayType(),
  new EnumType(),
  new FloatType(),
  new IntegerType(),
  new MapType(),
  new ObjectType(),
  new SchemaType(),
  new StringType(),
  new TimestampType(),
];

export interface ITypeScriptType {
  doesHandleType(spec: ITypeSpec): boolean;

  getTypeScriptType(spec: ITypeSpec): string;

  emitInterfaceDefinition(spec: IDefinitionSpec): string | null;

  pushOntoQueryStringArray(spec: IParameterSpec): string | null;
}

export function resolveType(spec: ITypeSpec): ITypeScriptType {
  for (const type of types) {
    if (type.doesHandleType(spec)) {
      return type;
    }
  }

  throw new Error('Unable to resolve type for spec: ' + JSON.stringify(spec, null, 2));
}