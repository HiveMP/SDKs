#include "module.h"
#include "curl/easy.h"
#include <thread>

enum curl_handle_state {
	PENDING,
	RUNNING,
	SUCCESS,
	ERROR
};

struct curl_handle_t {
	curl_handle_state state;
	CURL* handle;
	std::thread* thread;
	const char* resolve;
	const char* reject;
};

std::vector<struct curl_handle_t*>* handles = nullptr;
std::vector<struct curl_handle_t*>* pending_handles = nullptr;

void js_curl_fetch(js_State* J)
{
	auto handle = curl_easy_init();
	if (handle == nullptr)
	{
		js_error(J, "unable to create cURL handle");
	}

	auto resolve = js_ref(J, 2);
	auto reject = js_ref(J, 3);

	// set options
	js_getproperty(J, 1, "url");
	if (js_isstring(J, -1))
	{
		curl_easy_setopt(handle, CURLOPT_URL, js_tostring(J, -1));
	}
	js_pop(J, 1);

	auto handle_ref = new struct curl_handle_t();
	handle_ref->state = PENDING;
	handle_ref->handle = handle;
	handle_ref->thread = [handle_ref]() {
		handle_ref->state = RUNNING;
		auto result = curl_easy_perform(handle_ref->handle);
		if (result == CURLE_OK)
		{
			handle_ref->state = SUCCESS;
		}
		else
		{
			handle_ref->state = ERROR;
		}
	};

	pending_handles->push_back(handle_ref);
}

void js_load_curl_native(js_State* J)
{
	js_newobject(J);
	js_newcfunction(J, js_curl_fetch, "fetch", 3);
	js_setproperty(J, -2, "fetch");
}

bool js_tick_curl_native(js_State* J)
{
	if (handles != nullptr)
	{
		for (auto it = handles->begin(); it != handles->end(); )
		{
			if ((*it)->state == SUCCESS)
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
					// TODO: Fill in response object.

					if (js_pcall(J, 0) != 0)
					{
						printf("error while calling handle resolve\n");
					}
				}

				curl_easy_cleanup((*it)->handle);
				delete *it;
				it = handles->erase(it);
				continue;
			}

			if ((*it)->state == ERROR)
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

					if (js_pcall(J, 0) != 0)
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