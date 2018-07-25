cmake_minimum_required(VERSION 3.8)
project(client_connect)

# This should hopefully also set for curl
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

execute_process(COMMAND pwsh ${CMAKE_CURRENT_SOURCE_DIR}/patch.ps1)

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
option(CURL_STATICLIB "" ON)
option(CURL_STATIC_CRT "" OFF)
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

# Include Steam directories
link_directories(
  ${CMAKE_CURRENT_SOURCE_DIR}/steam/linux32/
  ${CMAKE_CURRENT_SOURCE_DIR}/steam/linux64/
  ${CMAKE_CURRENT_SOURCE_DIR}/steam/osx/
  ${CMAKE_CURRENT_SOURCE_DIR}/steam/win32/
  ${CMAKE_CURRENT_SOURCE_DIR}/steam/win64/
)

# Set up macros for logging
function(define_file_basename_for_sources targetname)
    get_target_property(source_files "${targetname}" SOURCES)
    foreach(sourcefile ${source_files})
        # Get source file's current list of compile definitions.
        get_property(defs SOURCE "${sourcefile}"
            PROPERTY COMPILE_DEFINITIONS)
        # Add the FILE_BASENAME=filename compile definition to the list.
        get_filename_component(absname "${sourcefile}" ABSOLUTE)
        file(RELATIVE_PATH
            basename # Output variable
            ${CMAKE_SOURCE_DIR} # Base directory
            ${absname} # Absolute path to the file
        )
        list(APPEND defs "FILE_BASENAME=\"${basename}\"")
        # Set the updated compile definitions on the source file.
        set_property(
            SOURCE "${sourcefile}"
            PROPERTY COMPILE_DEFINITIONS ${defs})
    endforeach()
endfunction()

add_subdirectory(cchost)
add_subdirectory(cctest)