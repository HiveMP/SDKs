# HiveMP Client Connect SDK

The HiveMP Client Connect SDK allows HiveMP's servers to call local, platform-specific APIs on your behalf when you use HiveMP REST calls. This SDK is included by default in all official HiveMP SDKs, so you will only need to use this repository if you're writing your own SDK or manually integrating with HiveMP. Even in these cases, Client Connect is an optional component, so you don't have to use it if you don't want to.

For example, say you want to record a player's highscore. With Client Connect, the only thing you need to do is call the HiveMP Highscore API to put the new highscore. If your game is running underneath Steam, our SDK will use Client Connect to automatically call Steam's highscore APIs on your behalf, with zero configuration. Client Connect automatically detects the platform your game is running on, so this would work not only on Steam, but any platform that has the concept of highscores for players. Of course, we also keep track of the highscore data on HiveMP so that the data is accessible across platforms, but with Client Connect automatically calling the platform APIs it enables those platforms to show and use the data in their own interfaces and UIs.

## Integrating the SDK

The Client Connect SDK is exposed as a very simple C API, which needs to be used by the language or engine specific SDK that is being used for HiveMP integration.

When your SDK or integration first starts up, it should make a call to the Client Connect API at https://client-connect-api.hivemp.com/v1/files/core, which will return a list of core files to download, their SHA1 hashes and corresponding URLs, like so:

```
{
    "json.lua": {
        "sha1": "675dc9d26b5040e87dda2f5da6845402db657c39",
        "url": "https://cdn.hivemp.com/client-connect/2017-08-27/json.lua"
    },
    "cURL.lua": {
        "sha1": "b482faa6ea49b682cdb83fd70c0dfdd440e8ed71",
        "url": "https://cdn.hivemp.com/client-connect/2017-08-27/cURL.lua"
    },
    "cURL/safe.lua": {
        "sha1": "a6013110b24ac95913d2956627b6841a35cd75e2",
        "url": "https://cdn.hivemp.com/client-connect/2017-08-27/cURL/safe.lua"
    },
    "cURL/utils.lua": {
        "sha1": "f33ad0bc0858f53568d34c3138597a89c1133b1c",
        "url": "https://cdn.hivemp.com/client-connect/2017-08-27/cURL/utils.lua"
    },
    "cURL/impl/cURL.lua": {
        "sha1": "a87adbf69c3a298c7c12dd266896a1a9f9f9d65c",
        "url": "https://cdn.hivemp.com/client-connect/2017-08-27/cURL/impl/cURL.lua"
    },
    "init.lua": {
        "sha1": "92429d82a41e930486c6de5ebda9602d55c39986",
        "url": "https://cdn.hivemp.com/client-connect/2017-08-27/init.lua"
    }
}
```

