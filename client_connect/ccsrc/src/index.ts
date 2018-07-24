import 'es6-promise/auto';
import './typedarray-load';

import * as hotpatching from 'hotpatching';
import { HiveMP } from './hivemp';
import hotpatch from './hotpatch';
import * as process from 'process';

async function authenticatePUT(request: hotpatching.IApiHotpatchRequest<HiveMP.UserSession.UserSessionClient.AuthenticatePUTRequest>): Promise<HiveMP.UserSession.AuthenticationResponse> {
  if (process.env.ITCHIO_API_KEY !== undefined) {
    request.parameters.authentication.tokens.itchIoTokens.push({
      apiKey: process.env.ITCHIO_API_KEY,   
    });
  }
  return await HiveMP.UserSession.UserSessionClient.authenticatePUT({
    apiKey: request.apiKey,
    baseUrl: request.endpoint,
  }, request.parameters);
}

hotpatch("user-session:authenticatePUT", authenticatePUT);