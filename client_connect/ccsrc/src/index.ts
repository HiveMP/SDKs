import 'es6-promise/auto';

import * as timers from 'timers';
import * as console from 'console';

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
  console.log("hello 1");
  await delay(2000);
  console.log("hello 2");
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