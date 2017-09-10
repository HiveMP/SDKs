// Copyright 2017 Redpoint Games.  MIT Licensed.

#include "OnlineSessionInterfaceHive.h"
#include "JsonReader.h"
#include "JsonSerializer.h"
#include "IHttpResponse.h"
#include "GenericPlatformHttp.h"
#include "OnlineSubsystem.h"
#include "OnlineSubsystemHive.h"
#include "OnlineIdentityHive.h"
#include "OnlineSessionInfoHive.h"

bool FOnlineSessionHive::CreateSession(int32 HostingPlayerNum, FName SessionName, const FOnlineSessionSettings& NewSessionSettings)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::CreateSession(%i, %s, ...)"), HostingPlayerNum, *SessionName.ToString());

	FNamedOnlineSession* Session = GetNamedSession(SessionName);
	if (Session)
	{
		UE_LOG_ONLINE(Warning, TEXT("Cannot create session '%s': session already exists."), *SessionName.ToString());
		return true;
	}

	IOnlineIdentityPtr Identity = HiveSubsystem->GetIdentityInterface();
	if (!Identity.IsValid())
	{
		UE_LOG_ONLINE(Warning, TEXT("No valid Hive identity interface."));
		TriggerOnCreateSessionCompleteDelegates(SessionName, false);
		return true;
	}

	auto AuthToken = Identity->GetAuthToken(HostingPlayerNum);
	if (FString().Equals(AuthToken))
	{
		UE_LOG_ONLINE(Warning, TEXT("No Hive authentication token available."));
		TriggerOnCreateSessionCompleteDelegates(SessionName, false);
		return true;
	}

	Session = AddNamedSession(SessionName, NewSessionSettings);

	check(Session);
	Session->SessionState = EOnlineSessionState::Creating;
	Session->NumOpenPrivateConnections = NewSessionSettings.NumPrivateConnections;
	Session->NumOpenPublicConnections = NewSessionSettings.NumPublicConnections;

	Session->HostingPlayerNum = HostingPlayerNum;
	Session->LocalOwnerId = Identity->GetUniquePlayerId(HostingPlayerNum);

	auto SessionInterface = TWeakPtr<IOnlineSession, ESPMode::ThreadSafe>(HiveSubsystem->GetSessionInterface());

	TSharedRef<IHttpRequest> HttpRequest = FHttpModule::Get().CreateRequest();
	HttpRequest->SetURL(FString::Printf(
		TEXT("https://lobby-api.hivemp.com/v1/lobby?name=%s&maxSessions=%i"),
		*FGenericPlatformHttp::UrlEncode(SessionName.ToString()),
		NewSessionSettings.NumPublicConnections));
	HttpRequest->SetHeader(TEXT("api_key"), AuthToken);
	HttpRequest->SetVerb(TEXT("PUT"));
	HttpRequest->OnProcessRequestComplete().BindLambda([this](FHttpRequestPtr HttpRequest, FHttpResponsePtr HttpResponse, bool bSucceeded, TWeakPtr<IOnlineSession, ESPMode::ThreadSafe> SessionInterfaceCapture, FName SessionName)
	{
		if (!SessionInterfaceCapture.IsValid())
		{
			UE_LOG_ONLINE(Error, TEXT("FOnlineSessionHive::DestroySession -> Shared pointer to online session lost, unsafe to access this"));
			return;
		}

		bool ShouldFail = false;
		if (!bSucceeded || !HttpResponse.IsValid())
		{
			UE_LOG_ONLINE(Error, TEXT("FOnlineSessionHive::CreateSession_HttpRequestComplete -> Did not get successful response from server"));
			RemoveNamedSession(SessionName);
			TriggerOnCreateSessionCompleteDelegates(SessionName, false);
			return;
		}

		auto Response = HttpResponse.Get();

		UE_LOG_ONLINE(Warning, TEXT("FOnlineSessionHive::CreateSession_HttpRequestComplete %s"), *(Response->GetContentAsString()));

		TSharedPtr<FJsonObject> JsonObject;
		auto Reader = TJsonReaderFactory<>::Create(Response->GetContentAsString());
		if (!FJsonSerializer::Deserialize(Reader, JsonObject) || !JsonObject.IsValid())
		{
			UE_LOG_ONLINE(Error, TEXT("FOnlineSessionHive::CreateSession_HttpRequestComplete -> Unable to parse JSON object from server response"));
			RemoveNamedSession(SessionName);
			TriggerOnCreateSessionCompleteDelegates(SessionName, false);
			return;
		}

		FNamedOnlineSession* Session = GetNamedSession(SessionName);
		if (Session == nullptr)
		{
			UE_LOG_ONLINE(Error, TEXT("FOnlineSessionHive::CreateSession_HttpRequestComplete -> Session '%s': not found"), *SessionName.ToString());
			RemoveNamedSession(SessionName);
			TriggerOnCreateSessionCompleteDelegates(SessionName, false);
			return;
		}

		FString Id;
		auto GotId = JsonObject->TryGetStringField(TEXT("id"), Id);

		if (!GotId)
		{
			UE_LOG_ONLINE(Error, TEXT("FOnlineSessionHive::CreateSession_HttpRequestComplete -> Unable to get ID from JSON"));
			RemoveNamedSession(SessionName);
			TriggerOnCreateSessionCompleteDelegates(SessionName, false);
			return;
		}

		TSharedPtr<FOnlineSessionInfoHive> SessionInfo = MakeShareable(new FOnlineSessionInfoHive(FUniqueNetIdString(Id)));

		Session->SessionInfo = SessionInfo;
		Session->SessionState = EOnlineSessionState::Pending;
		TriggerOnCreateSessionCompleteDelegates(SessionName, true);
	}, SessionInterface, SessionName);
	HttpRequest->ProcessRequest();
	return true;
}

