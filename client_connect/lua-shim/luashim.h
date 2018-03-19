#pragma once

#ifdef __cplusplus
extern "C" {
#endif
#include "../mujs/mujs.h"
#include "../mujs/jsi.h"
#include "../mujs/jslex.h"
#include "../mujs/jscompile.h"
#include "../mujs/jsvalue.h"
#include "luaconf.h"
#ifdef __cplusplus
}
#endif

typedef js_CFunction lua_CFunction;
typedef js_State lua_State;
typedef js_Alloc lua_Alloc;
typedef LUA_NUMBER lua_Number;
typedef LUA_INTEGER lua_Integer;
typedef LUA_UNSIGNED lua_Unsigned;

typedef struct lua_Debug {
	int event;
	const char *name;	/* (n) */
	const char *namewhat;	/* (n) 'global', 'local', 'field', 'method' */
	const char *what;	/* (S) 'Lua', 'C', 'main', 'tail' */
	const char *source;	/* (S) */
	int currentline;	/* (l) */
	int linedefined;	/* (S) */
	int lastlinedefined;	/* (S) */
	unsigned char nups;	/* (u) number of upvalues */
	unsigned char nparams;/* (u) number of parameters */
	char isvararg;        /* (u) */
	char istailcall;	/* (t) */
	char short_src[LUA_IDSIZE]; /* (S) */
} lua_Debug;

#define LUA_SIGNATURE	"\x1bLua"
#define LUA_MULTRET	(-1)
#define LUA_REGISTRYINDEX	(-LUAI_MAXSTACK - 1000)

#define LUA_TNONE		(-1)

#define LUA_TNIL		0
#define LUA_TBOOLEAN		1
#define LUA_TLIGHTUSERDATA	2
#define LUA_TNUMBER		3
#define LUA_TSTRING		4
#define LUA_TTABLE		5
#define LUA_TFUNCTION		6
#define LUA_TUSERDATA		7
#define LUA_TTHREAD		8

#define LUA_OK		0
#define LUA_YIELD	1
#define LUA_ERRRUN	2
#define LUA_ERRSYNTAX	3
#define LUA_ERRMEM	4
#define LUA_ERRGCMM	5
#define LUA_ERRERR	6

#define lua_call js_call
#define lua_concat js_concat
#define lua_copy js_copy
#define lua_atpanic js_atpanic
#define lua_getglobal js_getglobal
#define lua_gettop js_gettop
#define lua_pop js_pop
#define lua_pushboolean js_pushboolean
#define lua_pushnumber js_pushnumber
#define lua_pushnil js_pushnull
#define lua_insert js_insert
#define lua_isboolean js_isboolean
#define lua_isfunction js_iscallable

inline int lua_getfield(lua_State* L, int idx) {
	return js_getproperty(L, idx);
}

inline int lua_type(lua_State *L, int idx) {
	if (js_isundefined(L, idx)) {
		return LUA_TNONE;
	}
	if (js_isnull(L, idx)) {
		return LUA_TNIL;
	}
	if (js_isnumber(L, idx)) {
		return LUA_TNUMBER;
	}
	if (js_isstring(L, idx)) {
		return LUA_TSTRING;
	}
	if (js_isobject(L, idx)) {
		return LUA_TTABLE;
	}
	if (js_iscallable(L, idx)) {
		return LUA_TFUNCTION;
	}
	// don't know
	return LUA_TNIL;
}

inline void lua_pushinteger(lua_State *L, lua_Integer n) {
	js_pushnumber(L, (double)n);
}

inline int lua_error(lua_State* L)
{
	js_throw(L);
	return 0;
}

inline int lua_absindex(lua_State *L, int idx) 
{
	return idx > 0
		? idx
		: js_gettop(L) + idx + 1;
}

inline const char *lua_pushfstring(lua_State *L, const char *fmt, ...) {
	const char *ret = fmt;
	va_list argp;
	va_start(argp, fmt);
	js_pushstring(L, fmt); // no formatting support
	va_end(argp);
	return ret;
}