#include "module.h"
#include "curl/curl.h"
#include <thread>
#include <vector>

enum curl_handle_state {
	CHS_PENDING,
	CHS_RUNNING,
	CHS_SUCCESS,
	CHS_ERROR
};

struct curl_handle_t {
	curl_handle_state state;
	CURL* handle;
	struct curl_slist* reqHeaders;
	std::thread* thread;
	std::string responseData;
	const char* resolve;
	const char* reject;
};

std::vector<struct curl_handle_t*>* handles = nullptr;
std::vector<struct curl_handle_t*>* pending_handles = nullptr;

#define READ_CURL_REQUEST_STRING(name, opt, default) \
	js_getproperty(J, 1, name); \
	if (js_isstring(J, -1)) \
	{ \
		curl_easy_setopt(handle, opt, js_tostring(J, -1)); \
	} \
	else \
	{ \
		curl_easy_setopt(handle, opt, default); \
	} \
	js_pop(J, 1);

size_t _curl_write_response(void *contents, size_t size, size_t nmemb, std::string *s)
{
	size_t newLength = size * nmemb;
	size_t oldLength = s->size();
	try
	{
		s->resize(oldLength + newLength);
	}
	catch (std::bad_alloc &e)
	{
		// handle memory problem
		return 0;
	}

	std::copy((char*)contents, (char*)contents + newLength, s->begin() + oldLength);
	return size * nmemb;
}

void js_curl_fetch(js_State* J)
{
	auto handle = curl_easy_init();
	if (handle == nullptr)
	{
		js_error(J, "unable to create cURL handle");
	}
	
	js_copy(J, 2);
	auto resolve = js_ref(J);
	js_pop(J, 1);
	js_copy(J, 3);
	auto reject = js_ref(J);
	js_pop(J, 1);

	// set options
	READ_CURL_REQUEST_STRING("url", CURLOPT_URL, nullptr);
	READ_CURL_REQUEST_STRING("userAgent", CURLOPT_USERAGENT, "HiveMP-ClientConnect/1.0");

	// set custom headers
	struct curl_slist* headers = nullptr;
	js_getproperty(J, 1, "headers");
	if (js_isarray(J, -1))
	{
		for (auto i = 0; i < js_getlength(J, -1); i++)
		{
			js_getindex(J, -1, i);
			headers = curl_slist_append(headers, js_tostring(J, -1));
			js_pop(J, 1);
		}

		curl_easy_setopt(handle, CURLOPT_HTTPHEADER, headers);
	}
	js_pop(J, 1);

	// set based on method
	js_getproperty(J, 1, "method");
	if (js_isstring(J, -1))
	{
		auto meth_str = std::string(js_tostring(J, -1));

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
			curl_easy_setopt(handle, CURLOPT_UPLOAD, 1);

			// TODO Setup read callback
		}
		else if (meth_str == "POST")
		{
			curl_easy_setopt(handle, CURLOPT_POST, 1);

			// TODO Setup read callback
		}
		else if (meth_str == "DELETE")
		{
			curl_easy_setopt(handle, CURLOPT_CUSTOMREQUEST, "DELETE");
		}
		else
		{
			curl_easy_setopt(handle, CURLOPT_CUSTOMREQUEST, meth_str.c_str());
		}
	}
	js_pop(J, 1);

	// set up initial handle reference
	auto handle_ref = new struct curl_handle_t();
	handle_ref->state = CHS_PENDING;
	handle_ref->reqHeaders = headers;
	handle_ref->handle = handle;
	handle_ref->responseData = std::string("");
	handle_ref->resolve = resolve;
	handle_ref->reject = reject;

	// set up other options to read the response data
	curl_easy_setopt(handle, CURLOPT_WRITEFUNCTION, _curl_write_response);
	curl_easy_setopt(handle, CURLOPT_WRITEDATA, &(handle_ref->responseData));

	// start thread for processing
	handle_ref->thread = new std::thread([handle_ref]() 
	{
		handle_ref->state = CHS_RUNNING;
		auto result = curl_easy_perform(handle_ref->handle);
		if (result == CURLE_OK)
		{
			handle_ref->state = CHS_SUCCESS;
		}
		else
		{
			handle_ref->state = CHS_ERROR;
		}

		curl_slist_free_all(handle_ref->reqHeaders);
	});

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

					if (js_pcall(J, 1) != 0)
					{
						// TODO: push error onto an "unhandled" errors system, or 
						// maybe try to call the reject handler??
						js_pop(J, 1);
					}
				}

				curl_easy_cleanup((*it)->handle);
				delete *it;
				it = handles->erase(it);
				continue;
			}

			if ((*it)->state == CHS_ERROR)
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

					js_newerror(J, "TODO: create error object");

					if (js_pcall(J, 1) != 0)
					{
						printf("error while calling handle resolve\n");
					}
				}

				curl_easy_cleanup((*it)->handle);
				delete *it;
				it = handles->erase(it);
				continue;
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