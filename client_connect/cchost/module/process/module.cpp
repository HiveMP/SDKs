#include "module.h"
#if defined(_WIN32)
#include <windows.h>
#else
#include <cstdlib>
#endif

#include "../../jsutil.h"

struct env_t {
	int dummy;
};

int js_get_env(js_State* J, void* p, const char* name)
{
	const char* env_p = std::getenv(name);

	if (env_p == nullptr) {
		return false;
	} else {
		js_pushstring(J, env_p);
		return true;
	}
}

int js_put_env(js_State* J, void* p, const char* name)
{
	const char* env_p = js_tostring(J, -1);
#if defined(_WIN32)
	SetEnvironmentVariableA(name, env_p);
#else
	setenv(name, env_p, true);
#endif
	js_pop(J, 1);
	return true;
}

int js_delete_env(js_State* J, void* p, const char* name)
{
#if defined(_WIN32)
	SetEnvironmentVariableA(name, nullptr);
#else
	unsetenv(name);
#endif
	js_pop(J, 1);
	return true;
}

void js_load_process(js_State* J)
{
	struct env_t* env_ref = new struct env_t();

	js_newobject(J);
	js_newobject(J);
	js_newuserdatax(J, "Env", env_ref, js_get_env, js_put_env, js_delete_env, nullptr);
	js_setproperty(J, -2, "env");

	// new module object is now on stack.
}