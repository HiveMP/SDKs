#include "connect.impl.h"
extern "C" {
#include "mujs.h"
}
#include "lcurl.h"
#include "embed.h"
#include <stdlib.h>
#include <string.h>
#include <string>
#include <map>

std::map<std::string, std::string>* _hotpatches = nullptr;
js_State* _js = nullptr;

static void stackDump(js_State *L) {
	int i;
	int top = js_gettop(L);
	printf("stack top: %i\n", top);
	for (i = 0; i <= top; i++) {  /* repeat for each level */
		if (js_isundefined(L, i)) {
			printf("%i: undefined\n", i);
		}
		else if (js_isnull(L, i)) {
			printf("%i: null\n", i);
		}
		else if (js_isboolean(L, i)) {
			printf(js_toboolean(L, i) ? "%i: true\n" : "%i: false\n", i);
		}
		else if (js_isnumber(L, i)) {
			printf("%i: %g\n", i, js_tonumber(L, i));
		}
		else if (js_isstring(L, i)) {
			printf("%i: `%s'\n", i, js_tostring(L, i));
		}
		else if (js_iscallable(L, i)) {
			printf("%i: (callable)\n", i);
		}
		else if (js_isobject(L, i)) {
			printf("%i: (object)\n", i);
		}
		else {
			printf("%i: (unknown)\n", i);
		}
	}
	printf("stack top: %i\n", js_gettop(L));
	printf("\n");  /* end the listing */
}

void _ccl_register_hotpatch(js_State *J)
{
	auto id = js_tostring(J, 1);
	if (js_iscallable(J, 2)) {
		js_copy(J, 2);
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

#define STACK_DUMP(name) \
{ \
	printf(name "\n"); \
	stackDump(_js); \
}

#define BAIL(reason) \
{ \
	*statusCode_raw = 500; \
	js_pop(_js, 1); \
	result_to_copy = "{\"code\": 7002, \"message\": \"The hotpatch return value was not in an expected format (" reason ")\", \"fields\": null}"; \
}

int js_hasproperty_nopush(js_State *J, int idx, const char *name)
{
	if (js_hasproperty(J, idx, name)) {
		js_pop(J, 1);
		return 1;
	}

	return 0;
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

		// Get the callback.
		js_getregistry(_js, js_ref_name.c_str());

		// Use the global environment as "this".
		js_pushglobal(_js);

		// Build up the request object, parsing the JSON parameters into
		// a JavaScript object.
		js_newobject(_js);
		js_pushstring(_js, id.c_str());
		js_setproperty(_js, -2, "id");
		js_pushstring(_js, endpoint_raw);
		js_setproperty(_js, -2, "endpoint");
		js_pushstring(_js, apiKey_raw);
		js_setproperty(_js, -2, "apiKey");
		js_getglobal(_js, "JSON");
		js_getproperty(_js, -1, "parse");
		js_remove(_js, -2);
		js_pushglobal(_js);
		js_pushstring(_js, parametersAsJson_raw);

		// Do the JSON parse for parameters.
		if (js_pcall(_js, 1) != 0)
		{
			*statusCode_raw = 500;
			printf("error: %s\n", js_tostring(_js, -1));
			js_pop(_js, 1);
			result_to_copy = "{\"code\": 7002, \"message\": \"An internal error occurred while running hotpatch\", \"fields\": null}";
		}
		else
		{
			// Set the parsed object into the parameters field of our request object.
			js_setproperty(_js, -2, "parameters");

			// Now call our hotpatch callback.
			if (js_pcall(_js, 1) != 0)
			{
				*statusCode_raw = 500;
				printf("error: %s\n", js_tostring(_js, -1));
				js_pop(_js, 1);
				result_to_copy = "{\"code\": 7002, \"message\": \"An internal error occurred while running hotpatch\", \"fields\": null}";
			}
			else
			{
				if (!js_isobject(_js, -1)) 
				{
					BAIL("response is not an object");
				}
				else if (!js_hasproperty_nopush(_js, -1, "code"))
				{
					BAIL("response object is missing 'code' property");
				}
				else if (!js_hasproperty_nopush(_js, -1, "response"))
				{
					BAIL("response object is missing 'response' property");
				}
				else
				{
					js_getproperty(_js, -1, "code");
					js_getglobal(_js, "JSON");
					js_getproperty(_js, -1, "stringify");
					js_remove(_js, -2);
					js_pushglobal(_js);
					js_getproperty(_js, -4, "response");
					if (js_pcall(_js, 1) != 0) 
					{
						BAIL("unable to stringify 'response' property");
					}
					else 
					{
						bool isnum = js_isnumber(_js, -2);
						int code = 500;
						if (isnum)
						{
							code = js_tonumber(_js, -2);
						}
						const char* s = js_tostring(_js, -1);
						js_pop(_js, 2);

						if (!isnum || s == nullptr)
						{
							BAIL("unable to read 'code' property as number or get response string");
						}
						else
						{
							*statusCode_raw = (int)code;
							result_to_copy = s;
							pop_js_after_copy = true;
						}
					}
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