bool FOnlineSessionHive::CreateSession(const FUniqueNetId& HostingPlayerId, FName SessionName, const FOnlineSessionSettings& NewSessionSettings)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::CreateSession()"));

	// todo: use proper	HostingPlayerId
	return CreateSession(0, SessionName, NewSessionSettings);
}

bool FOnlineSessionHive::StartSession(FName SessionName)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::StartSession()"));

	FNamedOnlineSession* Session = GetNamedSession(SessionName);
	if (Session)
	{
		if (Session->SessionState == EOnlineSessionState::Pending ||
			Session->SessionState == EOnlineSessionState::Ended)
		{
			// Move into InProgress, fire delegates and return true.  Starting / ending game lobbies
			// has no concept in Hive.
			Session->SessionState = EOnlineSessionState::InProgress;
			TriggerOnStartSessionCompleteDelegates(SessionName, true);
			return true;
		}
		else
		{
			UE_LOG_ONLINE(Warning, TEXT("Can't start an online session (%s) in state %s"),
				*SessionName.ToString(),
				EOnlineSessionState::ToString(Session->SessionState));
		}
	}
	else
	{
		UE_LOG_ONLINE(Warning, TEXT("Can't start an online game for session (%s) that hasn't been created"), *SessionName.ToString());
	}

	TriggerOnStartSessionCompleteDelegates(SessionName, false);
	return false;
}

bool FOnlineSessionHive::UpdateSession(FName SessionName, FOnlineSessionSettings& UpdatedSessionSettings, bool bShouldRefreshOnlineData)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::UpdateSession()"));

	return false;
}

bool FOnlineSessionHive::EndSession(FName SessionName)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::EndSession()"));

	FNamedOnlineSession* Session = GetNamedSession(SessionName);
	if (Session)
	{
		if (Session->SessionState == EOnlineSessionState::InProgress)
		{
			// Move into Ended, fire delegates and return true.  Starting / ending game lobbies
			// has no concept in Hive.
			Session->SessionState = EOnlineSessionState::Ended;
			TriggerOnEndSessionCompleteDelegates(SessionName, true);
			return true;
		}
		else
		{
			UE_LOG_ONLINE(Warning, TEXT("Can't end an online session (%s) in state %s"),
				*SessionName.ToString(),
				EOnlineSessionState::ToString(Session->SessionState));
		}
	}
	else
	{
		UE_LOG_ONLINE(Warning, TEXT("Can't end an online game for session (%s) that hasn't been created"), *SessionName.ToString());
	}

	TriggerOnEndSessionCompleteDelegates(SessionName, false);
	return false;
}

