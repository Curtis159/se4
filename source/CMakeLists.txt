cmake_minimum_required(VERSION 3.25)
project(OpenSE4Browser LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(TOMLPLUSPLUS_DIR "${CMAKE_CURRENT_SOURCE_DIR}/third_party/tomlplusplus-3.4.0" CACHE PATH "tomlplusplus 3.4.0 source directory")
set(SE4_DATA_DIR "" CACHE PATH "Private extracted original install")
if(NOT EXISTS "${TOMLPLUSPLUS_DIR}/include/toml++/toml.hpp")
 message(FATAL_ERROR "Set TOMLPLUSPLUS_DIR to tomlplusplus 3.4.0")
endif()
# Use the entire authoritative upstream opense4_game source list, including
# initialization, AI, combat, both turn styles, and serialization. No engine stubs.
file(READ "${CMAKE_CURRENT_SOURCE_DIR}/upstream/src/CMakeLists.txt" upstream_cmake)
string(REGEX MATCH "add_library\\(opense4_game STATIC([^)]*)\\)" game_block "${upstream_cmake}")
set(game_text "${CMAKE_MATCH_1}")
separate_arguments(game_sources UNIX_COMMAND "${game_text}")
list(TRANSFORM game_sources PREPEND "upstream/src/")
file(GLOB core_sources CONFIGURE_DEPENDS upstream/src/core/*.cpp)
file(GLOB rules_sources CONFIGURE_DEPENDS upstream/src/ruleset/*.cpp upstream/src/datafile/*.cpp)
# Embedded assets belong to the desktop client. The engine needs these three core files.
set(core_sources upstream/src/core/environment.cpp upstream/src/core/log.cpp upstream/src/core/user_folder.cpp)
add_library(engine STATIC ${game_sources} ${rules_sources} ${core_sources}
 upstream/src/script/json.cpp upstream/src/script/value.cpp
 upstream/src/client/classic/screens/setup_model.cpp
 upstream/src/client/classic/screens/colony_logic.cpp
 upstream/src/client/classic/sector_view.cpp
 upstream/src/client/classic/map_style.cpp
 upstream/src/client/classic/replay.cpp
 upstream/src/client/classic/screens/empire_logic.cpp
 upstream/src/sdk/codec.cpp upstream/src/sdk/names.cpp)
target_include_directories(engine PUBLIC upstream/src "${TOMLPLUSPLUS_DIR}/include")
target_compile_definitions(engine PUBLIC TOML_FLOAT_CHARCONV=0)
target_compile_options(engine PUBLIC -ffp-contract=off)
file(GLOB learn_sources CONFIGURE_DEPENDS upstream/src/learn/*.cpp)
target_sources(engine PRIVATE ${learn_sources})
file(COPY upstream/assets/learn/ DESTINATION "${CMAKE_CURRENT_SOURCE_DIR}/private/se4/Learn")
file(COPY browser-learning/ DESTINATION "${CMAKE_CURRENT_SOURCE_DIR}/private/se4/Learn")
add_executable(opense4 wasm/bridge.cpp wasm/view.cpp)
target_link_libraries(opense4 PRIVATE engine)
# The headless target needs real Quick Start generation, but not the desktop
# setup menus that require the unlinked mod/Python SDK.
set_source_files_properties(upstream/src/client/classic/screens/setup_model.cpp
 PROPERTIES COMPILE_DEFINITIONS OPENSE4_HEADLESS_QUICK_START_ONLY)
set_source_files_properties(upstream/src/client/classic/screens/colony_logic.cpp
 PROPERTIES COMPILE_DEFINITIONS OPENSE4_HEADLESS_COLONIZATION_ONLY)
if(EMSCRIPTEN)
 # Browser debug builds still need optimized C++: template call chains at -O0
 # can exhaust the browser worker's native call stack during Hegemon queries.
 # Keep deterministic arithmetic flags; native parity tests guard game results.
 target_compile_options(engine PUBLIC -fexceptions -O1)
 set_target_properties(opense4 PROPERTIES SUFFIX ".mjs" RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/web/engine")
 target_link_options(opense4 PRIVATE
  -O1 -g0 -fexceptions --no-entry -sMODULARIZE=1 -sEXPORT_NAME=createOpenSE4
  -sENVIRONMENT=web,worker,node -sALLOW_MEMORY_GROWTH=1 -sINITIAL_MEMORY=67108864
  -sSTACK_SIZE=8388608 -sMAXIMUM_MEMORY=2147483648
  "-sEXPORTED_FUNCTIONS=['_se4_call','_malloc','_free']"
  "-sEXPORTED_RUNTIME_METHODS=['ccall','FS']")
 if(NOT EXISTS "${SE4_DATA_DIR}/Data/Settings.txt")
  message(FATAL_ERROR "Set SE4_DATA_DIR to original install (Data/Settings.txt required)")
 endif()
 target_link_options(opense4 PRIVATE "--preload-file" "${SE4_DATA_DIR}@/se4")
endif()

option(OPENSE4_ENABLE_HEGEMON "Compile original MicroPython and Hegemon SDK" OFF)
if(OPENSE4_ENABLE_HEGEMON)
 include(cmake/Hegemon.cmake)
endif()

if(NOT EMSCRIPTEN)
 add_executable(browser_view_tests tests/browser-view.cpp wasm/view.cpp)
 target_include_directories(browser_view_tests PRIVATE wasm)
 target_link_libraries(browser_view_tests PRIVATE engine)
 add_executable(browser_team_tests tests/team-rules.cpp)
 target_link_libraries(browser_team_tests PRIVATE engine)
 add_executable(browser_production_tests tests/production-rules.cpp)
 target_link_libraries(browser_production_tests PRIVATE engine)
endif()

option(OPENSE4_BUILD_AI_AUDIT "Build offline AI audit harness (not shipped to browsers)" OFF)
if(OPENSE4_BUILD_AI_AUDIT)
 add_executable(ai_audit tests/ai-audit.cpp)
 target_link_libraries(ai_audit PRIVATE engine)
 if(OPENSE4_ENABLE_HEGEMON)
  target_compile_definitions(ai_audit PRIVATE OPENSE4_ENABLE_HEGEMON)
 endif()
 if(EMSCRIPTEN)
  set_target_properties(ai_audit PROPERTIES SUFFIX ".mjs" RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/audit")
  target_compile_options(ai_audit PRIVATE -O1 -fexceptions)
  target_link_options(ai_audit PRIVATE -O2 -g0 -fexceptions --no-entry -sMODULARIZE=1 -sEXPORT_NAME=createAudit -sENVIRONMENT=node -sALLOW_MEMORY_GROWTH=1 -sINITIAL_MEMORY=67108864 -sSTACK_SIZE=8388608 -sMAXIMUM_MEMORY=2147483648 -sSUPPORT_LONGJMP=emscripten -sASYNCIFY=1 -sASYNCIFY_STACK_SIZE=1048576 "-sEXPORTED_FUNCTIONS=['_se4_audit','_malloc','_free']" "-sEXPORTED_RUNTIME_METHODS=['ccall']" "--preload-file" "${SE4_DATA_DIR}@/se4")
 endif()
endif()
