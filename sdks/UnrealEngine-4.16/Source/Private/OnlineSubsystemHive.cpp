// Copyright 2017 Redpoint Games. MIT Licensed.

#include "OnlineSubsystemHive.h"
#include "HAL/RunnableThread.h"
#include "Misc/AssertionMacros.h"
#include "OnlineAsyncTaskManagerHive.h"

#include "OnlineSessionInterfaceHive.h"
//#include "OnlineLeaderboardInterfaceNull.h"
#include "OnlineIdentityHive.h"
//#include "VoiceInterfaceImpl.h"
//#include "OnlineAchievementsInterfaceNull.h"

FThreadSafeCounter FOnlineSubsystemHive::TaskCounter;

IOnlineSessionPtr FOnlineSubsystemHive::GetSessionInterface() const
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHive::GetSessionInterface()"));

	return SessionInterface;
}

IOnlineFriendsPtr FOnlineSubsystemHive::GetFriendsInterface() const
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHive::GetFriendsInterface()"));

	return nullptr;
}

IOnlinePartyPtr FOnlineSubsystemHive::GetPartyInterface() const
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHive::GetPartyInterface()"));

	return nullptr;
}

IOnlineGroupsPtr FOnlineSubsystemHive::GetGroupsInterface() const
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHive::GetGroupsInterface()"));

	return nullptr;
}

IOnlineSharedCloudPtr FOnlineSubsystemHive::GetSharedCloudInterface() const
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHive::GetSharedCloudInterface()"));

	return nullptr;
}

IOnlineUserCloudPtr FOnlineSubsystemHive::GetUserCloudInterface() const
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHive::GetUserCloudInterface()"));

	return nullptr;
}

IOnlineEntitlementsPtr FOnlineSubsystemHive::GetEntitlementsInterface() const
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHive::GetEntitlementsInterface()"));

	return nullptr;
};

IOnlineLeaderboardsPtr FOnlineSubsystemHive::GetLeaderboardsInterface() const
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHive::GetLeaderboardsInterface()"));

	return nullptr;
}

IOnlineVoicePtr FOnlineSubsystemHive::GetVoiceInterface() const
{
	//UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHive::GetVoiceInterface()"));

	return nullptr;
}

IOnlineExternalUIPtr FOnlineSubsystemHive::GetExternalUIInterface() const
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHive::GetExternalUIInterface()"));

	return nullptr;
}

IOnlineTimePtr FOnlineSubsystemHive::GetTimeInterface() const
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHive::GetTimeInterface()"));

	return nullptr;
}

IOnlineIdentityPtr FOnlineSubsystemHive::GetIdentityInterface() const
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHive::GetIdentityInterface()"));

	return IdentityInterface;
}

IOnlineTitleFilePtr FOnlineSubsystemHive::GetTitleFileInterface() const
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHive::GetTitleFileInterface()"));

	return nullptr;
}

IOnlineStorePtr FOnlineSubsystemHive::GetStoreInterface() const
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHive::GetStoreInterface()"));

	return nullptr;
}

IOnlineEventsPtr FOnlineSubsystemHive::GetEventsInterface() const
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHive::GetEventsInterface()"));

	return nullptr;
}

IOnlineAchievementsPtr FOnlineSubsystemHive::GetAchievementsInterface() const
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHive::GetAchievementsInterface()"));

	return nullptr;
}

IOnlineSharingPtr FOnlineSubsystemHive::GetSharingInterface() const
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHive::GetSharingInterface()"));

	return nullptr;
}

IOnlineUserPtr FOnlineSubsystemHive::GetUserInterface() const
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHive::GetUserInterface()"));

	return nullptr;
}

IOnlineMessagePtr FOnlineSubsystemHive::GetMessageInterface() const
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHive::GetMessageInterface()"));

	return nullptr;
}

IOnlinePresencePtr FOnlineSubsystemHive::GetPresenceInterface() const
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHive::GetPresenceInterface()"));

	return nullptr;
}

IOnlineChatPtr FOnlineSubsystemHive::GetChatInterface() const
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHive::GetChatInterface()"));

	return nullptr;
}

IOnlineTurnBasedPtr FOnlineSubsystemHive::GetTurnBasedInterface() const
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHive::GetTurnBasedInterface()"));

    return nullptr;
}

