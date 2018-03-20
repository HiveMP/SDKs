extern "C" {
#include "mujs.h"
}
#include "connect.impl.h"
#include <stdint.h>
#include <stdlib.h>

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

    DLLEXPORT bool cc_is_hotpatched(const char* api, const char* operation)
    {
        return cci_is_hotpatched(api, operation);
    }

    DLLEXPORT char* cc_call_hotpatch(const char* api, const char* operation, const char* endpoint, const char* apiKey, const char* parametersAsJson, int32_t* statusCode)
    {
        return cci_call_hotpatch(api, operation, endpoint, apiKey, parametersAsJson, statusCode);
    }

	DLLEXPORT void cc_free_string(char* ptr)
	{
		// C# can't free a C-style string on return, even though it can marshal it.
		free(ptr);
	}
}