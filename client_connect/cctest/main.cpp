#include "connect.h"
#include <stdio.h>
#include <fstream>
#include <sstream>

int main()
{
	cc_init();

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