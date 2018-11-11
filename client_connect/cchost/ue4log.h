#if CLIENT_CONNECT_TARGETING_UNREAL

#pragma once

#include "EngineMinimal.h"
#include "LogVerbosity.h"
#include <cstdio>
#include <cstdlib>
#include <cstdarg>

DECLARE_LOG_CATEGORY_EXTERN(LogClientConnect, Log, All);

#if defined(__GNUC__) || defined(__clang__)
#define transpose_ue4_log(verbosity, fmt, ...) \
{ \
	char* buf = (char*)malloc(4096); \
	snprintf(buf, 4096, fmt, ##__VA_ARGS__); \
	UE_LOG(LogClientConnect, verbosity, TEXT("%s"), UTF8_TO_TCHAR(buf)); \
	free(buf); \
}

#define log_trace(fmt, ...) transpose_ue4_log(Log, fmt, ##__VA_ARGS__);
#define log_debug(fmt, ...) transpose_ue4_log(Log, fmt, ##__VA_ARGS__);
#define log_info(fmt, ...)  transpose_ue4_log(Log, fmt, ##__VA_ARGS__);
#define log_warn(fmt, ...)  transpose_ue4_log(Warning, fmt, ##__VA_ARGS__);
#define log_error(fmt, ...) transpose_ue4_log(Error, fmt, ##__VA_ARGS__);
#define log_fatal(fmt, ...) transpose_ue4_log(Error, fmt, ##__VA_ARGS__);
#else
#define transpose_ue4_log(verbosity, fmt, ...) \
{ \
	char* buf = (char*)malloc(4096); \
	snprintf(buf, 4096, fmt, __VA_ARGS__); \
	UE_LOG(LogClientConnect, verbosity, TEXT("%s"), UTF8_TO_TCHAR(buf)); \
	free(buf); \
}

#define log_trace(fmt, ...) transpose_ue4_log(Log, fmt, __VA_ARGS__);
#define log_debug(fmt, ...) transpose_ue4_log(Log, fmt, __VA_ARGS__);
#define log_info(fmt, ...)  transpose_ue4_log(Log, fmt, __VA_ARGS__);
#define log_warn(fmt, ...)  transpose_ue4_log(Warning, fmt, __VA_ARGS__);
#define log_error(fmt, ...) transpose_ue4_log(Error, fmt, __VA_ARGS__);
#define log_fatal(fmt, ...) transpose_ue4_log(Error, fmt, __VA_ARGS__);
#endif

#define log_set_udata(...) ;
#define log_set_lock(...) ;
#define log_set_fp(...) ;
#define log_set_level(...) ;
#define log_set_quiet(...) ;

#endif