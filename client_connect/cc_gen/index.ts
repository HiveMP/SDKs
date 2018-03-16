import { readFileSync } from 'fs';
import { join } from 'path';

let steamApiJson = JSON.parse(readFileSync(join(__dirname, '../steam/steam_api.json'), 'utf8'));
let steamTypeScript = '';
let steamC = '';

for (let def of steamApiJson.enums) {
  steamTypeScript += `
export enum ${def.enumname.replace(/::/g, '__')}
{
  ${def.values.map((x) => `${x.name} = ${x.value}`).join(",\n  ")}
}
`;
}

for (let def of steamApiJson.consts) {
  steamTypeScript += `
const ${def.constname} = ${def.constval};
export ${def.constname};
`;
}

for (let def of steamApiJson.structs) {
  steamTypeScript += `
export interface ${def.struct.replace(/::/g, '__')} {`;
  for (let fdef of def.fields) {
    steamTypeScript += `
  ${fdef.fieldname}: any;`;
  }
  steamTypeScript += `
}
`;
}

console.log(steamTypeScript);