import { IMethodReturnTypes } from "../return";
import { resolveType } from "../typing";

export function implementationMethodDeclarations(values: {
  apiId: string,
  methodName: string,
  methodOperationId: string,
  methodPath: string,
  methodHttpMethod: string,
  methodIsFileUpload: boolean,
  parameterBodyLoadingCode: string,
  parameterQueryLoadingCode: string,
  returnTypes: IMethodReturnTypes,
}) {
  let invokeName = values.methodHttpMethod.toLowerCase();
  if (invokeName === 'delete') {
    invokeName = 'del';
  }
  let returnCode = '';
  if (values.returnTypes.syncType !== 'void') {
    const type = resolveType(values.returnTypes.originalResponse);
    returnCode = `
{
  let result: ${values.returnTypes.syncType} | null = null;
  ${type.emitSerializationFragment({
    spec: values.returnTypes.originalResponse,
    into: 'result',
    from: `JSON.parse(response.text)`,
    nestLevel: 0,
  })}
  if (result === null) {
    throw HiveMPErrorFactory.createUnknownError(new Error('Unexpected null response from API'));
  }
  return result;
}
`;
  }
  let contentType = 'application/json';
  if (values.methodIsFileUpload) {
    contentType = 'application/octet-stream';
  }
  return `
    public async ${values.methodName}(req: ${values.methodName}Request): ${values.returnTypes.promiseType} {
      if (this.invocationWrapper === null) {
        return await this.__${values.methodName}(req);
      } else {
        return await this.invocationWrapper(() => this.__${values.methodName}(req));
      }
    }

    private async __${values.methodName}(req: ${values.methodName}Request): ${values.returnTypes.promiseType} {
      const request = superagent
        .${invokeName}(this.baseUrlFactory() + '${values.methodPath}')
        .set('Content-Type', '${contentType}');
      const qs: { [id: string]: string } = {};
      ${values.parameterQueryLoadingCode}
      ${values.parameterBodyLoadingCode}
      request.query(qs);
      request.set('X-API-Key', this.apiKeyFactory());
      let response: superagent.Response | null = null;
      let nestedErr: any = undefined;
      try {
        response = await request;
      } catch (err) {
        nestedErr = err;
        response = err.response;
      }
      if (response !== undefined && response !== null && response.ok) {
        ${returnCode}
      } else {
        if (response === undefined || response === null) {
          throw HiveMPErrorFactory.createUnknownError(nestedErr);
        } else if (response.serverError || response.clientError) {
          throw HiveMPErrorFactory.createApiError(deserialize_HiveMPSystemError(response.text) as HiveMPSystemError);
        } else {
          throw HiveMPErrorFactory.createClientError(response);
        }
      }
    }
`;
}