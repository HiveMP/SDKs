import { getB64Import } from './context';
export { clientPrefix, clientSuffix } from './fragments/client';
export { implementationMethodDeclarations } from './fragments/methods';

export function getNodeJsHeader() {
  return `
// tslint:disable

import * as superagent from 'superagent';
import * as moment from 'moment';
${getB64Import()}

export interface IHiveMPClient {
  apiKeyFactory: () => string;
  baseUrlFactory: () => string;
  getOriginalApiId: () => string;
  getOriginalBasePath: () => string;
  invocationWrapper: HiveMPInvocationWrapper<any> | null;
}

export interface PaginatedResults<T> {
  next: string | null;
  moreResults: boolean | null;
  results: (T | null)[] | null;
}

export interface HiveMPInvocationWrapper<T> {
  (methodToInvoke: () => Promise<T>): Promise<T>;
}

export interface HiveMPClientConstructable {
  new(apiKey?: (string | (() => string))): IHiveMPClient;
}

export class HiveMPError extends Error {
  public _hiveMPErrorType: string = '';
  public redirectTarget?: string;
  public apiError?: HiveMPSystemError;
  public nestedErr?: any;
}

export interface HiveMPSystemErrorWithTimeout extends HiveMPSystemError {
  isTimeout: boolean;
}

export class HiveMPErrorFactory {

  // ======== redirect errors =========

  public static createRedirectError(redirectTarget: string): Error {
    const err = new HiveMPError('Internal server-side redirect');
    err._hiveMPErrorType = 'redirect';
    err.redirectTarget = redirectTarget;
    return err;
  }
  
  public static isRedirectError(err: any): boolean {
    return err._hiveMPErrorType == 'redirect' && err.redirectTarget != undefined;
  }
  
  public static getRedirectErrorRedirect(err: any): string {
    if (err._hiveMPErrorType == 'redirect' && err.redirectTarget != undefined) {
      return err.redirectTarget;
    }
    throw new Error('Invalid use of getRedirectErrorRedirect');
  }
  
  // ======== API errors =========

  public static createApiError(apiError: HiveMPSystemError): Error {
    const suffix = apiError.fields == null ? '' : (' (' + apiError.fields + ')');
    const err = new HiveMPError('#' + apiError.code + ': ' + apiError.message + suffix);
    err._hiveMPErrorType = 'api-error';
    err.apiError = apiError;
    return err;
  }

  public static isApiError(err: any): boolean {
    if (err === "Can't read from server.  It may not have the appropriate access-control-origin settings.") {
      // Timeout or unreachable.
      return true;
    }
    return err._hiveMPErrorType == 'api-error' && err.apiError != undefined;
  }

  public static getApiErrorData(err: any): HiveMPSystemErrorWithTimeout {
    if (err === "Can't read from server.  It may not have the appropriate access-control-origin settings.") {
      // Timeout or unreachable.
      return {
        code: 0,
        message: err,
        fields: null,
        isTimeout: true,
        data: {},
      };
    }
    if (err._hiveMPErrorType == 'api-error' && err.apiError != undefined) {
      return {
        ...err.apiError,
        isTimeout: false,
      };
    }
    throw new Error('Invalid use of getApiErrorData');
  }
  
  // ======== session expiry errors =========

  public static createSessionExpiredError(): Error {
    const err = new HiveMPError('Session expired; redirecting to login page');
    err._hiveMPErrorType = 'session-expired';
    return err;
  }

  public static isSessionExpiredError(err: any): boolean {
    return err._hiveMPErrorType == 'session-expired';
  }

  // ======== client response errors =========

  public static createClientError(response: superagent.Response): Error {
    const err = new HiveMPError('Unexpected response status ' + response.status + '. Are you offline?');
    err._hiveMPErrorType = 'client-error';
    return err;
  }

  public static isClientError(err: any): boolean {
    return err._hiveMPErrorType == 'client-error';
  }

  // ======== unknown errors =========

  public static createUnknownError(nestedErr: any): Error {
    const err = new HiveMPError('Unknown error occurred during request. Are you offline?');
    err._hiveMPErrorType = 'unknown-error';
    err.nestedErr = nestedErr;
    return err;
  }

  public static isUnknownError(err: any): boolean {
    return err._hiveMPErrorType == 'unknown-error';
  }

};

`;
}

export function namespaceBegin(namespace: string) {
  return `
export namespace ${namespace}
{
`;
}

export const namespaceEnd = `
}
`