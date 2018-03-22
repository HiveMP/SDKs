extern "C" {
#include "mujs.h"
}
#include "connect.impl.h"
#include <cstdint>
#include <cstdlib>

#include "module/hotpatching/module.h"

#if WIN32
#define DLLEXPORT __declspec(dllexport)
#else
#define DLLEXPORT
#endif

extern "C"
{
	DLLEXPORT void cc_init()
	{
		cci_init();
	}

	DLLEXPORT bool cc_tick()
	{
		return cci_tick();
	}

	DLLEXPORT void cc_free_string(char* ptr)
	{
		// C# can't free a C-style string on return, even though it can marshal it.
		free(ptr);
	}

	DLLEXPORT bool cc_is_api_hotpatched(const char* api, const char* operation)
	{
		return js_is_api_hotpatched(api, operation);
	}

	DLLEXPORT long cc_call_api_hotpatch(const char* api, const char* operation, const char* endpoint, const char* apiKey, const char* parametersAsJson)
	{
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
		return js_is_api_hotpatch_call_ready(id);
	}

	DLLEXPORT const char* cc_get_api_hotpatch_result(long id)
	{
		return js_get_api_hotpatch_result(id);
	}

	DLLEXPORT int32_t cc_get_api_hotpatch_status_code(long id)
	{
		return js_get_api_hotpatch_status_code(id);
	}

	DLLEXPORT void cc_release_api_hotpatch_result(long id)
	{
		return js_release_api_hotpatch_result(id);
	}
}