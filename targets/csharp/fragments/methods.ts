import { IMethodReturnTypes } from "../return";

export function interfaceMethodDeclarations(values: {
  methodName: string,
  methodNameEscaped: string,
  methodSummary: string,
  methodDescription: string,
  returnTypes: IMethodReturnTypes,
}) {
  return `
#if HAS_TASKS
      /// <summary>
      /// ${values.methodSummary}
      /// </summary>
      /// <remarks>
      /// ${values.methodDescription}
      /// </remarks>
      /// <param name="arguments">The ${values.methodNameEscaped} arguments.</param>
      ${values.returnTypes.asyncType} ${values.methodName}Async(${values.methodName}Request arguments);

      /// <summary>
      /// ${values.methodSummary}
      /// </summary>
      /// <remarks>
      /// ${values.methodDescription}
      /// </remarks>
      /// <param name="arguments">The ${values.methodNameEscaped} arguments.</param>
      /// <param name="cancellationToken">The cancellation token for the asynchronous request.</param>
      ${values.returnTypes.asyncType} ${values.methodName}Async(${values.methodName}Request arguments, System.Threading.CancellationToken cancellationToken);
#endif
      /// <summary>
      /// ${values.methodSummary}
      /// </summary>
      /// <remarks>
      /// ${values.methodDescription}
      /// </remarks>
      /// <param name="arguments">The ${values.methodNameEscaped} arguments.</param>
      /// <param name="resolve">The callback to run when the API call returns. This is always executed on the main thread.</param>
      /// <param name="reject">The callback to run when the API call failed. This is always executed on the main thread.</param>
      void ${values.methodName}Promise(${values.methodName}Request arguments, ${values.returnTypes.promiseType} resolve, System.Action<System.Exception> reject);
`;
}

export function interfaceWebSocketMethodDeclarations(values: {
  methodName: string,
  methodNameEscaped: string,
  methodSummary: string,
  methodDescription: string,
  returnTypes: IMethodReturnTypes,
}) {
  return `
#if HAS_TASKS
      /// <summary>
      /// ${values.methodSummary}
      /// </summary>
      /// <remarks>
      /// ${values.methodDescription}
      /// </remarks>
      /// <param name="arguments">The ${values.methodNameEscaped} arguments.</param>
      ${values.returnTypes.asyncType} ${values.methodName}Async(${values.methodName}Request arguments);

      /// <summary>
      /// ${values.methodSummary}
      /// </summary>
      /// <remarks>
      /// ${values.methodDescription}
      /// </remarks>
      /// <param name="arguments">The ${values.methodNameEscaped} arguments.</param>
      /// <param name="cancellationToken">The cancellation token for the asynchronous request.</param>
      ${values.returnTypes.asyncType} ${values.methodName}Async(${values.methodName}Request arguments, System.Threading.CancellationToken cancellationToken);
#endif
`;
}