With this list, your SDK should then check if it already has the given file in some user-level cache (check if it exists, and check it's hash). If you don't already have it, download it from the specific URL. For any file not listed, you should delete it or obsolete it so that it won't be loaded in the future.

If the user is offline, use the last result you fetched when the user was online (i.e. you should cache the result of the API call and if you can't make the API call, fallback to the last result).

Once you have this list of files, call the `cc_map_chunk(name, data, len)` method with the name of the file (as provided by the API), the raw file data as binary, and the length of the read data.

With all of the files loaded, you should then call `cc_run("init.lua")` **only if init.lua was in the list of core files**.

When you are surfacing HiveMP API calls to the developer, you should call `cc_is_hotpatched(api, operation)` to find out if the operation has been hotpatched by Client Connect. If it has, you need to call `cc_call_hotpatch(api, operation, endpoint, apiKey, parametersAsJson, statusCode)` **instead of** performing a HTTPS call in your SDK.

For example, some pseudo-code for this would look like:

```c
struct TempSessionWithSecrets(const char* apiKey)
{
    bool doRetry = false;
    int delay = 1;

    do
    {
        doRetry = false;

        int statusCode;
        const char* data;
        if (cc_is_hotpatched("temp-session", "sessionPUT"))
        {
            data = cc_call_hotpatch(
                "temp-session",
                "sessionPUT",
                "https://temp-session-api.hivemp.com", // This should be a URL such that <url>/swagger.json exists
                apiKey,
                "{}", // Parameters as JSON string, sessionPUT takes no parameters though
                &statusCode
            );
        }
        else
        {
            // Use HTTP APIs to make the normal PUT request to https://temp-session-api.hivemp.com/v1/session, putting together query string, etc.
            // Store the status code in statusCode, and the response body in data
        }

        if (statusCode >= 200 && statusCode < 300)
        {
            // Deserialize data as TempSessionWithSecrets structure and return.
            return ...;
        }
        else
        {
            // Deserialize data as error and check the code.
            struct HiveSystemError error = ...;
            if (error.code >= 6000 && error < 7000)
            {
                // API temporarily available, retry with exponential back-off.
                sleep(delay); // seconds
                delay *= 2;
                doRetry = true;
                continue;
            }
            else
            {
                // Other kind of Hive error, throw or return the contents of error so that the developer can handle it.
                throw ...;
            }
        }
    }
    while (doRetry);
}
```

You should use this pattern for **every API call you surface in your SDK that makes a request to the HiveMP servers**. The effect should be that using any HiveMP API call through your SDK can be transparently handled by Client Connect instead of making a web request.

Once you have a user or temporary session, you should perform the same behaviour as SDK startup, but make a call to https://client-connect-api.hivemp.com/v1/files/user using the session API key that you were given. Files list in this result should override or be in addition to the core files (i.e. just call `cc_map_chunk` again). Files not in this list should be ignored (i.e. don't go deleting core files just because they aren't listed in this result).

You should only do this the first time you get a session. For example, if the developer creates multiple sessions with your SDK, you should only check the `files/user` endpoint once in the lifetime of the application.

If and **only if** the `files/user` endpoint lists a `user.lua` file, you should then call `cc_run("user.lua")`. Don't call `cc_run` if the `user.lua` file is in the core files (it won't be because of how our API works, but for the purposes of implementation, don't call it in that scenario).

## Integration Checklist

Not sure you've implemented it all? Here's a handy checklist to go over when evaluating your implementation:

- [ ] You make a call to `files/core` on SDK startup.
- [ ] You make a call to `files/user` on first session create.
- [ ] You download and cache each file listed in the response.
- [ ] You correctly handle offline scenarios for both SDK startup (`files/core`) and first session create (`files/user`).
- [ ] You call `cc_map_chunk` only for files listed by the API calls `files/core` and `files/user`.
- [ ] You call `cc_run("init.lua")` if `init.lua` is present in the `files/core` response.
- [ ] You call `cc_run("user.lua")` if `user.lua` is present in the `files/user` response.

## C API Overview

For C and C++ developers, you can include the `connect.h` header provided in the Client Connect SDK to automatically import these definitions.

### void cc_map_chunk(const char* name, void* data, int len)

Maps the path `name` to the virtual filesystem inside Client Connect, with the file contents `data` and the length `len`. 

(Please note that the files returned by the API may have null characters, so you should not use methods like `strlen` to determine result length; instead base it on the actual response length or filesize)

### void cc_free_chunk(const char* name)

Frees the virtual filesystem data associated with the path `name`.

### void cc_run(const char* name)

Runs the specified Lua source or bytecode file mapped in the virtual filesystem at the path `name`.

### bool cc_is_hotpatched(const char* api, const char* operation)

Returns if the specified API and operation are hotpatched.

`api` should be the component of the domain which indicates the API, for example the following endpoint to API mappings (not an exhaustive list):

```
https://temp-session-api.hivemp.com -> temp-session
https://dev-temp-session-api.hivemp.com -> temp-session
http://localhost:5001/_domain/temp-session-api.hivemp.com -> temp-session
https://pos-api.hivemp.com -> pos
https://dev-pos-api.hivemp.com -> pos
http://localhost:5001/_domain/pos-api.hivemp.com -> pos
```

`operation` should be the operation as defined by the Swagger (OpenAPI) document that describes the API.

### const char* cc_call_hotpatch(const char* api, const char* operation, const char* endpoint, const char* apiKey, const char* parametersAsJson, int* statusCode)

Calls the hotpatch function and returns the response body, setting the status code into `statusCode`.

`api` and `operation` should be the same value you used for `cc_is_hotpatched`.

`endpoint` should be the endpoint that you would have made the request to. For most users this will be something like `https://temp-session-api.hivemp.com` (depending on the API you are contacting). There **should be NO trailing slash**.

`apiKey` should be the API key that you would have used for the `X-API-Key` header had you made the web request directly from your SDK.

`parametersAsJson` should be the parameters to the API as a JSON object. Where as normally you would place parameters in the query string of the request, instead you should encode them into a JSON object. For example, if you had a `id` and `count` parameter for the API call normally, you would encode them as the following string:

```
{"id": "whatever the ID is", "count": 10}
```

`statusCode` is an out parameter, where the HTTP status code is written to.

## License

```
Copyright 2017 Redpoint Games Pty Ltd

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```