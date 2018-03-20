#include "connect.h"
#include <stdio.h>
#include <fstream>
#include <sstream>
#include <chrono>
#include <thread>

int main()
{
	cc_init();

	while (cc_tick())
	{
		// tick
		std::this_thread::sleep_for(std::chrono::milliseconds(16));
	}

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