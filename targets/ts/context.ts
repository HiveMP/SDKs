import { IDefinitionSpec, ITypeSpec } from "../common/typeSpec";
import { resolveType } from "./typing";
import { isErrorStructure } from "../common/error";

let registeredTypes = new Map<string, IDefinitionSpec>();
let requiredSerializers = new Map<string, ITypeSpec>();
let requiredDeserializers = new Map<string, ITypeSpec>();
let needsEncode = false;
let needsDecode = false;

function computeId(spec: ITypeSpec) {
  if (isErrorStructure(spec.schema)) {
    return spec.schema;
  }
  return spec.namespace + '_' + spec.schema;
}

export function usedB64Encode() {
  needsEncode = true;
}

export function usedB64Decode() {
  needsDecode = true;
}

export function getB64Import() {
  if (needsEncode) {
    if (needsDecode) {
      return `import { encode as encodeb64, decode as decodeb64 } from 'base64-arraybuffer';`;
    } else {
      return `import { encode as encodeb64 } from 'base64-arraybuffer';`;
    }
  } else {
    if (needsDecode) {
      return `import { decode as decodeb64 } from 'base64-arraybuffer';`;
    } else {
      return ``;
    }
  }
}

export function usedSerializer(spec: ITypeSpec) {
  requiredSerializers.set(computeId(spec), spec);
}

export function usedDeserializer(spec: ITypeSpec) {
  requiredDeserializers.set(computeId(spec), spec);
}

export function registerType(spec: IDefinitionSpec) {
  registeredTypes.set(computeId(spec), spec);
}

export function emitSerializerAndDeserializerImplementations() {
  let emittedSerializers = new Set<string>();
  let emittedDeserializers = new Set<string>();
  let requiresAdditionalPass = true;
  let lastSerializerCount = requiredSerializers.size;
  let lastDeserializerCount = requiredDeserializers.size;
  let code = '';
  while (requiresAdditionalPass) {
    for (const key of requiredSerializers.keys()) {
      if (emittedSerializers.has(key)) {
        continue;
      }
      const defSpec = registeredTypes.get(key);
      if (defSpec === undefined) {
        continue;
      }
      const type = resolveType(defSpec);
      code += type.emitSerializationImplementation(defSpec);
      emittedSerializers.add(key);
    }
    for (const key of requiredDeserializers.keys()) {
      if (emittedDeserializers.has(key)) {
        continue;
      }
      const defSpec = registeredTypes.get(key);
      if (defSpec === undefined) {
        continue;
      }
      const type = resolveType(defSpec);
      code += type.emitDeserializationImplementation(defSpec);
      emittedDeserializers.add(key);
    }

    requiresAdditionalPass = 
      (lastSerializerCount != requiredSerializers.size) ||
      (lastDeserializerCount != requiredDeserializers.size);
    lastSerializerCount = requiredSerializers.size;
    lastDeserializerCount = requiredDeserializers.size;
  }
  return code;
}