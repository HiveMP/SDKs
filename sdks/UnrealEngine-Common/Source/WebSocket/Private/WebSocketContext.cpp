/*
* Copyright (C) 2017 feiwu <feixuwu@outlook.com>
*
* The previous licensing header on this file has been replaced with this
* MIT license notice to make it consistent the LICENSE file contained in the
* original repository, as outlined in https://github.com/feixuwu/UEWebsocket/issues/15.
*/

#include "WebSocket.h"
#include "WebSocketContext.h"
#include "UObjectGlobals.h"
#include "WebSocketBase.h"

#ifdef LOAD_ROOT_CERTIFICATES_FROM_WIN32_STORE
#include <stdio.h>
#include <MinWindows.h>
#include <wincrypt.h>
#include <cryptuiapi.h>
#include <iostream>
#include <tchar.h>

#define UI UI_ST
THIRD_PARTY_INCLUDES_START
#include <openssl/x509.h>
#include <openssl/safestack.h>
THIRD_PARTY_INCLUDES_END
#undef UI

#pragma comment (lib, "crypt32.lib")
#pragma comment (lib, "cryptui.lib")

#define MY_ENCODING_TYPE  (PKCS_7_ASN_ENCODING | X509_ASN_ENCODING)
#endif

#define MAX_PAYLOAD	64*1024

extern TSharedPtr<UWebSocketContext> s_websocketCtx;

#if PLATFORM_UWP
#elif PLATFORM_HTML5
#else
static struct lws_protocols protocols[] = {
	/* first protocol must always be HTTP handler */

	{
		"",		/* name - can be overridden with -e */
		UWebSocketContext::callback_echo,
		0,
		MAX_PAYLOAD,
	},
	{
		NULL, NULL, 0		/* End of list */
	}
};

static const struct lws_extension exts[] = {
	{
		"permessage-deflate",
		lws_extension_callback_pm_deflate,
		"permessage-deflate; client_no_context_takeover"
	},
	{
		"deflate-frame",
		lws_extension_callback_pm_deflate,
		"deflate_frame"
	},
	{ NULL, NULL, NULL /* terminator */ }
};
#endif

void UWebSocketContext::BeginDestroy()
{
	Super::BeginDestroy();
	s_websocketCtx.Reset();
}

