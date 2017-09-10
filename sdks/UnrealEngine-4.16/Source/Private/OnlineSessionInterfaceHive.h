// Copyright 2017 Redpoint Games. MIT Licensed.

#pragma once

#include "CoreMinimal.h"
#include "Interfaces/OnlineSessionInterface.h"
#include "Misc/ScopeLock.h"
#include "OnlineSessionSettings.h"
#include "OnlineSubsystem.h"
#include "HttpModule.h"

class FOnlineSubsystemHive;

class FOnlineSessionHive : public IOnlineSession
{
private:

	/** Reference to the main Null subsystem */
	class FOnlineSubsystemHive* HiveSubsystem;

	int32 CurrentSearchId;

PACKAGE_SCOPE:

	/** Critical sections for thread safe operation of session lists */
	mutable FCriticalSection SessionLock;

	/** Current session settings */
	TMap<FName, TSharedPtr<FNamedOnlineSession>> Sessions;

public:

	FOnlineSessionHive(class FOnlineSubsystemHive* InSubsystem) :
		HiveSubsystem(InSubsystem),
		CurrentSearchId(-1) //,
		//CurrentSessionSearch(NULL),
		//SessionSearchStartInSeconds(0)
	{}

	// IOnlineSession
	FNamedOnlineSession* GetNamedSession(FName SessionName) override
	{
		UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::GetNamedSession(%s)"), *SessionName.ToString());

		FScopeLock ScopeLock(&SessionLock);
		if (Sessions.Contains(SessionName))
		{
			return Sessions[SessionName].Get();
		}
		return nullptr;
	}

	virtual void RemoveNamedSession(FName SessionName) override
	{
		UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::RemoveNamedSession(%s)"), *SessionName.ToString());

		FScopeLock ScopeLock(&SessionLock);
		if (Sessions.Contains(SessionName))
		{
			Sessions.Remove(SessionName);
		}
	}

	virtual EOnlineSessionState::Type GetSessionState(FName SessionName) const override
	{
		UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::GetSessionState(%s)"), *SessionName.ToString());

		FScopeLock ScopeLock(&SessionLock);
		if (Sessions.Contains(SessionName))
		{
			return Sessions[SessionName]->SessionState;
		}
		return EOnlineSessionState::NoSession;
	}

	virtual bool HasPresenceSession() override
	{
		UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::HasPresenceSession()"));

		FScopeLock ScopeLock(&SessionLock);
		for (auto it = Sessions.CreateIterator(); it; ++it)
		{
			if (it.Value()->SessionSettings.bUsesPresence)
			{
				return true;
			}
		}
		return false;
	}

	class FNamedOnlineSession* AddNamedSession(FName SessionName, const FOnlineSessionSettings& SessionSettings) override
	{
		UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::AddNamedSession()"));

		FScopeLock ScopeLock(&SessionLock);
		TSharedPtr<FNamedOnlineSession> Session = MakeShareable(new FNamedOnlineSession(SessionName, SessionSettings));
		Sessions.Add(SessionName, Session);
		return Session.Get();
	}

	class FNamedOnlineSession* AddNamedSession(FName SessionName, const FOnlineSession& Session) override
	{
		UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::AddNamedSession()"));

		FScopeLock ScopeLock(&SessionLock);
		TSharedPtr<FNamedOnlineSession> NamedSession = MakeShareable(new FNamedOnlineSession(SessionName, Session));
		Sessions.Add(SessionName, NamedSession);
		return NamedSession.Get();
	}