bool FOnlineSessionHive::DestroySession(FName SessionName, const FOnDestroySessionCompleteDelegate& CompletionDelegate)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::DestroySession()"));

	FNamedOnlineSession* Session = GetNamedSession(SessionName);
	if (!Session)
	{
		UE_LOG_ONLINE(Warning, TEXT("Cannot destroy session '%s': session does not exists."), *SessionName.ToString());
		return true;
	}

	IOnlineIdentityPtr Identity = HiveSubsystem->GetIdentityInterface();
	if (!Identity.IsValid())
	{
		UE_LOG_ONLINE(Warning, TEXT("No valid Hive identity interface."));
		TriggerOnCreateSessionCompleteDelegates(SessionName, false);
		return true;
	}

	auto AuthToken = Identity->GetAuthToken(Session->HostingPlayerNum);
	if (FString().Equals(AuthToken))
	{
		UE_LOG_ONLINE(Warning, TEXT("No Hive authentication token available."));
		TriggerOnCreateSessionCompleteDelegates(SessionName, false);
		return true;
	}

	auto SessionInfo = (const FOnlineSessionInfoHive*)(Session->SessionInfo.Get());

	auto SessionId = SessionInfo->LobbyId.ToString();

	auto SessionInterface = TWeakPtr<IOnlineSession, ESPMode::ThreadSafe>(HiveSubsystem->GetSessionInterface());

	TSharedRef<IHttpRequest> HttpRequest = FHttpModule::Get().CreateRequest();
	HttpRequest->SetURL(FString::Printf(
		TEXT("https://lobby-api.hivemp.com/v1/lobby?id=%s"),
		*FGenericPlatformHttp::UrlEncode(SessionId)));
	HttpRequest->SetHeader(TEXT("api_key"), AuthToken);
	HttpRequest->SetVerb(TEXT("DELETE"));
	HttpRequest->OnProcessRequestComplete().BindLambda([this](FHttpRequestPtr HttpRequest, FHttpResponsePtr HttpResponse, bool bSucceeded, TWeakPtr<IOnlineSession, ESPMode::ThreadSafe> SessionInterfaceCapture, FName SessionName)
	{
		if (!SessionInterfaceCapture.IsValid())
		{
			UE_LOG_ONLINE(Error, TEXT("FOnlineSessionHive::DestroySession -> Shared pointer to online session lost, unsafe to access this"));
			return;
		}

		bool ShouldFail = false;
		if (!bSucceeded || !HttpResponse.IsValid())
		{
			UE_LOG_ONLINE(Error, TEXT("FOnlineSessionHive::DestroySession -> Did not get successful response from server"));
			RemoveNamedSession(SessionName);
			TriggerOnCreateSessionCompleteDelegates(SessionName, false);
			return;
		}

		auto Response = HttpResponse.Get();

		UE_LOG_ONLINE(Warning, TEXT("FOnlineSessionHive::DestroySession %s"), *(Response->GetContentAsString()));

		if (Response->GetContentAsString().Equals(TEXT("true")))
		{
			RemoveNamedSession(SessionName);
			TriggerOnDestroySessionCompleteDelegates(SessionName, true);
			return;
		}

		TriggerOnDestroySessionCompleteDelegates(SessionName, false);
		UE_LOG_ONLINE(Error, TEXT("FOnlineSessionHive::DestroySession -> Unexpected response from server"));
		return;
	}, SessionInterface, SessionName);
	HttpRequest->ProcessRequest();
	return true;
}

bool FOnlineSessionHive::IsPlayerInSession(FName SessionName, const FUniqueNetId& UniqueId)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::IsPlayerInSession()"));

	return false;
}

bool FOnlineSessionHive::StartMatchmaking(const TArray< TSharedRef<const FUniqueNetId> >& LocalPlayers, FName SessionName, const FOnlineSessionSettings& NewSessionSettings, TSharedRef<FOnlineSessionSearch>& SearchSettings)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::StartMatchmaking()"));

	// Not supported yet.
	return false;
}

bool FOnlineSessionHive::CancelMatchmaking(int32 SearchingPlayerNum, FName SessionName)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::CancelMatchmaking()"));

	// Not supported yet.
	return false;
}

