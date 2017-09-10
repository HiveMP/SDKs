// Copyright 1998-2017 Epic Games, Inc. All Rights Reserved.

#include "OnlineIdentityHive.h"
#include "Misc/CommandLine.h"
#include "Misc/Guid.h"
#include "Misc/OutputDeviceRedirector.h"
#include "Misc/ConfigCacheIni.h"
#include "OnlineSubsystem.h"
#include "IPAddress.h"
#include "SocketSubsystem.h"
#include "OnlineSubsystemHive.h"
#include "OnlineSubsystemUtils.h"
#include "OnlineAsyncTaskManager.h"
#include "JsonReader.h"
#include "JsonSerializer.h"
#include "IHttpResponse.h"
#include "GenericPlatformHttp.h"

/**
* The Login callback expects a unique network ID to be assigned to a player
* before the asynchronous task completes - something which we don't have. So
* instead we generate a random user ID for the player isn't of using the Hive
* session ID.
*/
inline FString GenerateRandomUserId(int32 LocalUserNum)
{
	FString HostName;
	if (!ISocketSubsystem::Get(PLATFORM_SOCKETSUBSYSTEM)->GetHostName(HostName))
	{
		// could not get hostname, use address
		bool bCanBindAll;
		TSharedPtr<class FInternetAddr> Addr = ISocketSubsystem::Get(PLATFORM_SOCKETSUBSYSTEM)->GetLocalHostAddr(*GLog, bCanBindAll);
		HostName = Addr->ToString(false);
	}

	const bool bForceUniqueId = FParse::Param(FCommandLine::Get(), TEXT("StableNullID"));

	if ((GIsFirstInstance || bForceUniqueId) && !GIsEditor)
	{
		// When possible, return a stable user id
		return FString::Printf(TEXT("%s-%s"), *HostName, *FPlatformMisc::GetLoginId().ToUpper());
	}

	// If we're not the first instance (or in the editor), return truly random id
	return FString::Printf(TEXT("%s-%s"), *HostName, *FGuid::NewGuid().ToString());
}

