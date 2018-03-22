#include "module.h"
#include <chrono>
#include <map>
#include <functional>

#include "../../jsutil.h"

enum async_status {
	AS_PENDING,
	AS_RESOLVED,
	AS_REJECTED
};

long next_async_id = 10000;

struct async_t {
	long id;
	async_status status;
	const char* result;
	int32_t code;
};

std::map<std::string, std::string>* api_hotpatches = nullptr;
std::map<long, struct async_t*>* pending_functions = nullptr;

void js_register_api_hotpatch(js_State* J)
{
	auto id = js_tostring(J, 1);
	if (js_iscallable(J, 2)) 
	{
		js_copy(J, 2);
		auto handler = js_ref(J);

		if (id != nullptr && handler != nullptr && api_hotpatches != nullptr)
		{
			(*api_hotpatches)[id] = handler;
			js_pushboolean(J, true);
		}
		else
		{
			js_pushboolean(J, false);
		}
	}
	else
	{
		js_pushboolean(J, false);
	}
}

void js_load_hotpatching(js_State* J)
{
	api_hotpatches = new std::map<std::string, std::string>();
	pending_functions = new std::map<long, struct async_t*>();

	js_newobject(J);
	js_newcfunction(J, js_register_api_hotpatch, "registerApiHotpatch", 1);
	js_setproperty(J, -2, "registerApiHotpatch");

	// new module object is now on stack.
}

bool js_post_tick_hotpatching(js_State* J)
{
	if (pending_functions == nullptr)
	{
		return false;
	}

	return pending_functions->size() > 0;
}

bool js_is_api_hotpatched(const char* api_raw, const char* operation_raw)
{
	if (api_hotpatches != nullptr)
	{
		std::string api(api_raw);
		std::string operation(operation_raw);

		auto id = api + ":" + operation;

		return api_hotpatches->find(id) != api_hotpatches->end();
	}

	return false;
}

const char* generate_hivemp_error(const char* str)
{
	js_newobject(_js);
	js_pushnumber(_js, 7001);
	js_setproperty(_js, -2, "code");
	js_pushstring(_js, str);
	js_setproperty(_js, -2, "message");
	js_pushnull(_js);
	js_setproperty(_js, -2, "fields");
	js_newobject(_js);
	js_setproperty(_js, -2, "data");

	return serialize_json(_js, -1, "{"
		"\"code\": 7001,"
		"\"message\": \"Unable to serialize error object from Client Connect\","
		"\"fields\": null,"
		"\"data\": {}"
		"}");
}

const char* generate_hivemp_error_from_js_error()
{
	js_getproperty(_js, -1, "message");
	auto message = js_tostring(_js, -1);
	js_getproperty(_js, -2, "stackTrace");
	auto stackTrace = js_tostring(_js, -1);

	js_newobject(_js);
	js_pushnumber(_js, 7001);
	js_setproperty(_js, -2, "code");
	js_pushstring(_js, message);
	js_setproperty(_js, -2, "message");
	js_pushnull(_js);
	js_setproperty(_js, -2, "fields");
	js_newobject(_js);
	js_pushstring(_js, message);
	js_setproperty(_js, -2, "internalExceptionMessage");
	js_pushstring(_js, stackTrace);
	js_setproperty(_js, -2, "internalExceptionStackTrace");
	js_setproperty(_js, -2, "data");

	auto result = serialize_json(_js, -1, "{"
		"\"code\": 7001,"
		"\"message\": \"Unable to serialize error object from Client Connect\","
		"\"fields\": null,"
		"\"data\": {}"
		"}");

	js_pop(_js, 2);

	return result;
}

void js_handle_resolve(js_State* J)
{
	auto allocated_id = js_tonumber(J, 1);

	if (pending_functions != nullptr)
	{
		if (pending_functions->find(allocated_id) != pending_functions->end())
		{
			auto async_func_resolved = (*pending_functions)[allocated_id];

			if (js_hasproperty_nopush(_js, -1, "code") &&
				js_hasproperty_nopush(_js, -1, "response"))
			{
				js_getproperty(_js, -1, "code");
				js_getproperty(_js, -2, "response");

				async_func_resolved->code = js_tonumber(_js, -2);
				async_func_resolved->result = serialize_json(_js, -1, "{}");
				async_func_resolved->status = AS_RESOLVED;
				js_pop(_js, 3);
			}
			else
			{
				async_func_resolved->code = 500;
				async_func_resolved->result = generate_hivemp_error("Resolved value from hotpatch promise was not a response object");
				async_func_resolved->status = AS_REJECTED;
				js_pop(_js, 1);
			}
		}
	}
}

