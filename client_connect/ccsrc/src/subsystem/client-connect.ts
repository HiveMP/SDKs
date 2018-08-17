import * as hotpatching from 'hotpatching';
import { HiveMP } from '../hivemp';
import hotpatch from '../hotpatch';

async function serviceEnabledGET(request: hotpatching.IApiHotpatchRequest<HiveMP.ClientConnect.ServiceClient.ServiceEnabledGETRequest>): Promise<boolean> {
  return true;
}

async function serviceTestPUT(request: hotpatching.IApiHotpatchRequest<HiveMP.ClientConnect.ServiceClient.ServiceTestPUTRequest>): Promise<boolean> {
  if (request.parameters.testName === 'test-1') {  
    // Make sure we can call HiveMP through the HTTP handler.
    await HiveMP.ClientConnect.ServiceClient.serviceEnabledGET({
      apiKey: '',
      baseUrl: request.endpoint,
    }, {
    });
    return true;
  }

  return false;
}

export function init() {
  hotpatch("client-connect:serviceEnabledGET", serviceEnabledGET);
  hotpatch("client-connect:serviceTestPUT", serviceTestPUT);
}