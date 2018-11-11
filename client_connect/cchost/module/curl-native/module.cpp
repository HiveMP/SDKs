#include "module.h"
#if CLIENT_CONNECT_TARGETING_UNREAL
// When targeting UE4, we use the built in HTTP library instead of cURL because
// Unreal handles the cross-platform aspect of making HTTP requests, regardless
// of the target platform.
#include "CoreMinimal.h"
#include "UObject/ObjectMacros.h"
#include "Net/OnlineBlueprintCallProxyBase.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "DelegateCombinations.h"
#include "OnlineSubsystem.h"
#include "JsonReader.h"
#include "JsonSerializer.h"
#include "IHttpResponse.h"
#include "HttpModule.h"
#include "GenericPlatformHttp.h"
#include "Base64.h"
#else
#include "curl/curl.h"
#endif
#include <cstring>
#include <cstdint>
#include <thread>
#include <vector>
#include "../../jsutil.h"
#if CLIENT_CONNECT_TARGETING_UNREAL
#include "../../ue4log.h"
#else
extern "C" {
#include "log.h"
}
#endif

enum curl_handle_state {
    CHS_PENDING,
    CHS_RUNNING,
    CHS_SUCCESS,
    CHS_ERROR
};

struct curl_handle_t {
	bool finalized;
    curl_handle_state state;
#if CLIENT_CONNECT_TARGETING_UNREAL
#else
    CURL* handle;
    struct curl_slist* reqHeaders;
#endif
    std::thread* thread;
    const char* requestData;
    std::string responseData;
    const char* resolve;
    const char* reject;
    int64_t responseStatusCode;
};

std::vector<struct curl_handle_t*>* handles = nullptr;
std::vector<struct curl_handle_t*>* pending_handles = nullptr;

#if CLIENT_CONNECT_TARGETING_UNREAL
#else
size_t _curl_write_response(void *contents, size_t size, size_t nmemb, std::string *s)
{
	s->append((const char*)contents, (const size_t)(size * nmemb));
    return size * nmemb;
}
#endif

