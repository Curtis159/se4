// Required equipment assistance, using actual hull flags and native validation.
Design fitRequired(const Rules& r,const Empire& owner,Design d){
 const auto& hull=r.hull(d.hull);auto has=[&](uint32_t component,AbilityKind kind){return hasAbility(r.componentAbilities(component),kind);};
 std::erase_if(d.entries,[&](const auto& e){return !(r.component(e.component).vehicles & ruleset::maskOf(hull.type));});
 auto count=[&](AbilityKind kind){return std::count_if(d.entries.begin(),d.entries.end(),[&](const auto& e){return has(e.component,kind);});};
 auto level=[&](uint32_t id){int score=0;for(const auto& q:r.component(id).requirements)score+=q.level;return score;};
 auto add=[&](const std::vector<AbilityKind>& kinds,bool preferSurface=false){
  std::vector<uint32_t> choices;for(uint32_t id=0;id<r.data().components.size();++id)if(r.componentAvailable(owner,id)&&(r.component(id).vehicles & ruleset::maskOf(hull.type))&&std::any_of(kinds.begin(),kinds.end(),[&](auto kind){return has(id,kind);}))choices.push_back(id);
  const auto preferred=owner.race.nativeSurface=="Ice"?AbilityKind::ColonizeIce:owner.race.nativeSurface=="Gas Giant"?AbilityKind::ColonizeGas:AbilityKind::ColonizeRock;
  std::stable_sort(choices.begin(),choices.end(),[&](auto a,auto b){if(preferSurface&&has(a,preferred)!=has(b,preferred))return has(a,preferred);if(level(a)!=level(b))return level(a)>level(b);return a>b;});
  const auto before=computeDesignStats(r,&owner,d);for(auto id:choices){auto candidate=d;candidate.entries.push_back({id,-1});auto after=computeDesignStats(r,&owner,candidate);if(after.tonnageUsed>after.tonnageMax)continue;bool newProblem=false;for(const auto& problem:after.problems)if(std::find(before.problems.begin(),before.problems.end(),problem)==before.problems.end()){newProblem=true;break;}if(!newProblem){d=std::move(candidate);return true;}}return false;
 };
 const bool controls=hull.mustHaveBridge||hull.minLifeSupport>0||hull.minCrewQuarters>0;
 if(controls){
  std::erase_if(d.entries,[&](const auto& e){return has(e.component,AbilityKind::MasterComputer)||has(e.component,AbilityKind::ShipBridge)||has(e.component,AbilityKind::ShipLifeSupport)||has(e.component,AbilityKind::ShipCrewQuarters);});
  add({AbilityKind::MasterComputer});
 }
 if(count(AbilityKind::MasterComputer))std::erase_if(d.entries,[&](const auto& e){return !has(e.component,AbilityKind::MasterComputer)&&(has(e.component,AbilityKind::ShipBridge)||has(e.component,AbilityKind::ShipLifeSupport)||has(e.component,AbilityKind::ShipCrewQuarters));});
 else{
  auto need=[&](AbilityKind kind,int minimum){for(int limit=0;limit<128&&count(kind)<minimum;++limit)if(!add({kind}))break;};
  need(AbilityKind::ShipBridge,hull.mustHaveBridge?1:0);need(AbilityKind::ShipLifeSupport,hull.minLifeSupport);need(AbilityKind::ShipCrewQuarters,hull.minCrewQuarters);
 }
 auto percentage=[&](std::vector<AbilityKind> kinds,int percent,bool colony=false){for(int limit=0;percent>0&&limit<4096;++limit){int64_t used=0;for(const auto& e:d.entries)for(auto kind:kinds)if(has(e.component,kind))used+=mounted(r,e).tonnage;const auto capacity=computeDesignStats(r,&owner,d).tonnageMax;if(used>=int64_t(capacity)*percent/100)break;if(!add(kinds,colony))break;}};
 percentage({AbilityKind::ColonizeRock,AbilityKind::ColonizeIce,AbilityKind::ColonizeGas},hull.minPercentColonyModules,true);percentage({AbilityKind::CargoStorage},hull.minPercentCargo);percentage({AbilityKind::LaunchRecoverFighters},hull.minPercentFighterBays);
 return d;
}
