import * as curlNative from 'curl-native';

export interface Request {
  url?: string;
  userAgent?: string;
  method?: string;
  headers?: { [name: string]: string };
}

export interface Response {
  responseText: string;
  statusCode: number;
}

export async function fetch(request: Request): Promise<Response> {
  let headers: string[] | undefined = undefined;
  if (request.headers !== undefined) {
    headers = [];
    for (let key in request.headers) {
      headers.push(key + ": " + request.headers[key]);
    }
  }

  let nativeRequest: curlNative.Request = {
    url: request.url,
    userAgent: request.userAgent,
    method: request.method,
    headers: headers
  };

  return new Promise<curlNative.Response>((resolve, reject) => {
    curlNative.fetch(nativeRequest, resolve, reject);
  });
}