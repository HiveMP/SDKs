#pragma once

#include "../../../mujs/mujs.h"

void js_load_timers(js_State* J);
void js_load_timers_globals(js_State* J);

void js_tick_timers(js_State* J);
bool js_post_tick_timers(js_State* J);