#ifndef _CONNECT_H
#define CONNECT_H 1

#ifdef __cplusplus
extern "C"
{
#endif

#include <cstdbool>
#include <cstdint>

#if WIN32
#define DLLIMPORT __declspec(dllimport)
#else
#define DLLIMPORT
#endif

	DLLIMPORT void cc_init();
	DLLIMPORT bool cc_tick();
	DLLIMPORT void cc_free_string(char* ptr);

	DLLIMPORT bool cc_is_api_hotpatched(const char* api, const char* operation);
	DLLIMPORT long cc_call_api_hotpatch(const char* api, const char* operation, const char* endpoint, const char* apiKey, const char* parametersAsJson);
	DLLIMPORT bool cc_is_api_hotpatch_call_ready(long id);
	DLLIMPORT const char* cc_get_api_hotpatch_result(long id);
	DLLIMPORT int32_t cc_get_api_hotpatch_status_code(long id);
	DLLIMPORT void cc_release_api_hotpatch_result(long id);

#ifdef __cplusplus
}
#endif

#endif