void js_handle_reject(js_State* J)
{
	auto allocated_id = js_tonumber(J, 1);

	if (pending_functions != nullptr)
	{
		if (pending_functions->find(allocated_id) != pending_functions->end())
		{
			auto async_func_resolved = (*pending_functions)[allocated_id];

			async_func_resolved->status = AS_REJECTED;
			async_func_resolved->code = 500;
			async_func_resolved->result = generate_hivemp_error_from_js_error();
			js_pop(_js, 1);
		}
	}
}

void js_create_bound_function_with_allocated_id(js_State* J, js_CFunction func, int allocated_id)
{
	// Push a new object on the stack which we'll use to temporarily
	// store our generated function.
	js_newobject(J);

	// Load a string to execute in the context of a new object, which will
	// define a binder function that we'll use to create bound C function
	// callbacks.
	js_loadstring(J, "[string]", R"SCRIPT(
this.binder = function binder(callback, allocated_id) {
	return function bound(data_or_error) {
		return callback(allocated_id, data_or_error);
	}
}
)SCRIPT");

	// Copy the new object into the "this" place for the upcoming
	// function call.
	js_copy(J, -2);

	// Execute the loaded string in the context of the new object. After
	// this, the new object should have a "binder" property available.
	if (js_pcall(J, 0) != 0)
	{
		js_debug_error_dump(J);
		js_pushundefined(J);
		return;
	}
	
	// Pop the return value of this function (although this might be
	// the binder function, we want to be sure that we're getting
	// the right value, so we'll use getproperty instead).
	js_pop(J, 1);

	// Get the binder function.
	js_getproperty(J, -1, "binder");

	// Remove the new temporary object we created from the stack,
	// as we no longer need it.
	js_remove(J, -2);

	// The function generator is now on the stack.
	js_pushglobal(J);
	js_newcfunction(J, func, "bound_callback", 2);
	js_pushnumber(J, allocated_id);
	if (js_pcall(J, 2) != 0)
	{
		js_debug_error_dump(J);
		js_pushundefined(J);
		return;
	}

	// Now our real callback to be passed into 'then' or
	// 'catch' is on top of the stack.
}