bool FOnlineSessionHive::CancelMatchmaking(const FUniqueNetId& SearchingPlayerId, FName SessionName)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::CancelMatchmaking()"));

	// Not supported yet.
	return false;
}

bool FOnlineSessionHive::FindSessions(int32 SearchingPlayerNum, const TSharedRef<FOnlineSessionSearch>& SearchSettings)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::FindSessions()"));

	IOnlineIdentityPtr Identity = HiveSubsystem->GetIdentityInterface();
	if (!Identity.IsValid())
	{
		UE_LOG_ONLINE(Warning, TEXT("No valid Hive identity interface."));
		TriggerOnFindSessionsCompleteDelegates(false);
		return true;
	}

	auto AuthToken = Identity->GetAuthToken(SearchingPlayerNum);
	if (FString().Equals(AuthToken))
	{
		UE_LOG_ONLINE(Warning, TEXT("No Hive authentication token available."));
		TriggerOnFindSessionsCompleteDelegates(false);
		return true;
	}

	auto MaxSearchResults = SearchSettings->MaxSearchResults;
	if (MaxSearchResults < 10)
	{
		MaxSearchResults = 10;
	}
	else if (MaxSearchResults > 50)
	{
		MaxSearchResults = 50;
	}

	// TODO: Paginated requests for >50 max results.

	// Store the current search ID so that results are discarded if a newer search has since
	// been requested.
	this->CurrentSearchId = SearchSettings->PlatformHash;

	SearchSettings->SearchState = EOnlineAsyncTaskState::InProgress;

	auto SessionInterface = TWeakPtr<IOnlineSession, ESPMode::ThreadSafe>(HiveSubsystem->GetSessionInterface());

	TSharedRef<IHttpRequest> HttpRequest = FHttpModule::Get().CreateRequest();
	HttpRequest->SetURL(FString::Printf(
		TEXT("https://lobby-api.hivemp.com/v1/lobbies/paginated?limit=%i"),
		MaxSearchResults));
	HttpRequest->SetHeader(TEXT("api_key"), AuthToken);
	HttpRequest->SetVerb(TEXT("GET"));
	HttpRequest->OnProcessRequestComplete().BindLambda([this](FHttpRequestPtr HttpRequest, FHttpResponsePtr HttpResponse, bool bSucceeded, TWeakPtr<IOnlineSession, ESPMode::ThreadSafe> SessionInterfaceCapture, int32 SearchId, TSharedRef<FOnlineSessionSearch> SearchSettingsCapture)
	{
		if (!SessionInterfaceCapture.IsValid())
		{
			UE_LOG_ONLINE(Error, TEXT("FOnlineSessionHive::FindSessions -> Shared pointer to online session lost, unsafe to access this"));
			SearchSettingsCapture->SearchState = EOnlineAsyncTaskState::Failed;
			return;
		}

		if (this->CurrentSearchId != SearchId)
		{
			UE_LOG_ONLINE(Error, TEXT("FOnlineSessionHive::FindSessions -> Newer search has since been requested, ignoring results"));
			SearchSettingsCapture->SearchState = EOnlineAsyncTaskState::Failed;
			TriggerOnFindSessionsCompleteDelegates(false);
			return;
		}

		this->CurrentSearchId = -1;

		bool ShouldFail = false;
		if (!bSucceeded || !HttpResponse.IsValid())
		{
			UE_LOG_ONLINE(Error, TEXT("FOnlineSessionHive::FindSessions -> Did not get successful response from server"));
			SearchSettingsCapture->SearchState = EOnlineAsyncTaskState::Failed;
			TriggerOnFindSessionsCompleteDelegates(false);
			return;
		}

		auto Response = HttpResponse.Get();

		UE_LOG_ONLINE(Warning, TEXT("FOnlineSessionHive::FindSessions %s"), *(Response->GetContentAsString()));

		TSharedPtr<FJsonObject> JsonObject;
		auto Reader = TJsonReaderFactory<>::Create(Response->GetContentAsString());
		if (!FJsonSerializer::Deserialize(Reader, JsonObject))
		{
			UE_LOG_ONLINE(Error, TEXT("FOnlineSessionHive::FindSessions -> Unable to parse JSON object from server response"));
			SearchSettingsCapture->SearchState = EOnlineAsyncTaskState::Failed;
			TriggerOnFindSessionsCompleteDelegates(false);
			return;
		}

		if (!JsonObject.IsValid())
		{
			UE_LOG_ONLINE(Error, TEXT("FOnlineSessionHive::FindSessions -> Unable to parse JSON object from server response"));
			SearchSettingsCapture->SearchState = EOnlineAsyncTaskState::Failed;
			TriggerOnFindSessionsCompleteDelegates(false);
			return;
		}

		FString Next;
		bool MoreResults;
		const TArray<TSharedPtr<FJsonValue>>* Results;
		auto GotNext = JsonObject->TryGetStringField(TEXT("next"), Next);
		auto GotMoreResults = JsonObject->TryGetBoolField(TEXT("moreResults"), MoreResults);
		auto GotResults = JsonObject->TryGetArrayField(TEXT("results"), Results);

		if (!GotResults)
		{
			UE_LOG_ONLINE(Error, TEXT("FOnlineSessionHive::FindSessions -> Unable to get results from JSON object"));
			SearchSettingsCapture->SearchState = EOnlineAsyncTaskState::Failed;
			TriggerOnFindSessionsCompleteDelegates(false);
			return;
		}

		SearchSettingsCapture->SearchResults.Empty();

		for (int32 i = 0; i < Results->Num(); i++)
		{
			const TSharedPtr<FJsonObject>* ItemObj;
			if (!(*Results)[i]->TryGetObject(ItemObj) || ItemObj == NULL || !ItemObj->IsValid())
			{
				continue;
			}

			FString LobbyId, Name, OwnerSessionId;
			int32 CurrentSessions, MaxSessions;
			auto GotLobbyId = ItemObj->Get()->TryGetStringField(TEXT("id"), LobbyId);
			auto GotName = ItemObj->Get()->TryGetStringField(TEXT("name"), Name);
			auto GotOwnerSessionId = ItemObj->Get()->TryGetStringField(TEXT("ownerSessionId"), OwnerSessionId);
			auto GotCurrentSessions = ItemObj->Get()->TryGetNumberField(TEXT("currentSessions"), CurrentSessions);
			auto GotMaxSessions = ItemObj->Get()->TryGetNumberField(TEXT("maxSessions"), MaxSessions);

			// This also appends it to SearchResults via some new() magic??!?!?
			FOnlineSessionSearchResult* NewResult = new (SearchSettingsCapture->SearchResults) FOnlineSessionSearchResult();
			NewResult->PingInMs = 10;
			FOnlineSession* NewSession = &NewResult->Session;
			NewSession->NumOpenPrivateConnections = 0;
			if (GotCurrentSessions && GotMaxSessions)
			{
				NewSession->NumOpenPublicConnections = MaxSessions - CurrentSessions;
			}
			else
			{
				NewSession->NumOpenPublicConnections = 0;
			}
			if (GotName)
			{
				NewSession->OwningUserName = Name;
			}

			TSharedPtr<FOnlineSessionInfoHive> SessionInfo = MakeShareable(new FOnlineSessionInfoHive(FUniqueNetIdString(LobbyId)));
			NewSession->SessionInfo = SessionInfo;
		}

		SearchSettingsCapture->SearchState = EOnlineAsyncTaskState::Done;

		TriggerOnFindSessionsCompleteDelegates(true);
		return;
	}, SessionInterface, SearchSettings->PlatformHash, SearchSettings);
	HttpRequest->ProcessRequest();
	return true;
}