#if PLATFORM_UWP
#elif PLATFORM_HTML5
#else
int UWebSocketContext::callback_echo(struct lws *wsi, enum lws_callback_reasons reason, void *user, void *in, size_t len)
{
	void* pUser = lws_wsi_user(wsi);
	UWebSocketBase* pWebSocketBase = (UWebSocketBase*)pUser;

	switch (reason)
	{
	case LWS_CALLBACK_CLOSED:
		if (!pWebSocketBase) return -1;
		pWebSocketBase->Cleanlws();
		pWebSocketBase->OnClosed.Broadcast();
		break;

	case LWS_CALLBACK_CLIENT_CONNECTION_ERROR:
	{
		if (!pWebSocketBase) return -1;
		FString strError = UTF8_TO_TCHAR(in);
		UE_LOG(WebSocket, Error, TEXT("libwebsocket connect error:%s"), *strError);
		pWebSocketBase->Cleanlws();
		pWebSocketBase->OnConnectError.Broadcast(strError);
	}
		break;

	case LWS_CALLBACK_CLIENT_ESTABLISHED:
		if (!pWebSocketBase) return -1;
		pWebSocketBase->OnConnectComplete.Broadcast();
		break;

	case LWS_CALLBACK_CLIENT_APPEND_HANDSHAKE_HEADER:
	{
		if (!pWebSocketBase) return -1;

		unsigned char **p = (unsigned char **)in, *end = (*p) + len;
		if (!pWebSocketBase->ProcessHeader(p, end))
		{
			return -1;
		}
	}
		break;

	case LWS_CALLBACK_CLIENT_RECEIVE:
		if (!pWebSocketBase) return -1;
		pWebSocketBase->ProcessRead((const char*)in, (int)len);
		break;

	case LWS_CALLBACK_CLIENT_WRITEABLE:
		if (!pWebSocketBase) return -1;
		pWebSocketBase->ProcessWriteable();
		break;

#ifdef LOAD_ROOT_CERTIFICATES_FROM_WIN32_STORE
	case LWS_CALLBACK_OPENSSL_PERFORM_SERVER_CERT_VERIFICATION:
		{
			X509_STORE_CTX* ssl = (X509_STORE_CTX*)user;

			HCERTSTORE hStore;
			PCCERT_CONTEXT pContext = nullptr;
			X509 *x509;
			X509_STORE *store = X509_STORE_new();

			hStore = CertOpenSystemStore(NULL, L"ROOT");
			if (!hStore)
			{
				return 1;
			}
			
			int loadCount = 0;
			pContext = CertEnumCertificatesInStore(hStore, pContext);
			while (pContext != nullptr)
			{
				const unsigned char *encoded_cert = pContext->pbCertEncoded;
				x509 = nullptr;
				x509 = d2i_X509(nullptr, &encoded_cert, pContext->cbCertEncoded);
				if (x509)
				{
					int i = X509_STORE_add_cert(store, x509);
					if (i == 1)
					{
						loadCount++;
					}
					X509_free(x509);
				}
				pContext = CertEnumCertificatesInStore(hStore, pContext);
			}

			CertFreeCertificateContext(pContext);
			CertCloseStore(hStore, 0);

			UE_LOG(WebSocket, Log, TEXT("openssl store: loaded %i certificates from Windows root store"), loadCount);

			// Now re-create the validation context using the store based on the Windows root store.
			X509_STORE_CTX* new_ctx = X509_STORE_CTX_new();
			STACK_OF(X509)* chain = sk_X509_dup(ssl->chain);
			X509_STORE_CTX_init(new_ctx, store, ssl->cert, chain);

			X509_verify_cert(new_ctx);
			int ssl_error = X509_STORE_CTX_get_error(new_ctx);
			X509_STORE_CTX_set_error(ssl, ssl_error);
			if (ssl_error != X509_V_OK)
			{
				FString ErrorStr = FString(X509_verify_cert_error_string(ssl_error));
				UE_LOG(WebSocket, Error, TEXT("openssl verify failure: %s"), *ErrorStr);
			}
			X509_STORE_CTX_cleanup(new_ctx);
			X509_STORE_CTX_free(new_ctx);
			X509_STORE_free(store);

			return 0;
		}

		UE_LOG(WebSocket, Log, TEXT("loaded certificates from Windows trust store to X509 store"));
		break;
#endif

	default:
		break;
	}

	return 0;
}
#endif

UWebSocketContext::UWebSocketContext()
{
#if PLATFORM_UWP
#elif PLATFORM_HTML5
#else
	mlwsContext = nullptr;
#endif
}

void UWebSocketContext::CreateCtx()
{
#if PLATFORM_UWP
#elif PLATFORM_HTML5
#else
	struct lws_context_creation_info info;
	memset(&info, 0, sizeof info);

	info.protocols = protocols;
	info.ssl_cert_filepath = NULL;
	info.ssl_private_key_filepath = NULL;

	info.port = -1;
	info.gid = -1;
	info.uid = -1;
	info.extensions = exts;
	info.options = LWS_SERVER_OPTION_VALIDATE_UTF8;
	info.options |= LWS_SERVER_OPTION_DO_SSL_GLOBAL_INIT;

	mlwsContext = lws_create_context(&info);
	if (mlwsContext == nullptr)
	{
		//UE_LOG(WebSocket, Error, TEXT("libwebsocket Init fail"));
	}
#endif
}

void UWebSocketContext::Tick(float DeltaTime)
{
#if PLATFORM_UWP
#elif PLATFORM_HTML5
#else
	if (mlwsContext != nullptr)
	{
		lws_callback_on_writable_all_protocol(mlwsContext, &protocols[0]);
		lws_service(mlwsContext, 0);
	}
#endif
}

bool UWebSocketContext::IsTickable() const
{
	return true;
}

TStatId UWebSocketContext::GetStatId() const
{
	return TStatId();
}

UWebSocketBase* UWebSocketContext::Connect(const FString& uri, const TMap<FString, FString>& header)
{
#if PLATFORM_UWP
#elif PLATFORM_HTML5
#else
	if (mlwsContext == nullptr)
	{
		return nullptr;
	}
#endif

	UWebSocketBase* pNewSocketBase = NewObject<UWebSocketBase>();

#if PLATFORM_UWP
#elif PLATFORM_HTML5
#else
	pNewSocketBase->mlwsContext = mlwsContext;
#endif

	pNewSocketBase->Connect(uri, header);

	return pNewSocketBase;
}

UWebSocketBase* UWebSocketContext::Connect(const FString& uri)
{
	return Connect(uri, TMap<FString, FString>() );
}