long js_call_api_hotpatch(
	const char* api_raw,
	const char* operation_raw,
	const char* endpoint_raw,
	const char* apiKey_raw,
	const char* parametersAsJson_raw)
{
	if (api_hotpatches == nullptr)
	{
		// Api hotpatches not loaded, can't return directly but instead
		// provide a handle that will result in an error message to that
		// effect.
		return -1;
	}

	auto allocated_id = next_async_id++;

	auto async_func = new struct async_t();
	async_func->id = allocated_id;
	async_func->status = AS_PENDING;
	async_func->result = nullptr;
	async_func->code = 500;

	pending_functions->insert_or_assign(allocated_id, async_func);

	if (!js_is_api_hotpatched(api_raw, operation_raw))
	{
		async_func->status = AS_REJECTED;
		async_func->result = generate_hivemp_error("Request is not hotpatched, make a direct call to the servers instead");
		async_func->code = 400;

		return allocated_id;
	}

	std::string api(api_raw);
	std::string operation(operation_raw);
	auto id = api + ":" + operation;
	auto js_ref_name = (*api_hotpatches)[id];

	// Load the hotpatching callback.
	js_getregistry(_js, js_ref_name.c_str());

	// If the hotpatching value is undefined, return an error.
	if (js_isundefined(_js, -1))
	{
		js_pop(_js, 1);

		async_func->status = AS_REJECTED;
		async_func->result = generate_hivemp_error("Request hotpatching callback is undefined");
		async_func->code = 500;

		return allocated_id;
	}

	// Otherwise, load the global state for "this".
	js_pushglobal(_js);

	// Build up the request object, parsing the JSON parameters into
	// a JavaScript object.
	js_newobject(_js);
	js_pushstring(_js, id.c_str());
	js_setproperty(_js, -2, "id");
	js_pushstring(_js, endpoint_raw);
	js_setproperty(_js, -2, "endpoint");
	js_pushstring(_js, operation_raw);
	js_setproperty(_js, -2, "operation");
	js_pushstring(_js, apiKey_raw);
	js_setproperty(_js, -2, "apiKey");
	js_getglobal(_js, "JSON");
	js_getproperty(_js, -1, "parse");
	js_remove(_js, -2);
	js_pushglobal(_js);
	js_pushstring(_js, parametersAsJson_raw);

	// Do the JSON parse for parameters.
	if (js_pcall(_js, 1) != 0)
	{
		async_func->status = AS_REJECTED;
		async_func->code = 500;
		async_func->result = generate_hivemp_error_from_js_error();
		js_pop(_js, 1);

		return allocated_id;
	}
	else
	{
		js_setproperty(_js, -2, "parameters");
	}

	// Now invoke the hotpatch method, with the request object
	// currently on top of the stack.
	if (js_pcall(_js, 1) != 0)
	{
		async_func->status = AS_REJECTED;
		async_func->code = 500;
		async_func->result = generate_hivemp_error_from_js_error();
		js_pop(_js, 1);

		return allocated_id;
	}

	// If the result isn't an object (both promises and response
	// objects are objects), then the hotpatch isn't returning
	// something we can use.
	if (!js_isobject(_js, -1))
	{
		async_func->status = AS_REJECTED;
		async_func->code = 500;
		async_func->result = generate_hivemp_error("Hotpatch result wasn't an object");
		js_pop(_js, 1);

		return allocated_id;
	}

	// If the result is directly a response object, mark the function as resolved now.
	if (js_hasproperty_nopush(_js, -1, "code") &&
		js_hasproperty_nopush(_js, -1, "response"))
	{
		js_getproperty(_js, -1, "code");
		js_getproperty(_js, -2, "response");

		async_func->code = js_tonumber(_js, -2);
		async_func->result = serialize_json(_js, -1, "{}");
		async_func->status = AS_RESOLVED;
		js_pop(_js, 3);

		return allocated_id;
	}
	
	// If the result is a promise-like object, use 'then' and 'catch' to update
	// the async state when it's complete.
	if (js_hasproperty_nopush(_js, -1, "then") &&
		js_hasproperty_nopush(_js, -1, "catch"))
	{
		// Register our 'then' callback as a C function.
		js_getproperty(_js, -1, "then");
		js_copy(_js, -2);
		js_create_bound_function_with_allocated_id(_js, js_handle_resolve, allocated_id);
		if (js_pcall(_js, 1) != 0)
		{
			// Encountered an error while registering the 'then' callback.
			async_func->status = AS_REJECTED;
			async_func->code = 500;
			async_func->result = generate_hivemp_error_from_js_error();
			js_pop(_js, 1);

			return allocated_id;
		}

		// Pop result from 'then'.
		js_pop(_js, 1);

		// Register our 'catch' callback as a C function.
		js_getproperty(_js, -1, "catch");
		js_copy(_js, -2);
		js_create_bound_function_with_allocated_id(_js, js_handle_reject, allocated_id);
		if (js_pcall(_js, 1) != 0)
		{
			// Encountered an error while registering the 'catch' callback.
			async_func->status = AS_REJECTED;
			async_func->code = 500;
			async_func->result = generate_hivemp_error_from_js_error();
			js_pop(_js, 1);

			return allocated_id;
		}

		// Pop result from 'catch'.
		js_pop(_js, 1);

		// Pop the promise object.
		js_pop(_js, 1);

		return allocated_id;
	}

	// The object wasn't a response object or promise-like, reject the result.
	async_func->status = AS_REJECTED;
	async_func->code = 500;
	async_func->result = generate_hivemp_error("Hotpatch result wasn't a promise or response object");
	js_pop(_js, 1);

	return allocated_id;
}

bool js_is_api_hotpatch_call_ready(long id)
{
	if (pending_functions == nullptr)
	{
		return id == -1;
	}

	if (pending_functions->find(id) != pending_functions->end())
	{
		auto async_func = (*pending_functions)[id];

		return async_func->status == AS_RESOLVED || async_func->status == AS_REJECTED;
	}
	else
	{
		return false;
	}
}

const char* js_get_api_hotpatch_result(long id)
{
	if (pending_functions == nullptr)
	{
		return "{"
				"\"code\": 7001,"
				"\"message\": \"Hotpatching system not loaded for Client Connect\","
				"\"fields\": null"
			"}";
	}

	if (pending_functions->find(id) != pending_functions->end())
	{
		auto async_func = (*pending_functions)[id];

		return async_func->result;
	}
	else
	{
		return "{"
			"\"code\": 7001,"
			"\"message\": \"No such pending API hotpatch call in progress\","
			"\"fields\": null"
			"}";
	}
}

int32_t js_get_api_hotpatch_status_code(long id)
{
	if (pending_functions == nullptr)
	{
		return 400;
	}

	if (pending_functions->find(id) != pending_functions->end())
	{
		auto async_func = (*pending_functions)[id];

		return async_func->code;
	}
	else
	{
		return 400;
	}
}

void js_release_api_hotpatch_result(long id)
{
	if (pending_functions == nullptr)
	{
		return;
	}

	if (pending_functions->find(id) != pending_functions->end())
	{
		auto async_func = (*pending_functions)[id];

		if (async_func->status != AS_RESOLVED && async_func->status != AS_REJECTED)
		{
			// Api call is not resolved or rejected yet, so we might still have
			// pending callbacks sitting around in the JavaScript engine and we don't
			// want to free the lambdas until the call is complete.
			return;
		}

		if (async_func->result != nullptr)
		{
			free((void*)(async_func->result));
		}

		delete async_func;
		pending_functions->erase(id);
	}
}