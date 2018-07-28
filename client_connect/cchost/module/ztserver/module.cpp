#include "module.h"
#include "../../jsutil.h"
#include <string>
#include <vector>
#if defined(WIN32)
#include <Windows.h>
#endif
#if CLIENT_CONNECT_TARGETING_UNREAL
#include "../../ue4log.h"
#else
extern "C" {
#include "log.h"
}
#endif

struct ZtServerConnection {

};

void ztserver_send(long id, void* buffer, long len)
{

}

bool ztserver_try_receive(long id, void** buffer, long* len)
{
	*buffer = NULL;
	*len = 0;
	return false;
}

void ztserver_free_receive_buffer(void* buffer)
{
	free(buffer);
}

void js_ztserver_wait_for_available(js_State* J)
{

}

void js_load_ztserver(js_State* J)
{
	js_newobject(J);
	js_newcfunction(J, js_ztserver_wait_for_available, "waitForAvailable", 2);
	js_setproperty(J, -2, "waitForAvailable");

	// new module object is now on stack.
}

void js_tick_ztserver(js_State* J)
{
}

bool js_post_tick_ztserver(js_State* J)
{
}