bool FOnlineIdentityHive::Login(int32 LocalUserNum, const FOnlineAccountCredentials& AccountCredentials)
{
	FString ErrorStr;

	if (LocalUserNum < 0 || LocalUserNum > MAX_LOCAL_PLAYERS)
	{
		ErrorStr = FString::Printf(TEXT("Invalid LocalUserNum=%d"), LocalUserNum);
	}
	else if (UserNumToSessionId.Contains(LocalUserNum))
	{
		// This user is already logged in.
		UE_LOG_ONLINE(Warning, TEXT("Returning existing account object for local user %i"), LocalUserNum);
		auto SessionId = UserNumToSessionId.FindRef(LocalUserNum);
		FUniqueNetIdString UniqueSessionId(SessionId->ToString());
		const TSharedRef<FUserOnlineAccountHive>* AccountObject = UserAccounts.Find(UniqueSessionId);
		TriggerOnLoginCompleteDelegates(LocalUserNum, true, *AccountObject->Get().GetUserId(), TEXT(""));
		return true;
	}
	else
	{
		if (!PendingLoginRequests.Contains(LocalUserNum))
		{
			PendingLoginRequests.Emplace(LocalUserNum, false);
		}

		if (!PendingLoginRequests.FindRef(LocalUserNum))
		{
			UE_LOG_ONLINE(Warning, TEXT("Local user %i is not authenticated and no pending request exists, starting login"), LocalUserNum);

			// Allocate a random user ID to use internally inside Unreal.
			FString AllocatedUnrealUserId = GenerateRandomUserId(LocalUserNum);
			UE_LOG_ONLINE(Warning, TEXT("Allocated random user ID %s for local user %i"), *AllocatedUnrealUserId, LocalUserNum);

			// Assign the randomly generated ID to the local user number.  We then pass this random user ID
			// into the HTTP callbacks to include it in the account object.
			UserNumToSessionId.Emplace(LocalUserNum, MakeShareable(new FUniqueNetIdString(AllocatedUnrealUserId)));

			if (HiveAuthenticationMode == EHiveAuthenticationMode::Temporary ||
				HiveAuthenticationMode == EHiveAuthenticationMode::User)
			{
				auto IdentityInterface = TWeakPtr<IOnlineIdentity, ESPMode::ThreadSafe>(Subsystem->GetIdentityInterface());

				TSharedRef<IHttpRequest> HttpRequest = FHttpModule::Get().CreateRequest();
				if (HiveAuthenticationMode == EHiveAuthenticationMode::Temporary)
				{
					HttpRequest->SetURL(FString::Printf(TEXT("https://temp-session-api.hivemp.com/v1/session")));
				}
				else if (HiveAuthenticationMode == EHiveAuthenticationMode::User)
				{
					/*HttpRequest->SetURL(FString::Printf(
					TEXT("https://user-session-api.hivemp.com/v1/session?authenticationProvider=%s&credentials=%s"),
					FGenericPlatformHttp::UrlEncode(TEXT("password")), // TODO Can support Steam identification via Hive
					FGenericPlatformHttp::UrlEncode(
					FString::Printf(TEXT("%s:%s"), AccountCredentials.Id, AccountCredentials.Token))));*/
				}
				HttpRequest->SetHeader(TEXT("api_key"), PublicApiKey);
				HttpRequest->SetVerb(TEXT("PUT"));
				HttpRequest->OnProcessRequestComplete().BindLambda([this](FHttpRequestPtr HttpRequest, FHttpResponsePtr HttpResponse, bool bSucceeded, TWeakPtr<IOnlineIdentity, ESPMode::ThreadSafe> IdentityInterfaceCapture, int32 LocalUserNum, bool bIsTemporary, FString AllocatedUnrealUserId)
				{
					if (!IdentityInterfaceCapture.IsValid())
					{
						UE_LOG_ONLINE(Error, TEXT("FOnlineIdentityHive::Login -> Shared pointer to online session lost, unsafe to access this"));
						return;
					}

					if (!bSucceeded || !HttpResponse.IsValid())
					{
						PendingLoginRequests.Emplace(LocalUserNum, false);
						TriggerOnLoginCompleteDelegates(LocalUserNum, false, FUniqueNetIdString(), TEXT("FOnlineIdentityHive::Login_HttpRequestComplete -> Did not get successful response from server"));
						return;
					}

					auto Response = HttpResponse.Get();

					UE_LOG_ONLINE(Warning, TEXT("FOnlineIdentityHive::Login_HttpRequestComplete %s -> %s"), *AllocatedUnrealUserId, *(Response->GetContentAsString()));

					TSharedPtr<FJsonObject> JsonObject;
					auto Reader = TJsonReaderFactory<>::Create(Response->GetContentAsString());
					if (!FJsonSerializer::Deserialize(Reader, JsonObject))
					{
						PendingLoginRequests.Emplace(LocalUserNum, false);
						TriggerOnLoginCompleteDelegates(LocalUserNum, false, FUniqueNetIdString(), TEXT("FOnlineIdentityHive::Login_HttpRequestComplete -> Unable to parse JSON object from server response"));
						return;
					}

					if (!JsonObject.IsValid())
					{
						PendingLoginRequests.Emplace(LocalUserNum, false);
						TriggerOnLoginCompleteDelegates(LocalUserNum, false, FUniqueNetIdString(), TEXT("FOnlineIdentityHive::Login_HttpRequestComplete -> Unable to parse JSON object from server response"));
						return;
					}

					FString Id, AccountId, ApiKey, SecretKey;
					double Expiry, Start, BilledMinutes;
					auto GotId = JsonObject->TryGetStringField(TEXT("id"), Id);
					auto GotAccountId = JsonObject->TryGetStringField(TEXT("accountId"), AccountId);
					auto GotExpiry = JsonObject->TryGetNumberField(TEXT("expiry"), Expiry);
					auto GotStart = JsonObject->TryGetNumberField(TEXT("start"), Start);
					auto GotBilledMinutes = JsonObject->TryGetNumberField(TEXT("billedMinutes"), BilledMinutes);
					auto GotApiKey = JsonObject->TryGetStringField(TEXT("apiKey"), ApiKey);
					auto GotSecretKey = JsonObject->TryGetStringField(TEXT("secretKey"), SecretKey);

					if (!GotAccountId)
					{
						AccountId = TEXT("");
					}

					TSharedPtr<FUserOnlineAccountHive> AccountObject = MakeShareable(new FUserOnlineAccountHive(
						AllocatedUnrealUserId,
						Id,
						AccountId,
						ApiKey,
						SecretKey,
						(long)Expiry));

					FUniqueNetIdString UniqueAllocatedUnrealUserId(AllocatedUnrealUserId);

					UserAccounts.Emplace(UniqueAllocatedUnrealUserId, AccountObject.ToSharedRef());

					// TODO: On error return above, we should call this as well with the correct error information.
					TriggerOnLoginCompleteDelegates(LocalUserNum, true, *AccountObject->GetUserId(), TEXT(""));
					PendingLoginRequests.Emplace(LocalUserNum, false);
				}, IdentityInterface, LocalUserNum, true, AllocatedUnrealUserId);
				HttpRequest->ProcessRequest();

				PendingLoginRequests.Emplace(LocalUserNum, true);
			}
			else
			{
				// Not supported.
				ErrorStr = TEXT("Unsupported Hive authentication mode");
				return false;
			}
		}
	}

	if (!ErrorStr.IsEmpty())
	{
		UE_LOG_ONLINE(Warning, TEXT("Login request failed. %s"), *ErrorStr);
		TriggerOnLoginCompleteDelegates(LocalUserNum, false, FUniqueNetIdString(), ErrorStr);
		return false;
	}

	return true;
}

