#include "game/setup.hpp"
#include "game/turn.hpp"
#include "game/economy.hpp"
#include "game/query.hpp"
#include "game/abilities.hpp"
#include "game/serialize.hpp"
#include "game/research.hpp"
#include "client/classic/screens/setup_model.hpp"
#include "ruleset/ruleset.hpp"
#include <cassert>
#include <iostream>
using namespace opense4;using namespace opense4::game;
int main(int argc,char** argv){assert(argc==2);auto data=ruleset::loadRuleset(std::filesystem::path(argv[1])/"Data");assert(data.ruleset);Rules r(std::move(*data.ruleset),argv[1]);auto setup=client::classic::setup::quickStartGame(r,"Terran",400,0);setup.options.splitConstruction=true;auto game=createGame(r,setup);assert(game);auto& s=*game;EmpireId owner{0};Colony* c=nullptr;for(auto& p:s.colonies)if(p&&p->owner==owner){c=&*p;break;}assert(c);
 uint32_t yard=0;bool found=false;for(uint32_t i=0;i<r.data().facilities.size();++i)if(r.facilityAvailable(s.empire(owner),i)&&hasAbility(r.facilityAbilities(i),AbilityKind::SpaceYard)){yard=i;found=true;break;}assert(found);c->facilities={yard,yard};c->yardQueues.resize(2);c->yardsCombined=true;c->anger=10;const ObjectId planet=c->planet;s.empire(owner).stockpile={100000000,100000000,100000000};
 cmd::QueueTarget pt{planet,{}},first{planet,{},0},second{planet,{},1};auto combined=economy::constructionRate(r,s,owner,first);auto planetary=economy::constructionRate(r,s,owner,pt);assert(combined.total()>0&&planetary.total()>0);assert(economy::constructionRate(r,s,owner,second).isZero());c->yardsCombined=false;auto single=economy::constructionRate(r,s,owner,first);for(size_t i=0;i<3;++i)assert(combined.v[i]==single.v[i]*2);assert(economy::constructionRate(r,s,owner,second)==single);
 Design d;d.id=DesignId{static_cast<uint32_t>(s.designs.size())};d.owner=owner;d.name="Production test";for(uint32_t i=0;i<r.data().vehicleSizes.size();++i)if(r.hullAvailable(s.empire(owner),i)&&r.hull(i).type==ruleset::VehicleType::Ship){d.hull=i;break;}s.designs.push_back(d);QueueItem vessel;vessel.kind=QueueItem::Kind::Vehicle;vessel.design=d.id;
 // Place pre-paid final construction to isolate queue scheduling from design cost.
 c->yardQueues[0].items={vessel};c->yardQueues[1].items={vessel};auto cost=economy::itemCost(r,s,owner,first,vessel);c->yardQueues[0].items[0].spent=cost;c->yardQueues[1].items[0].spent=cost;
 QueueItem facility;facility.kind=QueueItem::Kind::Facility;facility.facility=yard;c->queue.items={facility};c->queue.items[0].spent=economy::itemCost(r,s,owner,pt,facility);auto count=s.vehicles.size();TurnContext context{r,s,{},{},{}};economy::runConstruction(context,owner);assert(s.vehicles.size()==count+2);assert(s.colony(planet)->facilities.size()==3);assert(s.colony(planet)->queue.items.empty());assert(s.colony(planet)->yardQueues[0].items.empty()&&s.colony(planet)->yardQueues[1].items.empty());
 assert(queueItemProblem(r,s,owner,pt,vessel)=="Choose a shipyard queue");assert(!queueItemProblem(r,s,owner,first,facility).empty());auto saved=deserializeState(serializeState(s));assert(saved&&saved->options.splitConstruction&&saved->colony(planet)->yardQueues.size()>=2);
 auto& e=s.empire(owner);e.research.clear();e.researchPool=123456;research::researchStep(context,owner);assert(e.researchPool==0);research::addToPools(e,100,0);assert(e.researchPool==100);
 std::cout<<"PASS separate planetary production, parallel yards, pooled rates, lane guards, save persistence and research expiry.\n";
}
