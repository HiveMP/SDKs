#pragma once

#include "../../../mujs/mujs.h"

void js_load_curl_native(js_State* J);

void js_tick_curl_native(js_State* J);
bool js_post_tick_curl_native(js_State* J);