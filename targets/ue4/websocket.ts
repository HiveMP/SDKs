import { IMethodSpec } from "../common/methodSpec";
import { resolveType } from "./typing";

export function emitMethodWebSocketDeclaration(spec: IMethodSpec): string {
  return `

`;
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

  let failureBroadcast = `OnFailure.Broadcast(ResultError)`;
  let customResponseHandler = '';
  if (spec.response !== null) {
    const ueType = resolveType(spec.response);
    failureBroadcast = `OnFailure.Broadcast(${ueType.getDefaultInitialiser(spec.response)}, ResultError)`;
    customResponseHandler = ueType.getCustomResponseHandler(spec.response, `${spec.apiId} ${spec.path} ${spec.method}`);
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
      ResultError.HttpStatusCode = 0;
      ResultError.ErrorCode = 0;
      ResultError.Message = TEXT("HTTP response was not valid!");
      ResultError.Parameter = TEXT("");
      UE_LOG_HIVE(Error, TEXT("[fail] ${spec.apiId} ${spec.path} ${spec.method}: %s"), *(ResultError.Message));
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
      ResultError.HttpStatusCode = Response->GetResponseCode();
      ResultError.ErrorCode = 0;
      ResultError.Message = TEXT("Unable to deserialize JSON response!");
      ResultError.Parameter = TEXT("");
      UE_LOG_HIVE(Error, TEXT("[fail] ${spec.apiId} ${spec.path} ${spec.method}: %s"), *(ResultError.Message));
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
        ResultError.HttpStatusCode = Response->GetResponseCode();
        if (GotErrorCode)
        {
          ResultError.ErrorCode = (int32)ErrorCode;
        }
        if (GotMessage)
        {
          ResultError.Message = Message;
        }
        if (GotParameter)
        {
          ResultError.Parameter = Parameter;
        }
        UE_LOG_HIVE(Error, TEXT("[fail] ${spec.apiId} ${spec.path} ${spec.method}: %s"), *(ResultError.Message));
        ${failureBroadcast};
        return;
      }
      else
      {
        struct FHiveApiError ResultError;
        ResultError.HttpStatusCode = Response->GetResponseCode();
        ResultError.ErrorCode = 0;
        ResultError.Message = TEXT("Unable to deserialize JSON response as HiveMP system error!");
        ResultError.Parameter = TEXT("");
        UE_LOG_HIVE(Error, TEXT("[fail] ${spec.apiId} ${spec.path} ${spec.method}: %s"), *(ResultError.Message));
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