bool FOnlineIdentityHive::Logout(int32 LocalUserNum)
{
	/*TSharedPtr<const FUniqueNetId> UserId = GetUniquePlayerId(LocalUserNum);
	if (UserId.IsValid())
	{
		// remove cached user account
		UserAccounts.Remove(FUniqueNetIdString(*UserId));
		// remove cached user id
		UserIds.Remove(LocalUserNum);
		// not async but should call completion delegate anyway
		TriggerOnLogoutCompleteDelegates(LocalUserNum, true);

		return true;
	}
	else
	{
		UE_LOG_ONLINE(Warning, TEXT("No logged in user found for LocalUserNum=%d."),
			LocalUserNum);
		TriggerOnLogoutCompleteDelegates(LocalUserNum, false);
	}*/
	return false;
}

bool FOnlineIdentityHive::AutoLogin(int32 LocalUserNum)
{
	/*FString LoginStr;
	FString PasswordStr;
	FString TypeStr;

	FParse::Value(FCommandLine::Get(), TEXT("AUTH_LOGIN="), LoginStr);
	FParse::Value(FCommandLine::Get(), TEXT("AUTH_PASSWORD="), PasswordStr);
	FParse::Value(FCommandLine::Get(), TEXT("AUTH_TYPE="), TypeStr);

	if (!LoginStr.IsEmpty())
	{
		if (!PasswordStr.IsEmpty())
		{
			if (!TypeStr.IsEmpty())
			{
				return Login(0, FOnlineAccountCredentials(TypeStr, LoginStr, PasswordStr));
			}
			else
			{
				UE_LOG_ONLINE(Warning, TEXT("AutoLogin missing AUTH_TYPE=<type>."));
			}
		}
		else
		{
			UE_LOG_ONLINE(Warning, TEXT("AutoLogin missing AUTH_PASSWORD=<password>."));
		}
	}
	else
	{
		UE_LOG_ONLINE(Warning, TEXT("AutoLogin missing AUTH_LOGIN=<login id>."));
	}*/
	return false;
}

TSharedPtr<FUserOnlineAccount> FOnlineIdentityHive::GetUserAccount(const FUniqueNetId& UserId) const
{
	TSharedPtr<FUserOnlineAccount> Result;

	FUniqueNetIdString StringUserId(UserId);
	const TSharedRef<FUserOnlineAccountHive>* FoundUserAccount = UserAccounts.Find(StringUserId);
	if (FoundUserAccount != NULL)
	{
		Result = *FoundUserAccount;
	}

	return Result;
}

TArray<TSharedPtr<FUserOnlineAccount> > FOnlineIdentityHive::GetAllUserAccounts() const
{
	TArray<TSharedPtr<FUserOnlineAccount> > Result;

	for (TMap<FUniqueNetIdString, TSharedRef<FUserOnlineAccountHive>>::TConstIterator It(UserAccounts); It; ++It)
	{
		Result.Add(It.Value());
	}

	return Result;
}

TSharedPtr<const FUniqueNetId> FOnlineIdentityHive::GetUniquePlayerId(int32 LocalUserNum) const
{
	const TSharedPtr<const FUniqueNetId>* FoundId = UserNumToSessionId.Find(LocalUserNum);
	if (FoundId != NULL)
	{
		return *FoundId;
	}
	return NULL;
}

TSharedPtr<const FUniqueNetId> FOnlineIdentityHive::CreateUniquePlayerId(uint8* Bytes, int32 Size)
{
	if (Bytes != NULL && Size > 0)
	{
		FString StrId(Size, (TCHAR*)Bytes);
		return MakeShareable(new FUniqueNetIdString(StrId));
	}
	return NULL;
}

