import { IMethodSpec } from "../common/methodSpec";
import { resolveType } from "./typing";
import { resolve } from "path";
import { avoidConflictingCPlusPlusNames } from "../cpp/naming";

export function emitMethodResultDelegateDefinition(spec: IMethodSpec): string {
  if (spec.isWebSocket) {
    return `
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(F${spec.implementationName}_Delegate, U${spec.implementationName}_ProtocolSocket*, ConnectedSocket, const FHiveApiError&, Error);
`;
  } else if (spec.response !== null) {
    const ueType = resolveType(spec.response);
    return `
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(F${spec.implementationName}_Delegate, ${ueType.getCPlusPlusOutType(spec.response)}, Result, const FHiveApiError&, Error);
`;
  } else {
    return `
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(F${spec.implementationName}_Delegate, const FHiveApiError&, Error);
`;
  }
}

export function emitMethodProxyHeaderDeclaration(spec: IMethodSpec): string {
  let header = `
UCLASS()
class HIVEMPSDK_API U${spec.implementationName} : public UOnlineBlueprintCallProxyBase
{
	GENERATED_UCLASS_BODY()

	UPROPERTY(BlueprintAssignable)
	F${spec.implementationName}_Delegate OnSuccess;

	UPROPERTY(BlueprintAssignable)
	F${spec.implementationName}_Delegate OnFailure;

	UFUNCTION(BlueprintCallable, meta=(BlueprintInternalUseOnly = "true", WorldContext="WorldContextObject", DisplayName="${spec.displayNameEscapedForDoubleQuotes}", ToolTip="${spec.descriptionLimitedEscapedForDoubleQuotes}"), Category="HiveMP|${spec.apiFriendlyName}")
	static U${spec.implementationName}* PerformHiveCall(
		UObject* WorldContextObject,
    FString ApiKey
`;
  for (const parameter of spec.parameters) {
    const ueType = resolveType(parameter);
    header += `
    , ${ueType.getCPlusPlusInType(parameter)} ${avoidConflictingCPlusPlusNames(parameter.name)}
`;
  }
  header += `
  );

	// UOnlineBlueprintCallProxyBase interface
	virtual void Activate() override;
	// End of UOnlineBlueprintCallProxyBase interface

private:
	// The world context object in which this call is taking place
	UObject* WorldContextObject;

  FString ApiKey;

`;
  if (spec.isWebSocket) {
    header += `
  UPROPERTY()
  U${spec.implementationName}_ProtocolSocket* ProtocolSocket;

  UFUNCTION()
  void OnWebSocketConnect();

  UFUNCTION()
  void OnWebSocketConnectError(const FString& ErrorMessage);
`;
  }
  for (const parameter of spec.parameters) {
    const ueType = resolveType(parameter);
    header += `
    ${ueType.getCPlusPlusInType(parameter)} Field_${parameter.name};
`;
  }
  header += `
};

`;
  return header;
}

export function emitMethodProxyConstructorImplementation(spec: IMethodSpec): string {
  return `

U${spec.implementationName}::U${spec.implementationName}(const FObjectInitializer& ObjectInitializer) : Super(ObjectInitializer), WorldContextObject(nullptr) { }

`;
}

