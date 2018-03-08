// Copyright Redpoint Games 2017 MIT Licensed

#include "HiveBaseGameInstance.h"
#include "OnlineSubsystem.h"
#include "Engine.h"

FSocket* UHiveBaseGameInstance::GetSharedSocketForNetworking()
{
	if (this->SocketForNetworking != nullptr)
	{
		return this->SocketForNetworking;
	}

	ISocketSubsystem* SocketSubsystem = ISocketSubsystem::Get();

	if (SocketSubsystem == NULL)
	{
		UE_LOG(LogOnline, Warning, TEXT("UHiveBaseGameInstance::GetSocketForNetworking: Unable to find socket subsystem"));
		return nullptr;
	}

	this->SocketForNetworking = SocketSubsystem->CreateSocket(NAME_DGram, TEXT("Unreal"));
	if (GEngine)
	{
		GEngine->AddOnScreenDebugMessage(-1, 30.0f, FColor::Green, TEXT("Created shared networking socket for NAT punchthrough + gameplay"));
	}
	return this->SocketForNetworking;
}

bool UHiveBaseGameInstance::CanTakeSocketForNetworking()
{
	return !this->SocketForNetworkingHasExclusiveNetDriverOwner;
}

FSocket* UHiveBaseGameInstance::TakeSocketForNetworking()
{
	if (this->SocketForNetworkingHasExclusiveNetDriverOwner)
	{
		return nullptr;
	}

	this->SocketForNetworkingHasExclusiveNetDriverOwner = true;
	auto Socket = this->GetSharedSocketForNetworking();
	if (GEngine)
	{
		GEngine->AddOnScreenDebugMessage(-1, 30.0f, FColor::Yellow, TEXT("Shared networking socket now reserved by gameplay"));
	}
	return Socket;
}

void UHiveBaseGameInstance::ReleaseSocketForNetworking()
{
	if (!this->SocketForNetworkingHasExclusiveNetDriverOwner)
	{
		return;
	}

	ISocketSubsystem* SocketSubsystem = ISocketSubsystem::Get();

	if (SocketSubsystem == NULL)
	{
		UE_LOG(LogOnline, Warning, TEXT("UHiveBaseGameInstance::CleanupSocketForNetworking: Unable to find socket subsystem"));
		return;
	}

	if (this->SocketForNetworking != nullptr)
	{
		if (!this->SocketForNetworking->Close())
		{
			UE_LOG(LogExit, Log, TEXT("closesocket error (%i)"), (int32)SocketSubsystem->GetLastErrorCode());
		}

		if (GEngine)
		{
			GEngine->AddOnScreenDebugMessage(-1, 30.0f, FColor::Red, TEXT("Releasing / destroying shared networking socket"));
		}

		SocketSubsystem->DestroySocket(this->SocketForNetworking);
		this->SocketForNetworking = nullptr;
	}
}
