import * as timers from 'timers';
import * as console from 'console';

timers.setTimeout(function () {
    console.log("hello");
}, 2000);

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