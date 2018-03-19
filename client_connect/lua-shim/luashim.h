#pragma once

extern "C" {
#include "../mujs/mujs.h"
}

#define lua_State js_State

typedef struct luaL_Reg {
	const char *name;
	js_CFunction func;
} luaL_Reg;