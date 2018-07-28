#pragma once

#include "../../../mujs/mujs.h"

void js_load_ztserver(js_State* J);
void js_tick_ztserver(js_State* J);
bool js_post_tick_ztserver(js_State* J);