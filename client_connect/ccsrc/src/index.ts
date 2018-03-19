import * as curl from './curl';

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

curl.makeApiRequest();

register_hotpatch("temp-session:sessionPUT", testHook);