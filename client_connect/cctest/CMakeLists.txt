if(MSVC)
else()
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++11")
endif()

add_executable(cctest main.cpp)

target_link_libraries(cctest LINK_PUBLIC cchost)

configure_file(${CMAKE_CURRENT_SOURCE_DIR}/../steam/linux32/libsteam_api.so ${CMAKE_BINARY_DIR}/linux32/libsteam_api.so COPYONLY)
configure_file(${CMAKE_CURRENT_SOURCE_DIR}/../steam/linux64/libsteam_api.so ${CMAKE_BINARY_DIR}/linux64/libsteam_api.so COPYONLY)
configure_file(${CMAKE_CURRENT_SOURCE_DIR}/../steam/osx32/libsteam_api.dylib ${CMAKE_BINARY_DIR}/osx32/libsteam_api.dylib COPYONLY)
configure_file(${CMAKE_CURRENT_SOURCE_DIR}/../steam/steam_api.dll ${CMAKE_BINARY_DIR}/steam_api.dll COPYONLY)
configure_file(${CMAKE_CURRENT_SOURCE_DIR}/../steam/steam_api64.dll ${CMAKE_BINARY_DIR}/steam_api64.dll COPYONLY)
configure_file(${CMAKE_CURRENT_SOURCE_DIR}/../steam/steam_appid.txt ${CMAKE_BINARY_DIR}/steam_appid.txt COPYONLY)