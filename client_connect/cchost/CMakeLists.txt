file(GLOB mujs_files ${CMAKE_CURRENT_SOURCE_DIR}/../mujs/one.c)
file(GLOB polyfill_files ${CMAKE_CURRENT_SOURCE_DIR}/../polyfill/*.c)
file(GLOB_RECURSE ccsrc_files ${CMAKE_CURRENT_SOURCE_DIR}/../ccsrc/src/*.ts)

include_directories(${CMAKE_CURRENT_SOURCE_DIR}/../mujs)
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/../polyfill)
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/../curl/include)

add_custom_command(
  OUTPUT ${CMAKE_CURRENT_SOURCE_DIR}/embed.cpp
  DEPENDS 
      ${ccsrc_files} 
      ${CMAKE_CURRENT_SOURCE_DIR}/embed.ps1 
      ${CMAKE_CURRENT_SOURCE_DIR}/../ccsrc/webpack.config.ts 
      ${CMAKE_CURRENT_SOURCE_DIR}/../ccsrc/package.json
      ${CMAKE_CURRENT_SOURCE_DIR}/../../targets/mujs.ts
  COMMAND pwsh ARGS ${CMAKE_CURRENT_SOURCE_DIR}/embed.ps1
  WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
)

if(MSVC)
  # Force to always compile with W4
  if(CMAKE_CXX_FLAGS MATCHES "/W[0-4]")
    string(REGEX REPLACE "/W[0-4]" "/W4" CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS}")
  else()
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} /W4")
  endif()
else()
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++11")
endif()

add_library(
  cchost SHARED
  ${mujs_files}
  ${polyfill_files}
  connect.cpp
  connect.impl.cpp
  embed.cpp
  jsutil.cpp
  module/timers/module.cpp
  module/console/module.cpp
  module/curl-native/module.cpp
  module/hotpatching/module.cpp
  module/process/module.cpp
  module/steam/module.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../log_c/src/log.c)
define_file_basename_for_sources(cchost)

if("${CC_PLATFORM_TARGET}" STREQUAL "Windows")
  message("Detected macOS: Steam will be delay loaded...")
  if(${CMAKE_CXX_COMPILER} MATCHES x64\/cl.exe)
    set(STEAM_LIBRARY_NAME steam_api64 delayimp)
    set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} /delayload:steam_api64.dll")
  else()
    set(STEAM_LIBRARY_NAME steam_api delayimp)
    set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} /delayload:steam_api.dll")
  endif()
elseif("${CC_PLATFORM_TARGET}" STREQUAL "macOS")
  message("Detected macOS: Steam will be lazy loaded...")
  set(STEAM_LIBRARY_NAME steam_api)
  set_target_properties(cchost PROPERTIES LINK_FLAGS "-lazy_library ${CMAKE_CURRENT_SOURCE_DIR}/../steam/osx/libsteam_api.dylib")
elseif("${CC_PLATFORM_TARGET}" STREQUAL "Linux")
  message("Detected Linux: Steam will be strongly linked...")
  set(STEAM_LIBRARY_NAME steam_api)
else()
  message(FATAL_ERROR "CC_PLATFORM_TARGET must be Windows, macOS or Linux")
endif()

add_dependencies(cchost libcurl)
target_include_directories(cchost PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
target_include_directories(cchost PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/../steam/public)
target_include_directories(cchost PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/../log_c/src)
if("${CC_PLATFORM_TARGET}" STREQUAL "macOS")
  target_link_libraries(cchost $<TARGET_OBJECTS:libcurl> ${CURL_LIBS_EXPORTED_2})
else()
  target_link_libraries(cchost $<TARGET_OBJECTS:libcurl> ${CURL_LIBS_EXPORTED_2} ${STEAM_LIBRARY_NAME})
endif()

message("C++ compiler is: ${CMAKE_CXX_COMPILER}")
message("Steam library name is: ${STEAM_LIBRARY_NAME}")

# On Linux, our prebuilt binaries require the presence of the Steam API DLLs. This is
# because unlike Windows and macOS, this platform does not support delay loading of shared libraries. Note
# that while these platforms require the presence of the Steam API DLLs, HiveMP will still degrade
# gracefully if Steam is not running.
if("${CC_PLATFORM_TARGET}" STREQUAL "Linux")
  if("${CMAKE_SIZEOF_VOID_P}" STREQUAL "4")
    configure_file(${CMAKE_CURRENT_SOURCE_DIR}/../steam/linux32/libsteam_api.so ${CMAKE_LIBRARY_OUTPUT_DIRECTORY}/libsteam_api.so COPYONLY)
  else()
    configure_file(${CMAKE_CURRENT_SOURCE_DIR}/../steam/linux64/libsteam_api.so ${CMAKE_LIBRARY_OUTPUT_DIRECTORY}/libsteam_api.so COPYONLY)
  endif()
endif()