bool FOnlineSubsystemHive::Tick(float DeltaTime)
{
	if (!FOnlineSubsystemImpl::Tick(DeltaTime))
	{
		return false;
	}

	if (OnlineAsyncTaskThreadRunnable)
	{
		OnlineAsyncTaskThreadRunnable->GameTick();
	}

	/*
	if (SessionInterface.IsValid())
	{
		SessionInterface->Tick(DeltaTime);
	}

	if (VoiceInterface.IsValid() && bVoiceInterfaceInitialized)
	{
		VoiceInterface->Tick(DeltaTime);
	}
	*/

	return true;
}

bool FOnlineSubsystemHive::Init()
{
	const bool bNullInit = true;

	if (bNullInit)
	{
		UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHive::Init()"));

		// Create the online async task thread
		OnlineAsyncTaskThreadRunnable = new FOnlineAsyncTaskManagerHive(this);
		check(OnlineAsyncTaskThreadRunnable);
		OnlineAsyncTaskThread = FRunnableThread::Create(OnlineAsyncTaskThreadRunnable, *FString::Printf(TEXT("OnlineAsyncTaskThreadHive %s(%d)"), *InstanceName.ToString(), TaskCounter.Increment()), 128 * 1024, TPri_Normal);
		check(OnlineAsyncTaskThread);
		UE_LOG_ONLINE(Verbose, TEXT("Created thread (ID:%d)."), OnlineAsyncTaskThread->GetThreadID());

		/*LeaderboardsInterface = MakeShareable(new FOnlineLeaderboardsNull(this));
		AchievementsInterface = MakeShareable(new FOnlineAchievementsNull(this));
		VoiceInterface = MakeShareable(new FOnlineVoiceImpl(this));*/

		IdentityInterface = MakeShareable(new FOnlineIdentityHive(this));
		SessionInterface = MakeShareable(new FOnlineSessionHive(this));

		// We must delay this until after IdentityInterface is assigned, otherwise the HTTP callback
		// can't capture the shared pointer for validity checking.
		if (IdentityInterface->HiveAuthenticationMode == EHiveAuthenticationMode::Temporary)
		{
			UE_LOG_ONLINE(Display, TEXT("Automatically creating Hive temporary session for 0th player"));

			// Autologin the 0-th player with a temporary session.
			IdentityInterface->Login(0, FOnlineAccountCredentials(TEXT("TemporaryCredentials"), TEXT(""), TEXT("")));
		}
	}
	else
	{
		Shutdown();
	}

	return bNullInit;
}

bool FOnlineSubsystemHive::Shutdown()
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSubsystemHive::Shutdown()"));

	FOnlineSubsystemImpl::Shutdown();

	if (OnlineAsyncTaskThread)
	{
		// Destroy the online async task thread
		delete OnlineAsyncTaskThread;
		OnlineAsyncTaskThread = nullptr;
	}

	if (OnlineAsyncTaskThreadRunnable)
	{
		delete OnlineAsyncTaskThreadRunnable;
		OnlineAsyncTaskThreadRunnable = nullptr;
	}
	/*
	if (VoiceInterface.IsValid() && bVoiceInterfaceInitialized)
	{
		VoiceInterface->Shutdown();
	}
*/

#define DESTRUCT_INTERFACE(Interface) \
 	if (Interface.IsValid()) \
 	{ \
 		if (!Interface.IsUnique()) \
		{ \
			UE_LOG_ONLINE(Warning, TEXT("OnlineSubsystemHive Shutdown " ## #Interface ## " was not unique on shutdown - possible pending operations!")); \
		} \
 		Interface = nullptr; \
 	}

	// Destruct the interfaces
	//DESTRUCT_INTERFACE(VoiceInterface);
	//DESTRUCT_INTERFACE(AchievementsInterface);
	DESTRUCT_INTERFACE(IdentityInterface);
	//DESTRUCT_INTERFACE(LeaderboardsInterface);
	DESTRUCT_INTERFACE(SessionInterface);

#undef DESTRUCT_INTERFACE

	return true;
}

FString FOnlineSubsystemHive::GetAppId() const
{
	return TEXT("");
}

bool FOnlineSubsystemHive::Exec(UWorld* InWorld, const TCHAR* Cmd, FOutputDevice& Ar)
{
	if (FOnlineSubsystemImpl::Exec(InWorld, Cmd, Ar))
	{
		return true;
	}

	return true;
}

bool FOnlineSubsystemHive::IsEnabled()
{
	return true;
}
