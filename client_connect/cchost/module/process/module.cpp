#include "module.h"
#if defined(_WIN32)
#include <windows.h>
#else
#include <cstdlib>
#endif
#if CLIENT_CONNECT_TARGETING_UNREAL
#include "../../ue4log.h"
#else
extern "C" {
#include "log.h"
}
#endif

#include "process.hpp"
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

struct ProcessRef
{
	TinyProcessLib::Process* process;
	std::string resolveRegistryName;
	std::string rejectRegistryName;
	std::string rejectErrorMessage;
};

std::vector<ProcessRef*>* processes = nullptr;

void js_process_spawn(js_State* J)
{
	const char* command = js_tostring(J, 1);
	const char* cwd = js_tostring(J, 2);

	js_copy(J, 3);
	const char* resolve = js_ref(J);
	js_copy(J, 4);
	const char* reject = js_ref(J);

	auto ref = new ProcessRef();
	ref->resolveRegistryName = resolve;
	ref->rejectRegistryName = reject;
	ref->rejectErrorMessage = "";
	ref->process = new TinyProcessLib::Process(
		command,
		cwd);
	processes->push_back(ref);

	// TODO return object that javascript can call kill() on.

	js_pushboolean(J, true);
}

void js_load_process(js_State* J)
{
	if (processes == nullptr)
	{
		processes = new std::vector<ProcessRef*>();
	}

	struct env_t* env_ref = new struct env_t();

	js_newobject(J);
	js_newobject(J);
	js_newuserdatax(J, "Env", env_ref, js_get_env, js_put_env, js_delete_env, nullptr);
	js_setproperty(J, -2, "env");

	js_newcfunction(J, js_process_spawn, "spawn", 4);
	js_setproperty(J, -2, "spawn");

	// new module object is now on stack.
}

void js_tick_process(js_State* J)
{
	if (processes != nullptr)
	{
		for (auto it = processes->begin(); it != processes->end(); )
		{
			int exit_status = -1;
			bool is_exited = (*it)->process->try_get_exit_status(exit_status);

			if (is_exited)
			{
				if (exit_status == 0)
				{
					// This callback is resolved.
					js_getregistry(J, (*it)->resolveRegistryName.c_str());
					if (js_isundefined(J, -1))
					{
						// no such registry value
						log_error("process callback: no function in registry for resolve callback");
						js_pop(J, 1);
					}
					else
					{
						log_trace("process callback: calling registered resolve function");
						js_pushglobal(J);
						if (js_pcall(J, 0) != 0)
						{
							js_debug_error_dump(J);
						}
					}

					delete (*it)->process;
					delete *it;
					it = processes->erase(it);
					continue;
				}
				else
				{
					(*it)->rejectErrorMessage = "Process exited with non-zero exit code.";

					// This callback is rejected.
					js_getregistry(J, (*it)->rejectRegistryName.c_str());
					if (js_isundefined(J, -1))
					{
						// no such registry value
						log_error("Steam callback: no function in registry for reject callback");
						js_pop(J, 1);
					}
					else
					{
						log_trace("Steam callback: calling registered reject function");
						js_pushglobal(J);
						js_pushstring(J, (*it)->rejectErrorMessage.c_str());
						if (js_pcall(J, 1) != 0)
						{
							js_debug_error_dump(J);
						}
					}

					delete (*it)->process;
					delete *it;
					it = processes->erase(it);
					continue;
				}
			}

			++it;
		}
	}
}

bool js_post_tick_process(js_State* J)
{
	if (processes != nullptr)
	{
		return processes->size() > 0;
	}
	else
	{
		return false;
	}
}