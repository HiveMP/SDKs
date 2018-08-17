#if CLIENT_CONNECT_TARGETING_UNREAL
#else
extern "C" {
#include "mujs.h"
}
#include "connect.impl.h"
#include <cstdint>
#include <cstdlib>
#include <mutex>

#include "module/hotpatching/module.h"

#if WIN32
#define DLLEXPORT __declspec(dllexport)
#else
#define DLLEXPORT
#endif

// We use a global SDK lock to prevent multiple SDK methods from being called
// at the same time, since the Client Connect SDK is internally not thread-safe.
std::mutex global_sdk_lock;

extern "C"
{
	DLLEXPORT void cc_init(bool log_stderr, const char* log_path)
	{
		std::lock_guard<std::mutex> lock(global_sdk_lock);

		cci_init(log_stderr, log_path);
	}

	DLLEXPORT bool cc_tick()
	{
		std::lock_guard<std::mutex> lock(global_sdk_lock);

		return cci_tick();
	}

	DLLEXPORT void cc_free_string(char* ptr)
	{
		std::lock_guard<std::mutex> lock(global_sdk_lock);

		// C# can't free a C-style string on return, even though it can marshal it.
		free(ptr);
	}

	DLLEXPORT bool cc_is_api_hotpatched(const char* api, const char* operation)
	{
		std::lock_guard<std::mutex> lock(global_sdk_lock);

		return js_is_api_hotpatched(api, operation);
	}

	DLLEXPORT long cc_call_api_hotpatch(const char* api, const char* operation, const char* endpoint, const char* apiKey, const char* parametersAsJson)
	{
		std::lock_guard<std::mutex> lock(global_sdk_lock);

		return js_call_api_hotpatch(
			api,
			operation,
			endpoint,
			apiKey,
			parametersAsJson
		);
	}

	DLLEXPORT bool cc_is_api_hotpatch_call_ready(long id)
	{
		std::lock_guard<std::mutex> lock(global_sdk_lock);

		return js_is_api_hotpatch_call_ready(id);
	}

	DLLEXPORT const char* cc_get_api_hotpatch_result(long id)
	{
		std::lock_guard<std::mutex> lock(global_sdk_lock);

		return js_get_api_hotpatch_result(id);
	}

	DLLEXPORT int32_t cc_get_api_hotpatch_status_code(long id)
	{
		std::lock_guard<std::mutex> lock(global_sdk_lock);

		return js_get_api_hotpatch_status_code(id);
	}

	DLLEXPORT void cc_release_api_hotpatch_result(long id)
	{
		std::lock_guard<std::mutex> lock(global_sdk_lock);

		return js_release_api_hotpatch_result(id);
	}
}
#endif