import { ICSharpType, resolveType } from "../typing";
import { ITypeSpec, IDefinitionSpec, IParameterSpec } from "../../common/typeSpec";
import { normalizeTypeName } from "../../common/normalize";
import { escapeForXmlComment } from "../escape";
import { camelCase } from "../naming";

export class SchemaType implements ICSharpType {
  public doesHandleType(spec: ITypeSpec): boolean {
    return spec.schema !== undefined;
  }
  
  public getCSharpType(spec: ITypeSpec): string {
    return spec.namespace + '.' + normalizeTypeName(spec.schema);
  }

  public emitStructureDefinition(spec: IDefinitionSpec): string | null {
    const className = spec.name.replace(/(\[|\])/g, '');

    let code = `
    [System.CodeDom.Compiler.GeneratedCode("HiveMP SDK Generator", "1.0.0.0")]
    public class ${className}
    {
        static ${className}()
        {
            HiveMP.Api.HiveMPSDKSetup.EnsureInited();
        }
`;
    
    for (const property of spec.properties) {
      // Normalize name. C# does not allow properties to have the same
      // name as the enclosing type.
      let name = camelCase(property.name);
      if (name === className) {
        name = '_' + name;
      }
      
      const csType = resolveType(property);

      code += `
      /// <summary>
      /// ${escapeForXmlComment(spec.description, "        /// ")}
      /// </summary>
      [Newtonsoft.Json.JsonProperty("${spec.name}")]
      public ${csType.getCSharpType(property)} ${name} { get; set; }
`;
    }
    code += `
    }
`;

    return code;
  }

  public pushOntoQueryStringArray(spec: IParameterSpec): string | null {
    return null;
  }
}