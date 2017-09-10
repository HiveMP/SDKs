// Copyright 2017 Redpoint Games. MIT Licensed.
// Copyright 2017 Redpoint Games. MIT Licensed.

#include "OnlineAsyncTaskManagerHive.h"

void FOnlineAsyncTaskManagerHive::OnlineTick()
{
	check(HiveSubsystem);
	check(FPlatformTLS::GetCurrentThreadId() == OnlineThreadId || !FPlatformProcess::SupportsMultithreading());
}