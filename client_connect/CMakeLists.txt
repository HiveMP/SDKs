cmake_minimum_required(VERSION 3.8)
project(HiveMP.ClientConnect)

execute_process(COMMAND pwsh ${CMAKE_CURRENT_SOURCE_DIR}/patch.curl.ps1)

if(MSVC)
  set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR})
  set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR})
else()
  set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
  set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
endif()

# Pretend that we have Perl so that curl will build, but we don't actually need it
set (Perl_FOUND YES)
set (PERL_EXECUTABLE "perl")

# Tweak curl settings
option(HTTP_ONLY "" ON)
option(CURL_STATICLIB "" OFF)
option(ENABLE_MANUAL "" OFF)
SET(BUILD_TESTING OFF CACHE BOOL "Use some expat option")
SET(BUILD_CURL_EXE OFF CACHE BOOL "Use some expat option")

if(WIN32)
  option(CMAKE_USE_WINSSL "" ON)
endif()
if(APPLE)
  option(CMAKE_USE_DARWINSSL "enable Apple OS native SSL/TLS" ON)
  option(CMAKE_USE_OPENSSL "Use OpenSSL code. Experimental" OFF)
  SET(CURL_CA_PATH "none" CACHE STRING "Use some expat option")
endif()

add_subdirectory(curl)
add_subdirectory(cchost)
add_subdirectory(cctest)