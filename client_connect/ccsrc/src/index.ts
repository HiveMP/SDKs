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