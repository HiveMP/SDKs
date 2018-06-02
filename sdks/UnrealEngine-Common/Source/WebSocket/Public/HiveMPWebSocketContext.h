// Copyright Redpoint Games 2017 MIT Licensed

#pragma once

#include "WebSocketBase.h"

WEBSOCKET_API UWebSocketBase* ConnectWebSocket(const FString& url, const TMap<FString, FString>& headers);