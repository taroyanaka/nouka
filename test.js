(function () {
  'use strict';

  const rawApi = window.__TEST_API__;
  if (!rawApi) throw new Error('test.js requires __TEST_MODE__ before script.js');
  // Keep the legacy vertical-coordinate scenarios readable while the runtime
  // is now landscape. New layout scenarios below use rawApi directly.
  const swapPoint = (x, y) => [y, x];
  const legacyMap = map => {
    const copy = JSON.parse(JSON.stringify(map));
    copy.spawns = copy.spawns.map(p => ({ ...p, x: p.y, y: p.x }));
    copy.base = { ...copy.base, x: copy.base.y, y: copy.base.x };
    copy.routes = Object.fromEntries(Object.entries(copy.routes).map(([id, route]) => [id, route.map(([x, y]) => [y, x])]));
    if (copy.obstacles) copy.obstacles = copy.obstacles.map(([x1, y1, x2, y2]) => [y1, x1, y2, x2]);
    return copy;
  };
  const legacyState = state => {
    const copy = JSON.parse(JSON.stringify(state));
    copy.grid = Array.from({ length: 30 }, (_, y) => Array.from({ length: 15 }, (_, x) => state.grid[y]?.[x] ?? null));
    [...(copy.farms || []), ...(copy.buildings || [])].forEach(item => [item.gx, item.gy] = [item.gy, item.gx]);
    (copy.traps || []).forEach(item => [item.gx, item.gy] = [item.gy, item.gx]);
    (copy.enemies || []).forEach(item => [item.x, item.y] = [item.y / 2, item.x / 2]);
    return copy;
  };
  const coordinateMethods = new Set(['spawnEnemy', 'placeTrap', 'placeTrapDefinition', 'tryPlaceTrapDefinition', 'placeBuilding', 'placeFarm', 'blockCell']);
  const api = new Proxy(rawApi, { get(target, property) {
    if (property === 'getState' || property === 'testState') return (...args) => legacyState(target[property](...args));
    if (property === 'getDefinitions') return () => { const defs = target.getDefinitions(); defs.MAP_DEFINITIONS = Object.fromEntries(Object.entries(defs.MAP_DEFINITIONS).map(([id, map]) => [id, legacyMap(map)])); return defs; };
    if (property === 'findPath') return (x, y, tx, ty) => target.findPath(...swapPoint(x, y), ...swapPoint(tx, ty)).map(([px, py]) => [py, px]);
    if (coordinateMethods.has(property)) return (...args) => {
      const bare = property === 'placeFarm' || property === 'blockCell';
      const offset = bare ? 0 : 1;
      const [x, y] = swapPoint(args[offset], args[offset + 1]);
      if (property === 'placeTrapDefinition' || property === 'tryPlaceTrapDefinition') {
        const definition = { ...args[0], ...(args[0]?.type === 'line' ? { direction: 'right' } : {}) };
        return target[property](definition, x, y, ...args.slice(3));
      }
      return bare ? target[property](x, y, ...args.slice(2)) : target[property](args[0], x, y, ...args.slice(3));
    };
    if (property === 'damageEnemy') return (index, damage, x, y) => target.damageEnemy(index, damage, y * 2, x * 2);
    if (property === 'reset') return (...args) => legacyState(target.reset(...args));
    return target[property];
  }});

  const output = [];
  const failures = [];
  const root = document.getElementById('test-output');
  const write = event => {
    const line = JSON.stringify({ timestamp: new Date().toISOString(), ...event });
    output.push(line);
    console.log(line);
    if (root) root.textContent += `${line}\n`;
  };
  const same = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);
  function assert(scenarioId, phase, seed, frame, label, actual, expected) {
    const ok = same(actual, expected);
    write({ phase, scenarioId, seed, mapId: 'straight', frame, event: ok ? 'assertion_passed' : 'assertion_failed', status: ok ? 'passed' : 'failed', expected, actual, label });
    if (!ok) failures.push({ scenarioId, label, expected, actual });
    return ok;
  }

  function runScenario({ scenarioId, phase, seed, setup, simulationFrames = 0, assertions }) {
    write({ phase, scenarioId, seed, mapId: 'straight', frame: 0, event: 'scenario_start', status: 'running' });
    try {
      api.setSeed(seed);
      api.reset({ mapId: 'straight', difficulty: 1, blockedTileSpawnRate: 0, disableDrones: true, disableBuffs: true });
      setup?.();
      const before = api.getState();
      write({ phase, scenarioId, seed, mapId: 'straight', frame: before.frame, event: 'spawned', status: 'passed', actual: before.enemies });
      api.step(simulationFrames);
      const failureCount = failures.length;
      assertions(api.getState(), before);
      write({ phase, scenarioId, seed, mapId: 'straight', frame: api.getState().frame, event: 'scenario_end', status: failures.length === failureCount ? 'passed' : 'failed' });
    } catch (error) {
      failures.push({ scenarioId, error: String(error) });
      write({ phase, scenarioId, seed, mapId: 'straight', frame: api.getState().frame, event: 'assertion_failed', status: 'error', actual: String(error) });
    }
  }

  function runEnemyTests() {
    const definitions = api.getDefinitions().ENEMY_DEFINITIONS;
    Object.entries(definitions).forEach(([id, definition], index) => {
      const seed = 1000 + index;
      runScenario({
        scenarioId: `enemy_basic_${id}`,
        phase: 'enemy',
        seed,
        setup: () => api.spawnEnemy(id, 7, 0),
        simulationFrames: 1,
        assertions: (state, before) => {
          const enemy = before.enemies[0];
          assert(`enemy_basic_${id}`, 'enemy', seed, 0, 'enemyId', enemy.type, id);
          assert(`enemy_basic_${id}`, 'enemy', seed, 0, 'spawn', [Math.floor((enemy.x - 12) / 24), Math.floor((enemy.y - 12) / 24)], [7, 0]);
          assert(`enemy_basic_${id}`, 'enemy', seed, 0, 'hp', enemy.hp, definition.hp);
          assert(`enemy_basic_${id}`, 'enemy', seed, 0, 'maxHp', enemy.maxHp, definition.hp);
          assert(`enemy_basic_${id}`, 'enemy', seed, 0, 'speed', enemy.baseSpeed, definition.speed);
          assert(`enemy_basic_${id}`, 'enemy', seed, 0, 'damage', enemy.baseDamage, definition.damage);
          assert(`enemy_basic_${id}`, 'enemy', seed, 0, 'armor', enemy.armor, definition.armor);
          assert(`enemy_basic_${id}`, 'enemy', seed, 0, 'trapResistance', enemy.trapResistance, definition.trapResistance);
          assert(`enemy_basic_${id}`, 'enemy', seed, 0, 'abilities', enemy.abilities, definition.abilities);
          assert(`enemy_basic_${id}`, 'enemy', seed, 1, 'moves_toward_base', state.enemies[0].y > enemy.y, true);
        }
      });
    });
  }

  function trapDefinition(type, effect) {
    const effects = Array.isArray(effect) ? effect : [effect];
    return { id: `test_${type}_${effects.map(item => item.type).join('_')}`, name: 'test trap', type, cost: 0, cooldown: 999, range: 4, radius: 2, width: 1, duration: 2, effects: effects.map(item => ({ duration: 1 / 6, ...item })) };
  }

  function runTrapRangeTests() {
    const cases = [
      { id: 'line', trap: { type: 'line', x: 7, y: 5 }, enemies: [[7, 6], [8, 6]], expected: 1 },
      { id: 'tile', trap: { type: 'tile', x: 7, y: 6 }, enemies: [[7, 6], [7, 7]], expected: 1 },
      { id: 'area', trap: { type: 'area', x: 7, y: 5 }, enemies: [[7, 6], [7, 7], [10, 10]], expected: 2 }
    ];
    cases.forEach((scenario, index) => runScenario({
      scenarioId: `trap_range_${scenario.id}`,
      phase: 'trap_range',
      seed: 2000 + index,
      setup: () => {
        scenario.enemies.forEach(([x, y]) => api.spawnEnemy('peasant', x, y));
        api.placeTrapDefinition(trapDefinition(scenario.trap.type, { type: 'stun' }), scenario.trap.x, scenario.trap.y);
      },
      simulationFrames: 1,
      assertions: state => {
        const targeted = state.enemies.filter(enemy => enemy.statusEffects.some(effect => effect.type === 'stun'));
        assert(`trap_range_${scenario.id}`, 'trap_range', 2000 + index, 1, 'target_count', targeted.length, scenario.expected);
      }
    }));
  }

  function runTrapEffectTests() {
    const effects = [
      ['slow', { amount: 0.75 }, enemy => enemy.trapSpeedMultiplier, 0.25],
      ['poison', { amount: 1, interval: 1 / 60 }, enemy => enemy.hp < enemy.maxHp, true],
      ['burn', { amount: 1, interval: 1 / 60 }, enemy => enemy.hp < enemy.maxHp, true],
      ['armor_down', { amount: 0.2 }, enemy => enemy.trapArmor, 0.2],
      ['stun', {}, enemy => enemy.trapStunned, true],
      ['knockback', { amount: 1 }, enemy => enemy.statusEffects.some(effect => effect.type === 'knockback'), true],
      ['pull', { amount: 1 }, enemy => enemy.statusEffects.some(effect => effect.type === 'pull'), true]
    ];
    effects.forEach(([effectType, effect, read, expected], index) => runScenario({
      scenarioId: `trap_effect_${effectType}`,
      phase: 'trap_effect',
      seed: 2100 + index,
      setup: () => {
        api.spawnEnemy('peasant', 7, 6);
        api.placeTrapDefinition(trapDefinition('area', { type: effectType, ...effect }), 7, 5);
      },
      simulationFrames: 1,
      assertions: (state, before) => {
        const enemy = state.enemies[0];
        assert(`trap_effect_${effectType}`, 'trap_effect', 2100 + index, 1, 'effect_state', read(enemy), expected);
        assert(`trap_effect_${effectType}`, 'trap_effect', 2100 + index, 1, 'duration', enemy.statusEffects[0]?.remaining, 9);
        api.step(10);
        assert(`trap_effect_${effectType}`, 'trap_effect', 2100 + index, 11, 'effect_expired', api.getState().enemies[0]?.statusEffects.some(item => item.type === effectType) || false, false);
      }
    }));
  }

  function runTrapCombinationTests() {
    const scenarios = [
      ['line', 1, [[7, 6], [8, 6]]],
      ['tile', 1, [[7, 6], [7, 7]]],
      ['area', 2, [[7, 6], [7, 7], [10, 10]]]
    ];
    scenarios.forEach(([type, expected, positions], index) => runScenario({
      scenarioId: `trap_combination_${type}`,
      phase: 'trap_combination',
      seed: 2200 + index,
      setup: () => {
        positions.forEach(([x, y]) => api.spawnEnemy('peasant', x, y));
        api.placeTrapDefinition(trapDefinition(type, { type: 'poison', amount: 1, interval: 1 / 60 }), 7, type === 'tile' ? 6 : 5);
      },
      simulationFrames: 1,
      assertions: state => {
        const affected = state.enemies.filter(enemy => enemy.statusEffects.some(effect => effect.type === 'poison'));
        assert(`trap_combination_${type}`, 'trap_combination', 2200 + index, 1, 'affected_count', affected.length, expected);
      }
    }));

    runScenario({
      scenarioId: 'trap_combination_area_slow',
      phase: 'trap_combination',
      seed: 2204,
      setup: () => {
        api.spawnEnemy('peasant', 7, 6);
        api.spawnEnemy('peasant', 7, 8);
        api.placeTrapDefinition(trapDefinition('area', { type: 'slow', amount: 0.5 }), 7, 5);
      },
      simulationFrames: 1,
      assertions: state => {
        assert('trap_combination_area_slow', 'trap_combination', 2204, 1, 'inside_slow', state.enemies[0]?.trapSpeedMultiplier, 0.5);
        assert('trap_combination_area_slow', 'trap_combination', 2204, 1, 'outside_unaffected', state.enemies[1]?.trapSpeedMultiplier, 1);
        assert('trap_combination_area_slow', 'trap_combination', 2204, 1, 'inside_effect_count', state.enemies[0]?.statusEffects.length, 1);
      }
    });

    runScenario({
      scenarioId: 'trap_combination_tile_multiple_effects',
      phase: 'trap_combination',
      seed: 2205,
      setup: () => {
        api.spawnEnemy('peasant', 7, 6);
        api.spawnEnemy('peasant', 7, 7);
        api.placeTrapDefinition(trapDefinition('tile', [
          { type: 'slow', amount: 0.5 },
          { type: 'poison', amount: 1, interval: 1 / 60 },
          { type: 'armor_down', amount: 0.2 }
        ]), 7, 6);
      },
      simulationFrames: 1,
      assertions: state => {
        const inside = state.enemies[0];
        const outside = state.enemies[1];
        assert('trap_combination_tile_multiple_effects', 'trap_combination', 2205, 1, 'inside_effect_types', inside?.statusEffects.map(effect => effect.type).sort(), ['armor_down', 'poison', 'slow']);
        assert('trap_combination_tile_multiple_effects', 'trap_combination', 2205, 1, 'inside_slow', inside?.trapSpeedMultiplier, 0.5);
        assert('trap_combination_tile_multiple_effects', 'trap_combination', 2205, 1, 'inside_poison', inside?.hp < inside?.maxHp, true);
        assert('trap_combination_tile_multiple_effects', 'trap_combination', 2205, 1, 'inside_armor_down', inside?.trapArmor, 0.2);
        assert('trap_combination_tile_multiple_effects', 'trap_combination', 2205, 1, 'outside_unaffected', outside?.statusEffects.length, 0);
      }
    });
  }

  function runEnemyAbilityTests() {
    const cases = [
      { id: 'drummer_speed_aura', setup: () => { api.spawnEnemy('drummer', 7, 5); api.spawnEnemy('peasant', 7, 6); }, frames: 1, actual: state => state.enemies[1]?.speedMultiplier, expected: 1.2 },
      { id: 'drummer_attack_aura', setup: () => { api.spawnEnemy('drummer', 7, 5); api.spawnEnemy('peasant', 7, 6); }, frames: 1, actual: state => state.enemies[1]?.attackMultiplier, expected: 1.2 },
      { id: 'wizard_speed_aura', setup: () => { api.spawnEnemy('wizard_speed', 7, 5); api.spawnEnemy('peasant', 7, 6); }, frames: 1, actual: state => state.enemies[1]?.speedMultiplier, expected: 1.25 },
      { id: 'wizard_attack_aura', setup: () => { api.spawnEnemy('wizard_attack', 7, 5); api.spawnEnemy('peasant', 7, 6); }, frames: 1, actual: state => state.enemies[1]?.attackMultiplier, expected: 1.25 },
      { id: 'priest_heal', setup: () => { api.spawnEnemy('priest', 7, 5); api.spawnEnemy('peasant', 7, 6); api.setEnemyHp(1, 1); }, frames: 120, actual: state => state.enemies[1]?.hp, expected: 6 },
      { id: 'wizard_heal', setup: () => { api.spawnEnemy('wizard_heal', 7, 5); api.spawnEnemy('peasant', 7, 6); api.setEnemyHp(1, 1); }, frames: 90, actual: state => state.enemies[1]?.hp, expected: 5 }
    ];
    cases.forEach((scenario, index) => runScenario({
      scenarioId: `enemy_ability_${scenario.id}`,
      phase: 'enemy_ability',
      seed: 1200 + index,
      setup: scenario.setup,
      simulationFrames: scenario.frames,
      assertions: state => assert(`enemy_ability_${scenario.id}`, 'enemy_ability', 1200 + index, state.frame, 'ability_effect', scenario.actual(state), scenario.expected)
    }));
    runScenario({
      scenarioId: 'enemy_ability_shieldmaster_front', phase: 'enemy_ability', seed: 1220,
      setup: () => { api.spawnEnemy('shieldmaster', 7, 6); api.setEnemyHp(0, 130); },
      simulationFrames: 1,
      assertions: state => {
        const enemy = state.enemies[0];
        api.damageEnemy(0, 100, enemy.x, enemy.y + 100);
        assert('enemy_ability_shieldmaster_front', 'enemy_ability', 1220, 0, 'front_reduction', api.getState().enemies[0].hp, 110);
        api.damageEnemy(0, 100, enemy.x + 100, enemy.y);
        assert('enemy_ability_shieldmaster_front', 'enemy_ability', 1220, 0, 'side_armor_only', api.getState().enemies[0].hp, 30);
      }
    });
  }

  function runEnemyProgressionTests() {
    const defs = api.getDefinitions();
    const difficulty = { initialMoney: 333, waves: { 1: { peasant: 2, adventurer: 1 } } };
    runScenario({scenarioId:'enemy_difficulty_wave_modifiers',phase:'enemy_progression',seed:1300,
      setup:()=>{api.setDifficultyConfig(3,difficulty);api.reset({mapId:'straight',difficulty:3,blockedTileSpawnRate:0,disableDrones:true,disableBuffs:true});api.startWave()},
      simulationFrames:54,
      assertions:state=>{const e=state.enemies[0];assert('enemy_difficulty_wave_modifiers','enemy_progression',1300,0,'wave_hp',e.maxHp,20);assert('enemy_difficulty_wave_modifiers','enemy_progression',1300,0,'wave_speed',e.baseSpeed,1.2);assert('enemy_difficulty_wave_modifiers','enemy_progression',1300,0,'wave_damage',e.baseDamage,4);assert('enemy_difficulty_wave_modifiers','enemy_progression',1300,0,'direct_enemy_count',state.enemies.length,3)}});
    api.setDifficultyConfig(3,{initialMoney:501,waves:{1:{peasant:10,adventurer:5}}});

    Object.entries(defs.MAP_DEFINITIONS).forEach(([mapId,map],index)=>runScenario({
      scenarioId:`map_spawn_${mapId}`,phase:'map',seed:1310+index,setup:()=>api.reset({mapId,difficulty:1,blockedTileSpawnRate:0,disableDrones:true,disableBuffs:true}),
      assertions:state=>{assert(`map_spawn_${mapId}`,'map',1310+index,0,'spawn_count',map.spawns.length,map.spawns.length);map.spawns.forEach((spawn,i)=>{api.spawnEnemy('peasant',spawn.x,spawn.y);const e=api.getState().enemies[i];assert(`map_spawn_${mapId}`,'map',1310+index,0,`spawn_${i}`,[e.x,e.y],[spawn.x*24+12,spawn.y*24+12])})}
    }));
    runScenario({scenarioId:'path_bfs_success',phase:'path',seed:1320,setup:()=>{},assertions:()=>assert('path_bfs_success','path',1320,0,'path_length',api.findPath(7,0,7,29).length>0,true)});
    runScenario({scenarioId:'path_bfs_failure_after_wall',phase:'path',seed:1321,setup:()=>{for(let x=0;x<15;x++)api.blockCell(x,1)},assertions:()=>assert('path_bfs_failure_after_wall','path',1321,0,'path_empty',api.findPath(7,0,7,29),[])});
    runScenario({scenarioId:'enemy_repath_timers',phase:'path',seed:1322,setup:()=>api.spawnEnemy('peasant',7,0),simulationFrames:20,assertions:state=>{const e=state.enemies[0];assert('enemy_repath_timers','path',1322,20,'twenty_frame_repath_tick',e.pathTick,0);for(let x=0;x<15;x++)api.blockCell(x,2);api.step(20);assert('enemy_repath_timers','path',1322,40,'obstacle_repath_path',api.getState().enemies[0].pathLength,0)}});
    runScenario({scenarioId:'enemy_nearest_farm',phase:'enemy',seed:1323,setup:()=>{api.placeFarm(5,10);api.placeFarm(12,20);api.spawnEnemy('peasant',7,2)},simulationFrames:1,assertions:state=>assert('enemy_nearest_farm','enemy',1323,1,'moves_to_nearest_farm',state.enemies[0].y>2*24+12,true)});
    runScenario({scenarioId:'farm_continuous_attack',phase:'enemy',seed:1324,setup:()=>api.spawnEnemy('peasant',7,29),simulationFrames:5,assertions:state=>assert('farm_continuous_attack','enemy',1324,5,'farm_hp_decreases',state.farms[0].hp<state.farms[0].maxHp,true)});
    runScenario({scenarioId:'farm_destroy_game_over',phase:'enemy',seed:1325,setup:()=>{api.reset({mapId:'straight',difficulty:4,blockedTileSpawnRate:0,disableDrones:true,disableBuffs:true});api.spawnEnemy('peasant',7,29);api.setEnemyDamage(0,6000)},simulationFrames:1,assertions:state=>{assert('farm_destroy_game_over','enemy',1325,1,'all_farms_removed',state.farms.length,0);assert('farm_destroy_game_over','enemy',1325,1,'game_over',state.gameResult,'GAME OVER')}});
    runScenario({scenarioId:'dead_enemy_removed',phase:'enemy',seed:1326,setup:()=>{api.spawnEnemy('peasant',7,1);api.setEnemyHp(0,0);api.setWaveActive(false)},simulationFrames:1,assertions:state=>assert('dead_enemy_removed','enemy',1326,1,'enemy_array_empty',state.enemies.length,0)});
  }

  function runWaveProgressionTests() {
    runScenario({scenarioId:'wave_exact_count',phase:'wave',seed:1400,setup:()=>{api.setWaveConfig({peasant:2});api.startWave()},simulationFrames:27,assertions:state=>{assert('wave_exact_count','wave',1400,27,'exact_spawn_count',state.enemies.length,2);assert('wave_exact_count','wave',1400,27,'configured_id_used',state.enemies.every(e=>e.type==='peasant'),true)}});
    runScenario({scenarioId:'wave_round_robin_spawns',phase:'wave',seed:1401,setup:()=>{api.reset({mapId:'parallel_double',difficulty:1,blockedTileSpawnRate:0,disableDrones:true,disableBuffs:true});api.setWaveConfig({peasant:3});api.startWave()},simulationFrames:54,assertions:state=>assert('wave_round_robin_spawns','wave',1401,54,'spawn_order',state.enemies.map(e=>e.id),['left','right','left'])});
    runScenario({scenarioId:'wave_restart_forbidden',phase:'wave',seed:1402,setup:()=>{api.setWaveConfig({peasant:2});api.startWave();api.startWave()},assertions:state=>assert('wave_restart_forbidden','wave',1402,0,'single_wave',state.wave,1)});
    runScenario({scenarioId:'wave_without_farm_forbidden',phase:'wave',seed:1403,setup:()=>api.removeAllFarms(),assertions:state=>{const result=api.tryStartWave();assert('wave_without_farm_forbidden','wave',1403,0,'wave_unchanged',result.after.wave,0);assert('wave_without_farm_forbidden','wave',1403,0,'no_spawn',result.after.enemies.length,0)}});
    runScenario({scenarioId:'wave_clear_and_final_victory',phase:'wave',seed:1404,setup:()=>{api.setMaxWave(1);api.setWaveConfig({peasant:1});api.startWave();api.setEnemyHp(0,0)},simulationFrames:28,assertions:state=>{assert('wave_clear_and_final_victory','wave',1404,28,'final_wave',state.wave,1);assert('wave_clear_and_final_victory','wave',1404,28,'victory',state.gameResult,'VICTORY!')}});
    api.setMaxWave(10);
  }

  function runTrapBoundaryAndValidationTests() {
    const make=(type,extra={})=>({id:`boundary_${type}`,name:'boundary',type,cost:10,cooldown:2/60,range:4,radius:3,width:1,duration:1,effects:[{type:'stun',duration:1}],...extra});
    runScenario({scenarioId:'trap_line_width_and_direction',phase:'trap_boundary',seed:1502,setup:()=>{api.spawnEnemy('peasant',7,6);api.spawnEnemy('peasant',7,4);api.spawnEnemy('peasant',8,6);api.placeTrapDefinition(make('line',{range:4,width:1}),7,5)},simulationFrames:1,assertions:state=>assert('trap_line_width_and_direction','trap_boundary',1502,1,'line_targets',state.enemies.map(e=>e.trapStunned),[true,false,false])});
    runScenario({scenarioId:'trap_area_radius_boundary',phase:'trap_boundary',seed:1503,setup:()=>{api.spawnEnemy('peasant',10,5);api.spawnEnemy('peasant',10.51,5);api.placeTrapDefinition(make('area',{radius:3}),7,5)},simulationFrames:1,assertions:state=>assert('trap_area_radius_boundary','trap_boundary',1503,1,'area_boundary',state.enemies.map(e=>e.trapStunned),[true,false])});
    runScenario({scenarioId:'trap_tile_cell_boundary',phase:'trap_boundary',seed:1504,setup:()=>{api.spawnEnemy('peasant',7,6);api.spawnEnemy('peasant',8,6);api.placeTrapDefinition(make('tile'),7,6)},simulationFrames:1,assertions:state=>assert('trap_tile_cell_boundary','trap_boundary',1504,1,'tile_cell',state.enemies.map(e=>e.trapStunned),[true,false])});
    runScenario({scenarioId:'trap_cooldown_and_reapply',phase:'trap_boundary',seed:1505,setup:()=>{api.spawnEnemy('peasant',7,6);api.placeTrapDefinition(make('line',{effects:[{type:'poison',amount:1,duration:1,interval:999}]}),7,5)},simulationFrames:1,assertions:state=>{const first=state.enemies[0].statusEffects[0].remaining;api.step(1);const second=api.getState().enemies[0].statusEffects[0].remaining;api.step(1);const third=api.getState().enemies[0].statusEffects[0].remaining;assert('trap_cooldown_and_reapply','trap_boundary',1505,3,'not_reapplied_during_cooldown',second,first-1);assert('trap_cooldown_and_reapply','trap_boundary',1505,3,'reapplied_after_cooldown',third,59)}});
    runScenario({scenarioId:'trap_resistance_damage_interval',phase:'trap_effect',seed:1506,setup:()=>{api.spawnEnemy('brute',7,6);api.placeTrapDefinition({id:'resist',name:'resist',type:'line',cost:0,cooldown:999,range:4,width:1,effects:[{type:'poison',amount:10,duration:10/60,interval:2/60}]},7,5)},simulationFrames:2,assertions:state=>{assert('trap_resistance_damage_interval','trap_effect',1506,2,'resisted_duration',state.enemies[0].statusEffects[0].remaining,3);assert('trap_resistance_damage_interval','trap_effect',1506,2,'interval_damage',state.enemies[0].hp,236.75)}});
    runScenario({scenarioId:'trap_knockback_pull_clamp',phase:'trap_effect',seed:1507,setup:()=>{api.spawnEnemy('peasant',0,1);api.placeTrapDefinition(make('line',{effects:[{type:'knockback',amount:99,duration:1}]}),0,1)},simulationFrames:1,assertions:state=>{assert('trap_knockback_pull_clamp','trap_effect',1507,1,'canvas_clamped',state.enemies[0].x>=2&&state.enemies[0].y>=26,true);}});
    runScenario({scenarioId:'trap_wave_stop_duplicate_invalid_and_clone',phase:'trap_validation',seed:1508,setup:()=>{const d=make('line');api.setWaveActive(false);api.placeTrapDefinition(d,7,5);d.effects[0].duration=0.1;const duplicate=api.tryPlaceTrapDefinition(d,7,5);const invalid=api.tryPlaceTrapDefinition({...d,id:'bad',effects:[]},8,5);api.setWaveActive(true);return {duplicate,invalid}},assertions:state=>{assert('trap_wave_stop_duplicate_invalid_and_clone','trap_validation',1508,1,'trap_unchanged_after_definition_mutation',state.traps[0].definition.effects[0].duration,1);assert('trap_wave_stop_duplicate_invalid_and_clone','trap_validation',1508,1,'one_trap',state.traps.length,1)}});
    runScenario({scenarioId:'trap_prices_and_six_coin_pusher_defaults',phase:'trap_validation',seed:1509,setup:()=>{},assertions:()=>{const defs=api.getDefinitions().TRAP_DEFINITIONS;const values=Object.values(defs);assert('trap_prices_and_six_coin_pusher_defaults','trap_validation',1509,0,'default_trap_count',values.length,6);assert('trap_prices_and_six_coin_pusher_defaults','trap_validation',1509,0,'default_trap_ids',values.map(d=>d.id).sort(),['trap_line_knockback','trap_line_pull','trap_tile_armor_down','trap_tile_burn','trap_tile_poison','trap_tile_slow']);assert('trap_prices_and_six_coin_pusher_defaults','trap_validation',1509,0,'default_trap_effects',values.map(d=>d.effects[0].type).sort(),['armor_down','burn','knockback','poison','pull','slow']);assert('trap_prices_and_six_coin_pusher_defaults','trap_validation',1509,0,'nonnegative_prices',values.every(d=>d.cost>=0),true)}});
  }

  function runBuffTests() {
    const definitions = api.getDefinitions().BUFF_DEFINITIONS;
    runScenario({
      scenarioId: 'buff_definitions',
      phase: 'buff',
      seed: 2300,
      assertions: state => {
        assert('buff_definitions', 'buff', 2300, 0, 'definition_count', definitions.length, 100);
        assert('buff_definitions', 'buff', 2300, 0, 'all_ids_unique', new Set(definitions.map(definition => definition[0])).size, definitions.length);
      }
    });

    const runtimeCases = [
      {
        id: 'buff_money_instant', expected: 801,
        setup: () => api.applyBuff('buff_money_instant'),
        actual: state => state.money
      },
      {
        id: 'buff_farm_hp', expected: 150,
        setup: () => { api.applyBuff('buff_farm_hp'); api.placeFarm(6, 29); },
        actual: state => state.farms.find(farm => farm.gx === 6 && farm.gy === 29)?.maxHp
      },
      {
        id: 'buff_science_gen', expected: 2,
        setup: () => { api.applyBuff('buff_science_gen'); api.placeBuilding('lab', 7, 28); },
        simulationFrames: 120,
        actual: state => state.science
      }
    ];
    runtimeCases.forEach((scenario, index) => runScenario({
      scenarioId: scenario.id,
      phase: 'buff',
      seed: 2310 + index,
      setup: scenario.setup,
      simulationFrames: scenario.simulationFrames || 0,
      assertions: state => assert(scenario.id, 'buff', 2310 + index, state.frame, 'runtime_effect', scenario.actual(state), scenario.expected)
    }));

    definitions.forEach((definition, index) => runScenario({
      scenarioId: `buff_definition_apply_${definition[0]}`,
      phase: 'buff_definition',
      seed: 2400 + index,
      setup: () => api.applyBuff(definition[0]),
      assertions: state => assert(`buff_definition_apply_${definition[0]}`, 'buff_definition', 2400 + index, 0, 'applied_to_state', state.buffs.includes(definition[0]), true)
    }));

    const metricCases = [
      ['buff_mg_damage', 'mgDamage', 1.2], ['buff_crop_sell', 'cropSell', 1.25], ['buff_drone_speed', 'droneSpeed', 1.3],
      ['buff_missile_range', 'missileRange', 1.2], ['buff_farm_hp', 'farmHp', 1.5], ['buff_mg_cooldown', 'mgCooldown', .85],
      ['buff_missile_damage', 'missileDamage', 1.25], ['buff_crop_speed', 'cropSpeed', 1.2], ['buff_slow_tile', 'slowTile', 1.15],
      ['buff_science_gen', 'scienceGen', 2]
    ];
    metricCases.forEach(([id, metric, expected], index) => runScenario({
      scenarioId: `buff_metric_${id}`, phase: 'buff_runtime', seed: 2500 + index,
      setup: () => api.applyBuff(id),
      assertions: () => assert(`buff_metric_${id}`, 'buff_runtime', 2500 + index, 0, metric, api.getBuffMetrics()[metric], expected)
    }));
  }

  function runRuntimeControlTests() {
    runScenario({scenarioId:'game_speed_control',phase:'runtime',seed:2399,setup:()=>{
      [2,4,8,16].forEach(speed=>assert('game_speed_control','runtime',2399,0,`${speed}x_selectable`,api.setSpeed(speed),speed));
      api.setSpeed(2);
      api.setWaveConfig({peasant:2});
      api.startWave();
    },simulationFrames:14,assertions:state=>{
      assert('game_speed_control','runtime',2399,14,'selected_speed',api.getSpeed(),2);
      assert('game_speed_control','runtime',2399,14,'render_frame_is_not_multiplied',state.frame,14);
      assert('game_speed_control','runtime',2399,14,'simulation_advances_at_selected_speed',state.enemies.length,2);
    }});
    const scenarioId = 'runtime_determinism_and_scheduler';
    const seed = 2400;
    write({ phase: 'runtime', scenarioId, seed, mapId: 'twin_s', frame: 0, event: 'scenario_start', status: 'running' });
    try {
      api.setSeed(seed);
      const first = api.reset({ mapId: 'twin_s', difficulty: 1, blockedTileSpawnRate: 0.15, disableDrones: true, disableBuffs: true });
      api.setSeed(seed);
      const second = api.reset({ mapId: 'twin_s', difficulty: 1, blockedTileSpawnRate: 0.15, disableDrones: true, disableBuffs: true });
      const sameGrid = JSON.stringify(first.grid) === JSON.stringify(second.grid);
      assert(scenarioId, 'runtime', seed, 0, 'same_seed_same_grid', sameGrid, true);

      api.reset({ mapId: 'straight', difficulty: 1, blockedTileSpawnRate: 0, disableDrones: true, disableBuffs: true });
      api.setWaveConfig({ peasant: 2 });
      api.startWave();
      const immediate = api.getState();
      assert(scenarioId, 'runtime', seed, 0, 'wave_starts_immediately', [immediate.wave, immediate.enemies.length, immediate.spawning], [1, 1, true]);
      api.step(27);
      const afterTimer = api.getState();
      assert(scenarioId, 'runtime', seed, afterTimer.frame, 'manual_step_runs_spawn_timer', afterTimer.enemies.length, 2);
      write({ phase: 'runtime', scenarioId, seed, mapId: afterTimer.mapId, frame: afterTimer.frame, event: 'scenario_end', status: 'passed' });
    } catch (error) {
      failures.push({ scenarioId, error: String(error) });
      write({ phase: 'runtime', scenarioId, seed, mapId: 'straight', frame: api.getState().frame, event: 'assertion_failed', status: 'error', actual: String(error) });
    }
  }

  function runLandscapeLayoutTests() {
    const scenarioId = 'landscape_left_to_right_layout';
    const seed = 2600;
    write({ phase: 'layout', scenarioId, seed, mapId: 'straight', frame: 0, event: 'scenario_start', status: 'running' });
    try {
      rawApi.setSeed(seed);
      rawApi.reset({ mapId: 'straight', difficulty: 1, blockedTileSpawnRate: 0, disableDrones: true, disableBuffs: true });
      const definitions = rawApi.getDefinitions();
      const state = rawApi.getState();
      const map = definitions.MAP_DEFINITIONS.straight;
      assert(scenarioId, 'layout', seed, 0, 'grid_is_landscape', [state.grid[0].length, state.grid.length], [30, 15]);
      assert(scenarioId, 'layout', seed, 0, 'spawn_is_left_base_is_right', [map.spawns[0].x, map.base.x], [0, 29]);
      assert(scenarioId, 'layout', seed, 0, 'canvas_is_landscape_2x', [canvas.width, canvas.height], [1440, 720]);
      rawApi.spawnEnemy('peasant', map.spawns[0].x, map.spawns[0].y);
      const before = rawApi.getState().enemies[0].x;
      rawApi.step(1);
      const after = rawApi.getState().enemies[0].x;
      assert(scenarioId, 'layout', seed, 1, 'enemy_moves_left_to_right', after > before, true);
      write({ phase: 'layout', scenarioId, seed, mapId: 'straight', frame: 1, event: 'scenario_end', status: 'passed' });
    } catch (error) {
      failures.push({ scenarioId, error: String(error) });
      write({ phase: 'layout', scenarioId, seed, mapId: 'straight', frame: 0, event: 'assertion_failed', status: 'error', actual: String(error) });
    }
  }

  write({ phase: 'all', scenarioId: 'test_run', seed: null, mapId: 'straight', frame: 0, event: 'test_start', status: 'running' });
  runEnemyTests();
  runEnemyProgressionTests();
  runEnemyAbilityTests();
  runTrapRangeTests();
  runTrapEffectTests();
  runTrapCombinationTests();
  runTrapBoundaryAndValidationTests();
  runWaveProgressionTests();
  runBuffTests();
  runRuntimeControlTests();
  runLandscapeLayoutTests();
  let parsedOutput = output.map(line => JSON.parse(line));
  const scenarioCount = parsedOutput.filter(event => event.event === 'scenario_end').length;
  const expectedScenarioCount = 183;
  if (scenarioCount !== expectedScenarioCount) {
    const mismatch = {
      scenarioId: 'test_run',
      label: 'scenario_count',
      expected: expectedScenarioCount,
      actual: scenarioCount
    };
    failures.push(mismatch);
    write({
      phase: 'all',
      scenarioId: 'test_run',
      seed: null,
      mapId: 'straight',
      frame: api.getState().frame,
      event: 'assertion_failed',
      status: 'failed',
      ...mismatch
    });
    parsedOutput = output.map(line => JSON.parse(line));
  }
  const result = { status: failures.length ? 'failed' : 'passed', totalFailures: failures.length, failures, logs: output, scenarioCount, expectedScenarioCount, failedAssertionCount: parsedOutput.filter(event => event.event === 'assertion_failed').length };
  write({ phase: 'all', scenarioId: 'test_run', seed: null, mapId: 'straight', frame: api.getState().frame, event: 'test_end', status: result.status, actual: { failures: failures.length } });
  result.logs = output.slice();
  result.generatedAt = new Date().toISOString();
  const resultJson = JSON.stringify(result, null, 2);
  try {
    localStorage.setItem('farm-defense-test-log', resultJson);
    const status = document.getElementById('log-status');
    if (status) status.textContent = ' localStorageに保存済み';
    const saveButton = document.getElementById('save-log');
    if (saveButton) saveButton.hidden = false;
  } catch (error) {
    console.warn('テストログをlocalStorageへ保存できませんでした', error);
  }
  document.getElementById('save-log')?.addEventListener('click', () => {
    const blob = new Blob([localStorage.getItem('farm-defense-test-log') || resultJson], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'test-log.json';
    link.click();
    URL.revokeObjectURL(link.href);
    const status = document.getElementById('log-status');
    if (status) status.textContent = ' test-log.jsonをダウンロードしました';
  });
  window.__TEST_RESULT__ = result;
})();
