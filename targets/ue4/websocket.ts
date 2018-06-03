import { IMethodSpec } from "../common/methodSpec";
import { resolveType } from "./typing";
import { normalizeWebSocketProtocolName } from "../common/normalize";
import { camelCase } from "../csharp/naming";

export function emitMethodWebSocketDeclaration(spec: IMethodSpec): string {
  let code = '';
  
  for (const response of spec.webSocketResponseMessageTypes) {
    const name = camelCase(normalizeWebSocketProtocolName(response.protocolMessageId));
    const ueType = resolveType(response.type);
    code += `
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(F${spec.implementationName}_${name}_Delegate, ${ueType.getCPlusPlusOutType(response.type)}, Message);
`;
  }

  code += `
DECLARE_DYNAMIC_MULTICAST_DELEGATE(F${spec.implementationName}__ServerDisconnect_Delegate);

UCLASS(BlueprintType, Transient)
class HIVEMPSDK_API U${spec.implementationName}_ProtocolSocket : public UObject
{
	GENERATED_BODY()

public:

	UPROPERTY()
  UWebSocketBase* WebSocket;

  void BindEventsToWebSocket();
  
  /**
   * Disconnects from the server.
   */
  UFUNCTION(BlueprintCallable)
  void Disconnect();

  /**
   * Begins raising events in response to inbound messages. Before you call this method
   * the socket will cache all inbound messages. You should call this method
   * after you have finished binding handlers to all events you are interested in.
   */
  UFUNCTION(BlueprintCallable)
  void BeginRaisingEvents();

  /**
   * Called when the server initiates a disconnection for any reason. This is not called
   * if the client initiates the disconnect (e.g. by calling Disconnect).
   */
  UPROPERTY(BlueprintAssignable)
  F${spec.implementationName}__ServerDisconnect_Delegate OnServerDisconnected;
`;
  for (const response of spec.webSocketResponseMessageTypes) {
    const name = camelCase(normalizeWebSocketProtocolName(response.protocolMessageId));
    code += `
	UPROPERTY(BlueprintAssignable, Category = "HiveMP")
  F${spec.implementationName}_${name}_Delegate On${name};
`;
  }
  for (const request of spec.webSocketRequestMessageTypes) {
    const name = camelCase(normalizeWebSocketProtocolName(request.protocolMessageId));
    const ueType = resolveType(request.type);
    code += `
  UFUNCTION(BlueprintCallable, Category = "HiveMP")
  void Send${name}(${ueType.getCPlusPlusInType(request.type)});
`;
  }
  code += `

private:

  bool ShouldRaiseEvents;
  TArray<FString> EventCache;

  UFUNCTION()
  void HandleReceiveData(const FString& Data);

  UFUNCTION()
  void HandleClosed();

  void ProcessMessage(const FString& Data);

};
`;
  return code;
}

export function emitMethodWebSocketDefinition(spec: IMethodSpec): string {
  let code = `
void U${spec.implementationName}_ProtocolSocket::Disconnect()
{
    this->WebSocket->Close();
}

void U${spec.implementationName}_ProtocolSocket::BeginRaisingEvents()
{
    this->ShouldRaiseEvents = true;
    for (int i = 0; i < this->EventCache.Num(); i++)
    {
        this->ProcessMessage(this->EventCache[i]);
    }
    this->EventCache.Empty();
}

void U${spec.implementationName}_ProtocolSocket::BindEventsToWebSocket()
{
    this->WebSocket->OnReceiveData.AddDynamic(this, &U${spec.implementationName}_ProtocolSocket::HandleReceiveData);
    this->WebSocket->OnClosed.AddDynamic(this, &U${spec.implementationName}_ProtocolSocket::HandleClosed);
}

void U${spec.implementationName}_ProtocolSocket::HandleReceiveData(const FString& Data)
{
    if (this->ShouldRaiseEvents)
    {
        this->ProcessMessage(Data);
    }
    else
    {
        this->EventCache.Add(Data);
    }
}

void U${spec.implementationName}_ProtocolSocket::ProcessMessage(const FString& Data)
{
    TSharedPtr<FJsonValue> JsonValue;
    TSharedRef<TJsonReader<TCHAR>> Reader = TJsonReaderFactory<>::Create(Data);
    if (FJsonSerializer::Deserialize(Reader, JsonValue) && JsonValue.IsValid())
    {
        const TSharedPtr<FJsonObject>* JsonObject;
        if (JsonValue->TryGetObject(JsonObject) && JsonObject->IsValid())
        {
            if ((*JsonObject)->HasField(TEXT("type")) && (*JsonObject)->HasField(TEXT("value")))
            {
                FString Type = (*JsonObject)->GetStringField(TEXT("type"));
                const TSharedPtr<FJsonValue>* Value = (*JsonObject)->Values.Find(TEXT("value"));
`;
  for (const response of spec.webSocketResponseMessageTypes) {
    const name = camelCase(normalizeWebSocketProtocolName(response.protocolMessageId));
    const ueType = resolveType(response.type);
    code += `
                if (Value != nullptr && Type == TEXT("${response.protocolMessageId}"))
                {
                    ${ueType.getCPlusPlusInType(response.type)} Message;
                    ${ueType.emitDeserializationFragment({
                      spec: response.type,
                      from: '(*Value)',
                      into: 'Message',
                      nestLevel: 0,
                    })}
                    this->On${name}.Broadcast(Message);
                }
`;
  }
  code += `
            }
        }
    }
}

void U${spec.implementationName}_ProtocolSocket::HandleClosed()
{
    this->OnServerDisconnected.Broadcast();
}
`;
  return code;
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

    TMap<FString, FString> Headers;
    Headers.Add(TEXT("X-API-Key"), this->ApiKey);

    this->ProtocolSocket->WebSocket = ConnectWebSocket(
      FString::Printf(
        TEXT("wss://${spec.apiId}-api.hivemp.com${spec.basePath}${spec.path}?%s"),
        *FString::Join(QueryStringElements, TEXT("&"))),
      Headers
    );

    this->ProtocolSocket->BindEventsToWebSocket();

    this->ProtocolSocket->WebSocket->OnConnectError.AddDynamic(this, &U${spec.implementationName}::OnWebSocketConnectError);
    this->ProtocolSocket->WebSocket->OnConnectComplete.AddDynamic(this, &U${spec.implementationName}::OnWebSocketConnect);
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