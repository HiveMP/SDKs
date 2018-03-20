declare interface IHotpatchRequest {
  id: string;
  endpoint: string;
  apiKey: string;
  parameters: { [id: string]: string };
}

declare interface IHotpatchResponse {
  code: number;
  response: any;
}

declare function register_hotpatch(id: string, handler: (request: IHotpatchRequest) => IHotpatchResponse): void;

type ClientConnectRequireFunction = (id: string) => any;

declare var require: ClientConnectRequireFunction;

declare var global: any;