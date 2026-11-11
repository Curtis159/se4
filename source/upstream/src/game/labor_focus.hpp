#pragma once
// Persistent colony production assignment, using the existing serialized mod-data slot.
#include "game/rules.hpp"
#include "game/abilities.hpp"
#include <algorithm>
namespace opense4::game {
inline constexpr const char* kLaborFocusKey="opense4.browser.labor-focus";
inline int laborFocus(const Colony& c){for(const auto& data:c.modData)if(data.mod==kLaborFocusKey&&data.value.size()==1&&data.value[0]>='1'&&data.value[0]<='5')return data.value[0]-'0';return 0;}
inline void setLaborFocus(Colony& c,int focus){std::erase_if(c.modData,[](const auto& data){return data.mod==kLaborFocusKey;});if(focus>0)c.modData.push_back({kLaborFocusKey,std::to_string(focus)});}
inline bool laborFocusEligible(const Rules& r,const GameState& s,const Colony& c,int focus){if(focus<1||focus>5)return false;if(focus<4)return true;if(focus==5&&!s.options.allowIntel)return false;const auto kind=focus==4?AbilityKind::PointGenResearch:AbilityKind::PointGenIntelligence;for(uint32_t i=0;i<r.data().facilities.size();++i)if(r.facilityAvailable(s.empire(c.owner),i)&&hasAbility(r.facilityAbilities(i),kind))return true;return false;}
inline int activeLaborFocus(const Rules& r,const GameState& s,const Colony& c){const int focus=laborFocus(c);return c.queue.items.empty()&&laborFocusEligible(r,s,c,focus)?focus:0;}
}
