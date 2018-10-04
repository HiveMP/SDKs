import { IMethodSpec } from "../common/methodSpec";
import { camelCase } from "./naming";
import { getReturnTypes, IMethodReturnTypes } from "./return";
import { escapeForXmlComment } from "./escape";
import * as fragments from './fragments';
import { getParametersFromMethodParameters } from "./parameters";
import { resolveType } from "./typing";
import { normalizeWebSocketProtocolName } from "../common/normalize";

function getRequestClassConstruction(spec: IMethodSpec) {
  let createRequest = `new ${camelCase(spec.operationId)}Request
    {`;
  for (const parameter of spec.parameters) {
    const csType = resolveType(parameter);
    let name = camelCase(parameter.name);
    createRequest += `
        ${name} = @${parameter.name},`;
  }
  createRequest += `
    }`;
  return createRequest;
}

function getClientConnectResponseHandler(returnTypes: IMethodReturnTypes) {
  if (returnTypes.syncType === 'void') {
    return `
              resolve_();
              return;
`;
  } else {
    return `
              try
              {
                  resolve_(Newtonsoft.Json.JsonConvert.DeserializeObject<${returnTypes.syncType}>(@ref.BodyJson));
              } 
              catch (System.Exception exception) 
              {
                  reject_(new HiveMP.Api.HiveMPException(@ref.HttpStatusCode, new HiveMP.Api.HiveMPSystemError
                      {
                          Code = 0,
                          Message = "Could not deserialize the response body.",
                          Fields = "RESPONSE:\n\n" + @ref.BodyJson + "\n\nEXCEPTION MESSAGE:\n\n" + exception.Message,
                      }));
              }
              return;
`;
  }
}

function getClientConnectResponseHandlerAsync(returnTypes: IMethodReturnTypes) {
  if (returnTypes.syncType === 'void') {
    return `
              return;
`;
  } else {
    return `
              try
              {
                  return Newtonsoft.Json.JsonConvert.DeserializeObject<${returnTypes.syncType}>(@ref.BodyJson);
              } 
              catch (System.Exception exception) 
              {
                  throw new HiveMP.Api.HiveMPException(@ref.HttpStatusCode, new HiveMP.Api.HiveMPSystemError
                      {
                          Code = 0,
                          Message = "Could not deserialize the response body.",
                          Fields = "RESPONSE:\n\n" + @ref.BodyJson + "\n\nEXCEPTION MESSAGE:\n\n" + exception.Message,
                      });
              }
`;
  }
}

function getHttpResponseHandler(returnTypes: IMethodReturnTypes) {
  if (returnTypes.syncType === 'void') {
    return '';
  } else {
    return `
                          var result_ = default(${returnTypes.syncType}); 
                          try
                          {
                              result_ = Newtonsoft.Json.JsonConvert.DeserializeObject<${returnTypes.syncType}>(responseData_);
                              return result_; 
                          } 
                          catch (System.Exception exception) 
                          {
                              throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, new HiveMP.Api.HiveMPSystemError
                                  {
                                      Code = 0,
                                      Message = "Could not deserialize the response body.",
                                      Fields = "RESPONSE:\n\n" + responseData_ + "\n\nEXCEPTION MESSAGE:\n\n" + exception.Message,
                                  });
                          }
`;
  }
}

function getLegacyParameterXmlComments(spec: IMethodSpec) {
  let code = '';
  for (const parameter of spec.parameters) {
    let name = parameter.name[0].toUpperCase() + parameter.name.substr(1);
    code += `
/// <param name="${escapeForXmlComment(name, '')}">${escapeForXmlComment(parameter.description, "        /// ")}</param>`;
  }
  return code;
}

function getParameterQueryLoadingCode(spec: IMethodSpec) {
  let code = '';
  for (const parameter of spec.parameters) {
    if (parameter.in == "query") {
      const csType = resolveType(parameter);
      code += (csType.pushOntoQueryStringArray(parameter) || '');
    }
  }
  return code;
}

