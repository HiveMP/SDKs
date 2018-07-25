#pragma once

extern "C" {
#if CLIENT_CONNECT_TARGETING_UNREAL
#include "../mujs/mujs.h"
#else 
#include "mujs.h"
#endif
}

#include <string>

extern js_State* _js;

void js_debug_object_dump(js_State* J, std::string indent, bool simple);
void js_debug_value_dump(js_State* L, std::string indent, bool simple = false);
void js_debug_stack_dump(js_State* L, bool simple = false);
std::string js_get_debug_object_dump(js_State* J, std::string indent, bool simple);
std::string js_get_debug_value_dump(js_State* L, std::string indent, bool simple = false);
std::string js_get_debug_stack_dump(js_State* L, bool simple = false);
void js_debug_error_dump(js_State* L);
int js_hasproperty_nopush(js_State *J, int idx, const char *name);
const char* alloc_copy(const char* fixed);
const char* serialize_json(js_State* J, int idx, const char* def);