file(GLOB mujs_files
    "../mujs/*.c"
)

include_directories(SYSTEM ../mujs)
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/../curl/include)

add_custom_command(
	OUTPUT ${CMAKE_CURRENT_SOURCE_DIR}/../cc_src/dist/bundle.js
	COMMAND ${CMAKE_CURRENT_SOURCE_DIR}/../cc_src/node_modules/.bin/webpack 
	WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/../cc_src
)

add_library(
	HiveMP.ClientConnect SHARED
	${mujs_files}
	connect.cpp
	connect.impl.cpp
	vfiles.cpp)

target_include_directories(HiveMP.ClientConnect PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
target_link_libraries(HiveMP.ClientConnect libcurl)