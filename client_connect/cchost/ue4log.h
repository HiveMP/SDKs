#if CLIENT_CONNECT_TARGETING_UNREAL

#pragma once

// TODO: Wire up these logging macros to UE4 properly.

#define log_trace(...) ;
#define log_debug(...) ;
#define log_info(...)  ;
#define log_warn(...)  ;
#define log_error(...) ;
#define log_fatal(...) ;

#define log_set_udata(...) ;
#define log_set_lock(...) ;
#define log_set_fp(...) ;
#define log_set_level(...) ;
#define log_set_quiet(...) ;

#endif