function getParameterBodyLoadingCode(spec: IMethodSpec) {
  let code = '';
  for (const parameter of spec.parameters) {
    const csType = resolveType(parameter);
    let name = camelCase(parameter.name);
    if (parameter.in == "body") {
      code += `
          content_ = Newtonsoft.Json.JsonConvert.SerializeObject(arguments.${name});
`;
      break;
    }
  }
  return code;
}

export function emitInterfaceMethodDeclarations(spec: IMethodSpec) {
  const methodName = camelCase(spec.operationId);
  const returnTypes = getReturnTypes(spec);

  const methodSummary = escapeForXmlComment(spec.summary, "        /// ");
  const methodDescription = escapeForXmlComment(spec.description, "        /// ");
  const methodNameEscaped = escapeForXmlComment(methodName, " ");

  let implementor = fragments.interfaceMethodDeclarations;
  if (spec.isWebSocket) {
    implementor = fragments.interfaceWebSocketMethodDeclarations;
  }

  return implementor({
    methodSummary: methodSummary,
    methodName: methodName,
    methodNameEscaped: methodNameEscaped,
    methodDescription: methodDescription,
    returnTypes: returnTypes
  });
}

export function emitImplementationMethodDeclarations(spec: IMethodSpec) {
  const methodName = camelCase(spec.operationId);
  const returnTypes = getReturnTypes(spec);

  const methodSummary = escapeForXmlComment(spec.summary, "        /// ");
  const methodDescription = escapeForXmlComment(spec.description, "        /// ");
  const methodNameEscaped = escapeForXmlComment(methodName, " ");

  const parameterBodyLoadingCode = getParameterBodyLoadingCode(spec);
  const parameterQueryLoadingCode = getParameterQueryLoadingCode(spec);

  const parameterDeclarations = getParametersFromMethodParameters(spec.parameters);
  const parameterDeclarationsSuffix = parameterDeclarations != '' ? ', ' : '';
  const returnSyncPrefix = returnTypes.syncType == 'void' ? '' : 'return ';
  const promiseReturnStore = returnTypes.syncType == 'void' ? '' : 'var store = ';
  const promiseReturnType = returnTypes.syncType == 'void' ? 'HiveMP.Api.HiveMPPromise' : `HiveMP.Api.HiveMPPromise<${returnTypes.syncType}>`;
  const promiseResolve = returnTypes.syncType == 'void' ? 'resolve_();' : 'resolve_(store);';
  const requestClassConstruction = getRequestClassConstruction(spec);
  const legacyParameterXmlComments = getLegacyParameterXmlComments(spec);

  const clientConnectResponseHandler = getClientConnectResponseHandler(returnTypes);
  const clientConnectResponseHandlerAsync = getClientConnectResponseHandlerAsync(returnTypes);
  const httpResponseHandler = getHttpResponseHandler(returnTypes);

  let implementor = fragments.implementationMethodDeclarations;
  if (spec.isWebSocket) {
    implementor = fragments.implementationWebSocketMethodDeclarations;
  }

  return implementor({
    apiId: spec.apiId,
    methodName,
    methodNameEscaped,
    methodSummary,
    methodDescription,
    methodOperationId: spec.operationId,
    methodPath: spec.path,
    methodHttpMethod: spec.method.toUpperCase(),
    parameterBodyLoadingCode,
    parameterQueryLoadingCode,
    returnTypes: returnTypes,
    returnSyncPrefix,
    promiseReturnStore,
    promiseReturnType,
    promiseResolve,
    httpResponseHandler,
    legacyParameterXmlComments,
    parameterDeclarations,
    parameterDeclarationsSuffix,
    requestClassConstruction,
    clientConnectResponseHandler,
    clientConnectResponseHandlerAsync,
  });
}

