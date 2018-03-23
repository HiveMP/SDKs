import 'es6-promise/auto';
import './typedarray-load';

import * as timers from 'timers';
import * as console from 'console';
import * as curl from './curl';
import * as hotpatching from 'hotpatching';
import * as qs from 'query-string';
import { HiveMP } from './hivemp';

var t: HiveMP.Attribute.AttributeData;

async function delay(ms: number) {
  return new Promise<void>((resolve, reject) => {
    timers.setTimeout(() => {
      resolve();
    }, ms);
  })
}

async function beginDelayTest() {
  console.log('delay test: begin');

  await delay(2000);

  console.log('delay test: after first 2s delay');

  await delay(2000);

  console.log('delay test: after second 2s delay');
}

async function sessionPut(request: hotpatching.IApiHotpatchRequest): Promise<hotpatching.IApiHotpatchResponse> {
  try {
    return {
      code: 200,
      response: await HiveMP.TemporarySession.TemporarySessionClient.sessionPUT({
        apiKey: request.apiKey,
        baseUrl: request.endpoint
      }, {
        // No parameters...
      })
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
}

hotpatching.registerApiHotpatch('temp-session:sessionPUT', sessionPut);

beginDelayTest();