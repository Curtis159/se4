export function selectedRouteShip(snapshot,selection,sector,system,selectedShip){
 if(!snapshot||!selection||!sector||sector.system!==system||selection.ship!==selectedShip)return null;
 const ship=snapshot.ships.find(s=>s.id===selection.ship);
 if(!ship||ship.location.system!==sector.system||ship.location.x!==sector.x||ship.location.y!==sector.y)return null;
 if(selection.kind==='fleet'&&(ship.fleet<0||!ship.fleetLocation||ship.fleetLocation.system!==sector.system||ship.fleetLocation.x!==sector.x||ship.fleetLocation.y!==sector.y))return null;
 return ship;
}
