#include "connect.impl.h"
extern "C" {
#include "mujs.h"
}
#include "embed.h"
#include <stdlib.h>
#include <string.h>
#include <string>
#include <map>

std::map<std::string, std::string>* _hotpatches = nullptr;
js_State* _js = nullptr;

void _ccl_register_hotpatch(js_State *J)
{
    auto id = js_tostring(J, 1);
	if (js_iscallable(J, 2)) {
		auto handler = js_ref(J);

		if (id != nullptr && handler != nullptr && _hotpatches != nullptr)
		{
			(*_hotpatches)[id] = handler;
			js_pushboolean(J, true);
		}
		else
		{
			js_pushboolean(J, false);
		}
	}
	else {
		js_pushboolean(J, false);
	}
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
		js_newcfunction(_js, _ccl_register_hotpatch, "register_hotpatch", 2);
		js_setglobal(_js, "register_hotpatch");
		if (js_dostring(_js, _embedded_sdk) == 1) {
			// error
		}
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
	bool pop_js_after_copy = false;

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

		auto js_ref_name = (*_hotpatches)[id];

		js_getregistry(_js, js_ref_name.c_str());
		js_newobject(_js);
		
		js_pushstring(_js, id.c_str());
		js_setproperty(_js, -2, "id");

		js_pushstring(_js, endpoint_raw);
		js_setproperty(_js, -2, "endpoint");

		js_pushstring(_js, apiKey_raw);
		js_setproperty(_js, -2, "apiKey");

		// Use JSON.parse to decode the parametersAsJson field.
		js_pushstring(_js, parametersAsJson_raw);
		js_getglobal(_js, "JSON");
		js_getproperty(_js, -1, "parse");
		js_pcall(_js, -1);
		js_setproperty(_js, -2, "parameters");

		if (js_pcall(_js, 1) != 0)
		{
			*statusCode_raw = 500;
			printf("error: %s\n", js_tostring(_js, -1));
			js_pop(_js, 1);
			result_to_copy = "{\"code\": 7002, \"message\": \"An internal error occurred while running hotpatch\", \"fields\": null}";
		}
		else
		{

#define BAIL \
	*statusCode_raw = 500; \
	js_pop(_js, 1); \
	result_to_copy = "{\"code\": 7002, \"message\": \"The hotpatch return value was not in an expected format\", \"fields\": null}"

			if (!js_isobject(_js, -1) || !js_hasproperty(_js, -1, "code") || !js_hasproperty(_js, -1, "response")) {
				BAIL;
			} else {
				js_getproperty(_js, -1, "code");
				js_getproperty(_js, -2, "response");
				js_getglobal(_js, "JSON");
				js_getproperty(_js, -1, "stringify");
				js_pcall(_js, -1);
				bool isnum = js_isnumber(_js, -2);
				int code = 500;
				if (isnum) {
					code = js_tonumber(_js, -2);
				}
				const char* s = js_tostring(_js, -1);
				js_pop(_js, 2);

				if (!isnum || s == nullptr)
				{
					BAIL;
				}
				else
				{
					double code = js_tonumber(_js, 1);
					*statusCode_raw = (int)code;
					result_to_copy = s;
					pop_js_after_copy = true;
				}
			}
		}
	}

	auto len = strlen(result_to_copy) + 1;
	char* result = (char*)malloc(len);
	memcpy(result, result_to_copy, len);
	result[len - 1] = 0;

	if (pop_js_after_copy)
	{
		js_pop(_js, 1);
	}

	// Caller must free after usage.
	return result;
}