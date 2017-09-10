// Copyright 2017 Redpoint Games. MIT Licensed.

#pragma once

#include "CoreMinimal.h"
#include "UObject/CoreOnline.h"
#include "OnlineSubsystemTypes.h"
#include "Interfaces/OnlineIdentityInterface.h"
#include "HttpModule.h"
#include "HiveAuthenticationMode.h"
#include "UserOnlineAccountHive.h"

class FOnlineIdentityHive : public IOnlineIdentity
{
public:

	// IOnlineIdentity
	virtual bool Login(int32 LocalUserNum, const FOnlineAccountCredentials& AccountCredentials) override;
	virtual bool Logout(int32 LocalUserNum) override;
	virtual bool AutoLogin(int32 LocalUserNum) override;
	virtual TSharedPtr<FUserOnlineAccount> GetUserAccount(const FUniqueNetId& UserId) const override;
	virtual TArray<TSharedPtr<FUserOnlineAccount> > GetAllUserAccounts() const override;
	virtual TSharedPtr<const FUniqueNetId> GetUniquePlayerId(int32 LocalUserNum) const override;
	virtual TSharedPtr<const FUniqueNetId> CreateUniquePlayerId(uint8* Bytes, int32 Size) override;
	virtual TSharedPtr<const FUniqueNetId> CreateUniquePlayerId(const FString& Str) override;
	virtual ELoginStatus::Type GetLoginStatus(int32 LocalUserNum) const override;
	virtual ELoginStatus::Type GetLoginStatus(const FUniqueNetId& UserId) const override;
	virtual FString GetPlayerNickname(int32 LocalUserNum) const override;
	virtual FString GetPlayerNickname(const FUniqueNetId& UserId) const override;
	virtual FString GetAuthToken(int32 LocalUserNum) const override;
	virtual void GetUserPrivilege(const FUniqueNetId& UserId, EUserPrivileges::Type Privilege, const FOnGetUserPrivilegeCompleteDelegate& Delegate) override;
	virtual FPlatformUserId GetPlatformUserIdFromUniqueNetId(const FUniqueNetId& UniqueNetId) override;
	virtual FString GetAuthType() const override;

	// FOnlineIdentityNull

	/**
	* Constructor
	*
	* @param InSubsystem online subsystem being used
	*/
	FOnlineIdentityHive(class FOnlineSubsystemHive* InSubsystem);

	/**
	* Destructor
	*/
	virtual ~FOnlineIdentityHive();

PACKAGE_SCOPE:

	/** The type of authentication mode that is used with Hive */
	EHiveAuthenticationMode HiveAuthenticationMode;

	/**
	* The public API key that is used to talk to Hive. This identifies what game
	* / project it is on Hive, and is not the credentials for any individual
	* session
	*/
	FString PublicApiKey;

private:

	/**
	* Should use the initialization constructor instead
	*/
	FOnlineIdentityHive();

	/** Tracks whether there are pending login requests for a local user number */
	TMap<int32, bool> PendingLoginRequests;

	/** Tracks the mapping of local users to the identifiers of authenticated sessions */
	TMap<int32, TSharedPtr<const FUniqueNetId>> UserNumToSessionId;

	/** Tracks the identifiers of authenticated sessions to actual account structures */
	TMap<FUniqueNetIdString, TSharedRef<FUserOnlineAccountHive>> UserAccounts;

	/** The subsystem this instance belongs to */
	FOnlineSubsystemHive* Subsystem;
};

typedef TSharedPtr<FOnlineIdentityHive, ESPMode::ThreadSafe> FOnlineIdentityHivePtr;
