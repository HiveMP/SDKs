import { IMethodSpec } from "../common/methodSpec";
import { resolveType } from "./typing";
import { normalizeWebSocketProtocolName } from "../common/normalize";

export function emitMethodWebSocketDeclaration(spec: IMethodSpec): string {
  let code = '';
  
  for (const response of spec.webSocketResponseMessageTypes) {
    const name = normalizeWebSocketProtocolName(response.protocolMessageId);
    const ueType = resolveType(response.type);
    code += `
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(F${spec.implementationName}_${name}_Delegate, ${ueType.getCPlusPlusOutType(response.type)}, Message);
`;
  }

  code += `
UCLASS(BlueprintType, Transient)
class HIVEMPSDK_API U${spec.implementationName}_ProtocolSocket : public UObject
{
	GENERATED_BODY()

public:

	UPROPERTY()
	UWebSocketBase* WebSocket;
  
`;
  for (const response of spec.webSocketResponseMessageTypes) {
    const name = normalizeWebSocketProtocolName(response.protocolMessageId);
    code += `
	UPROPERTY(BlueprintAssignable, Category = "HiveMP")
  F${spec.implementationName}_${name}_Delegate On${name};
`;
  }
  for (const request of spec.webSocketRequestMessageTypes) {
    const name = normalizeWebSocketProtocolName(request.protocolMessageId);
    const ueType = resolveType(request.type);
    code += `
  UFUNCTION(BlueprintCallable, Category = "HiveMP")
  void Send${request.protocolMessageId}(${ueType.getCPlusPlusInType(request.type)});
`;
  }
  code += `
};
`;
  return code;
}

export function emitMethodWebSocketDefinition(spec: IMethodSpec): string {
  return `

`;
}

export function emitMethodWebSocketCallImplementation(spec: IMethodSpec): string {
  let code = `

U${spec.implementationName}* U${spec.implementationName}::PerformHiveCall(
  UObject* WorldContextObject,
  FString ApiKey
  `;
  for (const parameter of spec.parameters) {
    const ueType = resolveType(parameter);
    code += `
    , ${ueType.getCPlusPlusInType(parameter)} ${parameter.name}
`;
  }
  code += `
)
{
    U${spec.implementationName}* Proxy = NewObject<U${spec.implementationName}>();
  
    Proxy->WorldContextObject = WorldContextObject;
    Proxy->ApiKey = ApiKey;
`;
  for (const parameter of spec.parameters) {
    const ueType = resolveType(parameter);
    code += `
    Proxy->Field_${parameter.name} = ${ueType.getAssignmentFrom(parameter, parameter.name)};
`;
  }
  code += `

    return Proxy;
}

void U${spec.implementationName}::Activate()
{
    UE_LOG_HIVE(Display, TEXT("[start] ${spec.apiId} ${spec.path} ${spec.method}"));

    TArray<FString> QueryStringElements;
`;
  for (const parameter of spec.parameters) {
    if (parameter.in === 'query') {
      const ueType = resolveType(parameter);
      code += `
  ${ueType.pushOntoQueryStringArray('QueryStringElements', parameter)}
`;
    }
  }

  code += `

    this->ProtocolSocket = NewObject<U${spec.implementationName}_ProtocolSocket>();
    this->ProtocolSocket->WebSocket = NewObject<UWebSocketBase>();

    TMap<FString, FString> Headers;
    Headers.Add(TEXT("X-API-Key"), this->ApiKey);

    // TODO: Wire up this->WebSocket->OnReceiveData and this->WebSocket->OnClosed to
    // handlers inside this->ProtocolSocket->WebSocket.

    this->ProtocolSocket->WebSocket->OnConnectError.AddDynamic(this, &U${spec.implementationName}::OnWebSocketConnectError);
    this->ProtocolSocket->WebSocket->OnConnectComplete.AddDynamic(this, &U${spec.implementationName}::OnWebSocketConnect);
    
    this->ProtocolSocket->WebSocket->Connect(
      FString::Printf(
        TEXT("https://${spec.apiId}-api.hivemp.com${spec.basePath}${spec.path}?%s"),
        *FString::Join(QueryStringElements, TEXT("&"))),
      Headers
    );
}

void U${spec.implementationName}::OnWebSocketConnect()
{
    struct FHiveApiError ResultError;
    UE_LOG_HIVE(Warning, TEXT("[success, websocket connect] ${spec.apiId} ${spec.path} ${spec.method}"));
    OnSuccess.Broadcast(this->ProtocolSocket, ResultError);
}

void U${spec.implementationName}::OnWebSocketConnectError(const FString& ErrorMessage)
{
    struct FHiveApiError ResultError;
    ResultError.HttpStatusCode = FNullableInt32(false, 0);
    ResultError.ErrorCode = FNullableInt32(false, 0);
    ResultError.Message = FNullableString(true, ErrorMessage);
    ResultError.Parameter = FNullableString(false, TEXT(""));
    UE_LOG_HIVE(Error, TEXT("[fail, websocket connect] ${spec.apiId} ${spec.path} ${spec.method}: %s"), *(ResultError.Message.Value));
    OnFailure.Broadcast(nullptr, ResultError);
    return;
}
`;
  return code;
}