declare module "hotpatching" {
  interface IApiHotpatchRequest {
    id: string;
    endpoint: string;
    operation: string;
    apiKey: string;
    parameters: { [id: string]: string };
  }
  
  interface IApiHotpatchResponse {
    code: number;
    response: any;
  }

  function registerApiHotpatch(
    id: string,
    callback: (request: IApiHotpatchRequest) => Promise<IApiHotpatchResponse> | IApiHotpatchResponse
  ): void;
}