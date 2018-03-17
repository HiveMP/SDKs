#include "connect.h"
#include <stdio.h>
#include <fstream>
#include <sstream>

#define MAP_CHUNK(name) \
{ \
	std::ostringstream sstream; \
	std::ifstream fs(name); \
	sstream << fs.rdbuf(); \
	const std::string str(sstream.str()); \
	const char* ptr = str.c_str(); \
 	cc_map_chunk(name, (void*)ptr, str.length()); \
}

int main()
{
	// Core
	MAP_CHUNK("json.lua");
	MAP_CHUNK("cURL.lua");
	MAP_CHUNK("cURL/safe.lua");
	MAP_CHUNK("cURL/utils.lua");
	MAP_CHUNK("cURL/impl/cURL.lua");

	// Test files
	MAP_CHUNK("steam.lua");
	MAP_CHUNK("test.lua");
	
	// Run the test.lua chunk to set up hot patches
	cc_set_startup("test.lua");

    printf("checking if hotpatched\n");
    if (cc_is_hotpatched("temp-session", "sessionPUT"))
    {
        int statusCode;
        const char* result = cc_call_hotpatch("temp-session", "sessionPUT", "https://dev-temp-session-api.hivemp.com", "test", "{}", &statusCode);
        printf("%i - %s\n", statusCode, result);
    }
    else
    {
        printf("temp-session sessionPUT is not hotpatched!\n");
    }

    return 0;
}