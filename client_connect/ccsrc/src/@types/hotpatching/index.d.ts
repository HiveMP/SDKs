declare module "hotpatching" {
  interface IApiHotpatchRequest<Req> {
    id: string;
    endpoint: string;
    operation: string;
    apiKey: string;
    parameters: Req;
  }
  
  interface IApiHotpatchResponse<Resp> {
    code: number;
    response: Resp;
  }

  function registerApiHotpatch<Req, Resp>(
    id: string,
    callback: (request: IApiHotpatchRequest<Req>) => Promise<IApiHotpatchResponse<Resp>> | IApiHotpatchResponse<Resp>
  ): void;
}