TSharedPtr<const FUniqueNetId> FOnlineIdentityHive::CreateUniquePlayerId(const FString& Str)
{
	return MakeShareable(new FUniqueNetIdString(Str));
}

ELoginStatus::Type FOnlineIdentityHive::GetLoginStatus(int32 LocalUserNum) const
{
	TSharedPtr<const FUniqueNetId> UserId = GetUniquePlayerId(LocalUserNum);
	if (UserId.IsValid())
	{
		return GetLoginStatus(*UserId);
	}
	return ELoginStatus::NotLoggedIn;
}

ELoginStatus::Type FOnlineIdentityHive::GetLoginStatus(const FUniqueNetId& UserId) const
{
	TSharedPtr<FUserOnlineAccount> UserAccount = GetUserAccount(UserId);
	if (UserAccount.IsValid() &&
		UserAccount->GetUserId()->IsValid())
	{
		return ELoginStatus::LoggedIn;
	}
	return ELoginStatus::NotLoggedIn;
}

FString FOnlineIdentityHive::GetPlayerNickname(int32 LocalUserNum) const
{
	TSharedPtr<const FUniqueNetId> UniqueId = GetUniquePlayerId(LocalUserNum);
	if (UniqueId.IsValid())
	{
		return UniqueId->ToString();
	}
	return TEXT("NullUser");
}

FString FOnlineIdentityHive::GetPlayerNickname(const FUniqueNetId& UserId) const
{
	return UserId.ToString();
}

FString FOnlineIdentityHive::GetAuthToken(int32 LocalUserNum) const
{
	TSharedPtr<const FUniqueNetId> UserId = GetUniquePlayerId(LocalUserNum);
	if (UserId.IsValid())
	{
		TSharedPtr<FUserOnlineAccount> UserAccount = GetUserAccount(*UserId);
		if (UserAccount.IsValid())
		{
			return UserAccount->GetAccessToken();
		}
	}
	return FString();
}

FOnlineIdentityHive::FOnlineIdentityHive(class FOnlineSubsystemHive* InSubsystem)
{
	this->Subsystem = InSubsystem;
	this->HiveAuthenticationMode = EHiveAuthenticationMode::Unknown;

	if (!GConfig)
	{
		return;
	}

	FString AuthenticationModeString;
	if (!GConfig->GetString(TEXT("OnlineSubsystemHive"), TEXT("HiveAuthenticationMode"), AuthenticationModeString, GEngineIni))
	{
		UE_LOG_ONLINE(Error, TEXT("Missing HiveAuthenticationMode in OnlineSubsystemHive group of engine configuration - please specify!"));
	}

	if (!GConfig->GetString(TEXT("OnlineSubsystemHive"), TEXT("PublicApiKey"), PublicApiKey, GEngineIni))
	{
		UE_LOG_ONLINE(Error, TEXT("Missing PublicApiKey in OnlineSubsystemHive group of engine configuration - please specify!"));
	}

	if (AuthenticationModeString.Compare(TEXT("Temporary")) == 0)
	{
		this->HiveAuthenticationMode = EHiveAuthenticationMode::Temporary;
	}
	else if (AuthenticationModeString.Compare(TEXT("User")) == 0)
	{
		this->HiveAuthenticationMode = EHiveAuthenticationMode::User;
	}
	else
	{
		UE_LOG_ONLINE(Error, TEXT("Expected Temporary or User for HiveAuthenticationMode!"));
	}
}

FOnlineIdentityHive::FOnlineIdentityHive()
{
}

FOnlineIdentityHive::~FOnlineIdentityHive()
{
}

void FOnlineIdentityHive::GetUserPrivilege(const FUniqueNetId& UserId, EUserPrivileges::Type Privilege, const FOnGetUserPrivilegeCompleteDelegate& Delegate)
{
	Delegate.ExecuteIfBound(UserId, Privilege, (uint32)EPrivilegeResults::NoFailures);
}

FPlatformUserId FOnlineIdentityHive::GetPlatformUserIdFromUniqueNetId(const FUniqueNetId& UniqueNetId)
{
	for (int i = 0; i < MAX_LOCAL_PLAYERS; ++i)
	{
		auto CurrentUniqueId = GetUniquePlayerId(i);
		if (CurrentUniqueId.IsValid() && (*CurrentUniqueId == UniqueNetId))
		{
			return i;
		}
	}

	return PLATFORMUSERID_NONE;
}

FString FOnlineIdentityHive::GetAuthType() const
{
	return TEXT("");
}
