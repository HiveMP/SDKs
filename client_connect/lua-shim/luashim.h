#pragma once

#include "../mujs/mujs.h"
#include "../mujs/jsi.h"
#include "../mujs/jslex.h"
#include "../mujs/jscompile.h"
#include "../mujs/jsvalue.h"
#include "luaconf.h"

typedef js_CFunction lua_CFunction;
typedef js_State lua_State;
typedef LUA_NUMBER lua_Number;
typedef LUA_INTEGER lua_Integer;
typedef LUA_UNSIGNED lua_Unsigned;

#define LUA_MULTRET 0
#define LUA_REGISTRYINDEX 0

#define LUA_TNONE		JS_TUNDEFINED

#define LUA_TNIL		JS_TNULL
#define LUA_TBOOLEAN		JS_TBOOLEAN
#define LUA_TLIGHTUSERDATA	JS_TOBJECT
#define LUA_TNUMBER		JS_TNUMBER
#define LUA_TSTRING		JS_TMEMSTR
#define LUA_TTABLE		JS_TOBJECT
#define LUA_TFUNCTION		JS_TOBJECT
#define LUA_TUSERDATA		JS_TOBJECT
#define LUA_TTHREAD		JS_TOBJECT