void js_curl_fetch(js_State* J)
{
#if CLIENT_CONNECT_TARGETING_UNREAL
    TSharedRef<IHttpRequest> handle = FHttpModule::Get().CreateRequest();
#else
    auto handle = curl_easy_init();
    if (handle == nullptr)
    {
        js_error(J, "unable to create cURL handle");
    }
#endif
    
    js_copy(J, 2);
    auto resolve = js_ref(J);
    js_pop(J, 1);
    js_copy(J, 3);
    auto reject = js_ref(J);
    js_pop(J, 1);

    // set options
    js_getproperty(J, 1, "url");
    if (js_isstring(J, -1))
    {
        log_trace("curl fetch: url=%s", js_tostring(J, -1));
#if CLIENT_CONNECT_TARGETING_UNREAL
        handle->SetURL(FString(js_tostring(J, -1)));
#else
        curl_easy_setopt(handle, CURLOPT_URL, js_tostring(J, -1));
#endif
    }
    else
    {
#if CLIENT_CONNECT_TARGETING_UNREAL
#else
        curl_easy_setopt(handle, CURLOPT_URL, nullptr);
#endif
    }
    js_pop(J, 1);
    js_getproperty(J, 1, "userAgent");
    if (js_isstring(J, -1))
    {
#if CLIENT_CONNECT_TARGETING_UNREAL
#else
        curl_easy_setopt(handle, CURLOPT_USERAGENT, js_tostring(J, -1));
#endif
    }
    else
    {
#if CLIENT_CONNECT_TARGETING_UNREAL
#else
        curl_easy_setopt(handle, CURLOPT_USERAGENT, "HiveMP-ClientConnect/1.0");
#endif
    }
    js_pop(J, 1);

#if CLIENT_CONNECT_TARGETING_UNREAL
#else
    struct curl_slist* headers = nullptr;
#endif

    // set body if provided
    const char* requestBody = nullptr;
    js_getproperty(J, 1, "body");
    if (js_isstring(J, -1))
    {
        log_trace("curl fetch: body=%s", js_tostring(J, -1));
        requestBody = alloc_copy(js_tostring(J, -1));
    }
	js_pop(J, 1);
    
    // set based on method
    js_getproperty(J, 1, "method");
    if (js_isstring(J, -1))
    {
        auto meth_str = std::string(js_tostring(J, -1));

        log_trace("curl fetch: method=%s", js_tostring(J, -1));

#if CLIENT_CONNECT_TARGETING_UNREAL
        handle->SetVerb(meth_str.c_str());
		if (meth_str == "PUT" || meth_str == "POST")
		{
			handle->SetContentAsString(FString(requestBody));
		}
#else
        if (meth_str == "GET") 
        {
            curl_easy_setopt(handle, CURLOPT_HTTPGET, 1);
        }
        else if (meth_str == "HEAD")
        {
            curl_easy_setopt(handle, CURLOPT_NOBODY, 1);
        }
        else if (meth_str == "PUT")
        {
            curl_easy_setopt(handle, CURLOPT_CUSTOMREQUEST, "PUT");

            if (requestBody == nullptr)
            {
                log_trace("curl fetch: (no body, setting Content-Length to 0)");
                headers = curl_slist_append(headers, "Content-Length: 0");
            }
            else
            {
                curl_easy_setopt(handle, CURLOPT_POSTFIELDSIZE, strlen(requestBody));
                curl_easy_setopt(handle, CURLOPT_POSTFIELDS, requestBody);
            }
        }
        else if (meth_str == "POST")
        {
            curl_easy_setopt(handle, CURLOPT_CUSTOMREQUEST, "POST");

            if (requestBody == nullptr)
            {
                log_trace("curl fetch: (no body, setting Content-Length to 0)");
                headers = curl_slist_append(headers, "Content-Length: 0");
            }
            else
            {
                curl_easy_setopt(handle, CURLOPT_POSTFIELDSIZE, strlen(requestBody));
                curl_easy_setopt(handle, CURLOPT_POSTFIELDS, requestBody);
            }
        }
        else if (meth_str == "DELETE")
        {
            curl_easy_setopt(handle, CURLOPT_CUSTOMREQUEST, "DELETE");
        }
        else
        {
            curl_easy_setopt(handle, CURLOPT_CUSTOMREQUEST, meth_str.c_str());
        }
#endif
    }
	js_pop(J, 1);

    // set custom headers
    js_getproperty(J, 1, "headers");
    if (js_isarray(J, -1))
    {
        for (auto i = 0; i < js_getlength(J, -1); i++)
        {
            js_getindex(J, -1, i);
            log_trace("curl fetch: header=%s", js_tostring(J, -1));
#if CLIENT_CONNECT_TARGETING_UNREAL
			FString FullHeader = js_tostring(J, -1);
			FString HeaderKey;
			FString HeaderValue;
			FullHeader.Split(":", &HeaderKey, &HeaderValue);
            handle->SetHeader(HeaderKey.TrimStartAndEnd(), HeaderValue.TrimStartAndEnd());
#else
            headers = curl_slist_append(headers, js_tostring(J, -1));
#endif
            js_pop(J, 1);
        }

#if CLIENT_CONNECT_TARGETING_UNREAL
#else
        curl_easy_setopt(handle, CURLOPT_HTTPHEADER, headers);
#endif
    }
    js_pop(J, 1);

    // set up initial handle reference
    auto handle_ref = new struct curl_handle_t();
	handle_ref->finalized = false;
	handle_ref->thread = nullptr;
    handle_ref->state = CHS_PENDING;
#if CLIENT_CONNECT_TARGETING_UNREAL
#else
    handle_ref->reqHeaders = headers;
    handle_ref->handle = handle;
#endif
    handle_ref->requestData = nullptr;
    handle_ref->responseData = std::string("");
    handle_ref->resolve = resolve;
    handle_ref->reject = reject;

    // set up other options to read the response data
#if CLIENT_CONNECT_TARGETING_UNREAL
#else
    curl_easy_setopt(handle, CURLOPT_WRITEFUNCTION, _curl_write_response);
    curl_easy_setopt(handle, CURLOPT_WRITEDATA, &(handle_ref->responseData));
#endif

    // start thread for processing
#if CLIENT_CONNECT_TARGETING_UNREAL
    handle->OnProcessRequestComplete().BindLambda([handle_ref](FHttpRequestPtr HttpRequest, FHttpResponsePtr HttpResponse, bool bSucceeded)
    {
        if (!HttpResponse.IsValid())
        {
            log_trace("curl fetch: result=error");
            handle_ref->state = CHS_ERROR;
        }
        else
        {
            auto Response = HttpResponse.Get();

            handle_ref->responseStatusCode = Response->GetResponseCode();

            if (Response->GetResponseCode() != 200)
            {
                log_trace("curl fetch: result=success-with-error");
                handle_ref->state = CHS_ERROR;
            }
            else
            {
                log_trace("curl fetch: result=success");
                handle_ref->state = CHS_SUCCESS;
            }

            log_trace("curl fetch: http-status-code=%lli", handle_ref->responseStatusCode);

            handle_ref->responseData = std::string(TCHAR_TO_UTF8(*(Response->GetContentAsString())));

            log_trace("curl fetch: response=%s", handle_ref->responseData.c_str());
        }

        if (handle_ref->requestData != nullptr)
        {
            free((void*)handle_ref->requestData);
        }
		
		handle_ref->finalized = true;
    });
    handle->ProcessRequest();
    handle_ref->state = CHS_RUNNING;
#else
    handle_ref->thread = new std::thread([handle_ref]() 
    {
        handle_ref->state = CHS_RUNNING;
        auto result = curl_easy_perform(handle_ref->handle);
        if (result == CURLE_OK)
        {
            log_trace("curl fetch: result=success");
            handle_ref->state = CHS_SUCCESS;
            curl_easy_getinfo(handle_ref->handle, CURLINFO_RESPONSE_CODE, &handle_ref->responseStatusCode);
            log_trace("curl fetch: http-status-code=%i", handle_ref->responseStatusCode);
            log_trace("curl fetch: response=%s", handle_ref->responseData.c_str());
        }
        else
        {
            log_trace("curl fetch: result=error (%i, %s)", result, curl_easy_strerror(result));
            handle_ref->state = CHS_ERROR;
        }

        curl_slist_free_all(handle_ref->reqHeaders);

        if (handle_ref->requestData != nullptr)
        {
            free((void*)handle_ref->requestData);
        }

		handle_ref->finalized = true;
    });
#endif

    // add handle ref to pending handles
    pending_handles->push_back(handle_ref);
}