export function implementationMethodDeclarations(values: {
  apiId: string,
  methodName: string,
  methodNameEscaped: string,
  methodSummary: string,
  methodDescription: string,
  methodOperationId: string,
  methodPath: string,
  methodHttpMethod: string,
  parameterBodyLoadingCodeHttpClient: string,
  parameterBodyLoadingCodeLegacyHttpClient: string,
  parameterQueryLoadingCode: string,
  returnTypes: IMethodReturnTypes,
  returnSyncPrefix: string,
  promiseReturnStore: string,
  promiseReturnType: string,
  promiseResolve: string,
  httpClientResponseHandler: string,
  legacyHttpClientResponseHandler: string,
  legacyParameterXmlComments: string,
  parameterDeclarations: string,
  parameterDeclarationsSuffix: string,
  requestClassConstruction: string,
  clientConnectResponseHandler: string,
  clientConnectResponseHandlerAsync: string,
}) {
  return `
#if HAS_TASKS
      /// <summary>
      /// ${values.methodSummary}
      /// </summary>
      /// <remarks>
      /// ${values.methodDescription}
      /// </remarks>
      /// <param name="arguments">The ${values.methodNameEscaped} arguments.</param>
      public ${values.returnTypes.asyncType} ${values.methodName}Async(${values.methodName}Request arguments)
      {
          return ${values.methodName}Async(arguments, System.Threading.CancellationToken.None);
      }

      /// <summary>
      /// ${values.methodSummary}
      /// </summary>
      /// <remarks>
      /// ${values.methodDescription}
      /// </remarks>
      /// <param name="arguments">The ${values.methodNameEscaped} arguments.</param>
      public async ${values.returnTypes.asyncType} ${values.methodName}Async(${values.methodName}Request arguments, System.Threading.CancellationToken cancellationToken)
      {
#if ENABLE_CLIENT_CONNECT_SDK
          if (HiveMP.Api.HiveMPSDK.ClientConnect != null && 
              HiveMP.Api.HiveMPSDK.ClientConnect.IsApiHotpatched("${values.apiId}", "${values.methodOperationId}"))
          {
              int delay = 1000;
              while (true)
              {
                  var @ref = await HiveMP.Api.HiveMPSDK.RunHotpatchWithTask(
                      "${values.apiId}", 
                      "${values.methodOperationId}",
                      BaseUrl,
                      ApiKey,
                      Newtonsoft.Json.JsonConvert.SerializeObject(arguments)
                  );
                  if (@ref.HttpStatusCode >= 200 && @ref.HttpStatusCode < 300)
                  {
                      ${values.clientConnectResponseHandlerAsync}
                  }
                  else
                  {
                      var result_ = default(HiveMP.Api.HiveMPSystemError); 
                      try
                      {
                          result_ = Newtonsoft.Json.JsonConvert.DeserializeObject<HiveMP.Api.HiveMPSystemError>(@ref.BodyJson);
                          if (result_.Code >= 6000 && result_.Code < 7000)
                          {
                              // Retry after delay.
                              await System.Threading.Tasks.Task.Delay(delay);
                              delay *= 2;
                              delay = System.Math.Min(30000, delay);
                              continue;
                          }
                      } 
                      catch (System.Exception exception_) 
                      {
                          throw new HiveMP.Api.HiveMPException(@ref.HttpStatusCode, new HiveMP.Api.HiveMPSystemError
                              {
                                  Code = 0,
                                  Message = "Could not deserialize the response body.",
                                  Fields = "RESPONSE:\\n\\n" + @ref.BodyJson + "\\n\\nEXCEPTION MESSAGE:\\n\\n" + exception_.Message,
                              });
                      }

                      if (result_ == null)
                      {
                          throw new HiveMP.Api.HiveMPException(@ref.HttpStatusCode, new HiveMP.Api.HiveMPSystemError
                              {
                                  Code = 0,
                                  Message = "Could not deserialize the response body.",
                                  Fields = "RESPONSE:\\n\\n" + @ref.BodyJson + "\\n\\nDESERIALIZED RESULT WAS NULL",
                              });
                      }

                      throw new HiveMP.Api.HiveMPException(@ref.HttpStatusCode, result_);
                  }
              }
          }
#endif

          var urlBuilder_ = new System.Text.StringBuilder();
          urlBuilder_.Append(BaseUrl).Append("${values.methodPath}?");
          ${values.parameterQueryLoadingCode}
          urlBuilder_.Length--;
  
          var client_ = new HiveMP.Api.RetryableHttpClient();
          try
          {
#if HAS_HTTPCLIENT
              using (var request_ = new System.Net.Http.HttpRequestMessage())
              {
                  PrepareRequest(client_, urlBuilder_);
                  var url_ = urlBuilder_.ToString();
                  PrepareRequest(client_, url_);
                  
                  System.Net.Http.HttpContent content_ = null;
                  ${values.parameterBodyLoadingCodeHttpClient}
                  if (content_ == null)
                  {
                      content_ = new System.Net.Http.StringContent(string.Empty);
                  }
                  
                  if ("${values.methodHttpMethod}" != "GET" && "${values.methodHttpMethod}" != "DELETE")
                  {
                      request_.Content = content_;
                  }
                  request_.Method = new System.Net.Http.HttpMethod("${values.methodHttpMethod}");
                  request_.RequestUri = new System.Uri(url_, System.UriKind.RelativeOrAbsolute);
                  request_.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
                  var response_ = await client_.SendAsync(request_, System.Net.Http.HttpCompletionOption.ResponseHeadersRead, cancellationToken).ConfigureAwait(false);
                  try
                  {
                      var headers_ = System.Linq.Enumerable.ToDictionary(response_.Headers, h_ => h_.Key, h_ => h_.Value);
                      foreach (var item_ in response_.Content.Headers)
                          headers_[item_.Key] = item_.Value;
  
                      var status_ = ((int)response_.StatusCode).ToString();
                      if (status_ == "200") 
                      {
                          ${values.httpClientResponseHandler}
                      }
                      else if (status_ == "301" || status_ == "302")
                      {
                          using (var redirectedRequest = new System.Net.Http.HttpRequestMessage())
                          {
                              request_.Method = new System.Net.Http.HttpMethod("GET");
                              request_.RequestUri = new System.Uri(System.Linq.Enumerable.First(headers_["Location"]), System.UriKind.Absolute);
                              request_.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("*/*"));
                              response_ = await client_.SendAsync(request_, System.Net.Http.HttpCompletionOption.ResponseHeadersRead, cancellationToken).ConfigureAwait(false);

                              headers_ = System.Linq.Enumerable.ToDictionary(response_.Headers, h_ => h_.Key, h_ => h_.Value);
                              foreach (var item_ in response_.Content.Headers)
                                  headers_[item_.Key] = item_.Value;
                          
                              ${values.httpClientResponseHandler}
                          }
                      }
                      else
                      {
                          var responseData_ = await response_.Content.ReadAsStringAsync().ConfigureAwait(false); 
                          var result_ = default(HiveMP.Api.HiveMPSystemError); 
                          try
                          {
                              result_ = Newtonsoft.Json.JsonConvert.DeserializeObject<HiveMP.Api.HiveMPSystemError>(responseData_);
                          } 
                          catch (System.Exception exception_) 
                          {
                              throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, new HiveMP.Api.HiveMPSystemError
                                  {
                                      Code = 0,
                                      Message = "Could not deserialize the response body.",
                                      Fields = "RESPONSE:\\n\\n" + responseData_ + "\\n\\nEXCEPTION MESSAGE:\\n\\n" + exception_.Message,
                                  });
                          }

                          if (result_ == null)
                          {
                              throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, new HiveMP.Api.HiveMPSystemError
                                  {
                                      Code = 0,
                                      Message = "Could not deserialize the response body.",
                                      Fields = "RESPONSE:\\n\\n" + responseData_ + "\\n\\nDESERIALIZED RESULT WAS NULL",
                                  });
                          }
  
                          throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, result_);
                      }
                  }
                  finally
                  {
                      if (response_ != null)
                          response_.Dispose();
                  }
              }
#else
              // Run non-HttpClient on a background task explicitly,
              // as old style web requests don't support async methods.
              try
              {
                  ${values.returnSyncPrefix}await System.Threading.Tasks.Task.Run(async () =>
                  {
                      PrepareRequest(client_, urlBuilder_);
                      var url_ = urlBuilder_.ToString();
                      PrepareRequest(client_, url_);

                      byte[] content_ = null;
                      string contentType_ = "application/json";
                      ${values.parameterBodyLoadingCodeLegacyHttpClient}
                      
                      var request_ = (System.Net.HttpWebRequest)System.Net.HttpWebRequest.Create(url_);
                      request_.Method = "${values.methodHttpMethod}";
                      request_.ContentLength = content_ == null ? 0 : content_.Length;
                      request_.Accept = "application/json";
                      client_.UpdateRequest(request_);

                      if (request_.Method != "GET" && request_.Method != "DELETE")
                      {
                          request_.ContentType = contentType_;
        
                          // This will actually start the request, so we can't send any more headers
                          // after opening the request stream.
                          using (var requestStream = request_.GetRequestStream())
                          {
                              requestStream.Write(content_ ?? new byte[0]);
                          }
                      }

                      var response_ = client_.ExecuteRequest(request_);
                      var headers_ = System.Linq.Enumerable.ToDictionary(response_.Headers.AllKeys, h_ => h_, h_ => response_.Headers[h_]);

                      var status_ = ((int)response_.StatusCode).ToString();
                      if (status_ == "200") 
                      {
                          ${values.legacyHttpClientResponseHandler}
                      }
                      else if (status_ == "301" || status_ == "302")
                      {
                          request_ = (System.Net.HttpWebRequest)System.Net.HttpWebRequest.Create(headers_["Location"]);
                          request_.Method = "GET";
                          request_.ContentLength = 0;
                          request_.Accept = "*/*";

                          response_ = client_.ExecuteRequest(request_);
                          headers_ = System.Linq.Enumerable.ToDictionary(response_.Headers.AllKeys, h_ => h_, h_ => response_.Headers[h_]);

                          ${values.legacyHttpClientResponseHandler}
                      }
                      else
                      {
                          string responseData_;
                          using (var reader = new System.IO.StreamReader(response_.GetResponseStream()))
                          {
                              responseData_ = reader.ReadToEnd();
                          }
                          var result_ = default(HiveMP.Api.HiveMPSystemError); 
                          try
                          {
                              result_ = Newtonsoft.Json.JsonConvert.DeserializeObject<HiveMP.Api.HiveMPSystemError>(responseData_);
                          } 
                          catch (System.Exception exception_) 
                          {
                              throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, new HiveMP.Api.HiveMPSystemError
                                  {
                                      Code = 0,
                                      Message = "Could not deserialize the response body.",
                                      Fields = "RESPONSE:\\n\\n" + responseData_ + "\\n\\nEXCEPTION MESSAGE:\\n\\n" + exception_.Message,
                                  });
                          }

                          if (result_ == null)
                          {
                              throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, new HiveMP.Api.HiveMPSystemError
                                  {
                                      Code = 0,
                                      Message = "Could not deserialize the response body.",
                                      Fields = "RESPONSE:\\n\\n" + responseData_ + "\\n\\nDESERIALIZED RESULT WAS NULL",
                                  });
                          }

                          throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, result_);
                      }
                  });
              }
              catch (System.AggregateException ex)
              {
                  if (ex.InnerExceptions.Count == 1)
                  {
                      if (ex.InnerExceptions[0] is HiveMP.Api.HiveMPException)
                      {
                          // Rethrow the HiveMPException without it being wrapped in AggregateException.
                          throw ex.InnerExceptions[0];
                      }
                  }

                  // Otherwise propagate.
                  throw;
              }
#endif
          }
          finally
          {
              if (client_ != null)
                  client_.Dispose();
          }
      }
#endif

      /// <summary>
      /// ${values.methodSummary}
      /// </summary>
      /// <remarks>
      /// ${values.methodDescription}
      /// </remarks>
      /// <param name="arguments">The ${values.methodNameEscaped} arguments.</param>
      /// <param name="resolve">The callback to run when the API call returns. This is always executed on the main thread.</param>
      /// <param name="reject">The callback to run when the API call failed. This is always executed on the main thread.</param>
      public void ${values.methodName}Promise(${values.methodName}Request arguments, ${values.returnTypes.promiseType} resolve, System.Action<System.Exception> reject)
      {
#if ENABLE_CLIENT_CONNECT_SDK
          if (HiveMP.Api.HiveMPSDK.ClientConnect != null && 
              HiveMP.Api.HiveMPSDK.ClientConnect.IsApiHotpatched("${values.apiId}", "${values.methodOperationId}"))
          {
              HiveMP.Api.HiveMPPromiseScheduler.ExecuteWithMainThreadCallbacks(new ${values.promiseReturnType}((resolve_, reject_) =>
              {
                  int delay = 1000;
                  System.Action<HiveMP.Api.HiveMPSDK.HotpatchRef> then = null;
                  System.Action run = () =>
                  {
                      HiveMP.Api.HiveMPSDK.RunHotpatchWithPromise(
                          "${values.apiId}", 
                          "${values.methodOperationId}",
                          BaseUrl,
                          ApiKey,
                          Newtonsoft.Json.JsonConvert.SerializeObject(arguments)
                      ).Then(then).Catch(reject_);
                  };
                  then = (@ref) =>
                  {
                      if (@ref.HttpStatusCode >= 200 && @ref.HttpStatusCode < 300)
                      {
                          ${values.clientConnectResponseHandler}
                      }
                      else
                      {
                          var result_ = default(HiveMP.Api.HiveMPSystemError); 
                          try
                          {
                              result_ = Newtonsoft.Json.JsonConvert.DeserializeObject<HiveMP.Api.HiveMPSystemError>(@ref.BodyJson);
                              if (result_.Code >= 6000 && result_.Code < 7000)
                              {
                                  // Retry after delay.
                                  var timer = new System.Timers.Timer();
                                  timer.Interval = delay;
                                  timer.AutoReset = true;
                                  timer.Elapsed += new System.Timers.ElapsedEventHandler((sender, e) =>
                                  {
                                      run();
                                  });
                                  timer.Start();
                                  delay *= 2;
                                  delay = System.Math.Min(30000, delay);
                                  return;
                              }
                          } 
                          catch (System.Exception exception_) 
                          {
                              reject_(new HiveMP.Api.HiveMPException(@ref.HttpStatusCode, new HiveMP.Api.HiveMPSystemError
                                  {
                                      Code = 0,
                                      Message = "Could not deserialize the response body.",
                                      Fields = "RESPONSE:\\n\\n" + @ref.BodyJson + "\\n\\nEXCEPTION MESSAGE:\\n\\n" + exception_.Message,
                                  }));
                              return;
                          }
    
                          if (result_ == null)
                          {
                              reject_(new HiveMP.Api.HiveMPException(@ref.HttpStatusCode, new HiveMP.Api.HiveMPSystemError
                                  {
                                      Code = 0,
                                      Message = "Could not deserialize the response body.",
                                      Fields = "RESPONSE:\\n\\n" + @ref.BodyJson + "\\n\\nDESERIALIZED RESULT WAS NULL",
                                  }));
                              return;
                          }
    
                          reject_(new HiveMP.Api.HiveMPException(@ref.HttpStatusCode, result_));
                          return;
                      }
                  };
                  run();
              }).Then(resolve).Catch(reject));
              return;
          }
#endif

          HiveMP.Api.HiveMPPromiseScheduler.ExecuteWithMainThreadCallbacks(new ${values.promiseReturnType}((resolve_, reject_) =>
          {
              try
              {
                  ${values.promiseReturnStore}${values.methodName}Internal(arguments);
                  ${values.promiseResolve}
              }
              catch (System.Exception ex)
              {
                  reject_(ex);
              }
          }).Then(resolve).Catch(reject));
      }

      /// <summary>
      /// ${values.methodSummary}
      /// </summary>
      /// <remarks>
      /// ${values.methodDescription}
      /// </remarks>
      /// <param name="arguments">The ${values.methodNameEscaped} arguments.</param>
      private ${values.returnTypes.syncType} ${values.methodName}Internal(${values.methodName}Request arguments)
      {
          var urlBuilder_ = new System.Text.StringBuilder();
          urlBuilder_.Append(BaseUrl).Append("${values.methodPath}?");
          ${values.parameterQueryLoadingCode}
          urlBuilder_.Length--;
  
          var client_ = new HiveMP.Api.RetryableHttpClient();
          try
          {
              PrepareRequest(client_, urlBuilder_);
              var url_ = urlBuilder_.ToString();
              PrepareRequest(client_, url_);

              byte[] content_ = null;
              string contentType_ = "application/json";
              ${values.parameterBodyLoadingCodeLegacyHttpClient}
              
              var request_ = (System.Net.HttpWebRequest)System.Net.HttpWebRequest.Create(url_);
              request_.Method = "${values.methodHttpMethod}";
              request_.ContentLength = content_ == null ? 0 : content_.Length;
              request_.Accept = "application/json";
              client_.UpdateRequest(request_);

              if (request_.Method != "GET" && request_.Method != "DELETE")
              {
                  request_.ContentType = contentType_;

                  // This will actually start the request, so we can't send any more headers
                  // after opening the request stream.
                  using (var requestStream = request_.GetRequestStream())
                  {
                      requestStream.Write(content_ ?? new byte[0]);
                  }
              }

              var response_ = client_.ExecuteRequest(request_);
              var headers_ = System.Linq.Enumerable.ToDictionary(response_.Headers.AllKeys, h_ => h_, h_ => response_.Headers[h_]);

              var status_ = ((int)response_.StatusCode).ToString();
              if (status_ == "200") 
              {
                  ${values.legacyHttpClientResponseHandler}
              }
              else if (status_ == "301" || status_ == "302")
              {
                  request_ = (System.Net.HttpWebRequest)System.Net.HttpWebRequest.Create(headers_["Location"]);
                  request_.Method = "GET";
                  request_.ContentLength = 0;
                  request_.Accept = "*/*";

                  response_ = client_.ExecuteRequest(request_);
                  headers_ = System.Linq.Enumerable.ToDictionary(response_.Headers.AllKeys, h_ => h_, h_ => response_.Headers[h_]);
                  
                  ${values.legacyHttpClientResponseHandler}
              }
              else
              {
                  string responseData_;
                  using (var reader = new System.IO.StreamReader(response_.GetResponseStream()))
                  {
                      responseData_ = reader.ReadToEnd();
                  }
                  var result_ = default(HiveMP.Api.HiveMPSystemError); 
                  try
                  {
                      result_ = Newtonsoft.Json.JsonConvert.DeserializeObject<HiveMP.Api.HiveMPSystemError>(responseData_);
                  } 
                  catch (System.Exception exception_) 
                  {
                      throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, new HiveMP.Api.HiveMPSystemError
                          {
                              Code = 0,
                              Message = "Could not deserialize the response body.",
                              Fields = "RESPONSE:\\n\\n" + responseData_ + "\\n\\nEXCEPTION MESSAGE:\\n\\n" + exception_.Message,
                          });
                  }

                  if (result_ == null)
                  {
                      throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, new HiveMP.Api.HiveMPSystemError
                          {
                              Code = 0,
                              Message = "Could not deserialize the response body.",
                              Fields = "RESPONSE:\\n\\n" + responseData_ + "\\n\\nDESERIALIZED RESULT WAS NULL",
                          });
                  }

                  throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, result_);
              }
          }
          finally
          {
              if (client_ != null)
                  client_.Dispose();
          }
      }
`;
}

