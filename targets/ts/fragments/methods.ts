import { IMethodReturnTypes } from "../return";

export function implementationMethodDeclarations(values: {
  apiId: string,
  methodName: string,
  methodOperationId: string,
  methodPath: string,
  methodHttpMethod: string,
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
    returnCode = `return JSON.parse(response.text) as ${values.returnTypes.syncType};`;
  }
  return `
    public async ${values.methodName}(req: ${values.methodName}Request): ${values.returnTypes.promiseType} {
      const request = superagent
        .${invokeName}(this.baseUrlFactory() + '${values.methodPath}')
        .set('Content-Type', 'application/json');
      const qs: { [id: string]: string } = {};
      ${values.parameterQueryLoadingCode}
      ${values.parameterBodyLoadingCode}
      request.query(qs);
      request.set('X-API-Key', this.apiKeyFactory());
      const response = await request;
      if (response.ok) {
        ${returnCode}
      } else {
        if (response.serverError) {
          throw HiveMPErrorFactory.createApiError(JSON.parse(response.body) as HiveMPSystemError);
        } else {
          throw HiveMPErrorFactory.createClientError(response);
        }
      }
    }
`;
}