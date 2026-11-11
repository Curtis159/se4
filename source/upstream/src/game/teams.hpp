#pragma once
// Fixed custom teams; old games retain the original Human-vs-Computer flag.
#include "game/state.hpp"
namespace opense4::game {
inline int teamOf(const GameState& s,EmpireId e){return e.index()<s.options.teamAssignments.size()?s.options.teamAssignments[e.index()]:0;}
inline bool customTeammates(const GameState& s,EmpireId a,EmpireId b){return a!=b&&a.index()<s.empires.size()&&b.index()<s.empires.size()&&teamOf(s,a)>0&&teamOf(s,a)==teamOf(s,b);}
inline bool hasTeams(const GameState& s){return s.options.teamMode||std::any_of(s.options.teamAssignments.begin(),s.options.teamAssignments.end(),[](auto team){return team>0;});}
inline bool sameTeam(const GameState& s,EmpireId a,EmpireId b){if(a==b&&a.index()<s.empires.size())return true;if(!s.options.teamAssignments.empty())return customTeammates(s,a,b);return s.options.teamMode&&a.index()<s.empires.size()&&b.index()<s.empires.size()&&(s.empire(a).kind==PlayerKind::Human)==(s.empire(b).kind==PlayerKind::Human);}
}
