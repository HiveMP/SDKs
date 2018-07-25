#include "connect.h"
#include <stdio.h>
#include <fstream>
#include <sstream>
#include <chrono>
#include <thread>

int main()
{
	cc_init(true, nullptr);

	long call_handle = -1;
	if (cc_is_api_hotpatched("user-session", "authenticatePUT"))
	{
		call_handle = cc_call_api_hotpatch(
			"user-session",
			"authenticatePUT",
			"https://user-session-api.hivemp.com/v1",
			"ada0dc2f0a448e1058d4720763d1b5a1",
			"{\"authentication\":{\"tokens\":{\"steamTokens\":[],\"itchIoTokens\":[],\"discordTokens\":[],\"deviceTestTokens\":[],\"oAuthTokens\":[]},\"emailAddress\":\"\",\"passwordHash\":\"\",\"marketingPreferenceOptIn\":false,\"twoFactor\":{\"deviceIdentifier\":\"\",\"deviceIdentifierFriendlyName\":\"\",\"twoFactorCode\":\"\",\"trustThisDevice\":null}}}"
		);
	}
	else
	{
		printf("authenticatePUT is not hotpatched");
	}

	while (cc_tick())
	{
		std::this_thread::sleep_for(std::chrono::milliseconds(16));

		if (call_handle != -1)
		{
			if (cc_is_api_hotpatch_call_ready(call_handle))
			{
				auto status_code = cc_get_api_hotpatch_status_code(call_handle);
				auto result = cc_get_api_hotpatch_result(call_handle);
				printf("%i - %s\n", status_code, result);
				cc_release_api_hotpatch_result(call_handle);
			}
		}
	}

    return 0;
}