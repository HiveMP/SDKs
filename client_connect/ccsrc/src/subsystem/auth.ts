import * as hotpatching from 'hotpatching';
import * as process from 'process';
import * as steam from 'steam';
import { HiveMP } from '../hivemp';
import hotpatch from '../hotpatch';

async function authenticatePUT(request: hotpatching.IApiHotpatchRequest<HiveMP.UserSession.UserSessionClient.AuthenticatePUTRequest>): Promise<HiveMP.UserSession.AuthenticationResponse> {
  if (process.env.ITCHIO_API_KEY !== undefined) {
    request.parameters.authentication.tokens.itchIoTokens.push({
      apiKey: process.env.ITCHIO_API_KEY,   
    });
  }
  if (steam.isAvailable()) {
    try {
      const userTicket = await new Promise<string>((resolve, reject) => steam.getAuthTicket(resolve, reject));
      request.parameters.authentication.tokens.steamTokens.push({
        userTicket
      });
    } catch (e) {
      // We couldn't get an authentication ticket from Steam.
    }
  }
  return await HiveMP.UserSession.UserSessionClient.authenticatePUT({
    apiKey: request.apiKey,
    baseUrl: request.endpoint,
  }, request.parameters);
}

export function init() {
  hotpatch("user-session:authenticatePUT", authenticatePUT);
}