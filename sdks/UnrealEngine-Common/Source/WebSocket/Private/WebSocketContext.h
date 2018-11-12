/*
* Copyright (C) 2017 feiwu <feixuwu@outlook.com>
*
* The previous licensing header on this file has been replaced with this
* MIT license notice to make it consistent the LICENSE file contained in the
* original repository, as outlined in https://github.com/feixuwu/UEWebsocket/issues/15.
*/

#pragma once

#include "CoreMinimal.h"
#include "Tickable.h"
#include "CoreUObject.h"

#if PLATFORM_UWP
#elif PLATFORM_HTML5
#else
#define UI UI_ST

// Remove UE4 definition of TEXT macro.
#if defined(TEXT)
#undef TEXT
#endif

#if defined(WIN32) || defined(_WIN32)
#if !PLATFORM_UWP
#include <MinWindows.h>
#endif
#endif

THIRD_PARTY_INCLUDES_START
#include "libwebsockets.h"
THIRD_PARTY_INCLUDES_END

// Restore UE4 definition of TEXT macro.
#if defined(TEXT)
#undef TEXT
#endif
#define TEXT(x) TEXT_PASTE(x)

#undef UI
#endif

#include "WebSocketContext.generated.h"


class UWebSocketBase;
/**
 * 
 */
UCLASS()
class UWebSocketContext : public UObject, public FTickableGameObject
{
	GENERATED_BODY()
public:

	UWebSocketContext();

	void CreateCtx();

	virtual void BeginDestroy() override;

	virtual void Tick(float DeltaTime) override;
	virtual bool IsTickable() const override;
	virtual TStatId GetStatId() const override;

	UWebSocketBase* Connect(const FString& uri);
	UWebSocketBase* Connect(const FString& uri, const TMap<FString, FString>& header);
#if PLATFORM_UWP
#elif PLATFORM_HTML5
#else
	static int callback_echo(struct lws *wsi, enum lws_callback_reasons reason, void *user, void *in, size_t len);
#endif
	
private:

#if PLATFORM_UWP
#elif PLATFORM_HTML5
#else
	struct lws_context* mlwsContext;
#endif
};
