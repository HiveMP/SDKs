#include "module.h"
#include "../../jsutil.h"
#if !defined(CLIENT_CONNECT_TARGETING_UNREAL) || (defined(WITH_STEAMWORKS) && WITH_STEAMWORKS)
#define SUPPORTS_STEAM 1
#else
#define SUPPORTS_STEAM 0
#endif
#if SUPPORTS_STEAM
#if defined(CLIENT_CONNECT_TARGETING_UNREAL)
#include "CoreMinimal.h"
#include "OnlineSubsystem.h"
#pragma push_macro("ARRAY_COUNT")
#undef ARRAY_COUNT
THIRD_PARTY_INCLUDES_START
#include "steam/steam_api.h"
THIRD_PARTY_INCLUDES_END
#pragma pop_macro("ARRAY_COUNT")
#else
#include "steam/steam_api.h"
#endif
#endif
#include <string>
#include <vector>
#if defined(WIN32)
#include <Windows.h>
#endif
#if CLIENT_CONNECT_TARGETING_UNREAL
#include "../../ue4log.h"
#else
extern "C" {
#include "log.h"
}
#endif
#if CLIENT_CONNECT_TARGETING_UNREAL
#define log_warn_basic(txt) ;
#define log_info_basic(txt) ;
#else
#define log_warn_basic log_warn
#define log_info_basic log_info
#endif

enum HiveMPSteamManagerStatus
{
	NotComplete,
	Resolved,
	Rejected
};

class HiveMPSteamManager
{
public:
	HiveMPSteamManager(const char* resolve, const char* reject);
	virtual ~HiveMPSteamManager();
	std::string GetEncodedTicket();

	HiveMPSteamManagerStatus status;
	std::string resolveRegistryName;
	std::string rejectRegistryName;
	std::string rejectErrorMessage;

#if SUPPORTS_STEAM
	HAuthTicket ticket;
	const char* buffer;
	uint32 ticketLength;

private:
	STEAM_CALLBACK(HiveMPSteamManager, OnGotAuthTicket, GetAuthSessionTicketResponse_t);
#endif
};

bool has_inited_steam = false;
bool did_init_steam = false;
std::vector<HiveMPSteamManager*>* pending_callbacks = nullptr;

bool try_init_steam()
{
	if (!has_inited_steam)
	{
#if SUPPORTS_STEAM
#if defined(WIN32)
		__try
		{
#endif
			if (SteamAPI_Init == nullptr || SteamAPI_IsSteamRunning == nullptr) {
				log_warn_basic("unable to load Steam APIs: the steam_api DLL couldn't be loaded (this game might not support Steam)");
				did_init_steam = false;
				has_inited_steam = true;
			} else {
				did_init_steam = (SteamAPI_Init() && SteamAPI_IsSteamRunning());
				if (did_init_steam)
				{
					pending_callbacks = new std::vector<HiveMPSteamManager*>();
				}
				has_inited_steam = true;

				if (!did_init_steam)
				{
					log_warn_basic("unable to load Steam APIs: Steam isn't running or otherwise failed to load");
				}
				else
				{
					log_info_basic("successfully loaded Steam APIs");
				}
			}
#if defined(WIN32)
		}
		__except (EXCEPTION_EXECUTE_HANDLER)
		{
			// Unable to load Steam (game might not ship with the DLL).
			did_init_steam = false;
			has_inited_steam = true;

			log_warn_basic("unable to load Steam APIs: the steam_api DLL couldn't be loaded (this game might not support Steam)");
		}
#endif
#else
		did_init_steam = false;
		has_inited_steam = true;
		log_warn_basic("unable to load Steam APIs: this version of Client Connect wasn't built with Steam support");
#endif
	}

	return did_init_steam;
}

HiveMPSteamManager::HiveMPSteamManager(const char* resolve, const char* reject)
{
	log_trace("auth ticket request: starting request for Steam auth ticket");

	this->resolveRegistryName = resolve;
	this->rejectRegistryName = reject;
	this->status = HiveMPSteamManagerStatus::NotComplete;
#if SUPPORTS_STEAM
	this->buffer = nullptr;
	this->ticket = -1;
#endif

#if SUPPORTS_STEAM
	if (!try_init_steam())
#else
	if (true)
#endif
	{
		log_error("auth ticket request: Steam isn't available or loaded, immediately rejecting request");
		this->rejectErrorMessage = "Steam is not available";
		this->status = HiveMPSteamManagerStatus::Rejected;
		return;
	}

#if SUPPORTS_STEAM
	this->buffer = (const char*)malloc(1024);
	memset((void*)(this->buffer), 0, 1024);
	this->ticket = SteamUser()->GetAuthSessionTicket((void*)(this->buffer), 1024, &this->ticketLength);
#endif
}

