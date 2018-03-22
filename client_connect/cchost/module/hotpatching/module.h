#pragma once

#include "../../../mujs/mujs.h"
#include <cstdint>

void js_load_hotpatching(js_State* J);

bool js_post_tick_hotpatching(js_State* J);

bool js_is_api_hotpatched(const char* api_raw, const char* operation_raw);
long js_call_api_hotpatch(
	const char* api_raw,
	const char* operation_raw,
	const char* endpoint_raw,
	const char* apiKey_raw,
	const char* parametersAsJson_raw);
bool js_is_api_hotpatch_call_ready(long id);
const char* js_get_api_hotpatch_result(long id);
int32_t js_get_api_hotpatch_status_code(long id);
void js_release_api_hotpatch_result(long id);