if(MSVC)
else()
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++11")
endif()

add_executable(cctest main.cpp)

target_link_libraries(cctest LINK_PUBLIC cchost)

configure_file(${CMAKE_CURRENT_SOURCE_DIR}/../steam/win32/steam_api.dll ${CMAKE_CURRENT_BINARY_DIR}/steam_api.dll COPYONLY)
configure_file(${CMAKE_CURRENT_SOURCE_DIR}/../steam/win64/steam_api64.dll ${CMAKE_CURRENT_BINARY_DIR}/steam_api64.dll COPYONLY)
configure_file(${CMAKE_CURRENT_SOURCE_DIR}/../steam/osx/libsteam_api.dylib ${CMAKE_CURRENT_BINARY_DIR}/libsteam_api.dylib COPYONLY)
configure_file(${CMAKE_CURRENT_SOURCE_DIR}/../steam/steam_appid.txt ${CMAKE_CURRENT_BINARY_DIR}/steam_appid.txt COPYONLY)