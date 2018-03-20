#include "module.h"
#include <chrono>
#include <vector>

struct timer_t {
	bool immediate;
	bool isInterval;
	std::chrono::system_clock::duration interval;
	std::chrono::system_clock::time_point next;
	const char* registry_name;
};

std::vector<struct timer_t*>* timers = nullptr;

void js_set_immediate(js_State* J)
{
	if (timers == nullptr)
	{
		js_pushundefined(J);
		return;
	}

	js_copy(J, 1);
	const char* registry_name = js_ref(J);

	auto timer = new timer_t();
	timer->immediate = true;
	timer->isInterval = false;
	timer->interval = std::chrono::seconds(0);
	timer->next = std::chrono::system_clock::now();
	timer->registry_name = registry_name;

	timers->push_back(timer);

	js_newuserdata(J, "Timer", timer, nullptr);
}

void js_set_timeout(js_State* J)
{
	if (timers == nullptr)
	{
		js_pushundefined(J);
		return;
	}

	js_copy(J, 1);
	const char* registry_name = js_ref(J);
	auto ms = js_touint32(J, 2);

	auto timer = new timer_t();
	timer->immediate = false;
	timer->isInterval = false;
	timer->interval = std::chrono::seconds(0);
	timer->next = std::chrono::system_clock::now() + std::chrono::milliseconds(ms);
	timer->registry_name = registry_name;

	timers->push_back(timer);

	js_newuserdata(J, "Timer", timer, nullptr);
}

void js_set_interval(js_State* J)
{
	if (timers == nullptr)
	{
		js_pushundefined(J);
		return;
	}
	
	js_copy(J, 1);
	const char* registry_name = js_ref(J);
	auto ms = js_touint32(J, 2);

	auto timer = new timer_t();
	timer->immediate = false;
	timer->isInterval = false;
	timer->interval = std::chrono::milliseconds(ms);
	timer->next = std::chrono::system_clock::now() + timer->interval;
	timer->registry_name = registry_name;

	timers->push_back(timer);

	js_newuserdata(J, "Timer", timer, nullptr);
}

void js_clear_timer(js_State* J)
{
	auto timer = (struct timer_t*)js_touserdata(J, 1, "Timer");
	if (timer == nullptr)
	{
		js_pushundefined(J);
		return;
	}

	for (auto it = timers->begin(); it != timers->end(); it++)
	{
		if ((*it) == timer)
		{
			// This is the timer to clear.
			delete *it;
			timers->erase(it);
			if (it == timers->end())
			{
				// Can't allow loop to hit it++ because incrementing
				// end() is not permitted.
				break;
			}
		}
	}
}

void js_load_timers(js_State* J)
{
	timers = new std::vector<struct timer_t*>();

	js_newobject(J);
	js_newcfunction(J, js_set_immediate, "setImmediate", 1);
	js_setproperty(J, -2, "setImmediate");
	js_newcfunction(J, js_set_timeout, "setTimeout", 2);
	js_setproperty(J, -2, "setTimeout");
	js_newcfunction(J, js_set_interval, "setInterval", 2);
	js_setproperty(J, -2, "setInterval");
	js_newcfunction(J, js_clear_timer, "clearImmediate", 1);
	js_setproperty(J, -2, "clearImmediate");
	js_newcfunction(J, js_clear_timer, "clearTimeout", 1);
	js_setproperty(J, -2, "clearTimeout");
	js_newcfunction(J, js_clear_timer, "clearInterval", 1);
	js_setproperty(J, -2, "clearInterval");

	// new module object is now on stack.
}

bool js_tick_timers(js_State* J)
{
	auto now = std::chrono::system_clock::now();

	if (timers != nullptr)
	{
		for (auto it = timers->begin(); it != timers->end(); it++)
		{
			if ((*it)->immediate || now > (*it)->next)
			{
				js_getregistry(J, (*it)->registry_name);
				if (js_isundefined(J, -1))
				{
					// no such registry value
					js_pop(J, 1);
				}
				else
				{
					js_pushglobal(J);
					if (js_pcall(J, 0) != 0)
					{
						printf("error while calling timer callback\n");
					}
				}

				if (!(*it)->isInterval)
				{
					delete *it;
					timers->erase(it);
					if (it == timers->end())
					{
						// Can't allow loop to hit it++ because incrementing
						// end() is not permitted.
						break;
					}
				}
				else
				{
					(*it)->next = now + (*it)->interval;
				}
			}
		}

		return timers->size() > 0;
	}
	else
	{
		return false;
	}
}