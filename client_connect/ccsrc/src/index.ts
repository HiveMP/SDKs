import 'es6-promise/auto';

import * as timers from 'timers';
import * as console from 'console';
import * as curl from './curl';

async function delay(ms: number) {
  return new Promise<void>((resolve, reject) => {
    timers.setTimeout(() => {
      resolve();
    }, ms);
  })
}

async function test() {
  console.log("start");
  await delay(2000);

  let response = await curl.fetch({
    url: "https://hivemp.com/"
  });
  console.log(response.responseText);

  await delay(2000);
}

test();

/*

function testHook(request: IHotpatchRequest): IHotpatchResponse {
  return {
    code: 201,
    response: { 
      test: "hello",
      what: [
        "even",
        { is: "this" }
      ]
    } 
  }
}

register_hotpatch("temp-session:sessionPUT", testHook);

*/