export function emitRequestClassForMethod(spec: IMethodSpec) {
  const name = camelCase(spec.operationId);
  let code = `
    [System.CodeDom.Compiler.GeneratedCode("HiveMP SDK Generator", "1.0.0.0")]
    public struct ${name}Request
    {
  `;
  for (const parameter of spec.parameters) {
    const csType = resolveType(parameter);
    const parameterName = camelCase(parameter.name);
    code += `
        /// <summary>
        /// ${escapeForXmlComment(parameter.description, "        /// ")}
        /// </summary>
        [Newtonsoft.Json.JsonProperty("${parameter.name}")]
        public ${csType.getCSharpType(parameter)} ${parameterName} { get; set; }
`;
  }
  code += `
    }
`;
  return code;
}

export function emitWebSocketClassForMethod(spec: IMethodSpec) {
  const name = camelCase(spec.operationId);
  let code = `
    [System.CodeDom.Compiler.GeneratedCode("HiveMP SDK Generator", "1.0.0.0")]
    public sealed class ${name}Socket : HiveMP.Api.HiveMPWebSocket
    {
#if HAS_TASKS
        public ${name}Socket(System.Net.WebSockets.ClientWebSocket webSocket) : base(webSocket)
        {
        }
#else
        public ${name}Socket(WebSocket4Net.WebSocket webSocket) : base(webSocket)
        {
        }
#endif

  `;
  for (const requestMessage of spec.webSocketRequestMessageTypes) {
    const csType = resolveType(requestMessage.type);
    const protocolName = camelCase(normalizeWebSocketProtocolName(requestMessage.protocolMessageId));
    code += `
#if HAS_TASKS
        /// <summary>
        /// (The SDK does not generate this description yet)
        /// </summary>
        public async System.Threading.Tasks.Task Send${protocolName}(${csType.getCSharpType(requestMessage.type)} message, System.Threading.CancellationToken? cancellationToken = null)
        {
            var serializedMessage = Newtonsoft.Json.JsonConvert.SerializeObject(new {
                type = "${requestMessage.protocolMessageId}",
                value = message,
            });
            var messageBytes = System.Text.Encoding.UTF8.GetBytes(serializedMessage);
            var arraySegment = new System.ArraySegment<byte>(messageBytes);
            await _webSocket.SendAsync(
                arraySegment,
                System.Net.WebSockets.WebSocketMessageType.Text,
                true,
                cancellationToken ?? new System.Threading.CancellationToken(false));
        }
#endif
`;
  }
  for (const responseMessage of spec.webSocketResponseMessageTypes) {
    const csType = resolveType(responseMessage.type);
    const protocolName = camelCase(normalizeWebSocketProtocolName(responseMessage.protocolMessageId));
    code += `
#if HAS_TASKS
        /// <summary>
        /// (The SDK does not generate this description yet)
        /// </summary>
        public event System.Func<${csType.getCSharpType(responseMessage.type)}, System.Threading.CancellationToken, System.Threading.Tasks.Task> On${protocolName};
#else
        /// <summary>
        /// (The SDK does not generate this description yet)
        /// </summary>
        public event System.Action<${csType.getCSharpType(responseMessage.type)}> On${protocolName};
#endif
`;
  }
  if (spec.webSocketResponseMessageTypes.size > 0) {
    code += `
#if HAS_TASKS
        /// <summary>
        /// Once this method is called, events will start being fired when new messages come in. The
        /// socket caches received messages between the time the connection was actually established
        /// and when this method is called, so you don't miss any messages that are received during that
        /// time.
        ///
        /// This method is automatically called if needed by <see cref="WaitForDisconnect" />, therefore
        /// you only need to call this if you want to have events raised before you call
        /// <see cref="WaitForDisconnect" />.
        /// </summary>
        public void StartRaisingEvents(System.Threading.CancellationToken cancellationToken)
        {
            base.StartRaisingEvents(cancellationToken);
        }

        /// <summary>
        /// Wait until the WebSocket is closed by the server.  Handlers registered with
        /// events will continue to fire while this method is called (but it is not required
        /// to call this method to get events to fire).
        /// </summary>
        public async System.Threading.Tasks.Task WaitForDisconnect(System.Threading.CancellationToken cancellationToken)
        {
            await base.WaitForDisconnect(cancellationToken);
        }

        protected override async System.Threading.Tasks.Task HandleMessage(string protocolId, Newtonsoft.Json.Linq.JToken value, System.Threading.CancellationToken cancellationToken)
        {
            switch (protocolId)
            {
`;
    for (const responseMessage of spec.webSocketResponseMessageTypes) {
      const csType = resolveType(responseMessage.type);
      const protocolName = camelCase(normalizeWebSocketProtocolName(responseMessage.protocolMessageId));
      code += `
                case "${responseMessage.protocolMessageId}":
                {
                    var message = value.ToObject<${csType.getCSharpType(responseMessage.type)}>();
                    var handler = On${protocolName};
                    if (handler == null)
                    {
                        return;
                    }
                    var invocationList = handler.GetInvocationList();
                    var handlerTasks = new System.Threading.Tasks.Task[invocationList.Length];
                    for (var i = 0; i < invocationList.Length; i++)
                    {
                        handlerTasks[i] = ((System.Func<${csType.getCSharpType(responseMessage.type)}, System.Threading.CancellationToken, System.Threading.Tasks.Task>)invocationList[i])(message, cancellationToken);
                    }
                    await System.Threading.Tasks.Task.WhenAll(handlerTasks);
                    break;
                }
`;
    }
    code += `
            }
        }
#else
        /// <summary>
        /// Once this method is called, events will start being fired when new messages come in. The
        /// socket caches received messages between the time the connection was actually established
        /// and when this method is called, so you don't miss any messages that are received during that
        /// time.
        ///
        /// This method is automatically called if needed by <see cref="WaitForDisconnect" />, therefore
        /// you only need to call this if you want to have events raised before you call
        /// <see cref="WaitForDisconnect" />.
        /// </summary>
        public void StartRaisingEvents()
        {
            base.StartRaisingEvents();
        }

        /// <summary>
        /// Wait until the WebSocket is closed by the server.  Handlers registered with
        /// events will continue to fire while this method is called (but it is not required
        /// to call this method to get events to fire).
        /// </summary>
        public HiveMP.Api.HiveMPPromise WaitForDisconnect()
        {
            return base.WaitForDisconnect();
        }

        protected override void HandleMessage(string protocolId, Newtonsoft.Json.Linq.JToken value)
        {
            switch (protocolId)
            {
`;
    for (const responseMessage of spec.webSocketResponseMessageTypes) {
      const csType = resolveType(responseMessage.type);
      const protocolName = camelCase(normalizeWebSocketProtocolName(responseMessage.protocolMessageId));
      code += `
                case "${responseMessage.protocolMessageId}":
                {
                    var message = value.ToObject<${csType.getCSharpType(responseMessage.type)}>();
                    var handler = On${protocolName};
                    if (handler == null)
                    {
                        return;
                    }
                    var invocationList = handler.GetInvocationList();
                    var handlerTasks = new HiveMP.Api.HiveMPPromise[invocationList.Length];
                    for (var i = 0; i < invocationList.Length; i++)
                    {
                        ((System.Action<${csType.getCSharpType(responseMessage.type)}>)invocationList[i])(message);
                    }
                    return;
                }
`;
    }
    code += `
            }
        }
#endif
    }
`;
  } else {
    code += `
#if HAS_TASKS
        /// <summary>
        /// Wait until the WebSocket is closed by the server.
        /// </summary>
        public async System.Threading.Tasks.Task WaitForDisconnect(System.Threading.CancellationToken cancellationToken)
        {
            await base.WaitForDisconnect(cancellationToken);
        }

        protected override System.Threading.Tasks.Task HandleMessage(string protocolId, Newtonsoft.Json.Linq.JToken value, System.Threading.CancellationToken cancellationToken)
        {
            return System.Threading.Tasks.Task.CompletedTask;
        }
#else
        /// <summary>
        /// Wait until the WebSocket is closed by the server.
        /// </summary>
        public HiveMP.Api.HiveMPPromise WaitForDisconnect()
        {
            return base.WaitForDisconnect();
        }

        protected override void HandleMessage(string protocolId, Newtonsoft.Json.Linq.JToken value)
        {
        }
#endif
    }
`;
  }
  return code;
}