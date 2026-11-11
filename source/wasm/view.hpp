#pragma once
#include "game/rules.hpp"
#include "script/value.hpp"
opense4::script::Value browserSnapshot(const opense4::game::Rules&, const opense4::game::GameState&, opense4::game::EmpireId viewer = opense4::game::EmpireId{0});