export function emitMethodProxyCallImplementation(spec: IMethodSpec): string {
  let failureBroadcast = `OnFailure.Broadcast(ResultError)`;
  let customResponseHandler = '';
  let customHotpatchResponseHandler = '';
  if (spec.response !== null) {
    const ueType = resolveType(spec.response);
    failureBroadcast = `OnFailure.Broadcast(${ueType.getDefaultInitialiser(spec.response)}, ResultError)`;
    customResponseHandler = ueType.getCustomResponseHandler(spec.response, `${spec.apiId} ${spec.path} ${spec.method}`);
    customHotpatchResponseHandler = ueType.getCustomHotpatchResponseHandler(spec.response, `${spec.apiId} ${spec.path} ${spec.method}`);
  }

  let code = `

U${spec.implementationName}* U${spec.implementationName}::PerformHiveCall(
  UObject* WorldContextObject,
  FString ApiKey
  `;
  for (const parameter of spec.parameters) {
    const ueType = resolveType(parameter);
    code += `
    , ${ueType.getCPlusPlusInType(parameter)} ${avoidConflictingCPlusPlusNames(parameter.name)}
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
  Proxy->Field_${parameter.name} = ${ueType.getAssignmentFrom(parameter, avoidConflictingCPlusPlusNames(parameter.name))};
`;
  }
  code += `

  return Proxy;
}

void U${spec.implementationName}::Activate()
{
  UE_LOG_HIVE(Display, TEXT("[start] ${spec.apiId} ${spec.path} ${spec.method}"));

  if (js_is_api_hotpatched("${spec.apiId}", "${spec.operationId}"))
  {
	  if (this->WorldContextObject == nullptr)
	  {
		  UE_LOG(LogClientConnect, Error, TEXT("No world context available; HiveMP Client Connect can't operate"));
		  return;
	  }

	  UWorld* CurrentWorld = this->WorldContextObject->GetWorld();
	  if (CurrentWorld == nullptr)
	  {
		  UE_LOG(LogClientConnect, Error, TEXT("No world available; HiveMP Client Connect can't operate"));
		  return;
	  }

	  UGameInstance* CurrentGameInstance = CurrentWorld->GetGameInstance();
	  if (CurrentGameInstance == nullptr)
	  {
		  UE_LOG(LogClientConnect, Error, TEXT("No game instance available; HiveMP Client Connect can't operate"));
		  return;
	  }

	  UHiveMPBaseGameInstance* HiveMPGameInstance = Cast<UHiveMPBaseGameInstance>(CurrentGameInstance);
	  if (HiveMPGameInstance == nullptr)
	  {
		  UE_LOG(LogClientConnect, Error, TEXT("Current game instance does not inherit from UHiveMPBaseGameInstance; HiveMP Client Connect can't operate"));
		  return;
	  }
    
	  TSharedPtr<FJsonObject> HotpatchJson = MakeShareable(new FJsonObject());
	  TSharedPtr<FJsonValue> HotpatchJsonValue = MakeShareable(new FJsonValueObject(HotpatchJson));
	  
`;
for (const parameter of spec.parameters) {
  const ueType = resolveType(parameter);
  code += `
${ueType.pushOntoHotpatchJson('HotpatchJson', parameter)}
`;
}
  code += `

	  FString EncodedParameters = "";
	  TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&EncodedParameters);
	  FJsonSerializer::Serialize(HotpatchJsonValue, TEXT(""), Writer);
	  long handle = js_call_api_hotpatch(
		  "${spec.apiId}",
		  "${spec.operationId}",
		  "https://${spec.apiId}-api.hivemp.com${spec.basePath}",
		  TCHAR_TO_ANSI(*this->ApiKey),
		  TCHAR_TO_ANSI(*EncodedParameters));

    HiveMPGameInstance->RegisterClientConnectCallback(handle, [this](
      int32_t HttpStatusCode,
      FString HttpBody,
      TWeakObjectPtr<UObject> SelfRef)
    {
      UE_LOG_HIVE(Warning, TEXT("[info] ${spec.apiId} ${spec.path} ${spec.method}: %s"), *HttpBody);
  
      ${customHotpatchResponseHandler}
  
      TSharedPtr<FJsonValue> JsonValue;
      TSharedRef<TJsonReader<TCHAR>> Reader = TJsonReaderFactory<>::Create(HttpBody);
      if (!FJsonSerializer::Deserialize(Reader, JsonValue) || !JsonValue.IsValid())
      {
        struct FHiveApiError ResultError;
        ResultError.HttpStatusCode = FNullableInt32(true, HttpStatusCode);
        ResultError.ErrorCode = FNullableInt32(false, 0);
        ResultError.Message = FNullableString(true, TEXT("Unable to deserialize JSON response!"));
        ResultError.Parameter = FNullableString(false, TEXT(""));
        UE_LOG_HIVE(Error, TEXT("[fail] ${spec.apiId} ${spec.path} ${spec.method}: %s"), *(ResultError.Message.Value));
        ${failureBroadcast};
        return;
      }
      
      if (HttpStatusCode != 200)
      {
        const TSharedPtr<FJsonObject>* JsonObject;
        if (JsonValue->TryGetObject(JsonObject))
        {
          // Parse as Hive system error.
          FString Message, Parameter;
          double ErrorCode;
          auto GotMessage = (*JsonObject)->TryGetStringField(TEXT("message"), Message);
          auto GotParameter = (*JsonObject)->TryGetStringField(TEXT("fields"), Parameter);
          auto GotErrorCode = (*JsonObject)->TryGetNumberField(TEXT("code"), ErrorCode);
  
          struct FHiveApiError ResultError;
          ResultError.HttpStatusCode = FNullableInt32(true, HttpStatusCode);
          if (GotErrorCode)
          {
            ResultError.ErrorCode = FNullableInt32(true, (int32)ErrorCode);
          }
          else
          {
            ResultError.ErrorCode = FNullableInt32(false, 0);
          }
          if (GotMessage)
          {
            ResultError.Message = FNullableString(true, Message);
          }
          else
          {
            ResultError.Message = FNullableString(false, TEXT(""));
          }
          if (GotParameter)
          {
            ResultError.Parameter = FNullableString(true, Parameter);
          }
          else
          {
            ResultError.Parameter = FNullableString(false, TEXT(""));
          }
          UE_LOG_HIVE(Error, TEXT("[fail] ${spec.apiId} ${spec.path} ${spec.method}: %s"), *(ResultError.Message.Value));
          ${failureBroadcast};
          return;
        }
        else
        {
          struct FHiveApiError ResultError;
          ResultError.HttpStatusCode = FNullableInt32(true, HttpStatusCode);
          ResultError.ErrorCode = FNullableInt32(false, 0);
          ResultError.Message = FNullableString(true, TEXT("Unable to deserialize JSON response as HiveMP system error!"));
          ResultError.Parameter = FNullableString(false, TEXT(""));
          UE_LOG_HIVE(Error, TEXT("[fail] ${spec.apiId} ${spec.path} ${spec.method}: %s"), *(ResultError.Message.Value));
          ${failureBroadcast};
          return;
        }
      }
  
      {
        struct FHiveApiError ResultError;
  `;
    if (spec.response !== null) {
      const ueType = resolveType(spec.response);
      code += `
        ${ueType.getCPlusPlusInType(spec.response)} Result;
        ${ueType.emitDeserializationFragment({
          spec: spec.response,
          into: 'Result',
          from: 'JsonValue',
          nestLevel: 0
        })}
        UE_LOG_HIVE(Warning, TEXT("[success] ${spec.apiId} ${spec.path} ${spec.method}"));
        OnSuccess.Broadcast(Result, ResultError);
  `;
    } else {
      code += `
        UE_LOG_HIVE(Warning, TEXT("[success] ${spec.apiId} ${spec.path} ${spec.method}"));
        OnSuccess.Broadcast(ResultError);
  `;
    }
    code += `
      }
    }, TWeakObjectPtr<UObject>(this));
	  return;
  }

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

  TSharedRef<IHttpRequest> HttpRequest = FHttpModule::Get().CreateRequest();
  HttpRequest->SetURL(FString::Printf(
    TEXT("https://${spec.apiId}-api.hivemp.com${spec.basePath}${spec.path}?%s"),
    *FString::Join(QueryStringElements, TEXT("&"))));
  HttpRequest->SetHeader(TEXT("api_key"), this->ApiKey);
  HttpRequest->SetVerb(TEXT("${spec.method}"));
`;
  if (spec.method !== 'get') {
    let hasBody = false;
    for (const parameter of spec.parameters) {
      if (parameter.in === 'body') {
        const ueType = resolveType(parameter);
        code += `
  TSharedPtr<FJsonValue> BodyJson;
  FString BodyString = TEXT("");
  ${ueType.emitSerializationFragment({
    spec: parameter,
    into: 'BodyJson',
    from: `this->Field_${parameter.name}`,
    nestLevel: 0,
  })}
  if (BodyJson.IsValid())
  {
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&BodyString);
    FJsonSerializer::Serialize(BodyJson, TEXT(""), Writer);
  }
  HttpRequest->SetContentAsString(BodyString);
  HttpRequest->SetHeader(TEXT("Content-Length"), FString::Printf(TEXT("%i"), BodyString.Len()));
  HttpRequest->SetHeader(TEXT("Content-Type"), TEXT("application/json"));
`;
        hasBody = true;
        break;
      }
    }
    if (!hasBody) {
      code += `
  HttpRequest->SetHeader(TEXT("Content-Length"), TEXT("0"));
`;
    }
  }
  code += `
  HttpRequest->OnProcessRequestComplete().BindLambda([this](FHttpRequestPtr HttpRequest, FHttpResponsePtr HttpResponse, bool bSucceeded, TWeakObjectPtr<U${spec.implementationName}> SelfRef)
  {
    if (!SelfRef.IsValid())
    {
      UE_LOG_HIVE(Error, TEXT("[fail] ${spec.apiId} ${spec.path} ${spec.method}: Callback proxy is invalid (did the game shutdown?)"));
      return;
    }

    if (!HttpResponse.IsValid())
    {
      struct FHiveApiError ResultError;
      ResultError.HttpStatusCode = FNullableInt32(false, 0);
      ResultError.ErrorCode = FNullableInt32(false, 0);
      ResultError.Message = FNullableString(true, TEXT("HTTP response was not valid!"));
      ResultError.Parameter = FNullableString(false, TEXT(""));
      UE_LOG_HIVE(Error, TEXT("[fail] ${spec.apiId} ${spec.path} ${spec.method}: %s"), *(ResultError.Message.Value));
      ${failureBroadcast};
      return;
    }

    auto Response = HttpResponse.Get();

    UE_LOG_HIVE(Warning, TEXT("[info] ${spec.apiId} ${spec.path} ${spec.method}: %s"), *(Response->GetContentAsString()));

    ${customResponseHandler}

    TSharedPtr<FJsonValue> JsonValue;
    TSharedRef<TJsonReader<TCHAR>> Reader = TJsonReaderFactory<>::Create(Response->GetContentAsString());
    if (!FJsonSerializer::Deserialize(Reader, JsonValue) || !JsonValue.IsValid())
    {
      struct FHiveApiError ResultError;
      ResultError.HttpStatusCode = FNullableInt32(true, Response->GetResponseCode());
      ResultError.ErrorCode = FNullableInt32(false, 0);
      ResultError.Message = FNullableString(true, TEXT("Unable to deserialize JSON response!"));
      ResultError.Parameter = FNullableString(false, TEXT(""));
      UE_LOG_HIVE(Error, TEXT("[fail] ${spec.apiId} ${spec.path} ${spec.method}: %s"), *(ResultError.Message.Value));
      ${failureBroadcast};
      return;
    }
    
    if (!bSucceeded || HttpResponse->GetResponseCode() != 200)
    {
      const TSharedPtr<FJsonObject>* JsonObject;
      if (JsonValue->TryGetObject(JsonObject))
      {
        // Parse as Hive system error.
        FString Message, Parameter;
        double ErrorCode;
        auto GotMessage = (*JsonObject)->TryGetStringField(TEXT("message"), Message);
        auto GotParameter = (*JsonObject)->TryGetStringField(TEXT("fields"), Parameter);
        auto GotErrorCode = (*JsonObject)->TryGetNumberField(TEXT("code"), ErrorCode);

        struct FHiveApiError ResultError;
        ResultError.HttpStatusCode = FNullableInt32(true, Response->GetResponseCode());
        if (GotErrorCode)
        {
          ResultError.ErrorCode = FNullableInt32(true, (int32)ErrorCode);
        }
        else
        {
          ResultError.ErrorCode = FNullableInt32(false, 0);
        }
        if (GotMessage)
        {
          ResultError.Message = FNullableString(true, Message);
        }
        else
        {
          ResultError.Message = FNullableString(false, TEXT(""));
        }
        if (GotParameter)
        {
          ResultError.Parameter = FNullableString(true, Parameter);
        }
        else
        {
          ResultError.Parameter = FNullableString(false, TEXT(""));
        }
        UE_LOG_HIVE(Error, TEXT("[fail] ${spec.apiId} ${spec.path} ${spec.method}: %s"), *(ResultError.Message.Value));
        ${failureBroadcast};
        return;
      }
      else
      {
        struct FHiveApiError ResultError;
        ResultError.HttpStatusCode = FNullableInt32(true, Response->GetResponseCode());
        ResultError.ErrorCode = FNullableInt32(false, 0);
        ResultError.Message = FNullableString(true, TEXT("Unable to deserialize JSON response as HiveMP system error!"));
        ResultError.Parameter = FNullableString(false, TEXT(""));
        UE_LOG_HIVE(Error, TEXT("[fail] ${spec.apiId} ${spec.path} ${spec.method}: %s"), *(ResultError.Message.Value));
        ${failureBroadcast};
        return;
      }
    }

    {
      struct FHiveApiError ResultError;
`;
  if (spec.response !== null) {
    const ueType = resolveType(spec.response);
    code += `
      ${ueType.getCPlusPlusInType(spec.response)} Result;
      ${ueType.emitDeserializationFragment({
        spec: spec.response,
        into: 'Result',
        from: 'JsonValue',
        nestLevel: 0
      })}
      UE_LOG_HIVE(Warning, TEXT("[success] ${spec.apiId} ${spec.path} ${spec.method}"));
      OnSuccess.Broadcast(Result, ResultError);
`;
  } else {
    code += `
      UE_LOG_HIVE(Warning, TEXT("[success] ${spec.apiId} ${spec.path} ${spec.method}"));
      OnSuccess.Broadcast(ResultError);
`;
  }
  code += `
    }
  }, TWeakObjectPtr<U${spec.implementationName}>(this));
  HttpRequest->ProcessRequest();
}
`;
  return code;
}