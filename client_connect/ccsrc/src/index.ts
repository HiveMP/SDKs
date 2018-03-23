import 'es6-promise/auto';

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
  let response = await curl.fetch({
    url: "https://temp-session-api.hivemp.com/v1/session",
    method: "PUT",
    headers: {
      'X-API-Key': request.apiKey
    }
  });
  return {
    code: response.statusCode,
    response: JSON.parse(response.responseText),
  };
}

hotpatching.registerApiHotpatch('temp-session:sessionPUT', sessionPut);

beginDelayTest();