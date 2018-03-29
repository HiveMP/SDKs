// Copyright Redpoint Games 2017 MIT Licensed

#pragma once

#include "CoreMinimal.h"
#include "SocketSubsystem.h"
#include "Sockets.h"
#include "Runtime/Engine/Classes/Engine/GameInstance.h"
#include "HiveMPBaseGameInstance.generated.h"

UCLASS()
class UHiveMPBaseGameInstance : public UGameInstance
{
	GENERATED_BODY()

private:
	/** The UDP socket available for networking (such as NAT punchthrough) outside multiplayer games. */
	FSocket * SocketForNetworking = nullptr;

	/** Whether the socket for networking has a net driver owner already. */
	bool SocketForNetworkingHasExclusiveNetDriverOwner = false;

public:
	/** Gets a shared reference to the UDP socket, used for networking before the game launches. */
	FSocket * GetSharedSocketForNetworking();

	/** Returns true if a net driver can take the UDP socket used for networking for use in a game */
	bool CanTakeSocketForNetworking();

	/** Gets the UDP socket generally available for networking (shared between NAT punchthrough and multiplayer games). */
	FSocket * TakeSocketForNetworking();

	/** Destroys and cleans up the socket used for networking. */
	void ReleaseSocketForNetworking();
};