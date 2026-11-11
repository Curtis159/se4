#pragma once
#include "game/state.hpp"
#include <algorithm>
#include <string>
namespace opense4::game {
inline constexpr const char* kYardIdlePrefix="opense4.browser.yard-idle.";
inline std::string yardIdleKey(int lane){return std::string(kYardIdlePrefix)+std::to_string(lane);}
template<class Builder> bool yardIdle(const Builder& builder,int lane=0){const auto key=yardIdleKey(lane);return std::any_of(builder.modData.begin(),builder.modData.end(),[&](const auto& d){return d.mod==key&&d.value=="true";});}
template<class Builder> void setYardIdle(Builder& builder,int lane,bool idle){const auto key=yardIdleKey(lane);std::erase_if(builder.modData,[&](const auto& d){return d.mod==key;});if(idle)builder.modData.push_back({key,"true"});}
}
