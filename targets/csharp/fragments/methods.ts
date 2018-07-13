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
      [System.Obsolete(
          "Synchronous invocations are deprecated, because Client Connect implementations must be able to execute independent of the main application thread. If you invoke this method and a Client Connect implementation is present, an exception will be thrown. You should use the async/await version of this call where available. If you don't have access to async/await (.NET 4.5 and above), use the promise variant of this API call.")]
      ${values.returnTypes.syncType} ${values.methodName}(${values.methodName}Request arguments);
      
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
  parameterBodyLoadingCode: string,
  parameterQueryLoadingCode: string,
  returnTypes: IMethodReturnTypes,
  returnSyncPrefix: string,
  promiseReturnStore: string,
  promiseReturnType: string,
  promiseResolve: string,
  httpResponseHandler: string,
  legacyParameterXmlComments: string,
  parameterDeclarations: string,
  parameterDeclarationsSuffix: string,
  requestClassConstruction: string,
  clientConnectWait: string,
  clientConnectWaitAsync: string,
  clientConnectResponseHandler: string,
}) {
  return `
#if HAS_TASKS
      /// <summary>
      /// ${values.methodSummary}
      /// </summary>
      /// <remarks>
      /// ${values.methodDescription}
      /// </remarks>
      ${values.legacyParameterXmlComments}
      [System.Obsolete(
          "API calls with fixed position parameters are subject to change when new optional parameters " +
          "are added to the API; use the ${values.methodName}Async(${values.methodName}Request) version of this method " +
          "instead to ensure forward compatibility")]
      public ${values.returnTypes.asyncType} ${values.methodName}Async(${values.parameterDeclarations})
      {
          return ${values.methodName}Async(${values.requestClassConstruction}, System.Threading.CancellationToken.None);
      }

      /// <summary>
      /// ${values.methodSummary}
      /// </summary>
      /// <remarks>
      /// ${values.methodDescription}
      /// </remarks>
      ${values.legacyParameterXmlComments}
      /// <param name="cancellationToken">The cancellation token for the asynchronous request.</param>
      [System.Obsolete(
          "API calls with fixed position parameters are subject to change when new optional parameters " +
          "are added to the API; use the ${values.methodName}Async(${values.methodName}Request,CancellationToken) version of this method " +
          "instead to ensure forward compatibility")]
      public ${values.returnTypes.asyncType} ${values.methodName}Async(${values.parameterDeclarations}${values.parameterDeclarationsSuffix}System.Threading.CancellationToken cancellationToken)
      {
          return ${values.methodName}Async(${values.requestClassConstruction}, cancellationToken);
      }
      
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
          ${values.clientConnectWaitAsync}

#if ENABLE_CLIENT_CONNECT_SDK
          // TODO: Make threaded when Client Connect supports it!
          if (HiveMP.Api.HiveMPSDKSetup.IsHotpatched("${values.apiId}", "${values.methodOperationId}"))
          {
              var delay = 1000;
              do
              {
                  int statusCode;
                  var response = HiveMP.Api.HiveMPSDKSetup.CallHotpatch(
                      "${values.apiId}",
                      "${values.methodOperationId}",
                      BaseUrl,
                      ApiKey,
                      Newtonsoft.Json.JsonConvert.SerializeObject(arguments),
                      out statusCode);
                  if (statusCode >= 200 && statusCode < 300)
                  {
                      ${values.clientConnectResponseHandler}
                  }
                  else
                  {
                      var result_ = default(HiveMP.Api.HiveMPSystemError); 
                      try
                      {
                          result_ = Newtonsoft.Json.JsonConvert.DeserializeObject<HiveMP.Api.HiveMPSystemError>(response);
                          if (result_.Code >= 6000 && result_.Code < 7000)
                          {
                              await System.Threading.Tasks.Task.Delay(delay);
                              delay *= 2;
                              delay = System.Math.Min(30000, delay);
                              continue;
                          }
                      } 
                      catch (System.Exception exception_) 
                      {
                          throw new HiveMP.Api.HiveMPException(statusCode, new HiveMP.Api.HiveMPSystemError
                              {
                                  Code = 0,
                                  Message = "Could not deserialize the response body.",
                                  Fields = string.Empty,
                              });
                      }

                      if (result_ == null)
                      {
                          throw new HiveMP.Api.HiveMPException(statusCode, new HiveMP.Api.HiveMPSystemError
                              {
                                  Code = 0,
                                  Message = "Could not deserialize the response body.",
                                  Fields = string.Empty,
                              });
                      }

                      throw new HiveMP.Api.HiveMPException(statusCode, result_);
                  }
              }
              while (true);
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
                  
                  string content_ = null;
                  System.Net.Http.StringContent stringContent_ = null;
                  ${values.parameterBodyLoadingCode}
                  if (content_ == null)
                  {
                      stringContent_ = new System.Net.Http.StringContent(string.Empty);
                  }
                  else
                  {
                      stringContent_ = new System.Net.Http.StringContent(content_, System.Text.Encoding.UTF8, "application/json");
                  }
                  
                  if ("${values.methodHttpMethod}" != "GET" && "${values.methodHttpMethod}" != "DELETE")
                  {
                      request_.Content = stringContent_;
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
                          var responseData_ = await response_.Content.ReadAsStringAsync().ConfigureAwait(false); 
                          ${values.httpResponseHandler}
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
                                      Fields = string.Empty,
                                  });
                          }

                          if (result_ == null)
                          {
                              throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, new HiveMP.Api.HiveMPSystemError
                                  {
                                      Code = 0,
                                      Message = "Could not deserialize the response body.",
                                      Fields = string.Empty,
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

                      string content_ = null;
                      ${values.parameterBodyLoadingCode}
                      
                      var request_ = (System.Net.HttpWebRequest)System.Net.HttpWebRequest.Create(url_);
                      request_.Method = "${values.methodHttpMethod}";
                      request_.ContentLength = content.Length;
                      request_.Accept = "application/json";
                      client_.UpdateRequest(request_);

                      if (request_.Method != "GET" && request_.Method != "DELETE")
                      {
                          request_.ContentType = "application/json";
        
                          // This will actually start the request, so we can't send any more headers
                          // after opening the request stream.
                          using (var writer = new System.IO.StreamWriter(request_.GetRequestStream()))
                          {
                              writer.Write(content_ ?? string.Empty);
                          }
                      }

                      var response_ = client_.ExecuteRequest(request_);
                      var headers_ = System.Linq.Enumerable.ToDictionary(response_.Headers.AllKeys, h_ => h_, h_ => response_.Headers[h_]);

                      var status_ = ((int)response_.StatusCode).ToString();
                      if (status_ == "200") 
                      {
                          string responseData_;
                          using (var reader = new System.IO.StreamReader(response_.GetResponseStream()))
                          {
                              responseData_ = reader.ReadToEnd();
                          }

                          ${values.httpResponseHandler}
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
                                      Fields = string.Empty,
                                  });
                          }

                          if (result_ == null)
                          {
                              throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, new HiveMP.Api.HiveMPSystemError
                                  {
                                      Code = 0,
                                      Message = "Could not deserialize the response body.",
                                      Fields = string.Empty,
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
      ${values.legacyParameterXmlComments}
      [System.Obsolete(
          "API calls with fixed position parameters are subject to change when new optional parameters " +
          "are added to the API; use the ${values.methodName}(${values.methodName}Request) version of this method " +
          "instead to ensure forward compatibility")]
      public ${values.returnTypes.syncType} ${values.methodName}(${values.parameterDeclarations})
      {
          ${values.returnSyncPrefix}${values.methodName}(${values.requestClassConstruction});
      }

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
      [System.Obsolete(
          "Synchronous invocations are deprecated, because Client Connect implementations must be able to execute independent of the main application thread. If you invoke this method and a Client Connect implementation is present, an exception will be thrown. You should use the async/await version of this call where available. If you don't have access to async/await (.NET 4.5 and above), use the promise variant of this API call.")]
      public ${values.returnTypes.syncType} ${values.methodName}(${values.methodName}Request arguments)
      {
          ${values.returnSyncPrefix} ${values.methodName}Internal(arguments);
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
          ${values.clientConnectWait}

#if ENABLE_CLIENT_CONNECT_SDK
          if (HiveMP.Api.HiveMPSDKSetup.IsHotpatched("${values.apiId}", "${values.methodOperationId}"))
          {
              var delay = 1000;
              do
              {
                  int statusCode;
                  var response = HiveMP.Api.HiveMPSDKSetup.CallHotpatch(
                      "${values.apiId}",
                      "${values.methodOperationId}",
                      BaseUrl,
                      ApiKey,
                      Newtonsoft.Json.JsonConvert.SerializeObject(arguments),
                      out statusCode);
                  if (statusCode >= 200 && statusCode < 300)
                  {
                      ${values.clientConnectResponseHandler}
                  }
                  else
                  {
                      var result_ = default(HiveMP.Api.HiveMPSystemError); 
                      try
                      {
                          result_ = Newtonsoft.Json.JsonConvert.DeserializeObject<HiveMP.Api.HiveMPSystemError>(response);
                          if (result_.Code >= 6000 && result_.Code < 7000)
                          {
                              System.Threading.Thread.Sleep(delay);
                              delay *= 2;
                              delay = System.Math.Min(30000, delay);
                              continue;
                          }
                      } 
                      catch (System.Exception exception_) 
                      {
                          throw new HiveMP.Api.HiveMPException(statusCode, new HiveMP.Api.HiveMPSystemError
                              {
                                  Code = 0,
                                  Message = "Could not deserialize the response body.",
                                  Fields = string.Empty,
                              });
                      }

                      if (result_ == null)
                      {
                          throw new HiveMP.Api.HiveMPException(statusCode, new HiveMP.Api.HiveMPSystemError
                              {
                                  Code = 0,
                                  Message = "Could not deserialize the response body.",
                                  Fields = string.Empty,
                              });
                      }

                      throw new HiveMP.Api.HiveMPException(statusCode, result_);
                  }
              }
              while (true);
          }
#endif

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

              string content_ = null;
              ${values.parameterBodyLoadingCode}
              
              var request_ = (System.Net.HttpWebRequest)System.Net.HttpWebRequest.Create(url_);
              request_.Method = "${values.methodHttpMethod}";
              request_.ContentLength = content_.Length;
              request_.Accept = "application/json";
              client_.UpdateRequest(request_);

              if (request_.Method != "GET" && request_.Method != "DELETE")
              {
                  request_.ContentType = "application/json";

                  // This will actually start the request, so we can't send any more headers
                  // after opening the request stream.
                  using (var writer = new System.IO.StreamWriter(request_.GetRequestStream()))
                  {
                      writer.Write(content_ ?? string.Empty);
                  }
              }

              var response_ = client_.ExecuteRequest(request_);
              var headers_ = System.Linq.Enumerable.ToDictionary(response_.Headers.AllKeys, h_ => h_, h_ => response_.Headers[h_]);

              var status_ = ((int)response_.StatusCode).ToString();
              if (status_ == "200") 
              {
                  string responseData_;
                  using (var reader = new System.IO.StreamReader(response_.GetResponseStream()))
                  {
                      responseData_ = reader.ReadToEnd();
                  }

                  ${values.httpResponseHandler}
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
                              Fields = string.Empty,
                          });
                  }

                  if (result_ == null)
                  {
                      throw new HiveMP.Api.HiveMPException((int)response_.StatusCode, new HiveMP.Api.HiveMPSystemError
                          {
                              Code = 0,
                              Message = "Could not deserialize the response body.",
                              Fields = string.Empty,
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
  parameterBodyLoadingCode: string,
  parameterQueryLoadingCode: string,
  returnTypes: IMethodReturnTypes,
  returnSyncPrefix: string,
  promiseReturnStore: string,
  promiseReturnType: string,
  promiseResolve: string,
  httpResponseHandler: string,
  legacyParameterXmlComments: string,
  parameterDeclarations: string,
  parameterDeclarationsSuffix: string,
  requestClassConstruction: string,
  clientConnectWait: string,
  clientConnectWaitAsync: string,
  clientConnectResponseHandler: string,
}) {
  return `
#if HAS_TASKS
      /// <summary>
      /// ${values.methodSummary}
      /// </summary>
      /// <remarks>
      /// ${values.methodDescription}
      /// </remarks>
      ${values.legacyParameterXmlComments}
      [System.Obsolete(
          "API calls with fixed position parameters are subject to change when new optional parameters " +
          "are added to the API; use the ${values.methodName}Async(${values.methodName}Request) version of this method " +
          "instead to ensure forward compatibility")]
      public ${values.returnTypes.asyncType} ${values.methodName}Async(${values.parameterDeclarations})
      {
          return ${values.methodName}Async(${values.requestClassConstruction}, System.Threading.CancellationToken.None);
      }

      /// <summary>
      /// ${values.methodSummary}
      /// </summary>
      /// <remarks>
      /// ${values.methodDescription}
      /// </remarks>
      ${values.legacyParameterXmlComments}
      /// <param name="cancellationToken">The cancellation token for the asynchronous request.</param>
      [System.Obsolete(
          "API calls with fixed position parameters are subject to change when new optional parameters " +
          "are added to the API; use the ${values.methodName}Async(${values.methodName}Request,CancellationToken) version of this method " +
          "instead to ensure forward compatibility")]
      public ${values.returnTypes.asyncType} ${values.methodName}Async(${values.parameterDeclarations}${values.parameterDeclarationsSuffix}System.Threading.CancellationToken cancellationToken)
      {
          return ${values.methodName}Async(${values.requestClassConstruction}, cancellationToken);
      }
      
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