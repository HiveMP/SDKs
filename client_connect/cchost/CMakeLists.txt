file(GLOB mujs_files ${CMAKE_CURRENT_SOURCE_DIR}/../mujs/one.c)
file(GLOB polyfill_files ${CMAKE_CURRENT_SOURCE_DIR}/../polyfill/*.c)
file(GLOB ccsrc_files ${CMAKE_CURRENT_SOURCE_DIR}/../ccsrc/src/**)

include_directories(SYSTEM ${CMAKE_CURRENT_SOURCE_DIR}/../mujs)
include_directories(SYSTEM ${CMAKE_CURRENT_SOURCE_DIR}/../polyfill)
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/../curl/include)

add_custom_command(
	OUTPUT ${CMAKE_CURRENT_SOURCE_DIR}/../ccsrc/node_modules
	COMMAND yarn
	WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/../ccsrc
)
add_custom_command(
	OUTPUT ${CMAKE_CURRENT_SOURCE_DIR}/../ccsrc/dist/bundle.js
	DEPENDS 
		${CMAKE_CURRENT_SOURCE_DIR}/../ccsrc/node_modules 
		${ccsrc_files} 
		${CMAKE_CURRENT_SOURCE_DIR}/../ccsrc/webpack.config.ts 
		${CMAKE_CURRENT_SOURCE_DIR}/../ccsrc/package.json
	COMMAND ${CMAKE_CURRENT_SOURCE_DIR}/../ccsrc/node_modules/.bin/webpack 
	WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/../ccsrc
)
add_custom_command(
	OUTPUT ${CMAKE_CURRENT_SOURCE_DIR}/embed.cpp
	DEPENDS ${CMAKE_CURRENT_SOURCE_DIR}/embed.ps1 ${CMAKE_CURRENT_SOURCE_DIR}/../ccsrc/dist/bundle.js
	COMMAND pwsh ARGS ${CMAKE_CURRENT_SOURCE_DIR}/embed.ps1
	WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
)

add_library(
	cchost SHARED
	${mujs_files}
	${polyfill_files}
	connect.cpp
	connect.impl.cpp
	embed.cpp)

target_include_directories(cchost PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
target_link_libraries(cchost libcurl)