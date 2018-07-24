import { registerApiHotpatch, IApiHotpatchRequest, IApiHotpatchResponse } from "hotpatching";
import { HiveMP } from "./hivemp";

export default function hotpatch<Req, Resp>(
  id: string,
  callback: (request: IApiHotpatchRequest<Req>) => Promise<Resp>
) {
  registerApiHotpatch(id, async (request: IApiHotpatchRequest<Req>) => {
    try {
      return {
        code: 200,
        response: await callback(request)
      }
    } catch (e) {
      if (e.responseTextIsValid) {
        return {
          code: e.httpStatusCode,
          response: e.error,
        };
      } else {
        return {
          code: e.httpStatusCode || 500,
          response: {
            code: 7001,
            message: e.message,
            fields: null,
            data: {
              internalExceptionMessage: e.message,
              internalExceptionStackTrace: e.stackTrace
            }
          } as HiveMP.HiveMPSystemError,
        };
      }
    }
  })
}