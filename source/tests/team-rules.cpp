#include "game/setup.hpp"
#include "game/teams.hpp"
#include "game/turn.hpp"
#include "game/diplomacy.hpp"
#include "game/serialize.hpp"
#include "game/score.hpp"
#include "client/classic/screens/setup_model.hpp"
#include "ruleset/ruleset.hpp"
#include <cassert>
#include <iostream>
using namespace opense4;
int main(int argc,char** argv){assert(argc==2);auto data=ruleset::loadRuleset(std::filesystem::path(argv[1])/"Data");assert(data.ruleset);game::Rules rules(std::move(*data.ruleset),argv[1]);auto settings=client::classic::setup::defaultSettings(rules,12345);settings.computers.enabled=false;settings.neutrals.enabled=false;settings.options.systemCount=12;settings.options.teamAssignments={1,1,2};
 for(const auto& name:{"Terran","Xiati","Eee"}){game::EmpireSetup e;e.preset=name;e.name=name;e.kind=game::PlayerKind::Human;settings.players.push_back(e);}auto setup=client::classic::setup::buildGameSetup(rules,settings);assert(setup);auto created=game::createGame(rules,*setup);assert(created);auto& s=*created;game::EmpireId a{0},ally{1},enemy{2};assert(game::sameTeam(s,a,a));assert(game::customTeammates(s,a,ally));assert(!game::customTeammates(s,a,enemy));assert(s.empire(a).relation(ally).treaty==game::Treaty::Partnership);game::TurnContext context{rules,s,{},{},{}};assert(!game::diplomacy::setTreaty(context,a,ally,game::Treaty::War));assert(s.empire(a).relation(ally).treaty==game::Treaty::Partnership);
 auto bytes=game::serializeState(s);auto restored=game::deserializeState(bytes);assert(restored);assert(restored->options.teamAssignments==s.options.teamAssignments);assert(game::customTeammates(*restored,a,ally));s.empire(enemy).alive=false;game::score::checkVictory(context,0);assert(s.lastTurn);assert(s.winner.valid());assert(game::teamOf(s,s.winner)==1);std::cout<<"PASS fixed team partnerships, treaty lock, serialization and shared last-team victory.\n";
}
