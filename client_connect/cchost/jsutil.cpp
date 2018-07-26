#include "jsutil.h"
#if CLIENT_CONNECT_TARGETING_UNREAL
#include "ue4log.h"
#else
extern "C" {
#include "log.h"
}
#endif

#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>
#include <sstream>
#include <iomanip>

js_State* _js = nullptr;

void js_debug_object_dump(js_State* J, std::string indent, bool simple)
{
	log_debug("%s", js_get_debug_object_dump(J, indent, simple).c_str());
}

void js_debug_value_dump(js_State* J, std::string indent, bool simple)
{
	log_debug("%s", js_get_debug_value_dump(J, indent, simple).c_str());
}

void js_debug_stack_dump(js_State* J, bool simple)
{
	log_debug("%s", js_get_debug_stack_dump(J, simple).c_str());
}

std::string js_get_debug_object_dump(js_State* J, std::string indent, bool simple)
{
	std::string buffer = "";
	const char* key;
	js_pushiterator(J, -1, 1);
	while (true)
	{
		key = js_nextiterator(J, -1);
		if (key == nullptr)
		{
			break;
		}
		
		buffer += indent;
		buffer += "'";
		buffer += key;
		buffer += "': ";

		if (std::string(key) == "global")
		{
			buffer += "(skipped)\n";
		}
		else
		{
			js_getproperty(J, -2, key);
			buffer += js_get_debug_value_dump(J, indent + "  ", true);
			js_pop(J, 1);
		}
	}
	js_pop(J, 1);
	return buffer;
}

std::string js_get_debug_value_dump(js_State* L, std::string indent, bool simple)
{
	if (js_isundefined(L, -1))
	{
		return "undefined\n";
	}
	else if (js_isnull(L, -1))
	{
		return "null\n";
	}
	else if (js_isboolean(L, -1))
	{
		return js_toboolean(L, -1) ? "true\n" : "false\n";
	}
	else if (js_isnumber(L, -1))
	{
		std::ostringstream oss;
		oss << js_tonumber(L, -1) << "\n";
		return oss.str();
	}
	else if (js_isstring(L, -1))
	{
		std::ostringstream oss;
		oss << "`" << js_tostring(L, -1) << "'\n";
		return oss.str();
	}
	else if (js_iscallable(L, -1))
	{
		js_copy(L, -1);
		std::ostringstream oss;
		oss << "(callable: '" << js_tostring(L, -1) << "')\n";
		js_pop(L, 1);
		return oss.str();
	}
	else if (js_isobject(L, -1))
	{
		std::string buffer = "(object)\n";

		if (!simple)
		{
			buffer += js_get_debug_object_dump(L, "  ", simple);
		}

		return buffer;
	}
	else
	{
		return "(unknown)\n";
	}
}

std::string js_get_debug_stack_dump(js_State* L, bool simple)
{
	int i;
	int top = js_gettop(L);
	std::ostringstream oss;
	oss << "stack top: " << top << "\n";
	for (i = 0; i <= top; i++) 
	{
		oss << i << ": ";
		js_copy(L, i);
		js_debug_value_dump(L, "", simple);
		js_pop(L, 1);
	}
	oss << "stack top: " << js_gettop(L) << "\n";
	oss << "\n";  /* end the listing */
	return oss.str();
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

		log_error("error: %s%s", message, stackTrace);
		js_pop(J, 1);
	}
	else
	{
		log_error("error: %s", js_tostring(J, -1));
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

const char* serialize_json(js_State* J, int idx, const char* def)
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
		outcome = def;
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