	virtual bool CreateSession(int32 HostingPlayerNum, FName SessionName, const FOnlineSessionSettings& NewSessionSettings) override;
	virtual bool CreateSession(const FUniqueNetId& HostingPlayerId, FName SessionName, const FOnlineSessionSettings& NewSessionSettings) override;
	virtual bool StartSession(FName SessionName) override;
	virtual bool UpdateSession(FName SessionName, FOnlineSessionSettings& UpdatedSessionSettings, bool bShouldRefreshOnlineData = true) override;
	virtual bool EndSession(FName SessionName) override;
	virtual bool DestroySession(FName SessionName, const FOnDestroySessionCompleteDelegate& CompletionDelegate = FOnDestroySessionCompleteDelegate()) override;
	virtual bool IsPlayerInSession(FName SessionName, const FUniqueNetId& UniqueId) override;
	virtual bool StartMatchmaking(const TArray< TSharedRef<const FUniqueNetId> >& LocalPlayers, FName SessionName, const FOnlineSessionSettings& NewSessionSettings, TSharedRef<FOnlineSessionSearch>& SearchSettings) override;
	virtual bool CancelMatchmaking(int32 SearchingPlayerNum, FName SessionName) override;
	virtual bool CancelMatchmaking(const FUniqueNetId& SearchingPlayerId, FName SessionName) override;
	virtual bool FindSessions(int32 SearchingPlayerNum, const TSharedRef<FOnlineSessionSearch>& SearchSettings) override;
	virtual bool FindSessions(const FUniqueNetId& SearchingPlayerId, const TSharedRef<FOnlineSessionSearch>& SearchSettings) override;
	virtual bool FindSessionById(const FUniqueNetId& SearchingUserId, const FUniqueNetId& SessionId, const FUniqueNetId& FriendId, const FOnSingleSessionResultCompleteDelegate& CompletionDelegate) override;
	virtual bool CancelFindSessions() override;
	virtual bool PingSearchResults(const FOnlineSessionSearchResult& SearchResult) override;
	virtual bool JoinSession(int32 PlayerNum, FName SessionName, const FOnlineSessionSearchResult& DesiredSession) override;
	virtual bool JoinSession(const FUniqueNetId& PlayerId, FName SessionName, const FOnlineSessionSearchResult& DesiredSession) override;
	virtual bool FindFriendSession(int32 LocalUserNum, const FUniqueNetId& Friend) override;
	virtual bool FindFriendSession(const FUniqueNetId& LocalUserId, const FUniqueNetId& Friend) override;
	virtual bool FindFriendSession(const FUniqueNetId& LocalUserId, const TArray<TSharedRef<const FUniqueNetId>>& FriendList) override;
	virtual bool SendSessionInviteToFriend(int32 LocalUserNum, FName SessionName, const FUniqueNetId& Friend) override;
	virtual bool SendSessionInviteToFriend(const FUniqueNetId& LocalUserId, FName SessionName, const FUniqueNetId& Friend) override;
	virtual bool SendSessionInviteToFriends(int32 LocalUserNum, FName SessionName, const TArray< TSharedRef<const FUniqueNetId> >& Friends) override;
	virtual bool SendSessionInviteToFriends(const FUniqueNetId& LocalUserId, FName SessionName, const TArray< TSharedRef<const FUniqueNetId> >& Friends) override;
	virtual bool GetResolvedConnectString(FName SessionName, FString& ConnectInfo, FName PortType) override;
	virtual bool GetResolvedConnectString(const class FOnlineSessionSearchResult& SearchResult, FName PortType, FString& ConnectInfo) override;
	virtual FOnlineSessionSettings* GetSessionSettings(FName SessionName) override;
	virtual bool RegisterPlayer(FName SessionName, const FUniqueNetId& PlayerId, bool bWasInvited) override;
	virtual bool RegisterPlayers(FName SessionName, const TArray< TSharedRef<const FUniqueNetId> >& Players, bool bWasInvited = false) override;
	virtual bool UnregisterPlayer(FName SessionName, const FUniqueNetId& PlayerId) override;
	virtual bool UnregisterPlayers(FName SessionName, const TArray< TSharedRef<const FUniqueNetId> >& Players) override;
	virtual void RegisterLocalPlayer(const FUniqueNetId& PlayerId, FName SessionName, const FOnRegisterLocalPlayerCompleteDelegate& Delegate) override;
	virtual void UnregisterLocalPlayer(const FUniqueNetId& PlayerId, FName SessionName, const FOnUnregisterLocalPlayerCompleteDelegate& Delegate) override;
	virtual int32 GetNumSessions() override;
	virtual void DumpSessionState() override;
};