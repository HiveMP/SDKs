#pragma once

#include "../../../mujs/mujs.h"

void js_load_process(js_State* J);
void js_tick_process(js_State* J);
bool js_post_tick_process(js_State* J);