void js_load_curl_native(js_State* J)
{
    handles = new std::vector<struct curl_handle_t*>();
    pending_handles = new std::vector<struct curl_handle_t*>();

    js_newobject(J);
    js_newcfunction(J, js_curl_fetch, "fetch", 3);
    js_setproperty(J, -2, "fetch");
}

void js_tick_curl_native(js_State* J)
{
    if (handles != nullptr)
    {
        for (auto it = handles->begin(); it != handles->end(); )
        {
			if ((*it)->finalized)
			{
				if ((*it)->state == CHS_SUCCESS)
				{
					js_getregistry(J, (*it)->resolve);
					if (js_isundefined(J, -1))
					{
						// no such registry value
						js_pop(J, 1);
					}
					else
					{
						js_pushglobal(J);

						js_newobject(J);
						js_pushstring(J, (*it)->responseData.c_str());
						js_setproperty(J, -2, "responseText");
						js_pushnumber(J, (*it)->responseStatusCode);
						js_setproperty(J, -2, "statusCode");

						if (js_pcall(J, 1) != 0)
						{
							js_debug_error_dump(J);
						}
					}

#if CLIENT_CONNECT_TARGETING_UNREAL
#else
					curl_easy_cleanup((*it)->handle);
#endif
					if ((*it)->thread != nullptr)
					{
						(*it)->thread->join();
						delete (*it)->thread;
					}
					delete *it;
					it = handles->erase(it);
					continue;
				}

				if ((*it)->state == CHS_ERROR)
				{
					js_getregistry(J, (*it)->reject);
					if (js_isundefined(J, -1))
					{
						// no such registry value
						js_pop(J, 1);
					}
					else
					{
						js_pushglobal(J);

						js_newerror(J, "TODO: create error object");

						if (js_pcall(J, 1) != 0)
						{
							js_debug_error_dump(J);
						}
					}

#if CLIENT_CONNECT_TARGETING_UNREAL
#else
					curl_easy_cleanup((*it)->handle);
#endif
					if ((*it)->thread != nullptr)
					{
						(*it)->thread->join();
						delete (*it)->thread;
					}
					delete *it;
					it = handles->erase(it);
					continue;
				}
			}

            ++it;
        }
    }
}

bool js_post_tick_curl_native(js_State* J)
{
    if (handles != nullptr)
    {
        for (auto it = pending_handles->begin(); it != pending_handles->end(); it++)
        {
            handles->push_back(*it);
        }
        pending_handles->clear();

        return handles->size() > 0;
    }
    else
    {
        return false;
    }
}