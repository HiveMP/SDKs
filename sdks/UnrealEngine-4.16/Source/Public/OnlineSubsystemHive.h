// Copyright 1998-2017 Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "OnlineSubsystemImpl.h"
#include "OnlineSubsystemHiveNames.h"
#include "OnlineSubsystemHivePackage.h"
#include "HAL/ThreadSafeCounter.h"

/*
class FOnlineAchievementsNull;
class FOnlineIdentityNull;
class FOnlineLeaderboardsNull;
class FOnlineVoiceImpl;
*/

class FOnlineIdentityHive;
class FOnlineSessionHive;

/** Forward declarations of all interface classes */
typedef TSharedPtr<class FOnlineSessionHive, ESPMode::ThreadSafe> FOnlineSessionHivePtr;
typedef TSharedPtr<class FOnlineIdentityHive, ESPMode::ThreadSafe> FOnlineIdentityHivePtr;
/*
typedef TSharedPtr<class FOnlineProfileNull, ESPMode::ThreadSafe> FOnlineProfileNullPtr;
typedef TSharedPtr<class FOnlineFriendsNull, ESPMode::ThreadSafe> FOnlineFriendsNullPtr;
typedef TSharedPtr<class FOnlineUserCloudNull, ESPMode::ThreadSafe> FOnlineUserCloudNullPtr;
typedef TSharedPtr<class FOnlineLeaderboardsNull, ESPMode::ThreadSafe> FOnlineLeaderboardsNullPtr;
typedef TSharedPtr<class FOnlineVoiceImpl, ESPMode::ThreadSafe> FOnlineVoiceImplPtr;
typedef TSharedPtr<class FOnlineExternalUINull, ESPMode::ThreadSafe> FOnlineExternalUINullPtr;
typedef TSharedPtr<class FOnlineAchievementsNull, ESPMode::ThreadSafe> FOnlineAchievementsNullPtr;
*/

/**
 *	OnlineSubsystemHive - Implementation of the online subsystem for Hive services
 */
class FOnlineSubsystemHive :
	public FOnlineSubsystemImpl
{

public:

	virtual ~FOnlineSubsystemHive()
	{
	}

	// IOnlineSubsystem

	virtual IOnlineSessionPtr GetSessionInterface() const override;
	virtual IOnlineFriendsPtr GetFriendsInterface() const override;
	virtual IOnlinePartyPtr GetPartyInterface() const override;
	virtual IOnlineGroupsPtr GetGroupsInterface() const override;
	virtual IOnlineSharedCloudPtr GetSharedCloudInterface() const override;
	virtual IOnlineUserCloudPtr GetUserCloudInterface() const override;
	virtual IOnlineEntitlementsPtr GetEntitlementsInterface() const override;
	virtual IOnlineLeaderboardsPtr GetLeaderboardsInterface() const override;
	virtual IOnlineVoicePtr GetVoiceInterface() const override;
	virtual IOnlineExternalUIPtr GetExternalUIInterface() const override;
	virtual IOnlineTimePtr GetTimeInterface() const override;
	virtual IOnlineIdentityPtr GetIdentityInterface() const override;
	virtual IOnlineTitleFilePtr GetTitleFileInterface() const override;
	virtual IOnlineStorePtr GetStoreInterface() const override;
	virtual IOnlineStoreV2Ptr GetStoreV2Interface() const override { return nullptr; }
	virtual IOnlinePurchasePtr GetPurchaseInterface() const override { return nullptr; }
	virtual IOnlineEventsPtr GetEventsInterface() const override;
	virtual IOnlineAchievementsPtr GetAchievementsInterface() const override;
	virtual IOnlineSharingPtr GetSharingInterface() const override;
	virtual IOnlineUserPtr GetUserInterface() const override;
	virtual IOnlineMessagePtr GetMessageInterface() const override;
	virtual IOnlinePresencePtr GetPresenceInterface() const override;
	virtual IOnlineChatPtr GetChatInterface() const override;
	virtual IOnlineTurnBasedPtr GetTurnBasedInterface() const override;
	
	virtual bool Init() override;
	virtual bool Shutdown() override;
	virtual FString GetAppId() const override;
	virtual bool Exec(class UWorld* InWorld, const TCHAR* Cmd, FOutputDevice& Ar) override;

	// FTickerObjectBase
	
	virtual bool Tick(float DeltaTime) override;

	// FOnlineSubsystemNull

	/**
	 * Is the Null API available for use
	 * @return true if Null functionality is available, false otherwise
	 */
	bool IsEnabled();

PACKAGE_SCOPE:

	/** Only the factory makes instances */
	FOnlineSubsystemHive(FName InInstanceName) :
		FOnlineSubsystemImpl(HIVE_SUBSYSTEM, InInstanceName),
		SessionInterface(nullptr),
		IdentityInterface(nullptr),
		OnlineAsyncTaskThreadRunnable(nullptr),
		OnlineAsyncTaskThread(nullptr)
		
		//VoiceInterface(nullptr),
		//bVoiceInterfaceInitialized(false),
		//LeaderboardsInterface(nullptr),
		//,
		//AchievementsInterface(nullptr)
	{}

	FOnlineSubsystemHive() :
		SessionInterface(nullptr),
		IdentityInterface(nullptr),
		OnlineAsyncTaskThreadRunnable(nullptr),
		OnlineAsyncTaskThread(nullptr)
		
		//,
		//VoiceInterface(nullptr),
		//bVoiceInterfaceInitialized(false),
		//LeaderboardsInterface(nullptr),
		//
		//AchievementsInterface(nullptr),
	{}

private:

	/** Interface to the session services */
	FOnlineSessionHivePtr SessionInterface;

	/** Interface for voice communication */
	//mutable FOnlineVoiceImplPtr VoiceInterface;

	/** Interface for voice communication */
	//mutable bool bVoiceInterfaceInitialized;

	/** Interface to the leaderboard services */
	//FOnlineLeaderboardsNullPtr LeaderboardsInterface;

	/** Interface to the identity registration/auth services */
	FOnlineIdentityHivePtr IdentityInterface;

	/** Interface for achievements */
	//FOnlineAchievementsNullPtr AchievementsInterface;

	/** Online async task runnable */
	class FOnlineAsyncTaskManagerHive* OnlineAsyncTaskThreadRunnable;

	/** Online async task thread */
	class FRunnableThread* OnlineAsyncTaskThread;

	// task counter, used to generate unique thread names for each task
	static FThreadSafeCounter TaskCounter;
};

typedef TSharedPtr<FOnlineSubsystemHive, ESPMode::ThreadSafe> FOnlineSubsystemHivePtr;