HiveMPSteamManager::~HiveMPSteamManager()
{
#if SUPPORTS_STEAM
	if (this->buffer != nullptr)
	{
		free((void*)this->buffer);
	}
#endif
}

#if SUPPORTS_STEAM
void HiveMPSteamManager::OnGotAuthTicket(GetAuthSessionTicketResponse_t* response)
{
	if (response->m_hAuthTicket == this->ticket)
	{
		// This is for our ticket request.
		if (response->m_eResult == EResult::k_EResultOK)
		{
			this->status = HiveMPSteamManagerStatus::Resolved;
			log_trace("auth ticket request: got Steam auth ticket");
		}
		else
		{
			this->status = HiveMPSteamManagerStatus::Rejected;
			this->rejectErrorMessage = "Unable to request Steam authentication ticket";
			log_error("auth ticket request: Steam isn't available or loaded, immediately rejecting request");
		}
	}
}
#endif

std::string HiveMPSteamManager::GetEncodedTicket()
{
#if SUPPORTS_STEAM
	static const char* const lut = "0123456789abcdef";
	size_t len = this->ticketLength;

	std::string output;
	output.reserve(2 * len);
	for (size_t i = 0; i < len; ++i)
	{
		const unsigned char c = this->buffer[i];
		output.push_back(lut[c >> 4]);
		output.push_back(lut[c & 15]);
	}
	return output;
#else
	return "";
#endif
}

void js_steam_is_available(js_State* J)
{
	js_pushboolean(J, try_init_steam());
}

void js_get_steam_auth_ticket(js_State* J)
{
	js_copy(J, 1);
	const char* resolve = js_ref(J);
	js_copy(J, 2);
	const char* reject = js_ref(J);

	HiveMPSteamManager* callback = new HiveMPSteamManager(resolve, reject);
	pending_callbacks->push_back(callback);

	js_pushboolean(J, true);
}

void js_load_steam(js_State* J)
{
	js_newobject(J);
	js_newcfunction(J, js_steam_is_available, "isAvailable", 0);
	js_setproperty(J, -2, "isAvailable");
	js_newcfunction(J, js_get_steam_auth_ticket, "getAuthTicket", 2);
	js_setproperty(J, -2, "getAuthTicket");

	// new module object is now on stack.
}

void js_tick_steam(js_State* J)
{
	if (pending_callbacks != nullptr && did_init_steam)
	{
		for (auto it = pending_callbacks->begin(); it != pending_callbacks->end(); )
		{
			if ((*it)->status == HiveMPSteamManagerStatus::Resolved)
			{
				// This callback is resolved.
				js_getregistry(J, (*it)->resolveRegistryName.c_str());
				if (js_isundefined(J, -1))
				{
					// no such registry value
					log_error("Steam callback: no function in registry for resolve callback");
					js_pop(J, 1);
				}
				else
				{
					log_trace("Steam callback: calling registered resolve function");
					js_pushglobal(J);
					std::string encoded_ticket = (*it)->GetEncodedTicket();
					js_pushstring(J, encoded_ticket.c_str());
					if (js_pcall(J, 1) != 0)
					{
						js_debug_error_dump(J);
					}
				}

				delete *it;
				it = pending_callbacks->erase(it);
				continue;
			}
			else if ((*it)->status == HiveMPSteamManagerStatus::Rejected)
			{
				// This callback is rejected.
				js_getregistry(J, (*it)->rejectRegistryName.c_str());
				if (js_isundefined(J, -1))
				{
					// no such registry value
					log_error("Steam callback: no function in registry for reject callback");
					js_pop(J, 1);
				}
				else
				{
					log_trace("Steam callback: calling registered reject function");
					js_pushglobal(J);
					js_pushstring(J, (*it)->rejectErrorMessage.c_str());
					if (js_pcall(J, 1) != 0)
					{
						js_debug_error_dump(J);
					}
				}

				delete *it;
				it = pending_callbacks->erase(it);
				continue;
			}

			++it;
		}

#if SUPPORTS_STEAM
		// Run Steam API callbacks.
		SteamAPI_RunCallbacks();
#endif
	}
}

bool js_post_tick_steam(js_State* J)
{
	if (pending_callbacks != nullptr && did_init_steam)
	{
		return pending_callbacks->size() > 0;
	}
	else
	{
		return false;
	}
}