#include "HiveUtilBlueprintLibrary.h"
#include "Engine/NetDriver.h"
#include "Engine.h"

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

FString UHiveUtilBlueprintLibrary::GetCurrentWorldUrl(UObject* WorldContextObject)
{
	return WorldContextObject->GetWorld()->GetAddressURL();
}

void UHiveUtilBlueprintLibrary::SendNatPunchthroughRequest(UObject* WorldContextObject, const struct FHivenat_punchthrough_NATNegotation& Negotiation)
{
	auto NetDriver = GetActiveNetDriver(WorldContextObject->GetWorld());
	if (NetDriver != NULL)
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
		NetDriver->LowLevelSend(Address, Packet, Negotiation.message.Num() * 8 /* this argument is in bits, so multiply by 8 */);
		free(Packet);
	}
}

void UHiveUtilBlueprintLibrary::SendNatPunchthroughRequestToClient(UObject* WorldContextObject, const struct FHivenat_punchthrough_NATEndpoint& Endpoint)
{
	UNetDriver* NetDriver = GetActiveNetDriver(WorldContextObject->GetWorld());
	if (NetDriver != NULL)
	{
		uint8* Packet = (uint8*)malloc(1);
		// This will be intercepted by UHiveIpConnection, which must be configured in DefaultEngine.ini with:
		//
		// [/Script/OnlineSubsystemUtils.IpNetDriver]
		// NetConnectionClassName="/Script/OnlineSubsystemHive.HiveIpConnection"
		//
		// If you don't configure this, clients will be disconnected when they receive this packet.
		Packet[0] = 0;
		FString Address = FString::Printf(TEXT("%s:%i"), *(Endpoint.host), Endpoint.port);
		NetDriver->LowLevelSend(Address, Packet, 8 /* this argument is in bits, so multiply by 8 */);
		free(Packet);
	}
}