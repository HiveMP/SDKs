function testHook(request: IHotpatchRequest): IHotpatchResponse {
  return {
    code: 0,
    response: { } 
  }
}

register_hotpatch("temp-session:sessionPUT", testHook);