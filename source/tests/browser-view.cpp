#include "view.hpp"
#include "game/setup.hpp"
#include "game/query.hpp"
#include "game/research.hpp"
#include "game/serialize.hpp"
#include "game/yard_idle.hpp"
#include "game/commands.hpp"
#include "client/classic/screens/setup_model.hpp"
#include "ruleset/ruleset.hpp"
#include <cassert>
#include <iostream>
using namespace opense4;using namespace opense4::game;using script::Value;
const Value& field(const Value& v,const char* key){assert(v.find(key));return *v.find(key);}
const Value* entry(const Value& list,int id){for(const auto& v:list.asList())if(field(v,"id").asInt()==id)return &v;return nullptr;}
int main(int argc,char** argv){assert(argc==2);auto data=ruleset::loadRuleset(std::filesystem::path(argv[1])/"Data");assert(data.ruleset);Rules r(std::move(*data.ruleset),argv[1]);auto setup=client::classic::setup::quickStartGame(r,"Terran",12345,2);setup.options.systemCount=12;setup.options.allSystemsSeen=true;auto game=createGame(r,setup);assert(game);auto& s=*game;const EmpireId me{0},enemy{1};assert(s.empires.size()>1);
 ObjectId planet,asteroid;for(auto& o:s.galaxy.objects){if(o.kind==ObjectKind::Planet&&!s.colony(o.id)&&!planet.valid()&&o.system==s.empire(me).homeSystem)planet=o.id;if(o.kind==ObjectKind::Asteroids&&!asteroid.valid())asteroid=o.id;}assert(planet.valid()&&asteroid.valid());
 auto& world=s.galaxy.object(planet);world.value={142,38,91};world.abilities.push_back({"Ancient Ruins","Ancient ruins detected", "1", "0"});auto& rock=s.galaxy.object(asteroid);rock.value={197,12,64};
 auto snap=browserSnapshot(r,s,me);const auto* surveyed=entry(field(snap,"objects"),planet.value);assert(surveyed);const auto& survey=field(*surveyed,"survey");assert(field(survey,"resources").asList()[0].asInt()==142);assert(field(survey,"ruins").asBool());Colony projected;projected.planet=planet;projected.owner=me;assert(field(survey,"maxPopulation").asInt()==maxPopulation(r,s,projected));assert(field(survey,"facilitySlots").asInt()==facilitySlots(r,s,projected));const auto* ast=entry(field(snap,"objects"),asteroid.value);assert(ast);assert(field(field(*ast,"survey"),"resources").asList()[0].asInt()==197);assert(!field(*ast,"survey").find("maxPopulation"));
 s.options.finiteResources=true;snap=browserSnapshot(r,s,me);assert(!field(field(*entry(field(snap,"objects"),planet.value),"survey"),"percent").asBool());s.options.finiteResources=false;
 Design d;d.id=DesignId{static_cast<uint32_t>(s.designs.size())};d.owner=enemy;d.name="Encountered defense";d.hull=0;d.entries.push_back({0,-1});s.designs.push_back(d);Design other=d;other.id=DesignId{static_cast<uint32_t>(s.designs.size())};other.name="Unseen revision";s.designs.push_back(other);
 Colony foreign;foreign.planet=planet;foreign.owner=enemy;foreign.cargo.units={{d.id,7}};foreign.facilities={0};s.colonies[planet.index()]=foreign;
 snap=browserSnapshot(r,s,me);const auto* unknown=entry(field(snap,"knownDesigns"),d.id.value);assert(unknown);assert(!field(*unknown,"revealed").asBool());assert(field(*unknown,"entries").size()==0);assert(!entry(field(snap,"knownDesigns"),other.id.value));const auto* object=entry(field(snap,"objects"),planet.value);assert(field(*object,"units").asList()[0].find("count")->asInt()==7);assert(!object->find("facilities"));
 seeDesign(s.empire(me).knowledge,d.id,s.turn);snap=browserSnapshot(r,s,me);const auto* revealed=entry(field(snap,"knownDesigns"),d.id.value);assert(revealed&&field(*revealed,"revealed").asBool());assert(field(*revealed,"entries").size()==1);assert(!entry(field(snap,"knownDesigns"),other.id.value));auto restored=deserializeState(serializeState(s));assert(restored&&knowsDesign(restored->empire(me).knowledge,d.id));
 auto home=std::find_if(s.colonies.begin(),s.colonies.end(),[&](const auto& c){return c&&c->owner==me;});assert(home!=s.colonies.end());setYardIdle(**home,0,true);auto saved=deserializeState(serializeState(s));assert(saved&&yardIdle(*saved->colony((*home)->planet),0));

 for(uint32_t i=0;i<r.data().techAreas.size();++i)if(r.tech(ruleset::TechAreaId{i}).name=="Construction"){
  s.empire(me).techLevels[i]=0;const auto before=stateChecksum(s);auto researchView=browserSnapshot(r,s,me);assert(stateChecksum(s)==before);const auto* construction=entry(field(field(researchView,"research"),"areas"),i);assert(construction);const auto& unlocks=field(*construction,"researchUnlocks");assert(unlocks.size()>0);auto projected=s.empire(me);projected.techLevels[i]=1;for(const auto& next:unlocks.asList()){ruleset::TechAreaId id{static_cast<uint32_t>(field(next,"id").asInt())};assert(!research::isResearchable(r,s,s.empire(me),id));assert(research::isResearchable(r,s,projected,id));}
 }
 LogEntry event;event.title="A ship completed";event.location=Location{world.system,world.sector};event.target=LogGoto::Location;s.empire(me).log={event};auto logView=browserSnapshot(r,s,me);assert(field(field(logView,"log").asList()[0],"destination").find("location"));s.empire(me).log[0].target=LogGoto::Research;logView=browserSnapshot(r,s,me);assert(field(field(field(logView,"log").asList()[0],"destination"),"page").asString()=="research");s.empire(me).log[0].target=LogGoto::None;logView=browserSnapshot(r,s,me);assert(field(field(logView,"log").asList()[0],"destination").isNull());
 std::cout<<"PASS native survey and asteroid values, race-specific capacities, ruins, finite resources, exact-design intelligence privacy and save persistence.\n";
}

