// Copyright Redpoint Games 2017 MIT Licensed

#include "HiveMPUtilBlueprintLibrary.h"
#include "Engine/NetDriver.h"
#include "Engine.h"
#include "SocketSubsystem.h"
#include "Sockets.h"
#include "Runtime/Sockets/Public/IPAddress.h"
#include "HiveMPBaseGameInstance.h"

static inline UNetDriver* GetActiveNetDriver(UWorld* InWorld)
{
	UNetDriver* ReturnVal = NULL;
	FWorldContext* WorldContext = &GEngine->GetWorldContextFromWorldChecked(InWorld);

	if (WorldContext != NULL && WorldContext->PendingNetGame != NULL && WorldContext->PendingNetGame->NetDriver != NULL)
	{
		ReturnVal = WorldContext->PendingNetGame->NetDriver;
	}
	else if (InWorld != NULL)
	{
		ReturnVal = InWorld->NetDriver;
	}

	return ReturnVal;
}

FString UHiveMPUtilBlueprintLibrary::GetCurrentWorldUrl(UObject* WorldContextObject)
{
	return WorldContextObject->GetWorld()->GetAddressURL();
}

void UHiveMPUtilBlueprintLibrary::SendNatPunchthroughRequest(UObject* WorldContextObject, const struct FHivenat_punchthrough_NATNegotation& Negotiation)
{
	auto NetDriver = GetActiveNetDriver(WorldContextObject->GetWorld());
	if (NetDriver != NULL || WorldContextObject != NULL)
	{
		// For some reason, Unreal receives a newline after base64 decoding the negotation message,
		// should not occur (testing raw decoding of the base64 doesn't show any newlines in it).
		// Strip the newline data here.
		auto NegotiationLen = Negotiation.message.Num();
		if (Negotiation.message[Negotiation.message.Num() - 2] == '\r' &&
			Negotiation.message[Negotiation.message.Num() - 1] == '\n')
		{
			NegotiationLen -= 2;
		}
		else if (Negotiation.message[Negotiation.message.Num() - 1] == '\n')
		{
			NegotiationLen -= 1;
		}

		uint8* Packet = (uint8*)malloc(NegotiationLen);
		for (int i = 0; i < NegotiationLen; i++)
		{
			Packet[i] = Negotiation.message[i];
		}
		FString Address = FString::Printf(TEXT("%s:%i"), *(Negotiation.host), Negotiation.port);

		if (NetDriver != NULL)
		{
			NetDriver->LowLevelSend(Address, Packet, Negotiation.message.Num() * 8 /* this argument is in bits, so multiply by 8 */);
		}
		else if (WorldContextObject != NULL)
		{
			UHiveMPBaseGameInstance* Instance = WorldContextObject->GetWorld()->GetGameInstance<UHiveMPBaseGameInstance>();
			if (Instance != nullptr)
			{
				FSocket* Socket = Instance->GetSharedSocketForNetworking();

				bool bValidAddress = !Address.IsEmpty();
				TSharedRef<FInternetAddr> RemoteAddr = ISocketSubsystem::Get()->CreateInternetAddr();

				if (bValidAddress)
				{
					RemoteAddr->SetIp(*Address, bValidAddress);
				}

				if (bValidAddress)
				{
					const uint8* DataToSend = reinterpret_cast<uint8*>(Packet);

					int32 CountBits = Negotiation.message.Num() * 8;

					int32 BytesSent = 0;
					uint32 CountBytes = FMath::DivideAndRoundUp(CountBits, 8);

					if (CountBits > 0)
					{
						Socket->SendTo(DataToSend, FMath::DivideAndRoundUp(CountBits, 8), BytesSent, *RemoteAddr);
					}
				}
				else
				{
					// UE_LOG(LogNet, Warning, TEXT("UIpNetDriver::LowLevelSend: Invalid send address '%s'"), *Address);
				}
			}
		}

		free(Packet);
	}
}

void UHiveMPUtilBlueprintLibrary::SendNatPunchthroughRequestToClient(UObject* WorldContextObject, const struct FHivenat_punchthrough_NATEndpoint& Endpoint)
{
	UNetDriver* NetDriver = GetActiveNetDriver(WorldContextObject->GetWorld());
	if (NetDriver != NULL || WorldContextObject != NULL)
	{
		uint8* Packet = (uint8*)malloc(1);
		// This will be intercepted by UHiveIpConnection, which must be configured in DefaultEngine.ini with:
		//
		// [/Script/OnlineSubsystemUtils.IpNetDriver]
		// NetConnectionClassName="/Script/HiveMPSDK.HiveMPIpConnection"
		//
		// If you don't configure this, clients will be disconnected when they receive this packet.
		Packet[0] = 0;
		FString Address = FString::Printf(TEXT("%s:%i"), *(Endpoint.host), Endpoint.port);

		if (NetDriver != NULL)
		{
			NetDriver->LowLevelSend(Address, Packet, 8 /* this argument is in bits, so multiply by 8 */);
		}
		else if (WorldContextObject != NULL)
		{
			UHiveMPBaseGameInstance* Instance = WorldContextObject->GetWorld()->GetGameInstance<UHiveMPBaseGameInstance>();
			if (Instance != nullptr)
			{
				FSocket* Socket = Instance->GetSharedSocketForNetworking();

				bool bValidAddress = !Address.IsEmpty();
				TSharedRef<FInternetAddr> RemoteAddr = ISocketSubsystem::Get()->CreateInternetAddr();

				if (bValidAddress)
				{
					RemoteAddr->SetIp(*Address, bValidAddress);
				}

				if (bValidAddress)
				{
					const uint8* DataToSend = reinterpret_cast<uint8*>(Packet);

					int32 CountBits = 8;

					int32 BytesSent = 0;
					uint32 CountBytes = FMath::DivideAndRoundUp(CountBits, 8);

					if (CountBits > 0)
					{
						Socket->SendTo(DataToSend, FMath::DivideAndRoundUp(CountBits, 8), BytesSent, *RemoteAddr);
					}
				}
				else
				{
					// UE_LOG(LogNet, Warning, TEXT("UIpNetDriver::LowLevelSend: Invalid send address '%s'"), *Address);
				}
			}
		}

		free(Packet);
	}
}