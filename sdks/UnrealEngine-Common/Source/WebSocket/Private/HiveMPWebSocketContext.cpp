// Copyright Redpoint Games 2017 MIT Licensed

#include "HiveMPWebSocketContext.h"
#include "WebSocket.h"
#include "WebSocketBase.h"
#include "WebSocketContext.h"

TSharedPtr<UWebSocketContext> s_websocketCtx;

UWebSocketBase* ConnectWebSocket(const FString& url, const TMap<FString, FString>& headers)
{
	if (s_websocketCtx.Get() == nullptr)
	{
		s_websocketCtx =  MakeShareable(NewObject<UWebSocketContext>() );
		s_websocketCtx->CreateCtx();
		s_websocketCtx->AddToRoot();
	}

	return s_websocketCtx->Connect(url, headers);
}