bool FOnlineSessionHive::FindSessions(const FUniqueNetId& SearchingPlayerId, const TSharedRef<FOnlineSessionSearch>& SearchSettings)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::FindSessions()"));

	// TODO Use SearchingPlayerId
	return FindSessions(0, SearchSettings);
}

bool FOnlineSessionHive::FindSessionById(const FUniqueNetId& SearchingUserId, const FUniqueNetId& SessionId, const FUniqueNetId& FriendId, const FOnSingleSessionResultCompleteDelegate& CompletionDelegate)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::FindSessionById()"));

	return false;
}

bool FOnlineSessionHive::CancelFindSessions()
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::CancelFindSessions()"));

	// Not yet supported.
	return false;
}

bool FOnlineSessionHive::PingSearchResults(const FOnlineSessionSearchResult& SearchResult)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::PingSearchResults()"));

	return false;
}

bool FOnlineSessionHive::JoinSession(int32 PlayerNum, FName SessionName, const FOnlineSessionSearchResult& DesiredSession)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::JoinSession()"));

	FNamedOnlineSession* Session = GetNamedSession(SessionName);
	if (Session)
	{
		UE_LOG_ONLINE(Warning, TEXT("Cannot join session '%s': session already present."), *SessionName.ToString());
		return true;
	}

	IOnlineIdentityPtr Identity = HiveSubsystem->GetIdentityInterface();
	if (!Identity.IsValid())
	{
		UE_LOG_ONLINE(Warning, TEXT("No valid Hive identity interface."));
		TriggerOnJoinSessionCompleteDelegates(SessionName, EOnJoinSessionCompleteResult::UnknownError);
		return true;
	}

	auto AuthToken = Identity->GetAuthToken(PlayerNum);
	if (FString().Equals(AuthToken))
	{
		UE_LOG_ONLINE(Warning, TEXT("No Hive authentication token available."));
		TriggerOnJoinSessionCompleteDelegates(SessionName, EOnJoinSessionCompleteResult::UnknownError);
		return true;
	}

	auto UserSessionId = ((const FUserOnlineAccountHive*) Identity->GetUserAccount(*(Identity->GetUniquePlayerId(PlayerNum))).Get())->SessionId;

	// Create the named session for joining.
	Session = AddNamedSession(SessionName, DesiredSession.Session);
	Session->HostingPlayerNum = PlayerNum;

	if (!DesiredSession.Session.SessionInfo.IsValid())
	{
		UE_LOG_ONLINE(Warning, TEXT("Invalid session information on session"));
		TriggerOnJoinSessionCompleteDelegates(SessionName, EOnJoinSessionCompleteResult::UnknownError);
		return true;
	}

	const FOnlineSessionInfoHive* SearchSessionInfo = (const FOnlineSessionInfoHive*)DesiredSession.Session.SessionInfo.Get();
	
	FOnlineSessionInfoHive* SessionInfo = new FOnlineSessionInfoHive(FUniqueNetIdString(SearchSessionInfo->LobbyId.ToString()));
	Session->SessionInfo = MakeShareable(SessionInfo);

	auto SessionId = SessionInfo->LobbyId.ToString();

	auto SessionInterface = TWeakPtr<IOnlineSession, ESPMode::ThreadSafe>(HiveSubsystem->GetSessionInterface());

	TSharedRef<IHttpRequest> HttpRequest = FHttpModule::Get().CreateRequest();
	HttpRequest->SetURL(FString::Printf(
		TEXT("https://lobby-api.hivemp.com/v1/session?lobbyId=%s&sessionId=%s"),
		*FGenericPlatformHttp::UrlEncode(SessionId),
		*FGenericPlatformHttp::UrlEncode(UserSessionId)));
	HttpRequest->SetHeader(TEXT("api_key"), AuthToken);
	HttpRequest->SetVerb(TEXT("PUT"));
	HttpRequest->OnProcessRequestComplete().BindLambda([this](FHttpRequestPtr HttpRequest, FHttpResponsePtr HttpResponse, bool bSucceeded, TWeakPtr<IOnlineSession, ESPMode::ThreadSafe> SessionInterfaceCapture, FName SessionName)
	{
		if (!SessionInterfaceCapture.IsValid())
		{
			UE_LOG_ONLINE(Error, TEXT("FOnlineSessionHive::JoinSession -> Shared pointer to online session lost, unsafe to access this"));
			return;
		}

		bool ShouldFail = false;
		if (!bSucceeded || !HttpResponse.IsValid())
		{
			UE_LOG_ONLINE(Error, TEXT("FOnlineSessionHive::JoinSession -> Did not get successful response from server"));
			RemoveNamedSession(SessionName);
			TriggerOnJoinSessionCompleteDelegates(SessionName, EOnJoinSessionCompleteResult::UnknownError);
			return;
		}

		auto Response = HttpResponse.Get();

		UE_LOG_ONLINE(Warning, TEXT("FOnlineSessionHive::JoinSession %s"), *(Response->GetContentAsString()));

		TriggerOnJoinSessionCompleteDelegates(SessionName, EOnJoinSessionCompleteResult::Success);
		return;
	}, SessionInterface, SessionName);
	HttpRequest->ProcessRequest();
	return true;
}

