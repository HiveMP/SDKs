import * as curlNative from 'curl-native';

export async function fetch(request: curlNative.Request): Promise<curlNative.Response> {
  return new Promise<curlNative.Response>((resolve, reject) => {
    curlNative.fetch(request, resolve, reject);
  });
}