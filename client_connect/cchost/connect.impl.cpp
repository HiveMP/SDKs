#include "connect.impl.h"
extern "C" {
#include "mujs.h"
}
#include "embed.h"
#include <stdlib.h>
#include <string.h>
#include <string>
#include <map>

#define DEFINE_JS_FUNC(name) \
    js_pushcfunction(_js, _ccl_ ## name); \
    js_setglobal(_js, #name);
#define DEFINE_JS_LIB(name) \
	js_getglobal(_js, "package"); \
	js_pushstring(_js, "preload"); \
	js_gettable(_js, -2); \
	js_pushcclosure(_js, luaopen_ ## name, 0); \
	js_setfield(_js, -2, #name); \
	js_settop(_js, 0);

std::map<std::string, std::string>* _hotpatches = nullptr;
js_State* _js = nullptr;

int _ccl_register_hotpatch(js_State *J)
{
    auto id = js_tostring(J, 1);
    auto handler = js_tostring(J, 2);

    if (id != nullptr && handler != nullptr && _hotpatches != nullptr)
    {
        (*_hotpatches)[id] = handler;
        js_pushboolean(J, true);
    }
    else
    {
		js_pushboolean(J, false);
    }

    return 1;
}

void cci_init()
{
    if (_hotpatches == nullptr)
    {
        _hotpatches = new std::map<std::string, std::string>();
    }

    if (_js == nullptr)
    {
		_js = js_newstate(NULL, NULL, JS_STRICT);
		js_dostring(_js, _embedded_sdk);
    }
}

bool cci_is_hotpatched(const char* api_raw, const char* operation_raw)
{
	cci_init();

    std::string api(api_raw);
    std::string operation(operation_raw);

    auto id = api + ":" + operation;

    return _hotpatches->find(id) != _hotpatches->end();
}

static void stackDump(js_State *L) {
	int i;
	int top = js_gettop(L);
	for (i = 1; i <= top; i++) {  /* repeat for each level */
		if (js_isundefined(L, i)) {
			printf("undefined\n");
		}
		else if (js_isnull(L, i)) {
			printf("null\n");
		}
		else if (js_isboolean(L, i)) {
			printf(js_toboolean(L, i) ? "true\n" : "false\n");
		}
		else if (js_isnumber(L, i)) {
			printf("%g\n", js_tonumber(L, i));
		}
		else if (js_isstring(L, i)) {
			printf("`%s'\n", js_tostring(L, i));
		}
		else if (js_iscoercible(L, i)) {
			printf("%s\n", js_tostring(L, i));
		}
		else {
			printf("(unknown)\n");
		}
	}
	printf("\n");  /* end the listing */
}

char* cci_call_hotpatch(
	const char* api_raw, 
	const char* operation_raw, 
	const char* endpoint_raw, 
	const char* apiKey_raw, 
	const char* parametersAsJson_raw, 
	int32_t* statusCode_raw)
{
    cci_init();

	const char* result_to_copy = nullptr;
	bool pop_lua_after_copy = false;

    if (!cci_is_hotpatched(api_raw, operation_raw))
    {
        *statusCode_raw = 400;
        result_to_copy = "{\"code\": 7001, \"message\": \"Request is not hotpatched, make a direct call to the servers\", \"fields\": null}";
    }
	else
	{
		std::string api(api_raw);
		std::string operation(operation_raw);

		auto id = api + ":" + operation;

		auto lua_func_name = (*_hotpatches)[id];

		js_getglobal(_js, lua_func_name.c_str());
		lua_pushstring(_lua, id.c_str());
		lua_pushstring(_lua, endpoint_raw);
		lua_pushstring(_lua, apiKey_raw);
		lua_pushstring(_lua, parametersAsJson_raw);

		if (lua_pcall(_lua, 4, 2, 0) != 0)
		{
			*statusCode_raw = 500;
			printf("error: %s\n", lua_tostring(_lua, -1));
			lua_pop(_lua, 1);
			result_to_copy = "{\"code\": 7002, \"message\": \"An internal error occurred while running hotpatch\", \"fields\": null}";
		}
		else
		{
			int isnum;
			lua_Integer d = lua_tointegerx(_lua, 1, &isnum);
			const char* s = lua_tostring(_lua, 2);
			if (!isnum || s == nullptr)
			{
				*statusCode_raw = 500;
				lua_pop(_lua, 2);
				result_to_copy = "{\"code\": 7002, \"message\": \"The hotpatch return value was not in an expected format\", \"fields\": null}";
			}
			else
			{
				*statusCode_raw = (int)d;
				result_to_copy = s;
				pop_lua_after_copy = true;
			}
		}
	}

	auto len = strlen(result_to_copy) + 1;
	char* result = (char*)malloc(len);
	memcpy(result, result_to_copy, len);
	result[len - 1] = 0;

	if (pop_lua_after_copy)
	{
		lua_pop(_lua, 2);
	}

	// Caller must free after usage.
	return result;
}