bool FOnlineSessionHive::JoinSession(const FUniqueNetId& PlayerId, FName SessionName, const FOnlineSessionSearchResult& DesiredSession)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::JoinSession()"));

	return JoinSession(0, SessionName, DesiredSession);
}

bool FOnlineSessionHive::FindFriendSession(int32 LocalUserNum, const FUniqueNetId& Friend)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::FindFriendSession()"));

	// Not supported yet.
	return false;
}

bool FOnlineSessionHive::FindFriendSession(const FUniqueNetId& LocalUserId, const FUniqueNetId& Friend)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::FindFriendSession()"));

	// Not supported yet.
	return false;
}

bool FOnlineSessionHive::FindFriendSession(const FUniqueNetId& LocalUserId, const TArray<TSharedRef<const FUniqueNetId>>& FriendList)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::FindFriendSession()"));

	// Not supported yet.
	return false;
}

bool FOnlineSessionHive::SendSessionInviteToFriend(int32 LocalUserNum, FName SessionName, const FUniqueNetId& Friend)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::SendSessionInviteToFriend()"));

	// Not supported yet.
	return false;
}

bool FOnlineSessionHive::SendSessionInviteToFriend(const FUniqueNetId& LocalUserId, FName SessionName, const FUniqueNetId& Friend)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::SendSessionInviteToFriend()"));

	// Not supported yet.
	return false;
}

