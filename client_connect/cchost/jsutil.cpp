#include "jsutil.h"

#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>

js_State* _js = nullptr;

void js_debug_object_dump(js_State* J, std::string indent, bool simple)
{
	const char* key;
	js_pushiterator(J, -1, 1);
	while (key = js_nextiterator(J, -1))
	{
		printf("%s'%s': ", indent.c_str(), key);

		if (std::string(key) == "global")
		{
			printf("(skipped)\n");
		}
		else
		{
			js_getproperty(J, -2, key);
			js_debug_value_dump(J, indent + "  ", true);
			js_pop(J, 1);
		}
	}
	js_pop(J, 1);
}

void js_debug_value_dump(js_State* L, std::string indent, bool simple)
{
	if (js_isundefined(L, -1))
	{
		printf("undefined\n");
	}
	else if (js_isnull(L, -1))
	{
		printf("null\n");
	}
	else if (js_isboolean(L, -1))
	{
		printf(js_toboolean(L, -1) ? "true\n" : "false\n");
	}
	else if (js_isnumber(L, -1))
	{
		printf("%g\n", js_tonumber(L, -1));
	}
	else if (js_isstring(L, -1))
	{
		printf("`%s'\n", js_tostring(L, -1));
	}
	else if (js_iscallable(L, -1))
	{
		js_copy(L, -1);
		printf("(callable: '%s')\n", js_tostring(L, -1));
		js_pop(L, 1);
	}
	else if (js_isobject(L, -1))
	{
		printf("(object)\n");

		if (!simple)
		{
			js_debug_object_dump(L, "  ", simple);
		}
	}
	else
	{
		printf("(unknown)\n");
	}
}

void js_debug_stack_dump(js_State* L, bool simple)
{
	int i;
	int top = js_gettop(L);
	printf("stack top: %i\n", top);
	for (i = 0; i <= top; i++) 
	{
		printf("%i: ", i);
		js_copy(L, i);
		js_debug_value_dump(L, "", simple);
		js_pop(L, 1);
	}
	printf("stack top: %i\n", js_gettop(L));
	printf("\n");  /* end the listing */
}

void js_debug_error_dump(js_State* J)
{
	if (js_isobject(J, -1))
	{
		js_getproperty(J, -1, "message");
		auto message = js_tostring(J, -1);
		js_pop(J, 1);
		js_getproperty(J, -1, "stackTrace");
		auto stackTrace = js_tostring(J, -1);
		js_pop(J, 1);

		fprintf(stderr, "error: %s%s", message, stackTrace);
		js_pop(J, 1);
	}
	else
	{
		fprintf(stderr, "error: %s", js_tostring(J, -1));
		js_pop(J, 1);
	}
}

int js_hasproperty_nopush(js_State *J, int idx, const char *name)
{
	if (js_hasproperty(J, idx, name)) {
		js_pop(J, 1);
		return 1;
	}

	return 0;
}

const char* alloc_copy(const char* fixed)
{
	int len = strlen(fixed) + 1;
	char* result = (char*)malloc(len);
	memset((void*)result, 0, len);
	strcpy(result, fixed);
	return result;
}

const char* serialize_json(js_State* J, int idx, const char* default)
{
	js_copy(J, idx);

	js_getglobal(J, "JSON");
	js_getproperty(J, -1, "stringify");
	js_remove(J, -2);

	js_pushglobal(J);

	js_copy(J, -3);

	const char* outcome = nullptr;
	bool needs_pop = false;
	if (js_pcall(J, 1) != 0)
	{
		// We couldn't stringify our object for a JSON response, so return something
		// hard-coded.
		outcome = default;
	}
	else
	{
		outcome = js_tostring(J, -1);
		needs_pop = true;
	}

	const char* result = alloc_copy(outcome);

	if (needs_pop)
	{
		js_pop(J, 1);
	}

	js_pop(J, 1);

	return result;
}