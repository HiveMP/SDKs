#include "module.h"
#include <cstdio>

void js_console_log(js_State* J)
{
	auto str = js_tostring(J, 1);

	printf("%s\n", str);
}

void js_load_console(js_State* J)
{
	js_newobject(J);
	js_newcfunction(J, js_console_log, "log", 1);
	js_setproperty(J, -2, "log");

	// new module object is now on stack.
}