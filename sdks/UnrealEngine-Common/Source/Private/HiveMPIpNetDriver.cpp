// Copyright Redpoint Games 2017 MIT Licensed

#include "HiveMPIpNetDriver.h"
#include "Runtime/Engine/Classes/Engine/World.h"
#include "HiveMPBaseGameInstance.h"

#include "IpNetDriver.h"
#include "Misc/CommandLine.h"
#include "EngineGlobals.h"
#include "Engine/World.h"
#include "Engine/Engine.h"
#include "UObject/Package.h"
#include "PacketHandlers/StatelessConnectHandlerComponent.h"
#include "Engine/NetConnection.h"
#include "Engine/ChildConnection.h"
#include "SocketSubsystem.h"
#include "IpConnection.h"

#include "PacketAudit.h"

#include "IPAddress.h"
#include "Sockets.h"

FSocket* UHiveMPIpNetDriver::CreateSocket()
{
	if (this->World == nullptr)
	{
		this->DidTakeOwnershipOfSocketForNetworking = false;

		return Super::CreateSocket();
	}

	UHiveMPBaseGameInstance* Instance = this->World->GetGameInstance<UHiveMPBaseGameInstance>();
	if (Instance == nullptr)
	{
		this->DidTakeOwnershipOfSocketForNetworking = false;

		return Super::CreateSocket();
	}
	else
	{
		if (Instance->CanTakeSocketForNetworking())
		{
			this->DidTakeOwnershipOfSocketForNetworking = true;

			// Keep a reference to the instance for later...
			this->CachedGameInstance = Instance;

			return Instance->TakeSocketForNetworking();
		}
		else
		{
			this->DidTakeOwnershipOfSocketForNetworking = false;

			return Super::CreateSocket();
		}
	}
}

bool UHiveMPIpNetDriver::InitBase(bool bInitAsClient, FNetworkNotify* InNotify, const FURL& URL, bool bReuseAddressAndPort, FString& Error)
{
	if (!UNetDriver::InitBase(bInitAsClient, InNotify, URL, bReuseAddressAndPort, Error))
	{
		return false;
	}

	ISocketSubsystem* SocketSubsystem = GetSocketSubsystem();
	if (SocketSubsystem == NULL)
	{
		UE_LOG(LogNet, Warning, TEXT("Unable to find socket subsystem"));
		return false;
	}

	Socket = CreateSocket();

	if (Socket == NULL)
	{
		Socket = 0;
		Error = FString::Printf(TEXT("WinSock: socket failed (%i)"), (int32)SocketSubsystem->GetLastErrorCode());
		return false;
	}
	if (SocketSubsystem->RequiresChatDataBeSeparate() == false &&
		Socket->SetBroadcast() == false)
	{
		Error = FString::Printf(TEXT("%s: setsockopt SO_BROADCAST failed (%i)"), SocketSubsystem->GetSocketAPIName(), (int32)SocketSubsystem->GetLastErrorCode());
		return false;
	}

	if (Socket->SetReuseAddr(bReuseAddressAndPort) == false)
	{
		UE_LOG(LogNet, Log, TEXT("setsockopt with SO_REUSEADDR failed"));
	}

	if (Socket->SetRecvErr() == false)
	{
		UE_LOG(LogNet, Log, TEXT("setsockopt with IP_RECVERR failed"));
	}

	// Increase socket queue size, because we are polling rather than threading
	// and thus we rely on the OS socket to buffer a lot of data.
	int32 RecvSize = bInitAsClient ? 0x8000 : 0x20000;
	int32 SendSize = bInitAsClient ? 0x8000 : 0x20000;
	Socket->SetReceiveBufferSize(RecvSize, RecvSize);
	Socket->SetSendBufferSize(SendSize, SendSize);
	UE_LOG(LogInit, Log, TEXT("%s: Socket queue %i / %i"), SocketSubsystem->GetSocketAPIName(), RecvSize, SendSize);

	// Bind socket to our port.
	LocalAddr = SocketSubsystem->GetLocalBindAddr(*GLog);

	if (Socket->GetConnectionState() == ESocketConnectionState::SCS_Connected && Socket->GetPortNo() != 0)
	{
		// The socket is already in a connected state and has a port allocated.  Don't allocate
		// or change any ports.
		LocalAddr->SetPort(Socket->GetPortNo());
	}
	else
	{
		// Socket is not connected yet. Set preferred port and allocate as UE4 normally would.
		LocalAddr->SetPort(bInitAsClient ? GetClientPort() : URL.Port);
		int32 AttemptPort = LocalAddr->GetPort();
		int32 BoundPort = SocketSubsystem->BindNextPort(Socket, *LocalAddr, MaxPortCountToTry + 1, 1);
		if (BoundPort == 0)
		{
			Error = FString::Printf(TEXT("%s: binding to port %i failed (%i)"), SocketSubsystem->GetSocketAPIName(), AttemptPort,
				(int32)SocketSubsystem->GetLastErrorCode());
			return false;
		}
	}

	if (Socket->SetNonBlocking() == false)
	{
		Error = FString::Printf(TEXT("%s: SetNonBlocking failed (%i)"), SocketSubsystem->GetSocketAPIName(),
			(int32)SocketSubsystem->GetLastErrorCode());
		return false;
	}

	// Success.
	return true;
}

void UHiveMPIpNetDriver::LowLevelDestroy()
{
	if (!this->DidTakeOwnershipOfSocketForNetworking)
	{
		// Non-shared cleanup.
		Super::LowLevelDestroy();
	}
	else
	{
		if (this->World != nullptr)
		{
			auto NewGameInstance = this->World->GetGameInstance<UHiveMPBaseGameInstance>();
			if (NewGameInstance != nullptr)
			{
				this->CachedGameInstance = NewGameInstance;
			}
		}

		if (this->CachedGameInstance == nullptr)
		{
			UE_LOG(LogNet, Warning, TEXT("Unable to locate game instance."));
			UNetDriver::LowLevelDestroy();

			// It's not safe to call Super as we don't know if we're using a hive base game instance
			// with shared socket.

			return;
		}

		// Close the socket.
		if (Socket && !HasAnyFlags(RF_ClassDefaultObject))
		{
			UNetDriver::LowLevelDestroy();
			this->CachedGameInstance->ReleaseSocketForNetworking();
		}
	}
}