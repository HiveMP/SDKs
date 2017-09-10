// Copyright 2017 Redpoint Games. MIT Licensed.

#pragma once

#include "CoreMinimal.h"
#include "UObject/CoreOnline.h"
#include "OnlineSubsystemTypes.h"
#include "Interfaces/OnlineIdentityInterface.h"
#include "HttpModule.h"

class FUserOnlineAccountHive :
	public FUserOnlineAccount
{

public:

	FUserOnlineAccountHive(
		const FString& InAllocatedUnrealUserId,
		const FString& InSessionId,
		const FString& InAccountId,
		const FString& InApiKey,
		const FString& InSecretKey,
		const long InInitialExpiry) :
		AllocatedUnrealUserId(InAllocatedUnrealUserId),
		AllocatedUnrealUserIdPtr(new FUniqueNetIdString(InAllocatedUnrealUserId)),
		SessionId(InSessionId),
		AccountId(InAccountId),
		ApiKey(InApiKey),
		SecretKey(InSecretKey),
		UtcUnixTimestampExpiry(InInitialExpiry)
	{ }

	// FOnlineUser

	virtual TSharedRef<const FUniqueNetId> GetUserId() const override { return AllocatedUnrealUserIdPtr; }
	virtual FString GetRealName() const override { return SessionId; }
	virtual FString GetDisplayName(const FString& Platform = FString()) const override { return SessionId; }
	virtual bool GetUserAttribute(const FString& AttrName, FString& OutAttrValue) const override;
	virtual bool SetUserAttribute(const FString& AttrName, const FString& AttrValue) override;

	// FUserOnlineAccount

	virtual FString GetAccessToken() const override { return ApiKey; }
	virtual bool GetAuthAttribute(const FString& AttrName, FString& OutAttrValue) const override;

	// FUserOnlineAccountNull

	virtual ~FUserOnlineAccountHive()
	{
	}

	/**
	 * The randomly allocated user ID that's used inside Unreal. The engine
	 * requires some user identification before the login process completes,
	 * and we don't have any identification in Hive until it does. So we allocate
	 * a randomly generated string and use that as the user ID inside Unreal, which
	 * can then be used to access the full account data structure which contains
	 * the real session and user IDs, as well as API keys.
	 */
	FString AllocatedUnrealUserId;

	/** The unique network ID which represents this user */
	TSharedRef<const FUniqueNetId> AllocatedUnrealUserIdPtr;

	/** The Hive session ID as a string */
	FString SessionId;

	/** The Hive account ID if present, or an empty string if this is from the temporary session service */
	FString AccountId;

	/** The Hive API key used to access services */
	FString ApiKey;

	/** The Hive secret key that is optionally used with some services */
	FString SecretKey;

	/** The UTC UNIX timestamp on which this session will expire */
	long UtcUnixTimestampExpiry;

	/** Additional key/value pair data related to auth */
	TMap<FString, FString> AdditionalAuthData;

	/** Additional key/value pair data related to user attribution */
	TMap<FString, FString> UserAttributes;
};