export function implementationWebSocketMethodDeclarations(values: {
  apiId: string,
  methodName: string,
  methodNameEscaped: string,
  methodSummary: string,
  methodDescription: string,
  methodOperationId: string,
  methodPath: string,
  methodHttpMethod: string,
  parameterBodyLoadingCodeHttpClient: string,
  parameterBodyLoadingCodeLegacyHttpClient: string,
  parameterQueryLoadingCode: string,
  returnTypes: IMethodReturnTypes,
  returnSyncPrefix: string,
  promiseReturnStore: string,
  promiseReturnType: string,
  promiseResolve: string,
  httpClientResponseHandler: string,
  legacyHttpClientResponseHandler: string,
  legacyParameterXmlComments: string,
  parameterDeclarations: string,
  parameterDeclarationsSuffix: string,
  requestClassConstruction: string,
  clientConnectResponseHandler: string,
  clientConnectResponseHandlerAsync: string,
}) {
  return `
#if HAS_TASKS
      /// <summary>
      /// ${values.methodSummary}
      /// </summary>
      /// <remarks>
      /// ${values.methodDescription}
      /// </remarks>
      /// <param name="arguments">The ${values.methodNameEscaped} arguments.</param>
      public ${values.returnTypes.asyncType} ${values.methodName}Async(${values.methodName}Request arguments)
      {
          return ${values.methodName}Async(arguments, System.Threading.CancellationToken.None);
      }

      /// <summary>
      /// ${values.methodSummary}
      /// </summary>
      /// <remarks>
      /// ${values.methodDescription}
      /// </remarks>
      /// <param name="arguments">The ${values.methodNameEscaped} arguments.</param>
      public async ${values.returnTypes.asyncType} ${values.methodName}Async(${values.methodName}Request arguments, System.Threading.CancellationToken cancellationToken)
      {
          var wsBaseUrl = BaseUrl;
          if (wsBaseUrl.StartsWith("https://"))
          {
              wsBaseUrl = "wss://" + wsBaseUrl.Substring("https://".Length);
          }
          if (wsBaseUrl.StartsWith("http://"))
          {
              wsBaseUrl = "ws://" + wsBaseUrl.Substring("http://".Length);
          }

          var urlBuilder_ = new System.Text.StringBuilder();
          urlBuilder_.Append(wsBaseUrl).Append("${values.methodPath}?");
          ${values.parameterQueryLoadingCode}
          urlBuilder_.Length--;
   
          if (InterceptRequest != null)
          {
              var url = urlBuilder_.ToString();
              var newUrl = InterceptRequest(null, url);
              urlBuilder_.Remove(0, urlBuilder_.Length);
              urlBuilder_.Append(newUrl);
          }

          var client = new System.Net.WebSockets.ClientWebSocket();
          client.Options.SetRequestHeader("X-API-Key", ApiKey ?? string.Empty);
          await client.ConnectAsync(new System.Uri(urlBuilder_.ToString()), cancellationToken);

          return new ${values.methodName}Socket(client);
      }
#endif
`;
}