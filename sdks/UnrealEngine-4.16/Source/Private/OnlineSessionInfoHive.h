// Copyright 2017 Redpoint Games.  MIT Licensed.

#pragma once

#include "CoreMinimal.h"
#include "UObject/CoreOnline.h"
#include "OnlineSubsystemTypes.h"
#include "IPAddress.h"

class FOnlineSessionInfoHive : public FOnlineSessionInfo
{
protected:

	/** Hidden on purpose */
	FOnlineSessionInfoHive(const FOnlineSessionInfoHive& Src)
	{
	}

	/** Hidden on purpose */
	FOnlineSessionInfoHive& operator=(const FOnlineSessionInfoHive& Src)
	{
		return *this;
	}

PACKAGE_SCOPE:

	/** Constructor for game lobbies */
	FOnlineSessionInfoHive(const FUniqueNetIdString& InLobbyId) :
		LobbyId(InLobbyId) {}

	/** The Hive lobby ID */
	FUniqueNetIdString LobbyId;

public:

	virtual ~FOnlineSessionInfoHive() {}

	/**
	*	Comparison operator
	*/
	bool operator==(const FOnlineSessionInfoHive& Other) const
	{
		return false;
	}

	virtual int32 GetSize() const override
	{
		return sizeof(uint64) +
			sizeof(FString);
	}

	virtual bool IsValid() const override
	{
		return true;
	}

	virtual const uint8* GetBytes() const override
	{
		return NULL;
	}

	virtual FString ToString() const override
	{
		return LobbyId.ToString();
	}

	virtual FString ToDebugString() const override
	{
		return FString::Printf(TEXT("LobbyId: %s"), *LobbyId.ToString());
	}

	virtual const FUniqueNetId& GetSessionId() const override
	{
		return LobbyId;
	}
};