#if CLIENT_CONNECT_TARGETING_UNREAL

#pragma once

#include "EngineMinimal.h"

DECLARE_LOG_CATEGORY_EXTERN(LogClientConnect, Log, All);

// TODO: Wire up these logging macros to UE4 properly.

#define log_trace(fmt, ...) UE_LOG(LogClientConnect, VeryVerbose, TEXT(fmt), __VA_ARGS__);
#define log_debug(fmt, ...) UE_LOG(LogClientConnect, Verbose, TEXT(fmt), __VA_ARGS__);
#define log_info(fmt, ...)  UE_LOG(LogClientConnect, Log, TEXT(fmt), __VA_ARGS__);
#define log_warn(fmt, ...)  UE_LOG(LogClientConnect, Warning, TEXT(fmt), __VA_ARGS__);
#define log_error(fmt, ...) UE_LOG(LogClientConnect, Error, TEXT(fmt), __VA_ARGS__);
#define log_fatal(fmt, ...) UE_LOG(LogClientConnect, Error, TEXT(fmt), __VA_ARGS__);

#define log_set_udata(...) ;
#define log_set_lock(...) ;
#define log_set_fp(...) ;
#define log_set_level(...) ;
#define log_set_quiet(...) ;

#endif