#pragma once

extern "C" {
#include "mujs.h"
}

#include <string>

extern js_State* _js;

void js_debug_object_dump(js_State* J, std::string indent, bool simple);
void js_debug_value_dump(js_State* L, std::string indent, bool simple = false);
void js_debug_stack_dump(js_State* L, bool simple = false);
void js_debug_error_dump(js_State* L);
int js_hasproperty_nopush(js_State *J, int idx, const char *name);
const char* alloc_copy(const char* fixed);
const char* serialize_json(js_State* J, int idx, const char* default);