#ifndef _CONNECT_IMPL_H
#define _CONNECT_IMPL_H 1

#include <stdint.h>

void cci_init();
bool cci_is_hotpatched(const char* api, const char* operation);
char* cci_call_hotpatch(const char* api, const char* operation, const char* endpoint, const char* apiKey, const char* parametersAsJson, int32_t* statusCode);
#endif