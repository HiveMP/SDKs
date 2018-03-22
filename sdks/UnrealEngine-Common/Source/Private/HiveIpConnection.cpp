// Copyright Redpoint Games 2017 MIT Licensed

#include "HiveIpConnection.h"
#include "PacketHandler.h"

UHiveIpConnection::UHiveIpConnection(const FObjectInitializer& ObjectInitializer) :
	Super(ObjectInitializer)
{
}

void UHiveIpConnection::ReceivedRawPacket(void* InData, int32 InCount)
{
	uint8* Data = (uint8*)InData;

	if (Handler.IsValid())
	{
		const ProcessedPacket UnProcessedPacket = Handler->Incoming(Data, InCount);

		if (!UnProcessedPacket.bError)
		{
			int32 Count = FMath::DivideAndRoundUp(UnProcessedPacket.CountBits, 8);

			if (Count == 1)
			{
				UE_LOG(LogNet, Display, TEXT("UHiveIpConnection::ReceivedRawPacket: Intercepted NAT punchthrough packet"));

				uint8* CastedData = (uint8*)Data;
				if (CastedData[0] == 0x0)
				{
					// This is a NAT punchthrough packet sent from the server. Silently
					// ignore it.
					return;
				}
			}
		}
		else
		{
			UE_LOG(LogNet, Display, TEXT("UHiveIpConnection::ReceivedRawPacket: Intercepted NAT punchthrough packet"));
			return;
		}
	}

	// Sometimes we can also hit this scenario - not sure why though?
	if (InCount > 0 && Data[InCount - 1] == 0x0)
	{
		UE_LOG(LogNet, Display, TEXT("UHiveIpConnection::ReceivedRawPacket: Intercepted NAT punchthrough packet"));
		return;
	}

	// Not a NAT punchthrough packet - forward to base class.
	UNetConnection::ReceivedRawPacket(InData, InCount);
}