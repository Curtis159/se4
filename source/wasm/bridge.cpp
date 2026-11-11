#include "game/yard_idle.hpp"
#include "game/labor_focus.hpp"
#include "client/classic/screens/colony_logic.hpp"
#include "game/teams.hpp"
#include "game/abilities.hpp"
// OpenSE4 browser boundary. GPL-3.0, as the upstream engine.
#include "game/classic_files.hpp"
#include "game/setup.hpp"
#include "client/classic/screens/setup_model.hpp"
#include "game/turn.hpp"
#include "game/serialize.hpp"
#include "game/redact.hpp"
#include "ruleset/ruleset.hpp"
#include "script/json.hpp"
#include "sdk/codec.hpp"
#include "game/design.hpp"
#include "game/movement.hpp"
#include "game/economy.hpp"
#include "game/query.hpp"
#include "game/orders.hpp"
#ifdef OPENSE4_ENABLE_HEGEMON
#include "mods/data_set.hpp"
#include "mods/package.hpp"
#include "sdk/players.hpp"
#endif
#include "view.hpp"
#include "learn/library.hpp"
#include "learn/progress.hpp"
#include "learn/resume.hpp"
#include <filesystem>
#include <iostream>
#include <memory>
#include <stdexcept>
#include <cctype>
#include <algorithm>
#include <set>
using namespace opense4;
using namespace opense4::game;
using script::Value;
using script::ValueMap;
namespace {
std::filesystem::path root = "/se4";
std::unique_ptr<Rules> rules;
std::optional<GameState> state;
std::string output;
// The built-in C++ AI is always available. Hegemon requires OpenSE4's
// MicroPython SDK to be linked and its original mod package loaded.
constexpr bool kHegemonCompiled =
#ifdef OPENSE4_ENABLE_HEGEMON
 true;
#else
 false;
#endif
std::string aiMode = "classic";
int aiRequests=0,aiFallbacks=0;
Value aiErrors=Value::emptyList();

std::string text(const Value& v, const char* key, std::string fallback = {}) {
 auto p=v.find(key); if(!p) return fallback;
 if(!p->isString()) throw std::runtime_error(std::string(key)+" must be text");
 return p->asString();
}
int number(const Value& v, const char* key, int fallback) {
 auto p=v.find(key); if(!p) return fallback;
 if(!p->isInt() || p->asInt()<0 || p->asInt()>1000000) throw std::runtime_error(std::string(key)+" is out of range");
 return static_cast<int>(p->asInt());
}
void requireGame() { if(!state) throw std::runtime_error("Initialize or load a game first"); }
void ensureRules(std::string_view desired = "classic",std::string_view packageFolder="hegemon") {
 if (desired != "classic" && desired != "hegemon")
  throw std::runtime_error("Unknown AI mode; use classic or hegemon");
 if (desired == "hegemon" && !kHegemonCompiled)
  throw std::runtime_error("Hegemon requires the OpenSE4 Python SDK runtime; this WebAssembly build supports Classic AI only");
 if (rules && aiMode != desired)
  throw std::runtime_error("Changing AI mode needs a new game session and ruleset reload");
 if(rules) return;
 #ifdef OPENSE4_ENABLE_HEGEMON
 if (desired == "hegemon") {
  auto mod = mods::openPackage(root / "Mods" / packageFolder);
  if (!mod) throw std::runtime_error("Hegemon mod unavailable: " + mod.error());
  mods::ModSet set;
  set.packages.push_back(std::move(*mod));
  auto data = mods::loadDataSet(root, root / "Data", set);
  if (!data.ruleset) throw std::runtime_error("Hegemon-enabled original data could not be loaded");
  rules=std::make_unique<Rules>(std::move(*data.ruleset),root);
  sdk::PlayerSetup aiSetup;aiRequests=0;aiFallbacks=0;aiErrors=Value::emptyList();
  aiSetup.observe=[](const sdk::RequestEvent& event){if(event.kind==sdk::RequestEvent::Kind::Asked)++aiRequests;if(event.kind==sdk::RequestEvent::Kind::Failed||event.kind==sdk::RequestEvent::Kind::Skipped)++aiFallbacks;};
  aiSetup.failures=[](const sdk::PlayerFailure& failure){aiErrors.push(Value(ValueMap{{"turn",failure.turn},{"empire",failure.empire.value},{"call",failure.call},{"error",failure.error},{"traceback",failure.traceback}}));};
  sdk::installPlayers(std::move(aiSetup));
 } else
#endif
 {
  auto data=ruleset::loadRuleset(root/"Data");
  if(!data.ruleset) throw std::runtime_error("Original Data files could not be loaded");
  rules=std::make_unique<Rules>(std::move(*data.ruleset),root);
 }
 aiMode=std::string(desired);
}
#include "browser_setup.inc"
#include "browser_autofit.inc"
EmpireId viewer{0};
std::vector<EmpireId> readyPlayers;
// Keep the running campaign intact when a new setup is rejected.
struct NewGameGuard {
 std::string mode=aiMode;EmpireId player=viewer;bool replaceRules=false,committed=false;
 std::optional<GameState> game;std::unique_ptr<Rules> oldRules;std::vector<EmpireId> ready;
 explicit NewGameGuard(bool reload):replaceRules(reload||!rules),game(std::move(state)),ready(std::move(readyPlayers)){state.reset();if(replaceRules)oldRules=std::move(rules);}
 ~NewGameGuard(){if(!committed){state=std::move(game);if(replaceRules)rules=std::move(oldRules);aiMode=std::move(mode);viewer=player;readyPlayers=std::move(ready);}}
};

void syncYards(){if(state)economy::prepareConstruction(*rules,*state);}
Value snapshot() { requireGame();syncYards();return browserSnapshot(*rules,*state,viewer); }
#include "browser_learn.inc"
#include "browser_multiplayer.inc"
Value setupOptions(){ensureRules(aiMode);auto settings=setup::defaultSettings(*rules,1);settings.options.splitConstruction=true;settings.options.maxShipsPerPlayer=500;settings.options.maxUnitsPerPlayer=2000;auto quadrants=Value::emptyList(),styles=Value::emptyList(),areas=Value::emptyList();for(const auto& q:rules->data().quadrantTypes)quadrants.push(q.name);for(const auto& p:rules->racePresets())if(!p.neutral)styles.push(Value(ValueMap{{"id",p.folder},{"name",p.name}}));for(const auto& t:rules->data().techAreas)areas.push(Value(ValueMap{{"name",t.name},{"removable",t.canBeRemoved}}));return Value(ValueMap{{"fields",setupFields(settings.options)},{"quadrants",quadrants},{"races",styles},{"techAreas",areas}});}

Value call(std::string_view method,const Value& args) {
 if(method=="multiplayerPlayers")return multiplayerPlayers();
 if(method=="prepareMultiplayer")return prepareMultiplayer(args);
 if(method=="learnCatalog")return learnCatalog();
 if(method=="learnStatus"){requireGame();return learningStatus(args);}
 if(method=="stopLesson"){lessonProgress.reset();return Value();}
 if(method=="startLesson"){const auto kind=text(args,"kind")=="training"?learn::LessonKind::Training:learn::LessonKind::Tutorial;const auto* l=lessons().lesson(kind,text(args,"id"));if(!l)throw std::runtime_error("Lesson not found");auto lesson=*l;NewGameGuard guard(true);ensureRules("classic");auto setup=client::classic::setup::quickStartGame(*rules,lesson.setup.race.empty()?rules->racePresets()[0].folder:lesson.setup.race,lesson.setup.seed.value_or(404),lesson.setup.computerPlayers);StartExtras extras;if(!lesson.setup.startingShips.empty())extras.designMinisterRun.push_back(EmpireId{0});learn::applySetup(lesson.setup,setup,extras);setup.options.splitConstruction=true;setup.options.noTacticalCombat=true;auto created=createGame(*rules,setup,extras);if(!created)throw std::runtime_error(created.error());if(!created->options.simultaneous){auto result=resumeTurnBased(*rules,*created);if(!result.rejected.empty())throw std::runtime_error(result.rejected.front().second);}state=std::move(*created);viewer=EmpireId{0};readyPlayers.clear();lessonProgress=std::make_unique<learn::LessonProgress>(std::move(lesson),*rules,*state,viewer);auto result=snapshot();guard.committed=true;return result;}
 if(method=="aiDiagnostics"){auto agents=Value::emptyList();if(state)for(const auto& empire:state->empires)if(!empire.controller.builtin()){auto memory=script::parseJson(empire.script.memory.empty()?"null":empire.script.memory);agents.push(Value(ValueMap{{"id",empire.id.value},{"team",teamOf(*state,empire.id)},{"memory",memory?*memory:Value{}}}));}return Value(ValueMap{{"mode",aiMode},{"requests",aiRequests},{"fallbacks",aiFallbacks},{"errors",aiErrors},{"agents",agents}});}
 if(method=="capabilities") return Value(ValueMap{{"classicAI",true},{"hegemonAI",kHegemonCompiled},{"hegemonController","opense4.hegemon:Hegemon"}});
 if(method=="resupplyRoute"){requireGame();auto* v=state->vehicle(VehicleId{static_cast<uint32_t>(number(args,"vehicle",1000000))});if(!v||v->owner!=viewer)throw std::runtime_error("Not your ship");auto context=orderContextOf(*state,*v);std::vector<Order> out;Order request;request.kind=OrderKind::Resupply;expandOrder(*rules,*state,context,request,out);if(out.empty())throw std::runtime_error("No reachable resupply depot");auto goal=out.front().location;return Value(ValueMap{{"system",goal.system.value},{"x",static_cast<int>(goal.sector.x)},{"y",static_cast<int>(goal.sector.y)}});}
 if(method=="repairRoute"){requireGame();auto* v=state->vehicle(VehicleId{static_cast<uint32_t>(number(args,"vehicle",1000000))});if(!v||v->owner!=viewer)throw std::runtime_error("Not your ship");std::vector<Location> goals;for(const auto& c:state->colonies)if(c&&c->owner==viewer&&colonyHasWorkingYard(*rules,*c))goals.push_back(locationOf(state->galaxy,c->planet));for(const auto& yard:state->vehicles)if(yard.id!=v->id&&yard.owner==viewer&&vehicleHasSpaceYard(*rules,*state,yard))goals.push_back(yard.location);auto nearest=movement::findPathToNearest(*rules,*state,viewer,v->location,goals);if(!nearest)throw std::runtime_error("No reachable shipyard");auto goal=goals[nearest->goal];return Value(ValueMap{{"system",goal.system.value},{"x",static_cast<int>(goal.sector.x)},{"y",static_cast<int>(goal.sector.y)}});}
 if(method=="travelPreview"){
  requireGame();auto known=redactForEmpire(*rules,*state,viewer);auto* ship=known.vehicle(VehicleId{static_cast<uint32_t>(number(args,"vehicle",1000000))});if(!ship||ship->owner!=viewer)throw std::runtime_error("Not your ship");
  ship->orders.clear();if(auto* list=args.find("orders"))for(const auto& item:list->asList()){auto order=sdk::decodeOrder(item);if(!order)throw std::runtime_error(order.error().text());ship->orders.push_back(*order);}
  Rng display((uint64_t{known.turn}<<33)^ship->id.value^0x6d6f76656c696e65ull);auto route=movement::planRoute(*rules,known,*ship,display);auto warnings=Value::emptyList();std::vector<Location> locations=route.points;for(const auto& order:ship->orders)if(order.kind==OrderKind::MoveTo)locations.push_back(order.location);
  for(const auto& order:ship->orders)if(order.kind==OrderKind::Warp&&order.object.valid()){const auto& wp=known.galaxy.object(order.object);locations.push_back(locationOf(known.galaxy,wp.id));if(wp.destination.valid())locations.push_back(locationOf(known.galaxy,wp.destination));}
  std::set<std::string> seen;auto warn=[&](std::string text){if(seen.insert(text).second)warnings.push(text);};
  for(const auto l:locations){if(l.system.index()>=known.galaxy.systems.size()||l.system.index()>=known.empire(viewer).knowledge.explored.size()||!known.empire(viewer).knowledge.explored[l.system.index()])continue;
   const auto& sys=known.galaxy.system(l.system);if(l.system!=ship->location.system)for(auto id:sys.objects){const auto* colony=known.colony(id);if(colony&&colony->owner!=viewer&&!sameTeam(known,viewer,colony->owner))warn(sys.name+": entering "+known.empire(colony->owner).name+" space");}if(sumValue1(parseAbilities(sys.abilities),AbilityKind::SectorDamage)>0||sumValue1(parseAbilities(sys.abilities),AbilityKind::SystemDamage)>0)warn(sys.name+": damaging system");
   for(auto id:sys.objects){const auto& o=known.galaxy.object(id);if(o.sector!=l.sector)continue;const auto abilities=parseAbilities(o.abilities);if(sumValue1(abilities,AbilityKind::SectorDamage)>0)warn(o.name+": storm or sector damage");if(sumValue1(abilities,AbilityKind::WarpPointTurbulence)>0)warn(o.name+": warp turbulence");const auto* c=known.colony(o.id);if(c&&c->owner!=viewer&&!sameTeam(known,viewer,c->owner))warn(known.empire(c->owner).name+": foreign colony");}
   for(const auto& other:known.vehicles)if(other.owner!=viewer&&!sameTeam(known,viewer,other.owner)&&other.location==l)warn(known.empire(other.owner).name+": foreign ships");
   const auto& mines=known.empire(viewer).taggedMinefields;if(std::find(mines.begin(),mines.end(),l)!=mines.end())warn("Tagged minefield on route");
  }return Value(ValueMap{{"warnings",warnings}});
 }
 if(method=="movementRange"){requireGame();const auto* v=state->vehicle(VehicleId{static_cast<uint32_t>(number(args,"vehicle",1000000))});if(!v||v->owner!=viewer)throw std::runtime_error("Not your ship");SystemId system{static_cast<uint32_t>(number(args,"system",v->location.system.value))};auto cells=Value::emptyList();const int speed=vehicleMaxMovement(*rules,*state,*v);for(int y=0;y<kSystemSize;++y)for(int x=0;x<kSystemSize;++x){Location goal{system,Sector{static_cast<uint8_t>(x),static_cast<uint8_t>(y)}};auto path=movement::findPath(*rules,*state,viewer,v->location,goal);if(path){int turns=path->length<=v->movement?1:speed>0?1+(path->length-v->movement+speed-1)/speed:-1;cells.push(Value(ValueMap{{"x",x},{"y",y},{"turns",path->length==0?0:turns},{"distance",path->length}}));}}return cells;}
 if(method=="laborFocus"){
  requireGame();if(state->gameOver||!state->empire(viewer).alive||(!state->options.simultaneous&&activePlayer(*state)!=viewer)||std::find(readyPlayers.begin(),readyPlayers.end(),viewer)!=readyPlayers.end())throw std::runtime_error("It is not your turn");auto candidate=*state;auto* colony=candidate.colony(ObjectId{static_cast<uint32_t>(number(args,"planet",1000000))});const int focus=number(args,"focus",0);if(!colony||colony->owner!=viewer)throw std::runtime_error("Not your colony");if(focus<0||focus>5)throw std::runtime_error("Choose a resource focus");if(focus>0){if(!colony->queue.items.empty())throw std::runtime_error("Finish or clear the planet queue first");if(!laborFocusEligible(*rules,candidate,*colony,focus))throw std::runtime_error("That resource focus is not available");}setLaborFocus(*colony,focus);auto problem=validateState(candidate,rules.get());if(!problem.empty())throw std::runtime_error(problem);*state=std::move(candidate);return snapshot();
 }
 if(method=="yardIdle"){
  requireGame();if(state->gameOver||!state->empire(viewer).alive||(!state->options.simultaneous&&activePlayer(*state)!=viewer)||std::find(readyPlayers.begin(),readyPlayers.end(),viewer)!=readyPlayers.end())throw std::runtime_error("It is not your turn");auto candidate=*state;economy::prepareConstruction(*rules,candidate);const auto* flag=args.find("idle");if(!flag||!flag->isBool())throw std::runtime_error("Choose a shipyard assignment");const bool idle=flag->asBool();if(args.find("vehicle")){auto* ship=candidate.vehicle(VehicleId{static_cast<uint32_t>(number(args,"vehicle",1000000))});if(!ship||ship->owner!=viewer||!vehicleHasSpaceYard(*rules,candidate,*ship))throw std::runtime_error("Not your working shipyard");if(idle&&!ship->queue.items.empty())throw std::runtime_error("Use Pause Construction for an existing build, or clear the queue first");setYardIdle(*ship,0,idle);}else{const int lane=number(args,"yard",-1);auto* colony=candidate.colony(ObjectId{static_cast<uint32_t>(number(args,"planet",1000000))});if(!colony||colony->owner!=viewer||lane<0||lane>=static_cast<int>(colony->yardQueues.size())||(colony->yardsCombined&&lane!=0))throw std::runtime_error("Not your active shipyard lane");if(idle&&!colony->yardQueues[lane].items.empty())throw std::runtime_error("Use Pause Construction for an existing build, or clear the queue first");setYardIdle(*colony,lane,idle);}auto problem=validateState(candidate,rules.get());if(!problem.empty())throw std::runtime_error(problem);*state=std::move(candidate);return snapshot();
 }
 if(method=="yardMode"){requireGame();syncYards();auto* c=state->colony(ObjectId{static_cast<uint32_t>(number(args,"planet",1000000))});if(!c||c->owner!=viewer)throw std::runtime_error("Not your colony");const auto* combined=args.find("combined");if(!combined||!combined->isBool())throw std::runtime_error("Choose a yard mode");if(combined->asBool()&&!c->yardsCombined&&!c->yardQueues.empty())for(size_t i=1;i<c->yardQueues.size();++i){auto& from=c->yardQueues[i];c->yardQueues[0].items.insert(c->yardQueues[0].items.end(),from.items.begin(),from.items.end());from.items.clear();}c->yardsCombined=combined->asBool();if(!c->yardQueues.empty()&&!c->yardQueues[0].items.empty())setYardIdle(*c,0,false);return snapshot();}
 if(method=="setupOptions")return setupOptions();
 if(method=="classicFile"){
  ensureRules(aiMode);classic::ConversionReport report;const bool empire=text(args,"kind")=="empire";std::string result;
  if(auto hex=args.find("hex")){
   if(!hex->isString()||hex->asString().size()>16*1024*1024||hex->asString().size()%2)throw std::runtime_error("Invalid classic file length");std::vector<uint8_t> bytes;const auto& encoded=hex->asString();auto digit=[](char c){if(c>='0'&&c<='9')return c-'0';if(c>='a'&&c<='f')return c-'a'+10;throw std::runtime_error("Invalid file hex");};for(size_t i=0;i<encoded.size();i+=2)bytes.push_back((digit(encoded[i])<<4)|digit(encoded[i+1]));
   if(empire){auto decoded=classic::decodeClassicEmpire(bytes,rules->data().racialTraits.size());if(!decoded)throw std::runtime_error(decoded.error());auto converted=classic::importClassicEmpire(*rules,*decoded,report);if(!converted)throw std::runtime_error(converted.error());converted->designs.clear();result=setup::empireToToml(*rules,*converted);}
   else{auto decoded=classic::decodeClassicMap(bytes);if(!decoded)throw std::runtime_error(decoded.error());auto converted=classic::importClassicMap(rules->data(),*decoded,report,text(args,"name","Imported map"));if(!converted)throw std::runtime_error(converted.error());result=mapToText(rules->data(),*converted);}
  }else{
   std::vector<uint8_t> bytes;auto source=text(args,"file");if(source.size()>8*1024*1024)throw std::runtime_error("File is too large");
   if(empire){auto loaded=setup::empireFromToml(*rules,source);if(!loaded)throw std::runtime_error(loaded.error());auto converted=classic::exportClassicEmpire(*rules,loaded->empire,report);if(!converted)throw std::runtime_error(converted.error());auto encoded=classic::encodeClassicEmpire(*converted);if(!encoded)throw std::runtime_error(encoded.error());bytes=std::move(*encoded);}
   else{auto loaded=mapFromText(rules->data(),source);if(!loaded)throw std::runtime_error(loaded.error());auto converted=classic::exportClassicMap(rules->data(),loaded->map,report);if(!converted)throw std::runtime_error(converted.error());auto encoded=classic::encodeClassicMap(*converted);if(!encoded)throw std::runtime_error(encoded.error());bytes=std::move(*encoded);}
   constexpr char digits[]="0123456789abcdef";for(auto byte:bytes){result+=digits[byte>>4];result+=digits[byte&15];}
  }
  auto notes=Value::emptyList();for(auto& note:report.notes)notes.push(note);return Value(ValueMap{{"file",result},{"notes",notes}});
 }
 if(method=="raceEditor"){
  ensureRules(aiMode);const auto* style=findPreset(*rules,text(args,"style","Terran"));if(!style||style->neutral)throw std::runtime_error("Unknown race style");auto d=setup::blankDraft(*rules,style);
  if(auto source=args.find("file")){if(!source->isString()||source->asString().size()>1024*1024)throw std::runtime_error("Invalid empire file");auto loaded=setup::empireFromToml(*rules,source->asString());if(!loaded)throw std::runtime_error(loaded.error());d=setup::draftFromSetup(*rules,loaded->empire);}
  if(auto edits=args.find("edits")){
   d.setup.name=text(*edits,"name",d.setup.name);d.setup.leaderName=text(*edits,"leaderName",d.setup.leaderName);d.setup.leaderTitle=text(*edits,"leaderTitle",d.setup.leaderTitle);d.setup.empireType=text(*edits,"empireType",d.setup.empireType);d.setup.email=text(*edits,"email",d.setup.email);d.setup.ministerStyle=text(*edits,"ministerStyle",d.setup.ministerStyle);if(auto use=edits->find("useRaceMinisterStyle")){if(!use->isBool())throw std::runtime_error("Invalid minister style flag");d.setup.useRaceMinisterStyle=use->asBool();}if(auto password=edits->find("password")){if(!password->isString())throw std::runtime_error("Invalid password");d.setup.passwordHash=setup::hashPassword(password->asString());}if(auto color=edits->find("color")){if(!color->isInt()||color->asInt()<0||color->asInt()>0xffffff)throw std::runtime_error("Invalid empire color");d.setup.color=color->asInt();}
   d.race.name=text(*edits,"raceName",d.race.name);d.race.nativeSurface=text(*edits,"surface",d.race.nativeSurface);d.race.atmosphere=text(*edits,"atmosphere",d.race.atmosphere);d.race.biology=text(*edits,"biology",d.race.biology);d.race.society=text(*edits,"society",d.race.society);d.race.history=text(*edits,"history",d.race.history);d.race.demeanor=text(*edits,"demeanor",d.race.demeanor);d.race.designNameFile=text(*edits,"designNameFile",d.race.designNameFile);
   d.race.culture=number(*edits,"culture",d.race.culture);d.race.happinessModel=number(*edits,"happiness",d.race.happinessModel);if(d.race.culture>=rules->data().cultures.size()||d.race.happinessModel>=rules->data().happinessModels.size())throw std::runtime_error("Unknown culture or happiness model");
   if(auto chars=edits->find("characteristics")){if(!chars->isList()||chars->asList().size()!=kCharacteristics)throw std::runtime_error("Invalid characteristics");for(size_t i=0;i<kCharacteristics;++i){const auto& v=chars->asList()[i];auto limits=setup::characteristicLimits(*rules,static_cast<Characteristic>(i));if(!v.isInt()||v.asInt()<limits.min||v.asInt()>limits.max)throw std::runtime_error("Characteristic outside allowed range");d.race.characteristics[i]=v.asInt();}}
   if(auto traits=edits->find("traits")){if(!traits->isList())throw std::runtime_error("Invalid traits");d.race.traits.clear();for(const auto& v:traits->asList()){if(!v.isInt()||v.asInt()<0||v.asInt()>=static_cast<int64_t>(rules->data().racialTraits.size()))throw std::runtime_error("Invalid trait");auto check=setup::canAddTrait(*rules,d.race,v.asInt());if(!check.ok)throw std::runtime_error(check.reason);setup::addTrait(*rules,d.race,v.asInt());}}
  }
  auto surfaces=Value::emptyList(),atmospheres=Value::emptyList(),cultures=Value::emptyList(),happiness=Value::emptyList(),chars=Value::emptyList(),traits=Value::emptyList();for(auto v:setup::surfacesInSetupOrder(*rules))surfaces.push(v);for(auto v:setup::atmospheresInSetupOrder(*rules))atmospheres.push(v);for(auto& v:rules->data().cultures)cultures.push(v.name);for(auto& v:rules->data().happinessModels)happiness.push(v.name);
  for(size_t i=0;i<kCharacteristics;++i){auto c=static_cast<Characteristic>(i);auto l=setup::characteristicLimits(*rules,c);chars.push(Value(ValueMap{{"name",std::string(displayName(c))},{"value",d.race.characteristics[i]},{"min",l.min},{"max",l.max}}));}
  for(uint32_t i=0;i<rules->data().racialTraits.size();++i){const auto& t=rules->data().racialTraits[i];auto check=setup::canAddTrait(*rules,d.race,i);traits.push(Value(ValueMap{{"id",i},{"name",t.name},{"description",t.description},{"cost",t.cost},{"selected",setup::hasTrait(d.race,i)},{"allowed",check.ok},{"reason",check.reason}}));}
  auto demeanors=Value::emptyList(),names=Value::emptyList(),ministers=Value::emptyList();for(auto& v:rules->data().names.demeanors)demeanors.push(v);for(auto& v:setup::designNameFiles(*rules))names.push(v);for(auto& v:setup::ministerStyleChoices(*rules))ministers.push(v);
  const int budget=number(args,"budget",2000);auto finished=setup::finishDraft(*rules,d,budget);auto stored=d.setup;stored.customRace=d.race;stored.designs.clear();
  return Value(ValueMap{{"demeanors",demeanors},{"designNameFiles",names},{"ministerStyles",ministers},{"demeanor",d.race.demeanor},{"designNameFile",d.race.designNameFile},{"ministerStyle",d.setup.ministerStyle},{"useRaceMinisterStyle",d.setup.useRaceMinisterStyle},{"color",d.setup.color},{"file",setup::empireToToml(*rules,stored)},{"valid",bool(finished)},{"problem",finished?"":finished.error()},{"pointsLeft",setup::racialPointsLeft(*rules,d.race,budget)},{"name",d.setup.name},{"leaderName",d.setup.leaderName},{"leaderTitle",d.setup.leaderTitle},{"empireType",d.setup.empireType},{"email",d.setup.email},{"raceName",d.race.name},{"surface",d.race.nativeSurface},{"atmosphere",d.race.atmosphere},{"biology",d.race.biology},{"society",d.race.society},{"history",d.race.history},{"culture",d.race.culture},{"happiness",d.race.happinessModel},{"surfaces",surfaces},{"atmospheres",atmospheres},{"cultures",cultures},{"happinessModels",happiness},{"characteristics",chars},{"traits",traits}});
 }
 if(method=="checkTurnPassword"){requireGame();return Value(state->empire(viewer).passwordHash.empty()||state->empire(viewer).passwordHash==setup::hashPassword(text(args,"password")));}
 if(method=="setupMap"){
  ensureRules(aiMode);auto settings=setup::defaultSettings(*rules,number(args,"seed",1));if(auto options=args.find("options"))setupFields(settings.options,options);settings.options.quadrantType=text(args,"quadrantType",settings.options.quadrantType);
  if(auto file=args.find("map")){if(!file->isString()||file->asString().size()>8*1024*1024)throw std::runtime_error("Invalid map file");auto loaded=mapFromText(rules->data(),file->asString());if(!loaded)throw std::runtime_error(loaded.error());setup::useMap(settings,std::move(loaded->map));}
  Galaxy galaxy;if(settings.map)galaxy=settings.map->galaxy;else{auto generated=setup::previewQuadrant(*rules,settings.seed,settings.options);if(!generated)throw std::runtime_error(generated.error());galaxy=std::move(generated->galaxy);}
  auto systems=Value::emptyList();for(const auto& system:galaxy.systems)systems.push(Value(ValueMap{{"name",system.name},{"x",system.position.x},{"y",system.position.y}}));auto map=setup::mapToSave(settings,galaxy,text(args,"name","Browser quadrant"));return Value(ValueMap{{"file",mapToText(rules->data(),map)},{"systems",systems},{"width",galaxy.width},{"height",galaxy.height}});
 }
 if(method=="newGame"){
  const auto desired=text(args,"aiMode","classic");NewGameGuard guard(aiMode!=desired||desired=="hegemon");ensureRules(desired);auto settings=setup::defaultSettings(*rules,number(args,"seed",1));auto& o=settings.options;o.splitConstruction=true;o.maxShipsPerPlayer=500;o.maxUnitsPerPlayer=2000;
  if(auto options=args.find("options"))setupFields(o,options);
  o.quadrantType=text(args,"quadrantType",o.quadrantType);if(std::none_of(rules->data().quadrantTypes.begin(),rules->data().quadrantTypes.end(),[&](const auto& q){return q.name==o.quadrantType;}))throw std::runtime_error("Unknown quadrant type");
  int stock=number(args,"startingResources",20000);if(stock!=5000&&stock!=20000&&stock!=100000)throw std::runtime_error("Invalid starting resources");o.startingResources=Resources{stock,stock,stock};
  if(auto flags=args.find("techAreasAllowed")){if(!flags->isList()||flags->asList().size()!=rules->data().techAreas.size())throw std::runtime_error("Invalid technology areas");for(const auto& flag:flags->asList()){if(!flag.isBool())throw std::runtime_error("Invalid technology flag");o.techAreasAllowed.push_back(flag.asBool()?1:0);}}
  for(const auto& [key,target]:std::initializer_list<std::pair<const char*,setup::RandomPlayers*>>{{"computers",&settings.computers},{"neutrals",&settings.neutrals}}){int level=number(args,key,2);if(level>3)throw std::runtime_error("Invalid random player level");target->enabled=level>0;target->level=std::max(0,level-1);}
  auto players=args.find("players");if(!players||!players->isList()||players->asList().empty()||players->asList().size()>20)throw std::runtime_error("Add 1 to 20 players");
  for(const auto& player:players->asList()){EmpireSetup empire;if(auto source=player.find("empire")){if(!source->isString())throw std::runtime_error("Invalid empire file");auto loaded=setup::empireFromToml(*rules,source->asString());if(!loaded)throw std::runtime_error(loaded.error());empire=std::move(loaded->empire);}else{auto preset=findPreset(*rules,text(player,"race"));if(!preset||preset->neutral)throw std::runtime_error("Unknown race");empire.preset=preset->folder;empire.presetTier=setup::bestTierWithin(*rules,*preset,o.racialPoints);}
   empire.name=text(player,"name",empire.name);empire.email=text(player,"email",empire.email);empire.kind=text(player,"kind","human")=="computer"?PlayerKind::Computer:PlayerKind::Human;empire.designs.clear();settings.players.push_back(std::move(empire));}
  if(auto file=args.find("map")){if(!file->isString()||file->asString().size()>8*1024*1024)throw std::runtime_error("Invalid map file");auto loaded=mapFromText(rules->data(),file->asString());if(!loaded)throw std::runtime_error(loaded.error());setup::useMap(settings,std::move(loaded->map));}
  const bool multiplayer=text(args,"mode","solo")!="solo"||std::count_if(settings.players.begin(),settings.players.end(),[](const auto& e){return e.kind==PlayerKind::Human;})>1;if(multiplayer||o.simultaneous)o.noTacticalCombat=true;
  auto setup=setup::buildGameSetup(*rules,settings);if(!setup)throw std::runtime_error(setup.error());if(auto enabled=args.find("customTeams");enabled&&enabled->isBool()&&enabled->asBool()){setup->options.teamMode=false;setup->options.teamAssignments.assign(setup->empires.size(),0);for(size_t i=0;i<players->asList().size();++i){int team=number(players->asList()[i],"team",0);if(team>20)throw std::runtime_error("Choose team 1..20 or Independent");setup->options.teamAssignments[i]=team;}int randomTeam=number(args,"randomTeam",0);if(randomTeam>20)throw std::runtime_error("Invalid random player team");for(size_t i=players->asList().size();i<setup->empires.size();++i)if(setup->empires[i].kind==PlayerKind::Computer)setup->options.teamAssignments[i]=randomTeam;}
  if(aiMode=="hegemon")for(auto& empire:setup->empires)if(empire.kind==PlayerKind::Computer){empire.controller.kind=Controller::Kind::Script;empire.controller.mod="opense4.hegemon";empire.controller.player="Hegemon";}
  auto created=createGame(*rules,*setup);if(!created)throw std::runtime_error(created.error());for(auto& empire:created->empires)if(empire.kind==PlayerKind::Human)empire.researchEvenly=false;if(!created->options.simultaneous){auto result=resumeTurnBased(*rules,*created);if(!result.rejected.empty())throw std::runtime_error(result.rejected.front().second);}state=std::move(*created);lessonProgress.reset();readyPlayers.clear();viewer=EmpireId{0};if(state->options.simultaneous){for(const auto& e:state->empires)if(e.alive&&e.kind==PlayerKind::Human){viewer=e.id;break;}}else if(activePlayer(*state).valid())viewer=activePlayer(*state);auto result=snapshot();guard.committed=true;return result;
 }
 if(method=="initialize") {
  const auto desiredMode=text(args,"aiMode","classic");
  NewGameGuard guard(aiMode!=desiredMode||desiredMode=="hegemon");viewer=EmpireId{0};readyPlayers.clear();
  ensureRules(desiredMode);
  // Authoritative original-style Quick Start path from OpenSE4 setup_model.cpp.
  // With no opponents argument: seed-based Medium computer AND neutral rolls.
  // The explicit-opponents override is reserved for automated scenarios.
  const auto seed=static_cast<uint64_t>(number(args,"seed",12345));
  const std::string race=text(args,"race",std::filesystem::path(text(args,"empireFile","terran.emp")).stem().string());
  const auto* preset = game::findPreset(*rules,race);
  if (!preset) {
   // The frontend supplies the .emp filename too; resolve that exact race.
   auto file=text(args,"empireFile","");
   if(file.find('/')!=std::string::npos || file.find('\\')!=std::string::npos || !file.ends_with(".emp"))
    throw std::runtime_error("Invalid race preset");
   for(const auto& p:rules->racePresets()) if(p.folder==race || p.name==race || p.folder==std::filesystem::path(file).stem().string()) {preset=&p;break;}
  }
  if (!preset || preset->neutral) throw std::runtime_error("Unknown playable Quick Start race");
  std::optional<int> scriptedOpponents;
  if(args.find("opponents")) {
   scriptedOpponents=number(args,"opponents",0);
   if(*scriptedOpponents>9) throw std::runtime_error("At most 9 scripted opponents");
  }
  GameSetup setup=client::classic::setup::quickStartGame(*rules,preset->folder,seed,scriptedOpponents);
  setup.options.splitConstruction=!(args.find("legacyQueues")&&args.find("legacyQueues")->isBool()&&args.find("legacyQueues")->asBool());setup.options.maxShipsPerPlayer=500;setup.options.maxUnitsPerPlayer=2000;
  // The original Quick Start has no player-selected system count.
  // systemCount may be overridden only in automated test scenarios.
  if(args.find("systemCount")) {
   setup.options.systemCount=number(args,"systemCount",0);
   if(setup.options.systemCount!=0 && (setup.options.systemCount<8 || setup.options.systemCount>200)) throw std::runtime_error("systemCount must be 0 or 8..200");
  }
  // Keep OpenSE4's original Quick Start selection: only assign the AI
  // controller AFTER the opponent identities/count have been rolled.
  if (desiredMode == "hegemon") {
   for (auto& empire : setup.empires) {
    if (empire.kind != PlayerKind::Computer) continue;
    empire.controller.kind = Controller::Kind::Script;
    empire.controller.mod = "opense4.hegemon";
    empire.controller.player = "Hegemon";
   }
  }
  // The player starts with no ships or designs and designs researched hulls
  // manually. Computer players retain the engine's normal AI design flow.
  StartExtras extras;
  auto created=createGame(*rules,setup,extras); if(!created) throw std::runtime_error(created.error());for(auto& empire:created->empires)if(empire.kind==PlayerKind::Human)empire.researchEvenly=false;
  // Keep the original Quick Game homeworld facility allocation: one yard.
  auto problem=validateState(*created,rules.get()); if(!problem.empty()) throw std::runtime_error(problem);
  auto result=resumeTurnBased(*rules,*created);
  if(!result.rejected.empty()) throw std::runtime_error(result.rejected.front().second);
  state=std::move(*created);lessonProgress.reset();auto initial=snapshot();guard.committed=true;return initial;
 }
 if(method=="snapshot") return snapshot();
 if(method=="command") {
  requireGame();
  Command command;
  if(text(args,"type")=="engine") {
   const auto* value=args.find("command");if(!value)throw std::runtime_error("Missing command");
   auto decoded=sdk::decodeCommand(*value);if(!decoded)throw std::runtime_error(decoded.error().text());command=std::move(*decoded);
  } else if(text(args,"type")=="renamePlanet") {
   const auto name=text(args,"name");if(name.empty()||name.size()>128)throw std::runtime_error("Planet name must be 1..128 bytes");
   cmd::Rename rename;rename.planet=ObjectId{number(args,"planet",1000000)};rename.name=name;command=rename;
  } else throw std::runtime_error("Unknown browser command type");
  if(state->options.simultaneous){if(std::find(readyPlayers.begin(),readyPlayers.end(),viewer)!=readyPlayers.end())throw std::runtime_error("This player has submitted their turn");auto copy=*state;std::vector<std::pair<EmpireId,std::string>> rejected;applyOrders(*rules,copy,EmpireOrders{viewer,state->turn,{command}},rejected);if(rejected.empty()){*state=std::move(copy);if(lessonProgress)lessonProgress->issued(command);}return Value(ValueMap{{"accepted",rejected.empty()},{"error",rejected.empty()?"":rejected.front().second}});}
  auto result=applyLive(*rules,*state,viewer,command);if(result.rejected.empty()&&lessonProgress)lessonProgress->issued(command);
  return Value(ValueMap{{"accepted",result.rejected.empty()}, {"error",result.rejected.empty()?"":result.rejected.front().second}});
 }
 if(method=="upgradeFacilities"){
  requireGame();if(state->gameOver||!state->empire(viewer).alive||(!state->options.simultaneous&&activePlayer(*state)!=viewer)||std::find(readyPlayers.begin(),readyPlayers.end(),viewer)!=readyPlayers.end())throw std::runtime_error("It is not your turn");auto candidate=*state;ObjectId planet{static_cast<uint32_t>(number(args,"planet",1000000))};const auto* colony=candidate.colony(planet);if(!colony||colony->owner!=viewer)throw std::runtime_error("Not your colony");std::vector<Command> work;for(const auto& [index,facility]:client::classic::queuedFacilitySwitches(*rules,candidate,viewer,*colony))work.push_back(cmd::QueueReplaceFacility{{planet,{}},index,facility});if(colony->totalPopulation()>0)for(const auto& item:client::classic::possibleUpgrades(*rules,candidate,viewer,*colony))work.push_back(cmd::QueueAdd{{planet,{}},item,-1});
  if(work.empty())throw std::runtime_error("All facilities are up to date");for(const auto& command:work){if(candidate.options.simultaneous){std::vector<std::pair<EmpireId,std::string>> rejected;applyOrders(*rules,candidate,EmpireOrders{viewer,candidate.turn,{command}},rejected);if(!rejected.empty())throw std::runtime_error(rejected.front().second);}else{auto result=applyLive(*rules,candidate,viewer,command);if(!result.rejected.empty())throw std::runtime_error(result.rejected.front().second);}}auto problem=validateState(candidate,rules.get());if(!problem.empty())throw std::runtime_error(problem);*state=std::move(candidate);return snapshot();
 }
 if(method=="upgradeDesign"){
  requireGame();DesignId id{static_cast<uint32_t>(number(args,"design",1000000))};const auto& empire=state->empire(viewer);if(std::find(empire.designs.begin(),empire.designs.end(),id)==empire.designs.end())throw std::runtime_error("Not your design");auto d=state->design(id);auto entries=Value::emptyList();int changed=0;
  for(auto& entry:d.entries){auto target=rules->componentUpgradeTarget(empire,rules->component(entry.component).family);if(target&&*target!=entry.component){entry.component=*target;++changed;}entries.push(Value(ValueMap{{"component",entry.component},{"mount",entry.mount}}));}
  return Value(ValueMap{{"changed",changed},{"name",d.name},{"hull",d.hull},{"design_type",d.designType},{"entries",entries}});
 }
 if(method=="previewDesign") {
  requireGame();auto designArgs=args;
  // Preview options belong to the browser boundary, not the strict engine
  // design schema. Preserve all actual design-field validation.
  if(designArgs.isMap())std::erase_if(designArgs.editMap(),[](const auto& item){return item.first=="checkAdditions"||item.first=="autoRequired";});
  auto decoded=sdk::decodeCommand(Value(ValueMap{{"kind","create_design"},{"design",designArgs}}));
  if(!decoded)throw std::runtime_error(decoded.error().text());
  auto d=std::get<cmd::CreateDesign>(*decoded).design;
  if(d.hull>=rules->data().vehicleSizes.size()||d.entries.size()>4096)throw std::runtime_error("Invalid design size");
  for(const auto& e:d.entries)if(e.component>=rules->data().components.size()||e.mount>=static_cast<int>(rules->data().weaponMounts.size()))throw std::runtime_error("Invalid component or mount");
  if(auto fit=args.find("autoRequired");fit&&fit->isBool()&&fit->asBool())d=fitRequired(*rules,state->empires.at(viewer.index()),std::move(d));
  auto fitted=Value::emptyList();for(const auto& entry:d.entries)fitted.push(Value(ValueMap{{"component",entry.component},{"mount",entry.mount}}));
  const auto stats=computeDesignStats(*rules,&state->empires.at(viewer.index()),d);auto problems=Value::emptyList(),cost=Value::emptyList();
  for(const auto& p:stats.problems)problems.push(p);for(auto x:stats.cost.v)cost.push(x);
  auto additions=Value::emptyList();
  if(args.find("checkAdditions"))for(uint32_t i=0;i<rules->data().components.size();++i){
   const auto& c=rules->component(i);if(!rules->componentAvailable(state->empires.at(viewer.index()),i)||!(c.vehicles & ruleset::maskOf(rules->hull(d.hull).type)))continue;
   auto candidate=d;candidate.entries.push_back({i,-1});const auto checked=computeDesignStats(*rules,&state->empires.at(viewer.index()),candidate);std::string reason;
   for(const auto& p:checked.problems)if(std::find(stats.problems.begin(),stats.problems.end(),p)==stats.problems.end()){reason=p;break;}
   additions.push(Value(ValueMap{{"id",i},{"allowed",reason.empty()},{"reason",reason}}));
  }
  return Value(ValueMap{{"masterComputer",std::any_of(d.entries.begin(),d.entries.end(),[&](const auto& entry){return hasAbility(rules->componentAbilities(entry.component),AbilityKind::MasterComputer);})},{"entries",fitted},{"used",stats.tonnageUsed},{"capacity",stats.tonnageMax},{"movement",stats.movement},{"cost",cost},{"problems",problems},{"additions",additions}});
 }
 if(method=="endTurn") {
  requireGame();
  if(state->options.simultaneous){
   if(state->gameOver)return snapshot();if(std::find(readyPlayers.begin(),readyPlayers.end(),viewer)==readyPlayers.end())readyPlayers.push_back(viewer);
   for(const auto& e:state->empires)if(e.alive&&e.kind==PlayerKind::Human&&std::find(readyPlayers.begin(),readyPlayers.end(),e.id)==readyPlayers.end()){viewer=e.id;return snapshot();}
   std::vector<EmpireOrders> orders;for(const auto& e:state->empires)if(e.alive&&e.kind==PlayerKind::Human)orders.push_back(EmpireOrders{e.id,state->turn,{}});auto result=processTurn(*rules,*state,orders);if(!result.rejected.empty())throw std::runtime_error(result.rejected.front().second);readyPlayers.clear();for(const auto& e:state->empires)if(e.alive&&e.kind==PlayerKind::Human){viewer=e.id;break;}return snapshot();
  }
  auto result=endPlayerTurn(*rules,*state,viewer);
  if(!result.rejected.empty()) throw std::runtime_error(result.rejected.front().second);
  auto problem=validateState(*state,rules.get()); if(!problem.empty()) throw std::runtime_error(problem);
  if(activePlayer(*state).valid())viewer=activePlayer(*state);return snapshot();
 }
 if(method=="save") {
  requireGame(); SaveInfo info;info.gameName="Browser game";info.dataSet=dataSetIdentity(*rules);auto bytes=serializeSave(*state,info);std::string hex;hex.reserve(bytes.size()*2);
  constexpr char digits[]="0123456789abcdef";for(auto b:bytes){hex+=digits[b>>4];hex+=digits[b&15];}
  auto ready=Value::emptyList();for(auto id:readyPlayers)ready.push(id.value);
  auto lesson=lessonProgress?Value(ValueMap{{"id",lessonProgress->lesson().slug},{"kind",std::string(learn::kindName(lessonProgress->lesson().kind))},{"step",static_cast<int>(lessonProgress->active())}}):Value();
  return Value(ValueMap{{"lesson",lesson},{"viewer",viewer.value},{"readyPlayers",ready},{"format","OpenSE4-save-hex-v1"},{"payload",hex},{"aiMode",aiMode}});
 }
 if(method=="load") {
  // Save payloads do not specify mod choice; clients must explicitly choose
  // the correct engine capability before loading a modded save.
  const auto desired=text(args,"aiMode","classic");NewGameGuard guard(true);ensureRules(desired);auto payload=args.find("payload");if(!payload || !payload->isMap()) throw std::runtime_error("Missing save object");
  if(text(*payload,"format")!="OpenSE4-save-hex-v1") throw std::runtime_error("Unknown save format");
  auto hex=text(*payload,"payload");if(hex.size()%2 || hex.size()>64*1024*1024) throw std::runtime_error("Invalid save length");
  auto digit=[](char c)->int{if(c>='0'&&c<='9')return c-'0';if(c>='a'&&c<='f')return c-'a'+10;throw std::runtime_error("Invalid save hex");};
  std::vector<uint8_t> bytes;bytes.reserve(hex.size()/2);for(size_t i=0;i<hex.size();i+=2)bytes.push_back(static_cast<uint8_t>(digit(hex[i])*16+digit(hex[i+1])));
  auto loadedSave=deserializeSave(bytes);if(!loadedSave)throw std::runtime_error(loadedSave.error());
#ifdef OPENSE4_ENABLE_HEGEMON
  if(!sameDataSet(loadedSave->second,*rules)&&desired=="hegemon"){
   auto currentRules=std::move(rules);try{ensureRules(desired,"hegemon-15");if(!sameDataSet(loadedSave->second,*rules))rules=std::move(currentRules);}catch(...){rules=std::move(currentRules);throw;}
  }
#endif
  if(!sameDataSet(loadedSave->second,*rules))throw std::runtime_error("Save uses a different rules data set");
  auto loaded=std::optional<GameState>(std::move(loadedSave->first));
  if(loaded->options.simultaneous||std::count_if(loaded->empires.begin(),loaded->empires.end(),[](const auto& empire){return empire.kind==PlayerKind::Human;})>1)loaded->options.noTacticalCombat=true;
  auto problem=validateState(*loaded,rules.get());if(!problem.empty())throw std::runtime_error(problem);
  auto nextViewer=EmpireId{0};std::vector<EmpireId> nextReady;if(loaded->options.simultaneous){nextViewer=EmpireId{number(*payload,"viewer",0)};if(nextViewer.index()>=loaded->empires.size()||loaded->empire(nextViewer).kind!=PlayerKind::Human)throw std::runtime_error("Invalid saved player");if(auto ready=payload->find("readyPlayers")){if(!ready->isList())throw std::runtime_error("Invalid submitted players");for(const auto& id:ready->asList()){if(!id.isInt()||id.asInt()<0||id.asInt()>=static_cast<int64_t>(loaded->empires.size())||loaded->empires[id.asInt()].kind!=PlayerKind::Human)throw std::runtime_error("Invalid submitted player");nextReady.push_back(EmpireId{id.asInt()});}}}else if(activePlayer(*loaded).valid())nextViewer=activePlayer(*loaded);
  state=std::move(*loaded);viewer=nextViewer;readyPlayers=std::move(nextReady);auto restored=snapshot();lessonProgress.reset();if(auto meta=payload->find("lesson");meta&&meta->isMap()){const auto kind=text(*meta,"kind")=="training"?learn::LessonKind::Training:learn::LessonKind::Tutorial;if(const auto* l=lessons().lesson(kind,text(*meta,"id"))){lessonProgress=std::make_unique<learn::LessonProgress>(*l,*rules,*state,viewer);if(kind==learn::LessonKind::Tutorial)lessonProgress->jumpTo(learn::resumeStep(*l,number(*meta,"step",0)),*rules,*state,viewer);}}guard.committed=true;return restored;
 }
 throw std::runtime_error("Unknown method");
}
}
extern "C" const char* se4_call(const char* method,const char* json) {
 try {
  auto args=script::parseJson(json?json:"{}");if(!args)throw std::runtime_error(args.error().describe());
  auto result=script::toJson(call(method?method:"",*args));if(!result)throw std::runtime_error(result.error());output=std::move(*result);
 } catch(const std::exception& e) { output=*script::toJson(Value(ValueMap{{"error",std::string(e.what())}})); }
 return output.c_str();
}
#ifndef __EMSCRIPTEN__
int main(int argc,char**argv) {
 if(argc!=2){std::cerr<<"usage: opense4 /path/to/se4\n";return 2;}root=argv[1];
 std::string line;while(std::getline(std::cin,line)){
  auto request=script::parseJson(line);if(!request){std::cerr<<request.error().describe()<<'\n';return 2;}
  auto args=request->find("args");auto json=script::toJson(args?*args:Value::emptyMap());
  std::cout<<se4_call(text(*request,"method").c_str(),json->c_str())<<'\n'<<std::flush;
 }
}
#endif
