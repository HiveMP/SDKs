file(GLOB mujs_files ${CMAKE_CURRENT_SOURCE_DIR}/../mujs/one.c)
file(GLOB polyfill_files ${CMAKE_CURRENT_SOURCE_DIR}/../polyfill/*.c)
file(GLOB luacurl_files ${CMAKE_CURRENT_SOURCE_DIR}/../lua-curl/*.c)
file(GLOB luashim_files ${CMAKE_CURRENT_SOURCE_DIR}/../lua-shim/*.c)
file(GLOB_RECURSE ccsrc_files ${CMAKE_CURRENT_SOURCE_DIR}/../ccsrc/src/*.ts)

include_directories(SYSTEM ${CMAKE_CURRENT_SOURCE_DIR}/../mujs)
include_directories(SYSTEM ${CMAKE_CURRENT_SOURCE_DIR}/../polyfill)
include_directories(SYSTEM ${CMAKE_CURRENT_SOURCE_DIR}/../lua-curl)
include_directories(SYSTEM ${CMAKE_CURRENT_SOURCE_DIR}/../lua-shim)
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/../curl/include)

add_custom_command(
	OUTPUT ${CMAKE_CURRENT_SOURCE_DIR}/embed.cpp
	DEPENDS 
			${ccsrc_files} 
			${CMAKE_CURRENT_SOURCE_DIR}/embed.ps1 
			${CMAKE_CURRENT_SOURCE_DIR}/../ccsrc/webpack.config.ts 
			${CMAKE_CURRENT_SOURCE_DIR}/../ccsrc/package.json
	COMMAND pwsh ARGS ${CMAKE_CURRENT_SOURCE_DIR}/embed.ps1
	WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
)

add_library(
	cchost SHARED
	${mujs_files}
	${polyfill_files}
	${luacurl_files}
	${luashim_files}
	connect.cpp
	connect.impl.cpp
	embed.cpp)

target_include_directories(cchost PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
target_link_libraries(cchost libcurl)