bool FOnlineSessionHive::SendSessionInviteToFriends(int32 LocalUserNum, FName SessionName, const TArray< TSharedRef<const FUniqueNetId> >& Friends)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::SendSessionInviteToFriends()"));

	// Not supported yet.
	return false;
}

bool FOnlineSessionHive::SendSessionInviteToFriends(const FUniqueNetId& LocalUserId, FName SessionName, const TArray< TSharedRef<const FUniqueNetId> >& Friends)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::SendSessionInviteToFriends()"));

	// Not supported yet.
	return false;
}

bool FOnlineSessionHive::GetResolvedConnectString(FName SessionName, FString& ConnectInfo, FName PortType)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::GetResolvedConnectString()"));

	return false;
}

bool FOnlineSessionHive::GetResolvedConnectString(const class FOnlineSessionSearchResult& SearchResult, FName PortType, FString& ConnectInfo)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::GetResolvedConnectString()"));

	return false;
}

FOnlineSessionSettings* FOnlineSessionHive::GetSessionSettings(FName SessionName)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::GetSessionSettings()"));

	return NULL;
}

bool FOnlineSessionHive::RegisterPlayer(FName SessionName, const FUniqueNetId& PlayerId, bool bWasInvited)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::RegisterPlayer()"));

	return false;
}

bool FOnlineSessionHive::RegisterPlayers(FName SessionName, const TArray< TSharedRef<const FUniqueNetId> >& Players, bool bWasInvited)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::RegisterPlayers()"));

	return false;
}

bool FOnlineSessionHive::UnregisterPlayer(FName SessionName, const FUniqueNetId& PlayerId)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::UnregisterPlayer()"));

	return false;
}

bool FOnlineSessionHive::UnregisterPlayers(FName SessionName, const TArray< TSharedRef<const FUniqueNetId> >& Players)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::UnregisterPlayers()"));

	return false;
}

void FOnlineSessionHive::RegisterLocalPlayer(const FUniqueNetId& PlayerId, FName SessionName, const FOnRegisterLocalPlayerCompleteDelegate& Delegate)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::RegisterLocalPlayer()"));
}

void FOnlineSessionHive::UnregisterLocalPlayer(const FUniqueNetId& PlayerId, FName SessionName, const FOnUnregisterLocalPlayerCompleteDelegate& Delegate)
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::UnregisterLocalPlayer()"));
}

int32 FOnlineSessionHive::GetNumSessions()
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::GetNumSessions()"));

	// Not supported - Hive can not provide total number of online sessions.
	return 0;
}

void FOnlineSessionHive::DumpSessionState()
{
	UE_LOG_ONLINE(Display, TEXT("FOnlineSessionHive::DumpSessionState()"));
}