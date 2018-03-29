#include "connect.impl.h"
extern "C" {
#if CLIENT_CONNECT_TARGETING_UNREAL
#include "../mujs/mujs.h"
#else 
#include "mujs.h"
#endif
}
#include "jsutil.h"
#include "embed.h"
#include <stdlib.h>
#include <string.h>
#include <string>
#include <map>

#include "module/timers/module.h"
#include "module/console/module.h"
#include "module/curl-native/module.h"
#include "module/hotpatching/module.h"

void _ccl_require(js_State *J)
{
	auto mod = js_tostring(J, 1);
	js_getregistry(J, mod);
	if (!js_isundefined(J, -1))
	{
		// We have pushed the cached load onto the stack.
		return;
	}

	std::string mod_str(mod);

	if (mod_str == "curl-native")
	{
		js_load_curl_native(J);
		return;
	}
	else if (mod_str == "timers")
	{
		js_load_timers(J);
		return;
	}
	else if (mod_str == "console")
	{
		js_load_console(J);
		return;
	}
	else if (mod_str == "hotpatching")
	{
		js_load_hotpatching(J);
		return;
	}

	js_error(J, "native module '%s' not found", mod);
}

void cci_init()
{
	if (_js == nullptr)
	{
		_js = js_newstate(NULL, NULL, JS_STRICT);

		// Load the require() function
		js_newcfunction(_js, _ccl_require, "require", 1);
		js_setglobal(_js, "require");

		// Assign "global" to globals
		js_pushglobal(_js);
		js_pushglobal(_js);
		js_setproperty(_js, -2, "global");
		js_pop(_js, 1);

		// Load the global timer functions
		js_load_timers_globals(_js);

		if (js_ploadstring(_js, "bundle.js", _embedded_sdk) != 0)
		{
			js_debug_error_dump(_js);
			return;
		}
		else
		{
			js_pushglobal(_js);
			if (js_pcall(_js, 0) != 0) 
			{
				js_debug_error_dump(_js);
				return;
			}
		}
	}
}

bool cci_tick()
{
	auto any_alive = false;

	if (_js != nullptr)
	{
		js_tick_timers(_js);
		js_tick_curl_native(_js);

		if (js_post_tick_timers(_js))
		{
			any_alive = true;
		}

		if (js_post_tick_curl_native(_js))
		{
			any_alive = true;
		}

		if (js_post_tick_hotpatching(_js))
		{
			any_alive = true;
		}
	}

	return any_alive;
}