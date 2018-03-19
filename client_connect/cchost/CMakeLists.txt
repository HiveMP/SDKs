file(GLOB mujs_files ${CMAKE_CURRENT_SOURCE_DIR}/../mujs/one.c)
file(GLOB polyfill_files ${CMAKE_CURRENT_SOURCE_DIR}/../polyfill/*.c)
file(GLOB_RECURSE ccsrc_files ${CMAKE_CURRENT_SOURCE_DIR}/../ccsrc/src/*.ts)

include_directories(SYSTEM ${CMAKE_CURRENT_SOURCE_DIR}/../mujs)
include_directories(SYSTEM ${CMAKE_CURRENT_SOURCE_DIR}/../polyfill)
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

if(MSVC)
  # Force to always compile with W4
  if(CMAKE_CXX_FLAGS MATCHES "/W[0-4]")
    string(REGEX REPLACE "/W[0-4]" "/Wall" CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS}")
  else()
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} /Wall")
	endif()
endif()

add_library(
	cchost SHARED
	${mujs_files}
	${polyfill_files}
	connect.cpp
	connect.impl.cpp
	embed.cpp)

target_include_directories(cchost PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
target_link_libraries(cchost libcurl)