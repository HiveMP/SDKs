// Copyright Redpoint Games 2017 MIT Licensed

#pragma once

#include "CoreMinimal.h"
#include "SocketSubsystem.h"
#include "Sockets.h"
#include "Runtime/Engine/Classes/Engine/GameInstance.h"
#include "HiveMPBaseGameInstance.generated.h"

DECLARE_DELEGATE_TwoParams(FClientConnectCallback, uint32_t, FString)

UCLASS()
class UHiveMPBaseGameInstance : public UGameInstance
{
	GENERATED_BODY()

public:
	/** Called at the start of the game to initialise the game instance. **/
	virtual void Init() override;

	/** Called before the game shuts down. **/
	virtual void Shutdown() override;

	/** Called to register a HiveMP Client Connect callback, where the lambda is invoked when the handle completes. */
	template<typename FunctorType, typename... VarTypes>
	void RegisterClientConnectCallback(long Handle, FunctorType&& InFunctor, VarTypes... Vars)
	{
		TSharedPtr<FClientConnectCallback> Callback = MakeShareable(new FClientConnectCallback());
		Callback->BindLambda(InFunctor, Vars...);
		this->RegisteredCallbackHandles.Add(Handle, Callback);
	}

private:
	/** The handle for ticking the game instance. */
	FDelegateHandle TickDelegateHandle;

	/** The map of Client Connect handles to the delegates to invoke. */
	TMap<int64, TSharedPtr<FClientConnectCallback>> RegisteredCallbackHandles;

	/** Called to tick HiveMP Client Connect internally. */
	bool TickClientConnect(float DeltaSeconds);

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