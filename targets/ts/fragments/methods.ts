import { IMethodReturnTypes } from "../return";

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
    returnCode = `return JSON.parse(response.text, reviveValue) as ${values.returnTypes.syncType};`;
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
          throw HiveMPErrorFactory.createApiError(JSON.parse(response.text, reviveValue) as HiveMPSystemError);
        } else {
          throw HiveMPErrorFactory.createClientError(response);
        }
      }
    }
`;
}