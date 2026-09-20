const CONFIG={gridCols:15,gridRows:30,maxWave:10,initialMoney:501,blockedTileSpawnRate:.15,waveSpawnInterval:180,waveDensityMultiplier:1.25,slowTileEffect:.5,costFarm:150,costLab:250,costSlow:50,costMG:100,costMissile:200,costDrone:150,cropSellValue:2,cropGrowSpeed:3,droneBaseSpeed:1.6,mgDamage:12,mgRange:3.5,mgCooldown:17,missileDamage:19,missileRange:8,missileCooldown:33,missileSplashRadius:3.2,enemyBaseHp:50,enemyBaseSpeed:1.2,enemyBaseDamage:8,enemyBaseCount:15,runnerEnemyHp:20,runnerEnemySpeed:2.2,runnerEnemyDamage:5,tankEnemyHp:220,tankEnemySpeed:1,tankEnemyDamage:25};
let currentDifficultyLevel=1,activeDifficultyLevel=1;
const DIFFICULTY_KEYS=['initialMoney'];
const DIFFICULTY_WAVE_KEYS=[];
const BUILDING_COST_KEYS=Object.freeze({farm:'costFarm',lab:'costLab',slow:'costSlow',mg:'costMG',missile:'costMissile'});
function normalizeDifficultyLevel(level){return Math.max(1,Math.min(5,Math.floor(Number(level)||1)))}
function buildingCostKey(type){return BUILDING_COST_KEYS[type]}
function buildingUpgradeBaseCost(type){return CONFIG[type==='mg'?'costMG':type==='missile'?'costMissile':type==='lab'?'costLab':'costFarm']}
function droneCount(type){return drones.filter(drone=>drone.type===type).length}
function regulationDifficulty(level=currentDifficultyLevel){const r=activeRegulation();return r?.difficulties?.[normalizeDifficultyLevel(level)]||null}
function difficultyConfig(){return regulationDifficulty(activeDifficultyLevel)||{initialMoney:CONFIG.initialMoney,waves:{}}}
function selectedDifficultyConfig(){return regulationDifficulty(currentDifficultyLevel)||{initialMoney:CONFIG.initialMoney,waves:{}}}
function difficultyWaveConfig(wave){return difficultyConfig().waves?.[wave]||null}
function difficultyMultiplier(){return 1}
function scaledCost(base){return Math.floor(Math.max(0,Number(base)||0))}
function getBuildingCost(type){const key=buildingCostKey(type);const trap=TRAP_DEFINITIONS?.[type];const raw=trap?Number(trap.cost)||0:scaledCost(key?CONFIG[key]:0);const discount=trap?.type==='tile'&&typeof extDiscount==='function'?extDiscount('tile_trap'):1;return scaledCost(raw*discount)}
function getDroneCost(type){return scaledCost(CONFIG.costDrone*Math.pow(1.5,droneCount(type)))}
function getBuildingUpgradeCost(building){return scaledCost(buildingUpgradeBaseCost(building.type)*.8*building.level)}
function getFarmUpgradeCost(farm){return scaledCost(CONFIG.costFarm*1.5*farm.level)}
function getDifficultyEnemyCount(count){return Math.max(0,Math.floor((Number(count)||0)*(Number(CONFIG.waveDensityMultiplier)||1)))}
function buffDefinition(id){return BUFF_DEFINITIONS.find(definition=>definition[0]===id)||TECH_TIER_BUFF_DEFINITIONS.find(definition=>definition[0]===id)}
// [id, name, effectType, effectAmount, description, rarity]
const BUFF_DEFINITIONS=[['buff_mg_damage','弾丸強化','mg_damage',.2,'マシンガンダメージ +20%',1],['buff_crop_sell','効率収穫','crop_sell',.25,'作物売却額 +25%',1],['buff_drone_speed','ドローン推進器','drone_speed',.3,'全ドローン速度 +30%',1],['buff_missile_range','レーダー追尾','missile_range',.2,'ミサイル射程 +20%',2],['buff_farm_hp','農地補強','farm_hp',.5,'全畑HP +50%',2],['buff_mg_cooldown','連射機構','mg_cooldown',.15,'マシンガン攻撃速度 +15%',2],['buff_missile_damage','高圧弾頭','missile_damage',.25,'ミサイルダメージ +25%',2],['buff_crop_speed','活性肥料','crop_speed',.2,'作物成長速度 +20%',1],['buff_slow_tile','超粘性沼地','slow_tile',.15,'スロー効果強化 +15%',3],['buff_science_gen','研究活性化','science_gen',.5,'科学生成量 +50%',2],['buff_money_instant','緊急助成金','instant_money',300,'即座に $300',1],['buff_trap_duration','持続散布','trap_duration',.25,'毒・焼夷・減速の持続時間 +25%',2],['buff_trap_damage','化学兵器','trap_damage',.25,'毒・焼夷ダメージ +25%',2]];
// Tier 5以降は固有IDのバフにして、同じ効果の再取得でも強化が無駄にならないようにする。
const TECH_TIER_BUFF_DEFINITIONS=[
 ['buff_standard_industrial_farming','工業農業','crop_speed',.35,'作物成長速度 +35%',3],['buff_standard_industrial_market','大規模流通','crop_sell',.35,'作物売却額 +35%',3],
 ['buff_standard_fire_control','射撃管制AI','mg_damage',.45,'マシンガンダメージ +45%',3],['buff_standard_fire_rate','電磁給弾','mg_cooldown',.25,'マシンガン攻撃速度 +25%',3],
 ['buff_standard_bioengineering','生体農地工学','crop_speed',.5,'作物成長速度 +50%',4],['buff_standard_orbital_artillery','軌道砲撃','missile_damage',.55,'ミサイルダメージ +55%',4],
 ['buff_standard_orbital_radar','衛星照準','missile_range',.35,'ミサイル射程 +35%',4],['buff_standard_fortress_grid','要塞農地網','farm_hp',1,'全畑HP +100%',4],
 ['buff_standard_singularity','開拓特異点','mg_damage',.8,'マシンガンダメージ +80%',4],['buff_standard_singularity_rate','超電導給弾','mg_cooldown',.45,'マシンガン攻撃速度 +45%',4],
 ['buff_expedition_core','深層資源核','crop_sell',.45,'作物売却額 +45%',3],['buff_expedition_core_science','地殻解析網','science_gen',.7,'科学生成量 +70%',3],
 ['buff_expedition_fleet','発掘艦隊','drone_speed',.65,'全ドローン速度 +65%',3],['buff_expedition_trade','遺物交易','crop_sell',.55,'作物売却額 +55%',3],
 ['buff_expedition_rare_earth','希少鉱脈精錬','crop_sell',.8,'作物売却額 +80%',4],['buff_expedition_rare_science','古代知識解析','science_gen',.9,'科学生成量 +90%',4],
 ['buff_expedition_quantum_scan','量子スキャナー','drone_speed',.8,'全ドローン速度 +80%',4],['buff_expedition_quantum_range','探査衛星','missile_range',.35,'ミサイル射程 +35%',4],
 ['buff_expedition_underworld','地底炉心','farm_hp',.9,'全畑HP +90%',4],['buff_expedition_underworld_science','地底研究所','science_gen',1.1,'科学生成量 +110%',4],
 ['buff_expedition_legendary','伝説資源市場','crop_sell',1.2,'作物売却額 +120%',4],['buff_expedition_legendary_science','文明級知識庫','science_gen',1.2,'科学生成量 +120%',4],
 ['buff_coin_economy_core','資金循環炉','crop_sell',.5,'作物売却額 +50%',3],['buff_coin_economy_science','量産研究網','science_gen',.7,'科学生成量 +70%',3],
 ['buff_coin_swarm_weapons','群体火器管制','mg_damage',.6,'マシンガンダメージ +60%',3],['buff_coin_swarm_rate','連鎖装填','mg_cooldown',.3,'マシンガン攻撃速度 +30%',3],
 ['buff_coin_rapid_harvest','即応収穫','crop_speed',.65,'作物成長速度 +65%',4],['buff_coin_rapid_income','溢流販売','crop_sell',.65,'作物売却額 +65%',4],
 ['buff_coin_barrage','飽和砲撃','missile_damage',.8,'ミサイルダメージ +80%',4],['buff_coin_barrage_range','広域照準','missile_range',.5,'ミサイル射程 +50%',4],
 ['buff_coin_fortress','資金要塞','farm_hp',1.2,'全畑HP +120%',4],['buff_coin_fortress_slow','通貨粘性場','slow_tile',.45,'スロー効果強化 +45%',4],
 ['buff_coin_overflow','無限弾薬庫','mg_damage',.9,'マシンガンダメージ +90%',4],['buff_coin_overflow_missiles','終端弾頭','missile_damage',1,'ミサイルダメージ +100%',4],['buff_coin_overflow_income','経済特異点','crop_sell',.9,'作物売却額 +90%',4],
 ['buff_drone_logistics','自動物流網','drone_speed',.8,'全ドローン速度 +80%',3],['buff_drone_logistics_income','物流取引','crop_sell',.4,'作物売却額 +40%',3],
 ['buff_drone_ai','群知能制御','drone_speed',.9,'全ドローン速度 +90%',4],['buff_drone_ai_science','自動解析','science_gen',.8,'科学生成量 +80%',4],
 ['buff_drone_replicator_income','複製資源市場','crop_sell',.75,'作物売却額 +75%',4],['buff_drone_core','発掘炉心','drone_speed',1.1,'全ドローン速度 +110%',4],
 ['buff_drone_core_science','炉心解析','science_gen',1.1,'科学生成量 +110%',4],['buff_drone_empire_income','自律帝国市場','crop_sell',1.2,'作物売却額 +120%',4],
 ['buff_tile_inferno','床面熱核','trap_damage',.55,'罠ダメージ +55%',3],['buff_tile_inferno_duration','長時間燃焼','trap_duration',.55,'罠の持続時間 +55%',3],
 ['buff_tile_corrosion','腐食性床面','trap_damage',.65,'罠ダメージ +65%',4],['buff_tile_corrosion_slow','腐食粘液','slow_tile',.45,'スロー効果強化 +45%',4],
 ['buff_tile_network_duration','自動敷設網','trap_duration',.75,'罠の持続時間 +75%',4],['buff_tile_zero_escape','不可避領域','trap_damage',.9,'罠ダメージ +90%',4],
 ['buff_tile_zero_escape_slow','零距離拘束','slow_tile',.65,'スロー効果強化 +65%',4],['buff_tile_reactive_farm','反応式農地','farm_hp',.9,'全畑HP +90%',4],
 ['buff_tile_absolute','絶対防衛圏','trap_damage',1.3,'罠ダメージ +130%',4],['buff_tile_absolute_duration','永続薬剤','trap_duration',1.2,'罠の持続時間 +120%',4],['buff_tile_absolute_slow','時間停止粘液','slow_tile',.9,'スロー効果強化 +90%',4],
 ['buff_discount_drone_advanced','ドローン量産契約','discount_drone',.25,'ドローン購入費が25%引き',3],['buff_discount_drone_master','自律艦隊契約','discount_drone',.35,'ドローン購入費が35%引き',4],
 ['buff_discount_tile_trap_advanced','タイル罠大量調達','discount_tile_trap',.25,'タイル罠作成費が25%引き',3],['buff_discount_tile_trap_master','完全敷設契約','discount_tile_trap',.4,'タイル罠作成費が40%引き',4]
];
// wave number -> {appearanceCount, rarityWeights: {rarity: weight}, acquireCount}
const WAVE_BUFF_CONFIG={default:{appearanceCount:3,rarityWeights:{1:2,2:1},acquireCount:1},waves:{}};
const DEFAULT_TECH_TREES=[
 {id:'standard',name:'標準開拓ツリー',description:'農業と防衛をバランスよく強化',nodes:[
  ['tech_agriculture','近代農業',1,50,[],'buff_crop_speed'],['tech_defense_1','簡易防衛線',1,50,[],'buff_mg_damage'],
  ['tech_irrigation','市場流通改善',2,120,['tech_agriculture'],'buff_crop_sell'],['tech_ballistics','自動装填機構',2,150,['tech_defense_1'],'buff_mg_cooldown'],['tech_science_boost','学術研究推進',2,100,['tech_agriculture','tech_defense_1'],'buff_science_gen'],
  ['tech_automation','ドローン推進器',3,250,['tech_irrigation'],'buff_drone_speed'],['tech_chemistry','農薬・焼夷研究',3,240,['tech_science_boost','tech_defense_1'],'buff_trap_damage,buff_trap_duration'],['tech_heavy_artillery','重火器工学',3,300,['tech_ballistics'],'buff_missile_damage,buff_missile_range'],
  ['tech_geo_engineering','環境改変',4,450,['tech_automation','tech_heavy_artillery'],'buff_slow_tile,buff_farm_hp'],['tech_integrated_defense','統合防衛指揮',4,520,['tech_chemistry','tech_geo_engineering'],'buff_trap_damage,buff_mg_damage,buff_farm_hp'],
  ['tech_industrial_farming','工業農業',5,650,['tech_geo_engineering','tech_integrated_defense'],'buff_standard_industrial_farming,buff_standard_industrial_market'],['tech_fire_control','射撃管制AI',6,800,['tech_integrated_defense'],'buff_standard_fire_control,buff_standard_fire_rate'],
  ['tech_bioengineering','生体農地工学',7,1000,['tech_industrial_farming'],'buff_standard_bioengineering,buff_farm_hp'],['tech_orbital_artillery','軌道砲撃',8,1250,['tech_fire_control'],'buff_standard_orbital_artillery,buff_standard_orbital_radar'],
  ['tech_fortress_grid','要塞農地網',9,1600,['tech_bioengineering','tech_orbital_artillery'],'buff_standard_fortress_grid,buff_slow_tile'],['tech_singularity','開拓特異点',10,2200,['tech_fortress_grid'],'buff_standard_singularity,buff_standard_singularity_rate,buff_standard_orbital_artillery,buff_standard_industrial_market']
 ]},
 {id:'expedition',name:'探検・発掘ツリー',description:'発掘ドローンと資源獲得を優先',nodes:[
  ['dig_start','発掘許可',1,40,[],'buff_money_instant'],['dig_science','地質調査',1,70,[],'buff_science_gen'],['dig_speed','掘削機構',2,130,['dig_start'],'buff_drone_speed'],['dig_luck','幸運の地脈',2,180,['dig_start','dig_science'],'buff_crop_sell'],['dig_yield','資源精製',3,280,['dig_speed','dig_luck'],'buff_money_instant'],['dig_master','深層発掘',4,420,['dig_yield'],'buff_science_gen,buff_money_instant'],['dig_network','地層ネットワーク',4,460,['dig_master','dig_science'],'buff_trap_duration,buff_science_gen'],
  ['dig_core','深層資源核',5,620,['dig_master','dig_network'],'buff_expedition_core,buff_expedition_core_science'],['dig_fleet','発掘艦隊',6,780,['dig_core'],'buff_expedition_fleet,buff_expedition_trade'],['dig_rare_earth','希少鉱脈精錬',7,980,['dig_fleet'],'buff_expedition_rare_earth,buff_expedition_rare_science'],
  ['dig_quantum_scan','量子スキャナー',8,1220,['dig_rare_earth'],'buff_expedition_quantum_scan,buff_expedition_quantum_range'],['dig_underworld','地底炉心',9,1550,['dig_quantum_scan'],'buff_expedition_underworld,buff_expedition_underworld_science'],['dig_legendary','伝説資源市場',10,2100,['dig_underworld'],'buff_expedition_legendary,buff_expedition_legendary_science,buff_expedition_quantum_scan']
 ]}
];
let TECH_TREES=structuredClone(DEFAULT_TECH_TREES),activeTreeId='standard';
const EXCAVATION_DRONE_CONFIG={baseSpeed:1,dropIntervalMin:180,dropIntervalMax:420,excavateChance:.65,moneyMin:20,moneyMax:100,scienceMin:2,scienceMax:12,buffDropChance:.25,buffDropCount:1};
// Enemy definitions are data-driven so names, stats, abilities, and wave counts
// can be edited without adding a new enemy class.
const ENEMY_DEFINITIONS={
 archer:{nameEn:'Archer',nameJa:'アーチャー',category:'infantry',hp:30,speed:1.2,damage:8,armor:0,trapResistance:0,abilities:[]},
 armored_axeman:{nameEn:'Armored Axeman',nameJa:'重装斧兵',category:'heavy',hp:100,speed:0.8,damage:15,armor:0.4,trapResistance:0.3,abilities:[]},
 armored_orc:{nameEn:'Armored Orc',nameJa:'重装オーク',category:'heavy',hp:90,speed:0.9,damage:12,armor:0.3,trapResistance:0.3,abilities:[]},
 armored_skeleton:{nameEn:'Armored Skeleton',nameJa:'重装スケルトン',category:'heavy',hp:80,speed:0.9,damage:10,armor:0.3,trapResistance:0.2,abilities:[]},
 bat:{nameEn:'Bat',nameJa:'コウモリ',category:'fast',hp:15,speed:2.0,damage:3,armor:0,trapResistance:0,abilities:[]},
 elite_orc:{nameEn:'Elite Orc',nameJa:'エリートオーク',category:'heavy',hp:150,speed:1.0,damage:18,armor:0.2,trapResistance:0.4,abilities:[]},
 greatsword_skeleton:{nameEn:'Greatsword Skeleton',nameJa:'大剣スケルトン',category:'heavy',hp:160,speed:0.7,damage:25,armor:0.2,trapResistance:0.4,abilities:[]},
 knight:{nameEn:'Knight',nameJa:'騎士',category:'heavy',hp:120,speed:0.75,damage:15,armor:0.3,trapResistance:0.35,abilities:[]},
 knight_templar:{nameEn:'Knight Templar',nameJa:'テンプル騎士',category:'heavy',hp:250,speed:0.7,damage:20,armor:0.5,trapResistance:0.5,abilities:['front_shield']},
 lancer:{nameEn:'Lancer',nameJa:'ランサー',category:'melee',hp:50,speed:1.4,damage:9,armor:0.1,trapResistance:0.1,abilities:[]},
 necromancer:{nameEn:'Necromancer',nameJa:'ネクロマンサー',category:'wizard',hp:50,speed:1.0,damage:10,armor:0,trapResistance:0,abilities:['wizard_speed']},
 orc:{nameEn:'Orc',nameJa:'オーク',category:'infantry',hp:40,speed:1.1,damage:6,armor:0.1,trapResistance:0.1,abilities:[]},
 orc_rider:{nameEn:'Orc rider',nameJa:'オークライダー',category:'fast',hp:70,speed:2.5,damage:12,armor:0.2,trapResistance:0.2,abilities:[]},
 priest:{nameEn:'Priest',nameJa:'僧侶',category:'support',hp:40,speed:1.2,damage:5,armor:0,trapResistance:0,abilities:['heal_aura']},
 skeleton:{nameEn:'Skeleton',nameJa:'スケルトン',category:'infantry',hp:25,speed:1.0,damage:4,armor:0,trapResistance:0,abilities:[]},
 skeleton_archer:{nameEn:'Skeleton Archer',nameJa:'スケルトンアーチャー',category:'infantry',hp:20,speed:1.0,damage:6,armor:0,trapResistance:0,abilities:[]},
 slime:{nameEn:'Slime',nameJa:'スライム',category:'infantry',hp:25,speed:0.8,damage:5,armor:0,trapResistance:0.2,abilities:[]},
 soldier:{nameEn:'Soldier',nameJa:'兵士',category:'infantry',hp:35,speed:1.2,damage:5,armor:0.1,trapResistance:0,abilities:[]},
 swordsman:{nameEn:'Swordsman',nameJa:'剣士',category:'melee',hp:45,speed:1.3,damage:7,armor:0.1,trapResistance:0,abilities:[]},
 werebear:{nameEn:'Werebear',nameJa:'ウェアベア',category:'heavy',hp:240,speed:0.6,damage:25,armor:0.3,trapResistance:0.5,abilities:[]},
 werewolf:{nameEn:'Werewolf',nameJa:'ウェアウルフ',category:'fast',hp:140,speed:2.2,damage:18,armor:0.1,trapResistance:0.1,abilities:[]},
 wizard:{nameEn:'Wizard',nameJa:'魔法使い',category:'wizard',hp:40,speed:1.1,damage:8,armor:0,trapResistance:0,abilities:['wizard_attack']}
};
const ENEMY_ABILITY_CONFIG={priestHealAmount:5,priestHealInterval:120,priestHealRange:3,drummerAuraRange:4,drummerSpeedRate:.2,drummerAttackRate:.2,wizardAuraRange:4,wizardHealAmount:4,wizardHealInterval:90,wizardSpeedRate:.25,wizardAttackRate:.25,shieldmasterFrontReduction:.8,shieldmasterFrontAngle:120};
const regulationWaveDefaults=()=>Object.fromEntries(Array.from({length:CONFIG.maxWave},(_,i)=>[i+1,{bat:10,slime:5}]));
const defaultDifficulties=()=>Object.fromEntries(Array.from({length:5},(_,i)=>[i+1,{initialMoney:CONFIG.initialMoney,waves:regulationWaveDefaults()}]));
let REGULATIONS=[{id:'standard',name:'標準設定',difficulties:defaultDifficulties(),techTrees:structuredClone(DEFAULT_TECH_TREES)}];
let activeRegulationId='standard';
function activeRegulation(){return REGULATIONS.find(r=>r.id===activeRegulationId)||REGULATIONS[0]}
function applyActiveRegulation(){const r=activeRegulation();if(!r)return;TECH_TREES=structuredClone(r.techTrees||DEFAULT_TECH_TREES);activeTreeId=TECH_TREES[0]?.id||'standard';if(r.CONFIG)Object.assign(CONFIG,structuredClone(r.CONFIG));if(r.cropGrowSpeed!==undefined)CONFIG.cropGrowSpeed=Number(r.cropGrowSpeed);if(r.droneBaseSpeed!==undefined)CONFIG.droneBaseSpeed=Number(r.droneBaseSpeed);if(r.trapIcons)Object.entries(r.trapIcons).forEach(([id,icon])=>{if(TRAP_DEFINITIONS[id])TRAP_DEFINITIONS[id].icon=icon})}
const GAME_TEST_MODE=window.__TEST_MODE__===true;
// The playfield is intentionally landscape: enemies enter at the left edge and move right.
CONFIG.gridCols=30;CONFIG.gridRows=15;
const GAME_SPEED_OPTIONS=[1,2,4,8,16];
const TEST_RUNTIME={enabled:GAME_TEST_MODE,frame:0,random:null,tasks:[]};
const $=id=>document.getElementById(id),canvas=$('gameCanvas'),ctx=canvas.getContext('2d');let tile=24,grid=[],farms=[],buildings=[],drones=[],enemies=[],bullets=[],effects=[],trapEngine=null,money=0,science=0,wave=0,inWave=false,spawning=false,selected=null,buildMode='select',lineDirection='right',buffs={},techs={},last=0,spawnTimer,gameSpeed=1;
const LINE_DIRECTIONS=Object.freeze([{value:'up',label:'上',icon:'⬆'},{value:'down',label:'下',icon:'⬇'},{value:'left',label:'左',icon:'⬅'},{value:'right',label:'右',icon:'➡'}]);
const lineBuildDirections=Object.create(null);
function lineDirectionFor(trapId){return lineBuildDirections[trapId]||'right'}
function refreshLineDirectionButtons(){
  document.querySelectorAll('#build-grid [data-line-trap]').forEach(button=>{
    const trapId=button.dataset.lineTrap;
    button.classList.toggle('active',button.dataset.lineDirection===lineDirectionFor(trapId));
  });
}
function selectLineDirection(trapId,direction){
  if(!LINE_DIRECTIONS.some(option=>option.value===direction)||!TRAP_DEFINITIONS?.[trapId])return;
  lineBuildDirections[trapId]=direction;
  lineDirection=direction;
  setBuildMode(trapId);
  refreshLineDirectionButtons();
}
function setBuildMode(mode){
  buildMode=mode;
  if(canvas)canvas.style.cursor=mode==='remove'?'pointer':'crosshair';
  const definition=TRAP_DEFINITIONS?.[mode];
  if(definition?.type==='line')lineDirection=lineBuildDirections[mode]??=lineDirectionFor(mode);
  $('line-direction-panel')?.remove();
  const selectButton=$('btn-select-mode');if(selectButton)selectButton.classList.toggle('active',mode==='select');
  document.querySelectorAll('#build-grid [data-build]').forEach(button=>{
    const active=button.dataset.build===mode;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  });
  refreshLineDirectionButtons();
}
document.addEventListener('click',event=>{const button=event.target.closest?.('#build-grid [data-build]');if(button)setBuildMode(button.dataset.build);if(event.target.closest?.('#btn-select-mode'))setBuildMode('select')});
function normalizeGameSpeed(value){const n=Number(value);return GAME_SPEED_OPTIONS.includes(n)?n:1}
function setGameSpeed(value){gameSpeed=normalizeGameSpeed(value);const control=$('game-speed');if(control)control.value=String(gameSpeed);renderStats();return gameSpeed}
function gameRandom(){return TEST_RUNTIME.random?TEST_RUNTIME.random():Math.random()}
function scheduleGameTask(callback,delayMs){if(!GAME_TEST_MODE)return setTimeout(callback,delayMs);TEST_RUNTIME.tasks.push({callback,frames:Math.max(0,Math.ceil(Number(delayMs||0)/15))});return null}
function runTestTasks(){for(const task of TEST_RUNTIME.tasks)task.frames--;const ready=TEST_RUNTIME.tasks.filter(task=>task.frames<=0);TEST_RUNTIME.tasks=TEST_RUNTIME.tasks.filter(task=>task.frames>0);ready.forEach(task=>task.callback())}
const colors={farm:'#64c987',lab:'#be76dc',mg:'#e6b84f',missile:'#e87555',slow:'#6d75d9',blocked:'#34444b'};let pointerDown=false,lastPaintTile='';let TRAP_DEFINITIONS=structuredClone(window.DEFAULT_TRAPS);
// sx/sy are 1-based source-pixel coordinates.  (1, 1) is the image's top-left pixel.
const SPRITE_DEFAULT={uri:'',sx:1,sy:1,sw:24,sh:24,width:24,height:24,pivotX:.5,pivotY:.5,frames:1,columns:0,rows:0,frameDuration:8,flipByDirection:false,alignVisibleFrames:false,fallback:'shape'};
const SPRITE_SHEET_4X4=(uri,overrides={})=>({...SPRITE_DEFAULT,uri,frames:16,columns:4,rows:4,...overrides});
const SPRITE_SHEET_12X12=(uri,overrides={})=>({...SPRITE_DEFAULT,uri,frames:144,columns:12,rows:12,frameDuration:6,...overrides});
const SPRITE_SHEET_12X6=(uri,overrides={})=>({...SPRITE_DEFAULT,uri,frames:72,columns:12,rows:6,frameDuration:6,...overrides});
const SPRITE_SHEET_6X6=(uri,overrides={})=>({...SPRITE_DEFAULT,uri,frames:36,columns:6,rows:6,frameDuration:6,...overrides});
const SPRITE_CONFIG={
 outside:{...SPRITE_DEFAULT},floor:{...SPRITE_DEFAULT},blocked:SPRITE_SHEET_4X4('sprite_sheets/blocked.png'),slow:SPRITE_SHEET_4X4('sprite_sheets/slow.png'),spawn:{...SPRITE_DEFAULT},base:{...SPRITE_DEFAULT},excavation:{...SPRITE_DEFAULT}, farm:SPRITE_SHEET_12X12('sprite_sheets/farm.png'),lab:SPRITE_SHEET_12X12('sprite_sheets/lab.png'),mg:SPRITE_SHEET_12X12('sprite_sheets/mg.png'),missile:SPRITE_SHEET_12X12('sprite_sheets/missile.png'), trap:SPRITE_SHEET_4X4('sprite_sheets/trap.png'), enemy:SPRITE_SHEET_4X4('sprite_sheets/enemy.png',{frames:12,columns:3,rows:4,frameDuration:6,alignVisibleFrames:true}), 
  enemy_archer:SPRITE_SHEET_4X4('sprite_sheets/Tiny RPG Character Asset Pack 01 v2.0 -Full 22 Characters/char/Archer/Archer/Archer.png',{frames:12,columns:3,rows:4,frameDuration:6,alignVisibleFrames:true}),
  enemy_armored_axeman:SPRITE_SHEET_4X4('sprite_sheets/Tiny RPG Character Asset Pack 01 v2.0 -Full 22 Characters/char/Armored Axeman/Armored Axeman/Armored Axeman.png',{frames:12,columns:3,rows:4,frameDuration:6,alignVisibleFrames:true}),
  enemy_armored_orc:SPRITE_SHEET_4X4('sprite_sheets/Tiny RPG Character Asset Pack 01 v2.0 -Full 22 Characters/char/Armored Orc/Armored Orc/Armored Orc.png',{frames:12,columns:3,rows:4,frameDuration:6,alignVisibleFrames:true}),
  enemy_armored_skeleton:SPRITE_SHEET_4X4('sprite_sheets/Tiny RPG Character Asset Pack 01 v2.0 -Full 22 Characters/char/Armored Skeleton/Armored Skeleton/Armored Skeleton.png',{frames:12,columns:3,rows:4,frameDuration:6,alignVisibleFrames:true}),
  enemy_bat:SPRITE_SHEET_4X4('sprite_sheets/Tiny RPG Character Asset Pack 01 v2.0 -Full 22 Characters/char/Bat/Bat/Bat.png',{frames:12,columns:3,rows:4,frameDuration:6,alignVisibleFrames:true}),
  enemy_elite_orc:SPRITE_SHEET_4X4('sprite_sheets/Tiny RPG Character Asset Pack 01 v2.0 -Full 22 Characters/char/Elite Orc/Elite Orc/Elite Orc.png',{frames:12,columns:3,rows:4,frameDuration:6,alignVisibleFrames:true}),
  enemy_greatsword_skeleton:SPRITE_SHEET_4X4('sprite_sheets/Tiny RPG Character Asset Pack 01 v2.0 -Full 22 Characters/char/Greatsword Skeleton/Greatsword Skeleton/Greatsword Skeleton.png',{frames:12,columns:3,rows:4,frameDuration:6,alignVisibleFrames:true}),
  enemy_knight:SPRITE_SHEET_4X4('sprite_sheets/Tiny RPG Character Asset Pack 01 v2.0 -Full 22 Characters/char/Knight/Knight/Knight.png',{frames:12,columns:3,rows:4,frameDuration:6,alignVisibleFrames:true}),
  enemy_knight_templar:SPRITE_SHEET_4X4('sprite_sheets/Tiny RPG Character Asset Pack 01 v2.0 -Full 22 Characters/char/Knight Templar/Knight Templar/Knight Templar.png',{frames:12,columns:3,rows:4,frameDuration:6,alignVisibleFrames:true}),
  enemy_lancer:SPRITE_SHEET_4X4('sprite_sheets/Tiny RPG Character Asset Pack 01 v2.0 -Full 22 Characters/char/Lancer/Lancer/Lancer.png',{frames:12,columns:3,rows:4,frameDuration:6,alignVisibleFrames:true}),
  enemy_necromancer:SPRITE_SHEET_4X4('sprite_sheets/Tiny RPG Character Asset Pack 01 v2.0 -Full 22 Characters/char/Necromancer/Necromancer/Necromancer.png',{frames:12,columns:3,rows:4,frameDuration:6,alignVisibleFrames:true}),
  enemy_orc:SPRITE_SHEET_4X4('sprite_sheets/Tiny RPG Character Asset Pack 01 v2.0 -Full 22 Characters/char/Orc/Orc/Orc.png',{frames:12,columns:3,rows:4,frameDuration:6,alignVisibleFrames:true}),
  enemy_orc_rider:SPRITE_SHEET_4X4('sprite_sheets/Tiny RPG Character Asset Pack 01 v2.0 -Full 22 Characters/char/Orc rider/Orc rider/Orc rider.png',{frames:12,columns:3,rows:4,frameDuration:6,alignVisibleFrames:true}),
  enemy_priest:SPRITE_SHEET_4X4('sprite_sheets/Tiny RPG Character Asset Pack 01 v2.0 -Full 22 Characters/char/Priest/Priest/Priest.png',{frames:12,columns:3,rows:4,frameDuration:6,alignVisibleFrames:true}),
  enemy_skeleton:SPRITE_SHEET_4X4('sprite_sheets/Tiny RPG Character Asset Pack 01 v2.0 -Full 22 Characters/char/Skeleton/Skeleton/Skeleton.png',{frames:12,columns:3,rows:4,frameDuration:6,alignVisibleFrames:true}),
  enemy_skeleton_archer:SPRITE_SHEET_4X4('sprite_sheets/Tiny RPG Character Asset Pack 01 v2.0 -Full 22 Characters/char/Skeleton Archer/Skeleton Archer/Skeleton Archer.png',{frames:12,columns:3,rows:4,frameDuration:6,alignVisibleFrames:true}),
  enemy_slime:SPRITE_SHEET_4X4('sprite_sheets/Tiny RPG Character Asset Pack 01 v2.0 -Full 22 Characters/char/Slime/Slime/Slime.png',{frames:12,columns:3,rows:4,frameDuration:6,alignVisibleFrames:true}),
  enemy_soldier:SPRITE_SHEET_4X4('sprite_sheets/Tiny RPG Character Asset Pack 01 v2.0 -Full 22 Characters/char/Soldier/Soldier/Soldier.png',{frames:12,columns:3,rows:4,frameDuration:6,alignVisibleFrames:true}),
  enemy_swordsman:SPRITE_SHEET_4X4('sprite_sheets/Tiny RPG Character Asset Pack 01 v2.0 -Full 22 Characters/char/Swordsman/Swordsman/Swordsman.png',{frames:12,columns:3,rows:4,frameDuration:6,alignVisibleFrames:true}),
  enemy_werebear:SPRITE_SHEET_4X4('sprite_sheets/Tiny RPG Character Asset Pack 01 v2.0 -Full 22 Characters/char/Werebear/Werebear/Werebear.png',{frames:12,columns:3,rows:4,frameDuration:6,alignVisibleFrames:true}),
  enemy_werewolf:SPRITE_SHEET_4X4('sprite_sheets/Tiny RPG Character Asset Pack 01 v2.0 -Full 22 Characters/char/Werewolf/Werewolf/Werewolf.png',{frames:12,columns:3,rows:4,frameDuration:6,alignVisibleFrames:true}),
  enemy_wizard:SPRITE_SHEET_4X4('sprite_sheets/Tiny RPG Character Asset Pack 01 v2.0 -Full 22 Characters/char/Wizard/Wizard/Wizard.png',{frames:12,columns:3,rows:4,frameDuration:6,alignVisibleFrames:true}),
  drone:SPRITE_SHEET_4X4('sprite_sheets/drone.png'),droneSow:SPRITE_SHEET_4X4('sprite_sheets/droneSow.png'),droneWater:SPRITE_SHEET_4X4('sprite_sheets/droneWater.png'),droneHarvest:SPRITE_SHEET_4X4('sprite_sheets/droneHarvest.png'),droneExcavation:SPRITE_SHEET_4X4('sprite_sheets/droneExcavation.png'), bullet:{...SPRITE_DEFAULT},bulletMG:{...SPRITE_DEFAULT},bulletMissile:{...SPRITE_DEFAULT},explosion:SPRITE_SHEET_4X4('sprite_sheets/explosion.png'),trapEffect:{...SPRITE_DEFAULT},sowEffect:{...SPRITE_DEFAULT},waterEffect:{...SPRITE_DEFAULT},harvestEffect:{...SPRITE_DEFAULT},excavationEffect:{...SPRITE_DEFAULT} };
  const ENEMY_SPRITE_LAYOUT=Object.freeze({columns:3,framesPerDirection:3,stateRows:Object.freeze({idle:0,hit:0,attack:0,death:3}),directionRows:Object.freeze({up:0,down:1,right:2,left:2}),frameDuration:6,hitDuration:18,deathDuration:18,displayScale:2});
const SPRITE_IMAGES=new Map();

const MOTION_SPRITE=(uri)=>({...SPRITE_DEFAULT,uri,sw:100,sh:100,width:tile*2,height:tile*2,pivotX:.5,pivotY:.5,frameDuration:6,alignVisibleFrames:true,split100:true,flipByDirection:true});
const CHAR_BASE='sprite_sheets/Tiny RPG Character Asset Pack 01 v2.0 -Full 22 Characters/';
const ENEMY_MOTIONS={
  archer:{
    attack01:MOTION_SPRITE(CHAR_BASE+'char/Archer/Archer/Archer_Attack01.png'),
    attack02:MOTION_SPRITE(CHAR_BASE+'char/Archer/Archer/Archer_Attack02.png'),
    death:MOTION_SPRITE(CHAR_BASE+'char/Archer/Archer/Archer_Death.png'),
    hurt:MOTION_SPRITE(CHAR_BASE+'char/Archer/Archer/Archer_Hurt.png'),
    idle:MOTION_SPRITE(CHAR_BASE+'char/Archer/Archer/Archer_Idle.png'),
    walk:MOTION_SPRITE(CHAR_BASE+'char/Archer/Archer/Archer_Walk.png')
  },
  armored_axeman:{
    attack01:MOTION_SPRITE(CHAR_BASE+'char/Armored Axeman/Armored Axeman/Armored Axeman_Attack01.png'),
    attack02:MOTION_SPRITE(CHAR_BASE+'char/Armored Axeman/Armored Axeman/Armored Axeman_Attack02.png'),
    death:MOTION_SPRITE(CHAR_BASE+'char/Armored Axeman/Armored Axeman/Armored Axeman_Death.png'),
    hurt:MOTION_SPRITE(CHAR_BASE+'char/Armored Axeman/Armored Axeman/Armored Axeman_Hurt.png'),
    idle:MOTION_SPRITE(CHAR_BASE+'char/Armored Axeman/Armored Axeman/Armored Axeman_Idle.png'),
    walk:MOTION_SPRITE(CHAR_BASE+'char/Armored Axeman/Armored Axeman/Armored Axeman_Walk.png')
  },
  armored_orc:{
    attack01:MOTION_SPRITE(CHAR_BASE+'char/Armored Orc/Armored Orc/Armored Orc_Attack01.png'),
    attack02:MOTION_SPRITE(CHAR_BASE+'char/Armored Orc/Armored Orc/Armored Orc_Attack02.png'),
    death:MOTION_SPRITE(CHAR_BASE+'char/Armored Orc/Armored Orc/Armored Orc_Death.png'),
    hurt:MOTION_SPRITE(CHAR_BASE+'char/Armored Orc/Armored Orc/Armored Orc_Hurt.png'),
    idle:MOTION_SPRITE(CHAR_BASE+'char/Armored Orc/Armored Orc/Armored Orc_Idle.png'),
    walk:MOTION_SPRITE(CHAR_BASE+'char/Armored Orc/Armored Orc/Armored Orc_Walk.png')
  },
  armored_skeleton:{
    attack01:MOTION_SPRITE(CHAR_BASE+'char/Armored Skeleton/Armored Skeleton/Armored Skeleton_Attack01.png'),
    attack02:MOTION_SPRITE(CHAR_BASE+'char/Armored Skeleton/Armored Skeleton/Armored Skeleton_Attack02.png'),
    death:MOTION_SPRITE(CHAR_BASE+'char/Armored Skeleton/Armored Skeleton/Armored Skeleton_Death.png'),
    hurt:MOTION_SPRITE(CHAR_BASE+'char/Armored Skeleton/Armored Skeleton/Armored Skeleton_Hurt.png'),
    idle:MOTION_SPRITE(CHAR_BASE+'char/Armored Skeleton/Armored Skeleton/Armored Skeleton_Idle.png'),
    walk:MOTION_SPRITE(CHAR_BASE+'char/Armored Skeleton/Armored Skeleton/Armored Skeleton_Walk.png')
  },
  bat:{
    attack01:MOTION_SPRITE(CHAR_BASE+'char/Bat/Bat/Bat_Attack01.png'),
    attack02:MOTION_SPRITE(CHAR_BASE+'char/Bat/Bat/Bat_Attack02.png'),
    death:MOTION_SPRITE(CHAR_BASE+'char/Bat/Bat/Bat_Death.png'),
    hurt:MOTION_SPRITE(CHAR_BASE+'char/Bat/Bat/Bat_Hurt.png')
  },
  elite_orc:{
    attack01:MOTION_SPRITE(CHAR_BASE+'char/Elite Orc/Elite Orc/Elite Orc_Attack01.png'),
    attack02:MOTION_SPRITE(CHAR_BASE+'char/Elite Orc/Elite Orc/Elite Orc_Attack02.png'),
    death:MOTION_SPRITE(CHAR_BASE+'char/Elite Orc/Elite Orc/Elite Orc_Death.png'),
    hurt:MOTION_SPRITE(CHAR_BASE+'char/Elite Orc/Elite Orc/Elite Orc_Hurt.png'),
    idle:MOTION_SPRITE(CHAR_BASE+'char/Elite Orc/Elite Orc/Elite Orc_Idle.png'),
    walk:MOTION_SPRITE(CHAR_BASE+'char/Elite Orc/Elite Orc/Elite Orc_Walk.png')
  },
  greatsword_skeleton:{
    attack01:MOTION_SPRITE(CHAR_BASE+'char/Greatsword Skeleton/Greatsword Skeleton/Greatsword Skeleton_Attack01.png'),
    attack02:MOTION_SPRITE(CHAR_BASE+'char/Greatsword Skeleton/Greatsword Skeleton/Greatsword Skeleton_Attack02.png'),
    death:MOTION_SPRITE(CHAR_BASE+'char/Greatsword Skeleton/Greatsword Skeleton/Greatsword Skeleton_Death.png'),
    hurt:MOTION_SPRITE(CHAR_BASE+'char/Greatsword Skeleton/Greatsword Skeleton/Greatsword Skeleton_Hurt.png'),
    idle:MOTION_SPRITE(CHAR_BASE+'char/Greatsword Skeleton/Greatsword Skeleton/Greatsword Skeleton_Idle.png'),
    walk:MOTION_SPRITE(CHAR_BASE+'char/Greatsword Skeleton/Greatsword Skeleton/Greatsword Skeleton_Walk.png')
  },
  knight:{
    attack01:MOTION_SPRITE(CHAR_BASE+'char/Knight/Knight/Knight_Attack01.png'),
    attack02:MOTION_SPRITE(CHAR_BASE+'char/Knight/Knight/Knight_Attack02.png'),
    death:MOTION_SPRITE(CHAR_BASE+'char/Knight/Knight/Knight_Death.png'),
    hurt:MOTION_SPRITE(CHAR_BASE+'char/Knight/Knight/Knight_Hurt.png'),
    idle:MOTION_SPRITE(CHAR_BASE+'char/Knight/Knight/Knight_Idle.png'),
    walk:MOTION_SPRITE(CHAR_BASE+'char/Knight/Knight/Knight_Walk.png')
  },
  knight_templar:{
    attack01:MOTION_SPRITE(CHAR_BASE+'char/Knight Templar/Knight Templar/Knight Templar_Attack01.png'),
    attack02:MOTION_SPRITE(CHAR_BASE+'char/Knight Templar/Knight Templar/Knight Templar_Attack02.png'),
    death:MOTION_SPRITE(CHAR_BASE+'char/Knight Templar/Knight Templar/Knight Templar_Death.png'),
    hurt:MOTION_SPRITE(CHAR_BASE+'char/Knight Templar/Knight Templar/Knight Templar_Hurt.png'),
    idle:MOTION_SPRITE(CHAR_BASE+'char/Knight Templar/Knight Templar/Knight Templar_Idle.png')
  },
  lancer:{
    attack01:MOTION_SPRITE(CHAR_BASE+'char/Lancer/Lancer/Lancer_Attack01.png'),
    attack02:MOTION_SPRITE(CHAR_BASE+'char/Lancer/Lancer/Lancer_Attack02.png'),
    death:MOTION_SPRITE(CHAR_BASE+'char/Lancer/Lancer/Lancer_Death.png'),
    hurt:MOTION_SPRITE(CHAR_BASE+'char/Lancer/Lancer/Lancer_Hurt.png'),
    idle:MOTION_SPRITE(CHAR_BASE+'char/Lancer/Lancer/Lancer_Idle.png')
  },
  necromancer:{
    attack01:MOTION_SPRITE(CHAR_BASE+'char/Necromancer/Necromancer/Necromancer_Attack01.png'),
    attack02:MOTION_SPRITE(CHAR_BASE+'char/Necromancer/Necromancer/Necromancer_Attack02.png'),
    hurt:MOTION_SPRITE(CHAR_BASE+'char/Necromancer/Necromancer/Necromancer_Hurt.png'),
    idle:MOTION_SPRITE(CHAR_BASE+'char/Necromancer/Necromancer/Necromancer_Idle.png'),
    walk:MOTION_SPRITE(CHAR_BASE+'char/Necromancer/Necromancer/Necromancer_Walk.png')
  },
  orc:{
    attack01:MOTION_SPRITE(CHAR_BASE+'char/Orc/Orc/Orc_Attack01.png'),
    attack02:MOTION_SPRITE(CHAR_BASE+'char/Orc/Orc/Orc_Attack02.png'),
    death:MOTION_SPRITE(CHAR_BASE+'char/Orc/Orc/Orc_Death.png'),
    hurt:MOTION_SPRITE(CHAR_BASE+'char/Orc/Orc/Orc_Hurt.png'),
    idle:MOTION_SPRITE(CHAR_BASE+'char/Orc/Orc/Orc_Idle.png'),
    walk:MOTION_SPRITE(CHAR_BASE+'char/Orc/Orc/Orc_Walk.png')
  },
  orc_rider:{
    attack01:MOTION_SPRITE(CHAR_BASE+'char/Orc rider/Orc rider/Orc rider_Attack01.png'),
    attack02:MOTION_SPRITE(CHAR_BASE+'char/Orc rider/Orc rider/Orc rider_Attack02.png'),
    death:MOTION_SPRITE(CHAR_BASE+'char/Orc rider/Orc rider/Orc rider_Death.png'),
    hurt:MOTION_SPRITE(CHAR_BASE+'char/Orc rider/Orc rider/Orc rider_Hurt.png'),
    idle:MOTION_SPRITE(CHAR_BASE+'char/Orc rider/Orc rider/Orc rider_Idle.png'),
    walk:MOTION_SPRITE(CHAR_BASE+'char/Orc rider/Orc rider/Orc rider_Walk.png')
  },
  priest:{
    death:MOTION_SPRITE(CHAR_BASE+'char/Priest/Priest/Priest_Death.png'),
    hurt:MOTION_SPRITE(CHAR_BASE+'char/Priest/Priest/Priest_Hurt.png'),
    idle:MOTION_SPRITE(CHAR_BASE+'char/Priest/Priest/Priest_Idle.png'),
    walk:MOTION_SPRITE(CHAR_BASE+'char/Priest/Priest/Priest_Walk.png')
  },
  skeleton:{
    attack01:MOTION_SPRITE(CHAR_BASE+'char/Skeleton/Skeleton/Skeleton_Attack01.png'),
    attack02:MOTION_SPRITE(CHAR_BASE+'char/Skeleton/Skeleton/Skeleton_Attack02.png'),
    death:MOTION_SPRITE(CHAR_BASE+'char/Skeleton/Skeleton/Skeleton_Death.png'),
    hurt:MOTION_SPRITE(CHAR_BASE+'char/Skeleton/Skeleton/Skeleton_Hurt.png'),
    idle:MOTION_SPRITE(CHAR_BASE+'char/Skeleton/Skeleton/Skeleton_Idle.png'),
    walk:MOTION_SPRITE(CHAR_BASE+'char/Skeleton/Skeleton/Skeleton_Walk.png')
  },
  skeleton_archer:{
    death:MOTION_SPRITE(CHAR_BASE+'char/Skeleton Archer/Skeleton Archer/Skeleton Archer_Death.png'),
    hurt:MOTION_SPRITE(CHAR_BASE+'char/Skeleton Archer/Skeleton Archer/Skeleton Archer_Hurt.png'),
    idle:MOTION_SPRITE(CHAR_BASE+'char/Skeleton Archer/Skeleton Archer/Skeleton Archer_Idle.png'),
    walk:MOTION_SPRITE(CHAR_BASE+'char/Skeleton Archer/Skeleton Archer/Skeleton Archer_Walk.png')
  },
  slime:{
    attack01:MOTION_SPRITE(CHAR_BASE+'char/Slime/Slime/Slime_Attack01.png'),
    attack02:MOTION_SPRITE(CHAR_BASE+'char/Slime/Slime/Slime_Attack02.png'),
    death:MOTION_SPRITE(CHAR_BASE+'char/Slime/Slime/Slime_Death.png'),
    hurt:MOTION_SPRITE(CHAR_BASE+'char/Slime/Slime/Slime_Hurt.png'),
    idle:MOTION_SPRITE(CHAR_BASE+'char/Slime/Slime/Slime_Idle.png'),
    walk:MOTION_SPRITE(CHAR_BASE+'char/Slime/Slime/Slime_Walk.png')
  },
  soldier:{
    attack01:MOTION_SPRITE(CHAR_BASE+'char/Soldier/Soldier/Soldier_Attack01.png'),
    attack02:MOTION_SPRITE(CHAR_BASE+'char/Soldier/Soldier/Soldier_Attack02.png'),
    death:MOTION_SPRITE(CHAR_BASE+'char/Soldier/Soldier/Soldier_Death.png'),
    hurt:MOTION_SPRITE(CHAR_BASE+'char/Soldier/Soldier/Soldier_Hurt.png'),
    idle:MOTION_SPRITE(CHAR_BASE+'char/Soldier/Soldier/Soldier_Idle.png'),
    walk:MOTION_SPRITE(CHAR_BASE+'char/Soldier/Soldier/Soldier_Walk.png')
  },
  swordsman:{
    attack01:MOTION_SPRITE(CHAR_BASE+'char/Swordsman/Swordsman/Swordsman_Attack01.png'),
    attack02:MOTION_SPRITE(CHAR_BASE+'char/Swordsman/Swordsman/Swordsman_Attack02.png'),
    death:MOTION_SPRITE(CHAR_BASE+'char/Swordsman/Swordsman/Swordsman_Death.png'),
    hurt:MOTION_SPRITE(CHAR_BASE+'char/Swordsman/Swordsman/Swordsman_Hurt.png'),
    idle:MOTION_SPRITE(CHAR_BASE+'char/Swordsman/Swordsman/Swordsman_Idle.png'),
    walk:MOTION_SPRITE(CHAR_BASE+'char/Swordsman/Swordsman/Swordsman_Walk.png')
  },
  werebear:{
    attack01:MOTION_SPRITE(CHAR_BASE+'char/Werebear/Werebear/Werebear_Attack01.png'),
    attack02:MOTION_SPRITE(CHAR_BASE+'char/Werebear/Werebear/Werebear_Attack02.png'),
    death:MOTION_SPRITE(CHAR_BASE+'char/Werebear/Werebear/Werebear_Death.png'),
    hurt:MOTION_SPRITE(CHAR_BASE+'char/Werebear/Werebear/Werebear_Hurt.png'),
    idle:MOTION_SPRITE(CHAR_BASE+'char/Werebear/Werebear/Werebear_Idle.png'),
    walk:MOTION_SPRITE(CHAR_BASE+'char/Werebear/Werebear/Werebear_Walk.png')
  },
  werewolf:{
    attack01:MOTION_SPRITE(CHAR_BASE+'char/Werewolf/Werewolf/Werewolf_Attack01.png'),
    attack02:MOTION_SPRITE(CHAR_BASE+'char/Werewolf/Werewolf/Werewolf_Attack02.png'),
    death:MOTION_SPRITE(CHAR_BASE+'char/Werewolf/Werewolf/Werewolf_Death.png'),
    hurt:MOTION_SPRITE(CHAR_BASE+'char/Werewolf/Werewolf/Werewolf_Hurt.png'),
    idle:MOTION_SPRITE(CHAR_BASE+'char/Werewolf/Werewolf/Werewolf_Idle.png'),
    walk:MOTION_SPRITE(CHAR_BASE+'char/Werewolf/Werewolf/Werewolf_Walk.png')
  },
  wizard:{
    attack01:MOTION_SPRITE(CHAR_BASE+'char/Wizard/Wizard/Wizard_Attack01.png'),
    attack02:MOTION_SPRITE(CHAR_BASE+'char/Wizard/Wizard/Wizard_Attack02.png'),
    death:MOTION_SPRITE(CHAR_BASE+'char/Wizard/Wizard/Wizard_Death.png'),
    hurt:MOTION_SPRITE(CHAR_BASE+'char/Wizard/Wizard/Wizard_Hurt.png'),
    idle:MOTION_SPRITE(CHAR_BASE+'char/Wizard/Wizard/Wizard_Idle.png'),
    walk:MOTION_SPRITE(CHAR_BASE+'char/Wizard/Wizard/Wizard_Walk.png')
  }
};

function spriteDefinition(key,definition){return {...(key?SPRITE_CONFIG[key]:{}),...SPRITE_DEFAULT,...(definition||{})}}
function loadSprite(uri){if(!uri)return null;if(SPRITE_IMAGES.has(uri))return SPRITE_IMAGES.get(uri);const image=new Image();const state={image,ready:false,failed:false,alignmentCache:new Map()};image.onload=()=>{state.ready=true;state.naturalWidth=Number(image.naturalWidth)||Number(image.width)||0;state.naturalHeight=Number(image.naturalHeight)||Number(image.height)||0};image.onerror=()=>{state.failed=true};image.src=uri;SPRITE_IMAGES.set(uri,state);return state}
function spriteSourceGrid(definition,state,frameCount){
  let columns=Math.max(1,Math.floor(Number(definition.columns)||frameCount));
  let rows=Math.max(1,Math.floor(Number(definition.rows)||Math.ceil(frameCount/columns)));
  if(definition.split100||definition.sw===100){
    const imgW=Number(state.naturalWidth)||Number(state.image?.naturalWidth)||100;
    columns=Math.max(1,Math.floor(imgW/100));
    rows=1;
  }
  const imageWidth=Number(state.naturalWidth)||Number(state.image?.naturalWidth)||Number(definition.sw)||24;
  const imageHeight=Number(state.naturalHeight)||Number(state.image?.naturalHeight)||Number(definition.sh)||24;
  return {columns,rows,cellWidth:imageWidth/columns,cellHeight:imageHeight/rows};
}
function spriteFrameAlignments(definition,state,frameCount,sourceGrid){if(!definition.alignVisibleFrames||typeof document==='undefined')return null;const cacheKey=`${sourceGrid.columns}x${sourceGrid.rows}:${sourceGrid.cellWidth}x${sourceGrid.cellHeight}:${Number(definition.sx||1)}:${Number(definition.sy||1)}:${frameCount}`;if(state.alignmentCache.has(cacheKey))return state.alignmentCache.get(cacheKey);const width=Math.max(1,Math.ceil(sourceGrid.cellWidth)),height=Math.max(1,Math.ceil(sourceGrid.cellHeight)),measureCanvas=document.createElement('canvas');measureCanvas.width=width;measureCanvas.height=height;const measureCtx=measureCanvas.getContext('2d',{willReadFrequently:true});if(!measureCtx){state.alignmentCache.set(cacheKey,null);return null}measureCtx.imageSmoothingEnabled=false;const alignments=[];try{for(let frame=0;frame<frameCount;frame++){measureCtx.clearRect(0,0,width,height);const sx=Math.max(0,Number(definition.sx||1)-1)+(frame%sourceGrid.columns)*sourceGrid.cellWidth,sy=Math.max(0,Number(definition.sy||1)-1)+Math.floor(frame/sourceGrid.columns)*sourceGrid.cellHeight;measureCtx.drawImage(state.image,sx,sy,sourceGrid.cellWidth,sourceGrid.cellHeight,0,0,width,height);const pixels=measureCtx.getImageData(0,0,width,height).data;let minX=width,minY=height,maxX=-1,maxY=-1;for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]>8){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y}alignments.push(maxX<0?null:{pivotX:(minX+maxX+1)/(width*2),pivotY:(minY+maxY+1)/(height*2)})}}catch(error){state.alignmentCache.set(cacheKey,null);return null}state.alignmentCache.set(cacheKey,alignments);return alignments}
function drawSprite(key,x,y,options={}){const d=spriteDefinition(key,options.definition),state=loadSprite(d.uri);if(!state?.ready)return false;const frameCount=Math.max(1,Math.floor(Number(d.frames)||1)),requestedFrame=Number(options.frameIndex),frame=Number.isFinite(requestedFrame)?Math.max(0,Math.floor(requestedFrame))%frameCount:Math.max(0,Math.floor((TEST_RUNTIME.frame||0)/Math.max(1,Number(d.frameDuration)||1))%frameCount),sourceGrid=spriteSourceGrid(d,state,frameCount),frameAlignment=spriteFrameAlignments(d,state,frameCount,sourceGrid)?.[frame],sx=Math.max(0,Number(d.sx||1)-1)+(frame%sourceGrid.columns)*sourceGrid.cellWidth,sy=Math.max(0,Number(d.sy||1)-1)+Math.floor(frame/sourceGrid.columns)*sourceGrid.cellHeight,w=Number(d.width)||tile,h=Number(d.height)||tile,pivotX=frameAlignment?.pivotX??Number(d.pivotX??.5),pivotY=frameAlignment?.pivotY??Number(d.pivotY??.5);ctx.save();ctx.translate(x,y);if(Number.isFinite(Number(options.rotation)))ctx.rotate(Number(options.rotation));if(options.flip&&d.flipByDirection)ctx.scale(-1,1);ctx.drawImage(state.image,sx,sy,sourceGrid.cellWidth,sourceGrid.cellHeight,-w*pivotX,-h*pivotY,w,h);ctx.restore();return true}
function cellSpriteDefinition(key,definition={}){return {...spriteDefinition(key,definition),width:tile,height:tile}}
function drawCellSprite(key,x,y,options={}){return drawSprite(key,x,y,{...options,definition:cellSpriteDefinition(key,options.definition)})}
function drawCellFallback(type,gx,gy){ctx.fillStyle=colors[type]||'#798c96';ctx.fillRect(gx*tile,gy*tile,tile,tile)}
function drawProjectileSprite(type,x,y,options={}){const key=type==='missile'?'bulletMissile':'bulletMG';const definition=SPRITE_CONFIG[key];if(!definition?.uri)return false;return drawSprite(key,x,y,{...options,definition})}
function enemySpriteKey(type){return `enemy_${String(type||'').replace(/[^a-zA-Z0-9_-]/g,'_')}`}
function setEnemySpriteState(enemy,state,force=false){
  if(!enemy)return;
  if(!force&&enemy.spriteState===state)return;
  enemy.spriteState=state;
  enemy.spriteStateStartFrame=Number(TEST_RUNTIME.frame)||0;
}
function updateEnemySpriteState(enemy){
  if(!enemy)return;
  if(enemy.dead){setEnemySpriteState(enemy,'death');return}
  if((enemy.hitTimer||0)>0){setEnemySpriteState(enemy,'hurt');return}
  if(enemy.target&&dist(enemy.x,enemy.y,enemy.target.gx*tile+12,enemy.target.gy*tile+12)<tile*0.8){setEnemySpriteState(enemy,'attack');return}
  setEnemySpriteState(enemy,'walk');
}
function selectEnemyMotionDefinition(enemy){
  const typeMotions=ENEMY_MOTIONS[enemy?.type]||{};
  const state=enemy?.spriteState||'walk';
  let targetKey=state;
  if(state==='attack'){
    const has01=!!typeMotions.attack01,has02=!!typeMotions.attack02;
    if(has01&&has02){
      const elapsed=Math.max(0,(Number(TEST_RUNTIME.frame)||0)-(Number(enemy.spriteStateStartFrame)||0));
      const cycle=Math.floor(elapsed/24);
      targetKey=(cycle%2===0)?'attack01':'attack02';
    }else if(has01){
      targetKey='attack01';
    }else if(has02){
      targetKey='attack02';
    }else{
      targetKey='walk';
    }
  }else if(state==='hit'){
    targetKey='hurt';
  }
  let def=typeMotions[targetKey];
  if(!def&&targetKey==='walk')def=typeMotions.idle||typeMotions.attack01;
  if(!def&&targetKey==='idle')def=typeMotions.walk||typeMotions.attack01;
  if(!def&&targetKey==='hurt')def=typeMotions.idle||typeMotions.walk;
  if(!def&&targetKey==='death')def=typeMotions.hurt||typeMotions.idle||typeMotions.walk;
  if(!def&&(targetKey==='attack01'||targetKey==='attack02'))def=typeMotions.walk||typeMotions.idle;
  return def||null;
}
function drawEnemySprite(enemy){
  const def=selectEnemyMotionDefinition(enemy);
  if(!def||!def.uri)return false;
  const state=loadSprite(def.uri);
  if(!state?.ready)return false;
  const cols=Math.max(1,Math.floor((state.naturalWidth||100)/100));
  const elapsed=Math.max(0,(Number(TEST_RUNTIME.frame)||0)-(Number(enemy.spriteStateStartFrame)||0));
  const frameDuration=Math.max(1,Number(def.frameDuration)||6);
  const rawFrame=Math.floor(elapsed/frameDuration);
  const frameIndex=(enemy.spriteState==='death')?Math.min(cols-1,rawFrame):(rawFrame%cols);
  const options={
    definition:{
      ...def,
      columns:cols,
      rows:1,
      frames:cols,
      width:(Number(def.width)||tile)*ENEMY_SPRITE_LAYOUT.displayScale,
      height:(Number(def.height)||tile)*ENEMY_SPRITE_LAYOUT.displayScale
    },
    frameIndex,
    flip:(enemy.moveX<0)
  };
  return drawSprite(null,enemy.x,enemy.y,options);
}
const DIRECTION_ANGLES=Object.freeze({right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2});
function directionFromVector(dx,dy, fallback='right'){
  if(Math.abs(dx)<.001&&Math.abs(dy)<.001)return fallback;
  return Math.abs(dx)>=Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
}
// Turret art is side-facing only.  Keep its aim on the horizontal axis so an
// enemy above or below it does not rotate the sprite into an unsupported pose.
function turretDirectionFromVector(dx, fallback='right'){
  if(Math.abs(dx)<.001)return fallback==='left'?'left':'right';
  return dx<0?'left':'right';
}
function directionAngle(direction){return DIRECTION_ANGLES[direction]??DIRECTION_ANGLES.right}
function buildingIsActive(building){
  if(!building)return false;
  const type=building.type||'farm';
  if(type==='farm')return Number(building.state)>0;
  if(type==='lab')return !!inWave;
  if(type==='mg'||type==='missile')return Number(building.activeTimer)>0;
  return false;
}
function buildingSpriteFrameIndex(building,definition){
  const columns=Math.max(1,Math.floor(Number(definition.columns)||12));
  const level=Math.max(1,Math.min(6,Math.floor(Number(building?.level)||1)));
  const row=(buildingIsActive(building)?6:0)+(level-1);
  const frame=Math.floor((Number(TEST_RUNTIME.frame)||0)/Math.max(1,Number(definition.frameDuration)||6))%columns;
  return row*columns+frame;
}
function drawBuildingSprite(building){
  const type=building?.type||'farm';
  const definition=cellSpriteDefinition(type);
  if(Number(definition.frames||0)<144||Number(definition.columns||0)<12||Number(definition.rows||0)<12)return false;
  const options={definition,frameIndex:buildingSpriteFrameIndex(building,definition)};
  if(type==='mg'||type==='missile'){
    options.flip=building.facing==='left';
    options.definition.flipByDirection=true;
  }
  return drawCellSprite(type,building.gx*tile+tile/2,building.gy*tile+tile/2,options);
}
function droneSpriteRow(drone,definition={}){
  const columns=Math.max(1,Math.floor(Number(definition.columns)||4));
  const rows=Math.max(1,Math.floor(Number(definition.rows)||4));
  if(columns>=6&&rows>=6){
    if(drone?.spriteState==='working')return 5;
    if(drone?.spriteState==='moving')return {up:1,down:2,left:3,right:4}[drone.facing]??2;
  }
  return drone?.spriteState==='working'?1:0;
}
function droneSpriteFrameIndex(drone,definition){
  const columns=Math.max(1,Math.floor(Number(definition.columns)||4));
  const rows=Math.max(1,Math.floor(Number(definition.rows)||4));
  const directionalSheet=Number(definition.frames||0)>=36&&columns>=6&&Number(definition.rows||0)>=6;
  const frameCount=Math.max(1,Math.floor(Number(definition.frames)||columns));
  const animationFrame=Math.floor((Number(TEST_RUNTIME.frame)||0)/Math.max(1,Number(definition.frameDuration)||6))%(directionalSheet?columns:frameCount);
  // The current drone sheets are 4x4: row 1 is movement, rows 2-3 are
  // the two-part working animation, and row 4 is intentionally unused.
  if(frameCount>=16&&columns===4&&rows===4){
    const workingFrame=animationFrame%(columns*2);
    return droneSpriteRow(drone,definition)*columns+(drone?.spriteState==='working'?workingFrame:animationFrame%columns);
  }
  // Keep older 6x6 sheets loadable for saved/custom sprite configurations.
  if(!directionalSheet)return animationFrame;
  return (droneSpriteRow(drone,definition)*columns+(animationFrame%columns))%frameCount;
}
function drawDroneSprite(drone){
  const key={sow:'droneSow',water:'droneWater',harvest:'droneHarvest',excavation:'droneExcavation'}[drone?.type]||'drone';
  const definition=cellSpriteDefinition(key);
  const directionalSheet=Number(definition.frames||0)>=36&&Number(definition.columns||0)>=6&&Number(definition.rows||0)>=6;
  const legacySheet=Number(definition.frames||0)>=16&&Number(definition.columns||0)>=4&&Number(definition.rows||0)>=4;
  if(!directionalSheet&&!legacySheet)return false;
  return drawCellSprite(key,drone.x,drone.y,{definition,frameIndex:droneSpriteFrameIndex(drone,definition)});
}
function updateDroneSpriteState(drone,dx,dy){
  if(Math.abs(dx)>=.001||Math.abs(dy)>=.001){drone.facing=directionFromVector(dx,dy,drone.facing);drone.spriteState='moving';}
  else if(drone.isWorking)drone.spriteState='working';
  else drone.spriteState='idle';
}
function normalizeTrapDefinitions(definitions){const cloned=structuredClone(definitions);Object.values(cloned||{}).forEach(def=>{if(def.type==='freeze')def.type='stun';if(def.type==='single'){def.type='line';def.width??=1} (def.effects||[]).forEach(effect=>{if(effect.type==='freeze')effect.type='stun'})});return cloned}
function applySavedConfig(){
 if(typeof savedConfig==='undefined'||!savedConfig||typeof savedConfig!=='object')return;
 const data=savedConfig.common||savedConfig.gameConfig||savedConfig;
 const replaceObject=(target,source)=>{if(!source||typeof source!=='object')return;Object.keys(target).forEach(k=>delete target[k]);Object.assign(target,structuredClone(source))};
 const replaceArray=(target,source)=>{if(!Array.isArray(source))return;target.splice(0,target.length,...structuredClone(source))};
 const hasRegulations=Array.isArray(savedConfig.regulations);
 if(data.CONFIG)Object.assign(CONFIG,structuredClone(data.CONFIG));
 if(data.ENEMY_DEFINITIONS)replaceObject(ENEMY_DEFINITIONS,data.ENEMY_DEFINITIONS);
 if(data.ENEMY_ABILITY_CONFIG)replaceObject(ENEMY_ABILITY_CONFIG,data.ENEMY_ABILITY_CONFIG);
 if(data.TRAP_DEFINITIONS)TRAP_DEFINITIONS=normalizeTrapDefinitions(data.TRAP_DEFINITIONS);
 if(data.BUFF_DEFINITIONS)replaceArray(BUFF_DEFINITIONS,data.BUFF_DEFINITIONS);
 if(data.EXCAVATION_DRONE_CONFIG)Object.assign(EXCAVATION_DRONE_CONFIG,structuredClone(data.EXCAVATION_DRONE_CONFIG));
 if(data.WAVE_BUFF_CONFIG)replaceObject(WAVE_BUFF_CONFIG,data.WAVE_BUFF_CONFIG);
 if(data.SPRITE_CONFIG)Object.keys(SPRITE_CONFIG).forEach(k=>{if(data.SPRITE_CONFIG[k])Object.assign(SPRITE_CONFIG[k],structuredClone(data.SPRITE_CONFIG[k]))});
 if(Array.isArray(data.TECH_TREES))TECH_TREES=structuredClone(data.TECH_TREES);
 if(hasRegulations)REGULATIONS=structuredClone(savedConfig.regulations);
 else REGULATIONS=[{id:'standard',name:'標準設定',difficulties:defaultDifficulties(),techTrees:structuredClone(DEFAULT_TECH_TREES)}];
 if(savedConfig.activeRegulationId!==undefined)activeRegulationId=savedConfig.activeRegulationId;
 if(savedConfig.currentDifficultyLevel!==undefined)currentDifficultyLevel=Number(savedConfig.currentDifficultyLevel)||1;
 applyActiveRegulation();
}

// In-game simulation speed control. The control is created here so the same
// test surface can run against the production markup and the minimal test DOM.
(function installGameSpeedControl(){
  const controls=$('header-game-controls');
  if(controls&&!$('game-speed')){
    const wrap=document.createElement('div');
    wrap.className='speed-control';
    wrap.innerHTML='<label for="game-speed">進行速度</label><select id="game-speed" aria-label="ゲーム進行速度">'+GAME_SPEED_OPTIONS.map(n=>`<option value="${n}">${n}x</option>`).join('')+'</select>';
    controls.appendChild(wrap);
  }
  $('game-speed')?.addEventListener('change',event=>setGameSpeed(event.target.value));
  setGameSpeed(gameSpeed);
})();
function validateRegulations(){
 const errors=[];
 if(!Array.isArray(REGULATIONS)||!REGULATIONS.length)errors.push('レギュレーションが1件以上必要です');
 const ids=new Set();
 for(const r of REGULATIONS||[]){
  if(!r?.id||!r?.name)errors.push('レギュレーションIDと名称が必要です');
  if(ids.has(r?.id))errors.push(`レギュレーションIDが重複しています: ${r.id}`);ids.add(r?.id);
  if(!r?.difficulties)errors.push(`難易度設定がありません: ${r?.id}`);
  for(let level=1;level<=5;level++){
   const d=r?.difficulties?.[level]||r?.difficulties?.[String(level)];
   if(!d||!Number.isFinite(Number(d.initialMoney))||Number(d.initialMoney)<0)errors.push(`${r?.id} レベル${level}: 初期資金が不正です`);
   for(let n=1;n<=CONFIG.maxWave;n++){
    const wave=d?.waves?.[n]??d?.waves?.[String(n)];
    if(!wave||typeof wave!=='object'||Array.isArray(wave)||!Object.keys(wave).length)errors.push(`${r?.id} レベル${level} Wave${n}: 敵設定が必要です`);
    else {let total=0;for(const [enemyId,count] of Object.entries(wave)){if(!ENEMY_DEFINITIONS[enemyId])errors.push(`${r?.id} レベル${level} Wave${n}: 不明な敵ID ${enemyId}`);if(!Number.isInteger(Number(count))||Number(count)<0)errors.push(`${r?.id} レベル${level} Wave${n}: 出現数が不正です`);total+=Number(count)||0}if(total<1)errors.push(`${r?.id} レベル${level} Wave${n}: 1体以上必要です`)}
   }
   for(const key of Object.keys(d?.waves||{}))if(Number(key)>CONFIG.maxWave||Number(key)<1||!Number.isInteger(Number(key)))errors.push(`${r?.id} レベル${level}: Wave${key}は範囲外です`);
  }
  if(!Array.isArray(r?.techTrees)||!r.techTrees.length)errors.push(`${r?.id}: テックツリーが必要です`);
 }
 if(errors.length){const message=`設定エラーにより起動できません。\n${errors.join('\n')}`;console.error(message);document.body.innerHTML=`<main class="config-error"><h1>設定エラー</h1><pre>${message.replaceAll('&','&amp;').replaceAll('<','&lt;')}</pre></main>`;throw new Error(message)}
}
applySavedConfig();
validateRegulations();
trapEngine=new TrapEngine({getGrid:()=>grid,getEnemies:()=>enemies,getTile:()=>tile,getCanvasWidth:()=>canvas.width,getCanvasHeight:()=>canvas.height,getMapBounds:()=>getMapBounds(),getFrame:()=>Number(TEST_RUNTIME.frame)||0,damageEnemy:(enemy,damage,source)=>damageEnemy(enemy,damage,source),isWaveActive:()=>inWave,drawSprite:(key,x,y,options)=>drawSprite(key,x,y,options),spawnVisualEffect:(type,x,y)=>effects.push(new SpriteEffect(x,y,type)),spawnFct:(x,y,text,color,kind)=>effects.push(new TextEffect(x,y,text,color,kind))});
function activeTree(){return TECH_TREES.find(t=>t.id===activeTreeId)||TECH_TREES[0]}function treeNodes(){return activeTree()?.nodes||[]}function node(id){return treeNodes().find(n=>n[0]===id)}function buff(type){return Object.values(buffs).reduce((s,id)=>{let b=buffDefinition(id);return s+(b&&b[2]===type?b[3]:0)},0)}function mult(type){return 1+buff(type)}
window.getTrapBuffMultiplier=effectType=>['poison','burn'].includes(effectType)?mult('trap_damage'):1;
window.getTrapBuffDurationMultiplier=effectType=>['poison','burn','slow'].includes(effectType)?mult('trap_duration'):1;
class Farm{constructor(x,y){this.gx=x;this.gy=y;this.level=1;this.maxHp=100*mult('farm_hp');this.hp=this.maxHp;this.state=0;this.progress=0}update(){if(inWave&&this.state===2){this.progress+=.15*CONFIG.cropGrowSpeed*(1+(this.level-1)*.25)*mult('crop_speed');if(this.progress>=100){this.progress=100;this.state=3}}}upgrade(){let c=Math.floor(CONFIG.costFarm*1.5*this.level);if(money>=c){money-=c;this.level++;this.maxHp=Math.floor(100*(1+(this.level-1)*.5)*mult('farm_hp'));this.hp=this.maxHp;toast('畑をアップグレードしました')}}}
class Building{
  constructor(type,x,y){this.type=type;this.gx=x;this.gy=y;this.hp=this.maxHp=100;this.level=1;this.cool=0;this.timer=0;this.activeTimer=0;this.facing='right'}
  update(){
    if(this.activeTimer>0)this.activeTimer--;
    if(this.type==='lab'&&inWave&&++this.timer>=120){this.timer=0;let g=Math.max(1,Math.round(mult('science_gen')));science+=g;effects.push(new TextEffect(this.gx*tile+4,this.gy*tile,`+${g} Sci`,'#5bd5e6'))}
    if(['mg','missile'].includes(this.type)){
      if(this.cool>0)this.cool--;
      const cx=this.gx*tile+tile/2,cy=this.gy*tile+tile/2,range=(this.type==='mg'?CONFIG.mgRange:CONFIG.missileRange)*tile*mult(this.type==='missile'?'missile_range':'none');
      const e=enemies.filter(a=>dist(a.x,a.y,cx,cy)<range).sort((a,b)=>dist(a.x,a.y,cx,cy)-dist(b.x,b.y,cx,cy))[0];
      if(e){this.facing=turretDirectionFromVector(e.x-cx,this.facing);if(this.cool<=0){bullets.push(new Bullet(this,e));this.activeTimer=12;this.cool=Math.max(2,Math.floor((this.type==='mg'?CONFIG.mgCooldown:CONFIG.missileCooldown)*(1-(this.type==='mg'?buff('mg_cooldown'):0))))}}
    }
  }
  upgrade(){let base=buildingUpgradeBaseCost(this.type),c=Math.floor(base*.8*this.level);if(money>=c){money-=c;this.level++;this.maxHp*=1.35;this.hp=this.maxHp;toast('建物を強化しました')}}
}
class Drone{
  constructor(type){this.type=type;this.color={sow:'#62d889',water:'#62c9ef',harvest:'#f3c95c',excavation:'#d596ff'}[type]||'#f8c85d';this.x=(Math.floor(CONFIG.gridCols/2)+.5)*tile;this.y=(CONFIG.gridRows-2)*tile;this.target=null;this.work=0;this.goal=null;this.nextDrop=EXCAVATION_DRONE_CONFIG.dropIntervalMin;this.facing='down';this.spriteState='idle';this.isWorking=false}
  update(){
    const oldX=this.x,oldY=this.y;
    this.isWorking=false;
    if(!inWave){if(this.target)this.target.targetedBy=null;this.target=null;this.spriteState='idle';this.moveX=0;this.moveY=0;return}
    if(this.type==='excavation'){this.updateExcavation();updateDroneSpriteState(this,this.x-oldX,this.y-oldY);return}
    if(this.target&&(!farms.includes(this.target)||(this.type==='sow'?this.target.state!==0:this.type==='water'?this.target.state!==1:this.target.state!==3))){if(this.target.targetedBy===this)this.target.targetedBy=null;this.target=null;this.work=0}
    const candidates=farms.filter(f=>(this.type==='sow'?f.state===0:this.type==='water'?f.state===1:f.state===3)&&!f.targetedBy);
    if(!this.target&&candidates.length){
      candidates.sort((a,b)=>dist(this.x,this.y,a.gx*tile+tile/2,a.gy*tile+tile/2)-dist(this.x,this.y,b.gx*tile+tile/2,b.gy*tile+tile/2));
      this.target=candidates[0];
    }
    const tx=this.target?this.target.gx*tile+tile/2:this.x,ty=this.target?this.target.gy*tile+tile/2:this.y;
    if(this.target)this.target.targetedBy=this;
    const d=dist(this.x,this.y,tx,ty),sp=CONFIG.droneBaseSpeed*mult('drone_speed');
    if(d>4){
      if(d<=sp){this.x=tx;this.y=ty}
      else{this.x+=(tx-this.x)/d*sp;this.y+=(ty-this.y)/d*sp}
    }
    else if(this.target){this.isWorking=true;if(++this.work>=18){let f=this.target;f.targetedBy=null;if(this.type==='sow'){f.state=1;f.progress=0}if(this.type==='water')f.state=2;if(this.type==='harvest'){f.state=0;f.progress=0;let g=Math.floor(CONFIG.cropSellValue*mult('crop_sell'));money+=g;effects.push(new TextEffect(this.x,this.y,`+$${g}`,'#57d68d'))}effects.push(new SpriteEffect(this.x,this.y,`${this.type}-effect`));this.target=null;this.work=0}}
    this.moveX=this.x-oldX;this.moveY=this.y-oldY;updateDroneSpriteState(this,this.moveX,this.moveY);
  }
  updateExcavation(){
    let targets=[];for(let y=1;y<CONFIG.gridRows-1;y++)for(let x=0;x<CONFIG.gridCols;x++)if(grid[y][x]==='blocked')targets.push({x:x*tile+tile/2,y:y*tile+tile/2});
    if(!this.goal||dist(this.x,this.y,this.goal.x,this.goal.y)<5)this.goal=targets[Math.floor(gameRandom()*targets.length)]||{x:this.x,y:this.y};
    const d=dist(this.x,this.y,this.goal.x,this.goal.y),sp=EXCAVATION_DRONE_CONFIG.baseSpeed*mult('drone_speed');
    if(d>4){
      if(d<=sp){this.x=this.goal.x;this.y=this.goal.y}
      else{this.x+=(this.goal.x-this.x)/d*sp;this.y+=(this.goal.y-this.y)/d*sp}
      this.isWorking=false;
    }
    else {this.isWorking=true;if((this.nextDrop%12)===0)effects.push(new SpriteEffect(this.x,this.y,'excavation-effect'));if(--this.nextDrop<=0){this.nextDrop=EXCAVATION_DRONE_CONFIG.dropIntervalMin+gameRandom()*(EXCAVATION_DRONE_CONFIG.dropIntervalMax-EXCAVATION_DRONE_CONFIG.dropIntervalMin);if(gameRandom()<=EXCAVATION_DRONE_CONFIG.excavateChance){let m=Math.round(EXCAVATION_DRONE_CONFIG.moneyMin+gameRandom()*(EXCAVATION_DRONE_CONFIG.moneyMax-EXCAVATION_DRONE_CONFIG.moneyMin)),s=Math.round(EXCAVATION_DRONE_CONFIG.scienceMin+gameRandom()*(EXCAVATION_DRONE_CONFIG.scienceMax-EXCAVATION_DRONE_CONFIG.scienceMin));money+=m;science+=s;effects.push(new TextEffect(this.x,this.y,`+$${m} / +${s}Sci`,'#f8c85d'));if(gameRandom()<=EXCAVATION_DRONE_CONFIG.buffDropChance){let pool=BUFF_DEFINITIONS.filter(b=>!buffs[b[0]]);for(let i=0;i<Math.min(EXCAVATION_DRONE_CONFIG.buffDropCount,pool.length);i++){let b=pool.splice(Math.floor(gameRandom()*pool.length),1)[0];if(b)buffs[b[0]]=b[0]}toast('発掘でバフを発見しました')}}}}}
}
 class Enemy{constructor(type){this.type=type;this.hp=this.maxHp=0;this.speed=0;this.damage=0;this.x=(Math.floor(CONFIG.gridCols/2)+.5)*tile;this.y=tile/2;this.path=[];this.waypoint=1;this.pathTick=0;this.target=null;this.lastX=this.x;this.lastY=this.y;this.stuckFrames=0;this.attackFctTimer=0;this.attackFctDamage=0;this.facing='down';this.spriteState='idle';this.spriteStateStartFrame=Number(TEST_RUNTIME.frame)||0;this.hitTimer=0;this.deathTimer=0;this.dead=false}repath(){let sx=Math.max(0,Math.min(CONFIG.gridCols-1,Math.floor(this.x/tile))),sy=Math.max(0,Math.min(CONFIG.gridRows-1,Math.floor(this.y/tile)));this.path=findPath(sx,sy,this.target.gx,this.target.gy);this.waypoint=1;this.pathTick=0}update(){if(!farms.length)return;let nt=farms.slice().sort((a,b)=>dist(this.x,this.y,a.gx*tile+12,a.gy*tile+12)-dist(this.x,this.y,b.gx*tile+12,b.gy*tile+12))[0];if(this.target!==nt){this.target=nt;this.attackFctTimer=0;this.attackFctDamage=0;this.path=[];this.repath()}let tx=this.target.gx*tile+12,ty=this.target.gy*tile+12;if(dist(this.x,this.y,tx,ty)<tile*.8){let dealt=this.damage/60;this.target.hp-=dealt;this.attackFctTimer++;this.attackFctDamage+=dealt;if(this.attackFctTimer>=15){spawnFct(tx,ty,`-${formatFctNumber(this.attackFctDamage)}`,'#ff6b6b','enemy-damage');this.attackFctTimer=0;this.attackFctDamage=0}if(this.target.hp<=0){grid[this.target.gy][this.target.gx]=null;farms=farms.filter(f=>f!==this.target);this.target=null;if(!farms.length)endGame(false)}return}let next=this.path[this.waypoint],nextBlocked=next&&solid(next[0],next[1],this.target.gx,this.target.gy);if(++this.pathTick>=20||!this.path.length||this.stuckFrames>=30||nextBlocked)this.repath();let n=this.path[this.waypoint];if(n){let nx=n[0]*tile+12,ny=n[1]*tile+12,d=dist(this.x,this.y,nx,ny),slow=grid[Math.floor(this.y/tile)]?.[Math.floor(this.x/tile)]==='slow'?Math.max(.1,CONFIG.slowTileEffect/mult('slow_tile')):1,step=this.speed*slow;if(d<=step+.5){this.x=nx;this.y=ny;this.waypoint++;this.stuckFrames=0}else{this.x+=(nx-this.x)/d*step;this.y+=(ny-this.y)/d*step;this.stuckFrames=dist(this.x,this.y,this.lastX,this.lastY)<.05?this.stuckFrames+1:0}this.lastX=this.x;this.lastY=this.y}}}
class Bullet{constructor(t,e){this.t=t;this.e=e;this.x=t.gx*tile+12;this.y=t.gy*tile+12;this.angle=0;this.dead=false}update(){if(!this.e||this.e.hp<=0){this.dead=true;return}let d=dist(this.x,this.y,this.e.x,this.e.y),sp=5;this.angle=Math.atan2(this.e.y-this.y,this.e.x-this.x);if(d<sp){let dmg=(this.t.type==='mg'?CONFIG.mgDamage*mult('mg_damage'):CONFIG.missileDamage*mult('missile_damage'));if(this.t.type==='missile'){enemies.forEach(e=>{if(dist(e.x,e.y,this.e.x,this.e.y)<CONFIG.missileSplashRadius*tile)damageEnemy(e,dmg,{type:this.t.type})});effects.push(new Explosion(this.e.x,this.e.y))}else damageEnemy(this.e,dmg,{type:this.t.type});this.dead=true}else{this.x+=(this.e.x-this.x)/d*sp;this.y+=(this.e.y-this.y)/d*sp}}}class TextEffect{constructor(x,y,t,c,kind='gain'){this.x=x;this.y=y;this.t=t;this.c=c;this.kind=kind;this.life=50}update(){this.y-=this.kind==='enemy-damage'?0.7:1;this.life--}}class SpriteEffect{constructor(x,y,type){this.x=x;this.y=y;this.type=type;this.life=24}update(){this.life--}}class Explosion{constructor(x,y){this.x=x;this.y=y;this.life=20}update(){this.life--}}
function formatFctNumber(value){const n=Number(value)||0;return Number.isInteger(n)?String(n):n.toFixed(1).replace(/\.0$/,'')}
function spawnFct(x,y,text,color,kind='gain'){effects.push(new TextEffect(x,y,text,color,kind))}
 function damageEnemy(enemy,damage,source={}){if(!enemy||enemy.hp<=0||enemy.dead)return;const amount=Math.max(0,Number(damage)||0);enemy.hp-=amount;if(amount>0){if(enemy.hp<=0){enemy.dead=true;enemy.hitTimer=0;enemy.deathTimer=ENEMY_SPRITE_LAYOUT.deathDuration;setEnemySpriteState(enemy,'death',true)}else{const isStatusEffect=['poison','burn','slow','stun','armor_down','knockback','pull'].includes(source?.type);if(!isStatusEffect){enemy.hitTimer=ENEMY_SPRITE_LAYOUT.hitDuration;setEnemySpriteState(enemy,'hurt',true)}}}const color=source.type==='poison'?'#b78cff':source.type==='burn'?'#ff9b54':'#fff';spawnFct(enemy.x,enemy.y,`-${formatFctNumber(amount)}`,color,source.type==='poison'||source.type==='burn'?'trap-damage':'enemy-hit');}
function dist(x,y,a,b){return Math.hypot(x-a,y-b)}function solid(x,y,tx,ty){if(x<0||y<0||x>=CONFIG.gridCols||y>=CONFIG.gridRows||!isMapCell(x,y))return true;return grid[y][x]&&!(x===tx&&y===ty)}function findPath(sx,sy,tx,ty){let q=[[sx,sy]],prev=new Map([[`${sx},${sy}`,null]]);for(let i=0;i<q.length;i++){let [x,y]=q[i];if(x===tx&&y===ty){let p=[];for(let k=`${x},${y}`;k;k=prev.get(k))p.unshift(k.split(',').map(Number));return p}for(let [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){let nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(!prev.has(k)&&!solid(nx,ny,tx,ty)){prev.set(k,`${x},${y}`);q.push([nx,ny])}}}return []}function addFarm(x,y){let f=new Farm(x,y);farms.push(f);grid[y][x]='farm'}function validPlace(x,y){if(x<0||y<1||x>=CONFIG.gridCols||y>=CONFIG.gridRows-1||grid[y][x])return false;grid[y][x]='blocked';let ok=farms.every(f=>findPath(Math.floor(CONFIG.gridCols/2),0,f.gx,f.gy).length);grid[y][x]=null;return ok}function place(x,y,type){let cost=getBuildingCost(type);if(!validPlace(x,y)||money<cost)return false;money-=cost;if(TRAP_DEFINITIONS[type]){const result=trapEngine.place(x,y,TRAP_DEFINITIONS[type],lineDirection);if(!result.ok){money+=cost;toast(result.error);return false}renderAll();return true}if(type==='farm')addFarm(x,y);else{grid[y][x]=type;buildings.push(new Building(type,x,y))}renderAll();return true}
function removeBuilding(building){
  const index=buildings.indexOf(building);
  if(index<0)return false;
  if(!building||building.gx===undefined||building.gy===undefined)return false;
  if(grid[building.gy])grid[building.gy][building.gx]=null;
  buildings.splice(index,1);
  if(selected===building)selected=null;
  renderAll();
  renderSelection();
  toast('建築を撤去しました（コストは返還されません）');
  return true;
}
function removeTrap(trap){
  if(!trapEngine||!trap||trap.gx===undefined||trap.gy===undefined)return false;
  const removed=trapEngine.remove(trap.gx,trap.gy);
  if(!removed){
    const index=trapEngine.traps.indexOf(trap);
    if(index<0)return false;
    trapEngine.traps.splice(index,1);
  }
  if(grid[trap.gy]?.[trap.gx]===trap.definition?.id)grid[trap.gy][trap.gx]=null;
  if(selected===trap)selected=null;
  renderAll();
  renderSelection();
  toast('罠を撤去しました（コストは返還されません）');
  return true;
}
function removeFarm(farm){
  const index=farms.indexOf(farm);
  if(index<0)return false;
  if(farms.length<=1){
    toast('最後の畑は撤去できません');
    return false;
  }
  if(grid[farm.gy])grid[farm.gy][farm.gx]=null;
  farms.splice(index,1);
  drones.forEach(d=>{if(d.target===farm){d.target=null;d.work=0}});
  if(selected===farm)selected=null;
  renderAll();
  renderSelection();
  toast('畑を撤去しました（コストは返還されません）');
  return true;
}
function removeAt(x,y){
  const building=buildings.find(b=>b.gx===x&&b.gy===y);
  if(building)return removeBuilding(building);
  const trap=trapEngine?.traps.find(t=>t.gx===x&&t.gy===y);
  if(trap)return removeTrap(trap);
  const farm=farms.find(f=>f.gx===x&&f.gy===y);
  if(farm)return removeFarm(farm);
  return false;
}
function removeTarget(target){
  if(!target)return false;
  if(buildings.includes(target))return removeBuilding(target);
  if(trapEngine?.traps.includes(target))return removeTrap(target);
  if(farms.includes(target))return removeFarm(target);
  return false;
}
function waveBuffConfig(n){return WAVE_BUFF_CONFIG.waves[n]||WAVE_BUFF_CONFIG.default}
function weightedRarity(weights){let entries=Object.entries(weights||{}).map(([rarity,weight])=>[Number(rarity),Math.max(0,Number(weight)||0)]).filter(x=>x[1]>0);let total=entries.reduce((s,x)=>s+x[1],0);if(!total)return 1;let r=gameRandom()*total;for(let [rarity,weight] of entries){r-=weight;if(r<0)return rarity}return entries[entries.length-1][0]}
function pickBuffChoices(n){let cfg=waveBuffConfig(n),pool=BUFF_DEFINITIONS.filter(b=>!buffs[b[0]]),choices=[];for(let i=0;i<Math.min(Math.max(0,Number(cfg.appearanceCount)||0),pool.length);i++){let rarity=weightedRarity(cfg.rarityWeights),candidates=pool.filter(b=>Number(b[5])===rarity);if(!candidates.length)candidates=pool;let b=candidates[Math.floor(gameRandom()*candidates.length)];choices.push(b);pool=pool.filter(x=>x!==b)}return choices}
function resetGame(options={}){clearTimeout(spawnTimer);const current=activeRegulation();if(options.persistTechTrees!==false&&current&&TECH_TREES?.length)current.techTrees=structuredClone(TECH_TREES);activeDifficultyLevel=normalizeDifficultyLevel(currentDifficultyLevel);applyActiveRegulation();money=Math.floor(Number(difficultyConfig().initialMoney)||0);science=0;wave=0;inWave=false;spawning=false;selected=null;buffs={};techs={};grid=Array.from({length:CONFIG.gridRows},()=>Array(CONFIG.gridCols).fill(null));farms=[];buildings=[];drones=[];enemies=[];bullets=[];effects=[];['sow','water','harvest','excavation'].forEach(t=>drones.push(new Drone(t)));renderAll();$('start-tech-overlay').classList.remove('hidden');toast('テックツリーを選択してください')}
const originalResetGameForTraps=resetGame;resetGame=function(options={}){setGameSpeed(1);trapEngine.reset();return originalResetGameForTraps(options)};
function startWithTree(id){activeTreeId=id;$('start-tech-overlay').classList.add('hidden');renderAll();toast(`${activeTree().name}でゲームを開始しました`)}
function activateRegulation(id){const current=activeRegulation();if(current&&TECH_TREES?.length)current.techTrees=structuredClone(TECH_TREES);activeRegulationId=id;currentDifficultyLevel=1;applyActiveRegulation();resetGame({persistTechTrees:false})}
function startWave(){}
function endGame(win){inWave=false;$('game-result').textContent=win?'VICTORY!':'GAME OVER';$('game-result-detail').textContent=win?'全ウェーブをクリアしました！':'すべての畑が破壊されました。';$('game-overlay').classList.remove('hidden')}
function unlock(id){let n=node(id);if(!n||science<n[3]||!n[4].every(x=>techs[x])){toast('前提条件または科学ポイントが不足しています');return}science-=n[3];techs[id]=true;n[5].split(',').forEach(x=>buffs[x]=x);renderAll();toast(`${n[1]}を解除しました`)}function renderTreeChoices(){$('tree-choices').innerHTML=TECH_TREES.map(t=>`<div class="tree-choice"><h3>${t.name}</h3><p>${t.description||''}</p><b>${t.nodes.length} 研究</b><button data-start-tree="${t.id}">このツリーで開始</button></div>`).join('');document.querySelectorAll('[data-start-tree]').forEach(b=>b.onclick=()=>startWithTree(b.dataset.startTree))}
function renderTech(){let ns=treeNodes();$('techtree').innerHTML=[1,2,3,4].map(t=>`<div class="tier"><h3>TIER ${t}</h3>${ns.filter(n=>n[2]===t).map(n=>{let ok=n[4].every(x=>techs[x]),done=techs[n[0]];return`<div class="tech-card ${done?'unlocked':''} ${!ok?'locked':''}"><h4>${done?'✓ ':''}${n[1]}</h4><p>${n[3]} 🔬　バフ: ${n[5]}</p><p>${n[4].length?'前提: '+n[4].map(x=>node(x)?.[1]||x).join(' / '):'前提なし'}</p>${done?'解除済み':`<button data-tech="${n[0]}" ${ok?'':'disabled'}>🔬 ${n[3]}で解除</button>`}</div>`}).join('')}</div>`).join('');document.querySelectorAll('[data-tech]').forEach(b=>b.onclick=()=>unlock(b.dataset.tech))}
function renderTreeEditor(){let html=`<div class="tree-toolbar"><button id="add-tree">＋テックツリー追加</button><select id="tree-select">${TECH_TREES.map(t=>`<option value="${t.id}" ${t.id===activeTreeId?'selected':''}>${t.name}</option>`).join('')}</select></div>`;for(let t of TECH_TREES){html+=`<div class="tree-editor"><input data-tree-name="${t.id}" value="${t.name}"><input data-tree-desc="${t.id}" value="${t.description||''}"><button data-delete-tree="${t.id}" ${TECH_TREES.length<2?'disabled':''}>削除</button><div class="research-list">${t.nodes.map(n=>`<div class="research-row"><input data-node-field="name" data-tree="${t.id}" data-node="${n[0]}" value="${n[1]}"><input type="number" data-node-field="tier" data-tree="${t.id}" data-node="${n[0]}" value="${n[2]}" min="1" max="10"><input type="number" data-node-field="cost" data-tree="${t.id}" data-node="${n[0]}" value="${n[3]}" min="0"><select data-node-field="buffs" data-tree="${t.id}" data-node="${n[0]}" multiple>${BUFF_DEFINITIONS.map(b=>`<option value="${b[0]}" ${n[5].split(',').includes(b[0])?'selected':''}>${b[1]}</option>`).join('')}</select><small>依存: ${n[4].join(', ')||'なし'}</small><button data-delete-node="${t.id}|${n[0]}">削除</button></div>`).join('')}</div><button data-add-node="${t.id}">＋研究を追加</button></div>`}$('tech-editor').innerHTML=html;$('tree-select').onchange=e=>{activeTreeId=e.target.value;renderAll()};$('add-tree').onclick=()=>{let id='tree_'+Date.now();TECH_TREES.push({id,name:'新しいテックツリー',description:'説明を入力',nodes:[]});activeTreeId=id;renderAll()};document.querySelectorAll('[data-tree-name]').forEach(e=>e.onchange=()=>{TECH_TREES.find(t=>t.id===e.dataset.treeName).name=e.value;renderTreeChoices();renderTech()});document.querySelectorAll('[data-tree-desc]').forEach(e=>e.onchange=()=>TECH_TREES.find(t=>t.id===e.dataset.treeDesc).description=e.value);document.querySelectorAll('[data-delete-tree]').forEach(e=>e.onclick=()=>{TECH_TREES=TECH_TREES.filter(t=>t.id!==e.dataset.deleteTree);if(activeTreeId===e.dataset.deleteTree)activeTreeId=TECH_TREES[0].id;renderAll()});document.querySelectorAll('[data-delete-node]').forEach(e=>e.onclick=()=>{let [tid,nid]=e.dataset.deleteNode.split('|'),t=TECH_TREES.find(x=>x.id===tid);t.nodes=t.nodes.filter(n=>n[0]!==nid).map(n=>[n[0],n[1],n[2],n[3],n[4].filter(x=>x!==nid),n[5]]);renderAll()});document.querySelectorAll('[data-add-node]').forEach(e=>e.onclick=()=>{let t=TECH_TREES.find(x=>x.id===e.dataset.addNode),id=`research_${Date.now()}`;t.nodes.push([id,'新しい研究',1,100,[],BUFF_DEFINITIONS[0][0]]);renderAll()});document.querySelectorAll('[data-node-field]').forEach(e=>e.onchange=()=>{let n=TECH_TREES.find(t=>t.id===e.dataset.tree).nodes.find(n=>n[0]===e.dataset.node),v=e.dataset.nodeField==='buffs'?[...e.selectedOptions].map(o=>o.value).join(','):e.dataset.nodeField==='name'?e.value:Number(e.value);n[{name:1,tier:2,cost:3,buffs:5}[e.dataset.nodeField]]=v;renderTech()})}
function renderParams(){ $('param-editor').innerHTML=Object.entries(CONFIG).map(([k,v])=>`<div class="param"><label>${k}<output>${v}</output></label><input data-param="${k}" type="range" min="0" max="${Math.max(v*3,1)}" step="${v%1?'.01':'1'}" value="${v}"></div>`).join('');document.querySelectorAll('[data-param]').forEach(i=>i.oninput=()=>{CONFIG[i.dataset.param]=Number(i.value);i.previousElementSibling.querySelector('output').value=i.value;tile=canvas.width/CONFIG.gridCols;renderStats()});$('buff-editor').innerHTML=BUFF_DEFINITIONS.map(b=>`<div class="param"><label>${b[1]} <input type="checkbox" data-buff-toggle="${b[0]}" ${buffs[b[0]]?'checked':''}></label><small>${b[4]}</small></div>`).join('');document.querySelectorAll('[data-buff-toggle]').forEach(i=>i.onchange=()=>{if(i.checked)buffs[i.dataset.buff]=i.dataset.buff;else delete buffs[i.dataset.buff];renderAll()});$('excavation-editor').innerHTML=Object.entries(EXCAVATION_DRONE_CONFIG).map(([k,v])=>`<div class="param"><label>${k}<output>${v}</output></label><input data-exc-param="${k}" type="range" min="0" max="${Math.max(v*3,1)}" step="${v%1?'.01':'1'}" value="${v}"></div>`).join('');document.querySelectorAll('[data-exc-param]').forEach(i=>i.oninput=()=>{EXCAVATION_DRONE_CONFIG[i.dataset.excParam]=Number(i.value);i.previousElementSibling.querySelector('output').value=i.value})}
function renderStats(){$('money').textContent=Math.floor(money);$('science').textContent=science;$('science-tech').textContent=science;$('farms').textContent=farms.length;$('wave').textContent=`${wave} / ${CONFIG.maxWave}`;$('drones').textContent=`🌱${droneCount('sow')} 💧${droneCount('water')} 🌾${droneCount('harvest')} ⛏${droneCount('excavation')}`}
function renderAll(){renderStats();$('build-grid').innerHTML=[['farm','🌱 畑'],['lab','🔬 研究所'],['slow','🟣 スロータイル'],['mg','🔫 マシンガン'],['missile','🚀 ミサイル'],['select','🖱 選択'],['remove','🗑 撤去']].map(a=>`<button type="button" data-build="${a[0]}" class="${a[0]==='remove'?'danger':''}">${a[1]}<span class="cost">${['select','remove'].includes(a[0])?'':'$'+getBuildingCost(a[0])}</span></button>`).join('');$('drone-shop').innerHTML=[['sow','🌱 種まき'],['water','💧 水撒き'],['harvest','🌾 刈取り'],['excavation','⛏ 発掘']].map(([t,n])=>`<button type="button" class="drone-btn" data-drone="${t}">${n}<span class="cost">$${getDroneCost(t)}</span></button>`).join('');document.querySelectorAll('#build-grid [data-build]').forEach(b=>b.onclick=()=>setBuildMode(b.dataset.build));document.querySelectorAll('[data-drone]').forEach(b=>b.onclick=()=>buyDrone(b.dataset.drone));$('buff-list').innerHTML=Object.values(buffs).length?Object.values(buffs).map(id=>`<span class="badge">${buffDefinition(id)?.[1]||id}</span>`).join(''):'まだバフはありません';renderTech();renderTreeEditor();renderParams();renderTreeChoices();setBuildMode(buildMode)}
function buyDrone(t){let c=Math.floor(CONFIG.costDrone*Math.pow(1.5,droneCount(t)));if(money<c){toast('資金が足りません');return}money-=c;drones.push(new Drone(t));renderAll()}
 function update(){farms.forEach(f=>f.update());buildings.forEach(b=>b.update());drones.forEach(d=>d.update());enemies.forEach(e=>e.update());bullets.forEach(b=>b.update());effects.forEach(e=>e.update());enemies=enemies.filter(e=>e.dead?e.deathTimer>0:e.hp>0);bullets=bullets.filter(b=>!b.dead);effects=effects.filter(e=>e.life>0);if(inWave&&!spawning&&!enemies.length)waveClear();renderStats()}
function drawMapBackdrop(){
  ctx.fillStyle='#10271d';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='rgba(125,170,135,.24)';ctx.lineWidth=1;
  for(const key of mapShapeCells){const [x,y]=key.split(',').map(Number);ctx.fillStyle='#173326';ctx.fillRect(x*tile,y*tile,tile,tile);ctx.strokeRect(x*tile+.5,y*tile+.5,tile,tile)}
  for(const key of mapShapeCells){const [x,y]=key.split(',').map(Number);if(grid[y]?.[x]==='blocked'){ctx.fillStyle='#263844';ctx.fillRect(x*tile+2,y*tile+2,tile-4,tile-4);ctx.strokeStyle='#60747b';ctx.strokeRect(x*tile+4,y*tile+4,tile-8,tile-8)}}
  activeMap.spawns.forEach((spawn,index)=>{const x=spawn.x*tile+tile/2,y=spawn.y*tile+tile/2;ctx.fillStyle='#f1d16a';ctx.beginPath();ctx.moveTo(x,y+8);ctx.lineTo(x-7,y-5);ctx.lineTo(x+7,y-5);ctx.closePath();ctx.fill();ctx.fillStyle='#18251e';ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.fillText(`入口${index+1}`,x,y-8)});
  const bx=activeMap.base.x*tile+tile/2,by=activeMap.base.y*tile+tile/2;ctx.strokeStyle='#72e0a0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(bx,by,Math.max(9,tile*.42),0,Math.PI*2);ctx.stroke();ctx.fillStyle='#b8f4c9';ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.fillText('BASE',bx,by+tile*.75);
  ctx.fillStyle='rgba(6,16,12,.78)';ctx.fillRect(5,5,Math.min(canvas.width-10,180),18);ctx.fillStyle='#f3f6d0';ctx.font='bold 11px sans-serif';ctx.textAlign='left';ctx.fillText(activeMap.name,10,18);
}
function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);drawMapBackdrop();for(let y=0;y<CONFIG.gridRows;y++)for(let x=0;x<CONFIG.gridCols;x++){let v=grid[y]?.[x];if(v){ctx.fillStyle=colors[v]||'#596b72';ctx.fillRect(x*tile+1,y*tile+1,tile-2,tile-2)}}farms.forEach(f=>{ctx.fillStyle='#64c987';ctx.fillRect(f.gx*tile+2,f.gy*tile+2,tile-4,tile-4);ctx.fillStyle='#19352a';ctx.fillRect(f.gx*tile+3,f.gy*tile+tile-5,(tile-6)*Math.max(0,f.hp/f.maxHp),2)});buildings.forEach(b=>{ctx.fillStyle=colors[b.type]||'#798c96';ctx.fillRect(b.gx*tile+3,b.gy*tile+3,tile-6,tile-6)});enemies.forEach(e=>{ctx.fillStyle=e.definition?.color||'#e85d5d';ctx.beginPath();ctx.arc(e.x,e.y,8,0,Math.PI*2);ctx.fill()});drones.forEach(d=>{ctx.fillStyle='#f8c85d';ctx.beginPath();ctx.arc(d.x,d.y,4,0,Math.PI*2);ctx.fill()});bullets.forEach(b=>{ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(b.x,b.y,2,0,Math.PI*2);ctx.fill()});effects.forEach(e=>{if(e.t){ctx.fillStyle=e.c;ctx.fillText(e.t,e.x,e.y)}})}
const originalDrawForTraps=draw;draw=function(){originalDrawForTraps();trapEngine.draw(ctx)};
 const originalUpdateForTraps=update;update=function(){trapEngine.update();originalUpdateForTraps()};function loop(t){if(t-last>15){for(let i=0;i<gameSpeed;i++)update();TEST_RUNTIME.frame++;last=t}draw();if(!GAME_TEST_MODE)requestAnimationFrame(loop)}function toast(t){let e=$('toast');e.textContent=t;e.style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.style.display='none',1800)}
function renderSelection(){const host=$('selection');if(!host)return;const target=selected;const isTrap=!!(target&&trapEngine?.traps.includes(target));const isFarm=!!(target&&(target instanceof Farm||farms.includes(target)));const canRemove=!!(target&&(buildings.includes(target)||isTrap||(isFarm&&farms.length>1)));const title=isFarm?'🌱 畑':isTrap?`${target.definition?.icon||'🪤'} ${target.definition?.name||'罠'}`:(`🏗 ${target?.type||''}`);const details=isTrap?`<p>コスト $${target.definition?.cost??0}　CD ${target.definition?.cooldown??0}s</p>`:`<p>Lv.${target?.level??1}　HP ${Math.ceil(target?.hp??0)} / ${Math.ceil(target?.maxHp??0)}</p>`;host.innerHTML=target?`<b>${title}</b>${details}${!isTrap?'<button type="button" id="btn-upgrade-target">⬆ アップグレード</button>':''}${canRemove?'<button type="button" id="btn-remove-target" class="danger">🗑 撤去（返金なし）</button>':''}`:'<b>選択オブジェクト</b><p>キャンバス上の建物を選択してください</p>';if(target){if(!isTrap){$('btn-upgrade-target').onclick=()=>{if(selected===target)target.upgrade();renderAll()};}$('btn-remove-target')?.addEventListener('click',()=>removeTarget(target))}}
function showSelectionAt(x,y){selected=farms.find(f=>f.gx===x&&f.gy===y)||buildings.find(b=>b.gx===x&&b.gy===y)||trapEngine?.traps.find(t=>t.gx===x&&t.gy===y)||null;renderSelection()}function paintAt(e){let r=canvas.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)*canvas.width/r.width/tile),y=Math.floor((e.clientY-r.top)*canvas.height/r.height/tile),key=`${x},${y}`;if(key===lastPaintTile)return;lastPaintTile=key;if(buildMode==='remove'){removeAt(x,y)}else if(buildMode!=='select')place(x,y,buildMode);else showSelectionAt(x,y)}canvas.onpointerdown=e=>{pointerDown=true;lastPaintTile='';canvas.setPointerCapture?.(e.pointerId);paintAt(e);e.preventDefault()};canvas.onpointermove=e=>{if(pointerDown){paintAt(e);e.preventDefault()}};canvas.onpointerup=()=>{pointerDown=false;lastPaintTile=''};window.addEventListener('pointerup',()=>{pointerDown=false;lastPaintTile=''});document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab,.tab-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.tab).classList.add('active')});$('btn-start-wave').onclick=startWave;$('restart').onclick=()=>{$('game-overlay').classList.add('hidden');resetGame()};$('resume').onclick=()=>document.querySelector('[data-tab="game-tab"]').click();$('reset').onclick=resetGame;
// Initialization is performed after the map and editor extensions are installed.
// dependency editing is represented by each research prerequisite array and included in export
setTimeout(()=>{const host=document.getElementById('tech-editor');if(!host)return;const renderDeps=()=>{let old=document.getElementById('dependency-editor');if(old)old.remove();let wrap=document.createElement('div');wrap.id='dependency-editor';wrap.className='tree-editor';wrap.innerHTML='<h3>研究の依存関係</h3><p>各研究を解除するために必要な研究を複数選択できます。</p>';for(const t of TECH_TREES){let section=document.createElement('div');section.innerHTML=`<h4>${t.name}</h4>`;for(const n of t.nodes){let row=document.createElement('div');row.className='research-row';let label=document.createElement('label');label.textContent=n[1];let select=document.createElement('select');select.multiple=true;select.dataset.depTree=t.id;select.dataset.depNode=n[0];for(const candidate of t.nodes){if(candidate[0]===n[0])continue;let option=document.createElement('option');option.value=candidate[0];option.textContent=`${candidate[1]} (${candidate[0]})`;option.selected=n[4].includes(candidate[0]);select.appendChild(option)}select.onchange=()=>{let tree=TECH_TREES.find(x=>x.id===select.dataset.depTree),research=tree?.nodes.find(x=>x[0]===select.dataset.depNode);if(!research)return;research[4]=[...select.selectedOptions].map(o=>o.value);renderTech()};row.append(label,select);section.appendChild(row)}wrap.appendChild(section)}host.parentNode.appendChild(wrap)};const observer=new MutationObserver(renderDeps);observer.observe(host,{childList:true});renderDeps()},0);
setTimeout(()=>{renderTech=()=>{let ns=treeNodes(),maxTier=Math.max(1,...ns.map(n=>Number(n[2])||1));$('techtree').innerHTML=Array.from({length:maxTier},(_,i)=>i+1).map(t=>`<div class="tier"><h3>TIER ${t}</h3>${ns.filter(n=>Number(n[2])===t).map(n=>{let ok=n[4].every(x=>techs[x]),done=techs[n[0]];return`<div class="tech-card ${done?'unlocked':''} ${!ok?'locked':''}"><h4>${done?'✓ ':''}${n[1]}</h4><p>${n[3]} 🔬　バフ: ${n[5]}</p><p>${n[4].length?'前提: '+n[4].map(x=>node(x)?.[1]||x).join(' / '):'前提なし'}</p>${done?'解除済み':`<button data-tech="${n[0]}" ${ok?'':'disabled'}>🔬 ${n[3]}で解除</button>`}</div>`}).join('')}</div>`).join('');document.querySelectorAll('[data-tech]').forEach(b=>b.onclick=()=>unlock(b.dataset.tech))};renderAll()},0);
setTimeout(()=>{const host=document.getElementById('tech-editor');if(!host)return;const setTierRange=()=>host.querySelectorAll('[data-node-field="tier"]').forEach(input=>{input.max='10';input.placeholder='TIER'});new MutationObserver(setTierRange).observe(host,{childList:true,subtree:true});setTierRange()},0);
setTimeout(()=>document.head.insertAdjacentHTML('beforeend','<style>.tech-tree{display:flex!important;flex-direction:column!important;gap:18px!important}.tech-tree .tier{width:100%}.tech-tree .tier>h3{margin-top:0}.tech-tree .tech-card{display:inline-block;vertical-align:top;width:min(100%,340px);margin-right:9px}</style>'),0);
// Extended buff editors. Defined last so it overrides the legacy editor above.
function effectFields(effect,index,id){const common=`<label>効果 <select data-trap-effect="${id}" data-effect-index="${index}">${window.TRAP_EFFECT_TYPES.map(t=>`<option value="${t}" ${effect.type===t?'selected':''}>${t}</option>`).join('')}</select></label>`;const amount=['slow','poison','burn','armor_down','knockback','pull'].includes(effect.type)?`<label>量 <input type="number" step="0.05" data-effect-field="amount" data-trap-id="${id}" data-effect-index="${index}" value="${effect.amount??1}"></label>`:'';const interval=['poison','burn'].includes(effect.type)?`<label>間隔(秒) <input type="number" min="0.01" step="0.1" data-effect-field="interval" data-trap-id="${id}" data-effect-index="${index}" value="${effect.interval??0.5}"></label>`:'';return`<div class="trap-effect-row">${common}${amount}<label>時間(秒) <input type="number" min="0.01" step="0.1" data-effect-field="duration" data-trap-id="${id}" data-effect-index="${index}" value="${effect.duration??1}"></label>${interval}<button data-remove-effect="${id}" data-effect-index="${index}">削除</button></div>`}
function renderTrapEditor(){const host=$('trap-editor');if(!host)return;host.innerHTML=`<button data-add-trap>＋罠を追加</button>`+Object.values(TRAP_DEFINITIONS).map(def=>`<div class="trap-editor-card"><h3>${def.name}</h3><label>ID <input data-trap-field="id" data-trap-id="${def.id}" value="${def.id}"></label><label>名称 <input data-trap-field="name" data-trap-id="${def.id}" value="${def.name}"></label><label>タイプ <select data-trap-field="type" data-trap-id="${def.id}">${['line','tile','area'].map(t=>`<option value="${t}" ${def.type===t?'selected':''}>${t}</option>`).join('')}</select></label><label>コスト <input type="number" min="0" data-trap-field="cost" data-trap-id="${def.id}" value="${def.cost}"></label><label>クールダウン(秒) <input type="number" min="0" step="0.1" data-trap-field="cooldown" data-trap-id="${def.id}" value="${def.cooldown??0}"></label>${def.type==='line'?`<label>射程 <input type="number" min="1" data-trap-field="range" data-trap-id="${def.id}" value="${def.range??8}"></label>`:''}${def.type==='area'?`<label>半径 <input type="number" min="1" data-trap-field="radius" data-trap-id="${def.id}" value="${def.radius??3}"></label>`:''}${def.type==='tile'?`<label>持続時間(秒) <input type="number" min="0.01" step="0.1" data-trap-field="duration" data-trap-id="${def.id}" value="${def.duration??1}"></label>`:''}<h4>効果（1つ以上）</h4>${def.effects.map((e,i)=>effectFields(e,i,def.id)).join('')}<button data-add-effect="${def.id}">＋効果を追加</button> <button data-save-trap="${def.id}">保存</button> <button data-test-trap="${def.id}">ゲームで試す</button> <button data-delete-trap="${def.id}">削除</button><p data-trap-message="${def.id}"></p></div>`).join('');host.querySelector('[data-add-trap]').onclick=()=>{const id=`custom_trap_${Date.now()}`;TRAP_DEFINITIONS[id]={id,name:'新しい罠',type:'line',cost:50,cooldown:1,range:8,width:1,effects:[{type:'slow',amount:.5,duration:1}]};renderAll()};host.querySelectorAll('[data-trap-field]').forEach(input=>input.onchange=()=>{const def=TRAP_DEFINITIONS[input.dataset.trapId];const field=input.dataset.trapField;def[field]=field==='type'?input.value:['id','name'].includes(field)?input.value:Number(input.value);renderTrapEditor()});host.querySelectorAll('[data-effect-field]').forEach(input=>input.onchange=()=>{const def=TRAP_DEFINITIONS[input.dataset.trapId];def.effects[Number(input.dataset.effectIndex)][input.dataset.effectField]=Number(input.value);renderTrapEditor()});host.querySelectorAll('[data-trap-effect]').forEach(input=>input.onchange=()=>{const def=TRAP_DEFINITIONS[input.dataset.trapEffect];def.effects[Number(input.dataset.effectIndex)].type=input.value;renderTrapEditor()});host.querySelectorAll('[data-add-effect]').forEach(button=>button.onclick=()=>{TRAP_DEFINITIONS[button.dataset.addEffect].effects.push({type:'slow',amount:.5,duration:1});renderTrapEditor()});host.querySelectorAll('[data-remove-effect]').forEach(button=>button.onclick=()=>{const def=TRAP_DEFINITIONS[button.dataset.removeEffect];if(def.effects.length<=1){toast('効果は1つ以上必要です');return}def.effects.splice(Number(button.dataset.effectIndex),1);renderTrapEditor()});host.querySelectorAll('[data-save-trap]').forEach(button=>button.onclick=()=>{const def=TRAP_DEFINITIONS[button.dataset.saveTrap],error=validateTrapDefinition(def);const message=host.querySelector(`[data-trap-message="${def.id}"]`);if(error){message.textContent=error;return}message.textContent='保存しました。新規設置時から反映されます';renderAll()});host.querySelectorAll('[data-test-trap]').forEach(button=>button.onclick=()=>{const def=TRAP_DEFINITIONS[button.dataset.testTrap],error=validateTrapDefinition(def);if(error){toast(error);return}buildMode=def.id;document.querySelector('[data-tab="game-tab"]')?.click();toast(`${def.name}を選択しました。空きマスをクリックして設置してください`)});host.querySelectorAll('[data-delete-trap]').forEach(button=>button.onclick=()=>{if(Object.keys(TRAP_DEFINITIONS).length<=1){toast('罠は1つ以上必要です');return}delete TRAP_DEFINITIONS[button.dataset.deleteTrap];renderAll()})}
document.addEventListener('change',event=>{if(event.target.matches?.('#trap-editor [data-trap-field="id"]')){const id=event.target.dataset.trapId,def=TRAP_DEFINITIONS[id];if(def){def.id=id;renderTrapEditor();toast('罠IDは変更できません')}}});
const baseRenderTrapEditor=renderTrapEditor;
renderTrapEditor=function(){
  baseRenderTrapEditor();
  const host=$('trap-editor');
  host?.querySelectorAll('.trap-editor-card').forEach(card=>{
    const name=card.querySelector('[data-trap-field="name"]')?.value;
    const def=Object.values(TRAP_DEFINITIONS).find(item=>item.name===name);
    if(!def)return;
    const title=card.querySelector('h3');if(title)title.textContent=`${def.icon||'🪤'} ${def.name}`;
    const label=document.createElement('label');label.innerHTML=`ロゴ絵文字 <input maxlength="4" data-trap-icon="${def.id}" value="${def.icon||'🪤'}">`;
    card.insertBefore(label,card.querySelector('label'));
    label.querySelector('input').onchange=e=>{def.icon=e.target.value.trim()||'🪤';renderAll()};
    const spriteLabel=document.createElement('label');
    spriteLabel.innerHTML=`スプライト設定（JSON、空の{}で共通trap設定）<textarea rows="5" data-trap-sprite="${def.id}">${JSON.stringify(def.sprite||{},null,2)}</textarea>`;
    card.appendChild(spriteLabel);
    spriteLabel.querySelector('textarea').onchange=e=>{try{const value=JSON.parse(e.target.value);if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('object required');def.sprite=value;renderAll()}catch(error){toast('罠スプライト設定のJSONが不正です')}};
  });
};

// Drones launch from the active map's base position.
const BaseDrone=Drone;
Drone=class extends BaseDrone{constructor(type){super(type);this.x=activeMap.base.x*tile+tile/2;this.y=activeMap.base.y*tile+tile/2;}};

// Multi-spawn / single-base map system.
// Routes are intentionally axis-aligned because the game uses a 4-direction grid.
const MAP_DEFINITIONS={
  straight:{name:'中央直線',spawns:[{id:'main',x:7,y:0}],base:{x:7,y:29},routes:{main:[[7,0],[7,29]]}},
  l_shape:{name:'L字（90度クランク）',spawns:[{id:'main',x:2,y:0}],base:{x:12,y:29},routes:{main:[[2,0],[2,18],[12,18],[12,29]]}},
  basic_s:{name:'単一一本道（基本S字）',spawns:[{id:'main',x:2,y:0}],base:{x:7,y:29},routes:{main:[[2,0],[2,7],[11,7],[11,15],[3,15],[3,23],[7,23],[7,29]]}},
  stairs:{name:'階段状（ステップ）',spawns:[{id:'main',x:2,y:0}],base:{x:12,y:29},routes:{main:[[2,0],[2,5],[5,5],[5,10],[8,10],[8,15],[11,15],[11,22],[12,22],[12,29]]}},
  u_shape:{name:'U字（1ループ）',spawns:[{id:'main',x:3,y:0}],base:{x:7,y:29},routes:{main:[[3,0],[3,20],[11,20],[11,8],[7,8],[7,29]]}},
  parallel_double:{name:'平行ダブルライン（独立2ルート）',spawns:[{id:'left',x:3,y:0},{id:'right',x:11,y:0}],base:{x:7,y:29},routes:{left:[[3,0],[3,27],[7,27],[7,29]],right:[[11,0],[11,27],[7,27],[7,29]]}},
  c_shape:{name:'中央障害物回避（C字）',spawns:[{id:'left',x:2,y:0},{id:'right',x:12,y:0}],base:{x:7,y:29},obstacles:[[5,5,9,23]],routes:{left:[[2,0],[2,27],[7,27],[7,29]],right:[[12,0],[12,27],[7,27],[7,29]]}},
  split_area:{name:'二分分断エリア',spawns:[{id:'left',x:3,y:0},{id:'right',x:11,y:0}],base:{x:7,y:29},obstacles:[[7,0,7,27]],routes:{left:[[3,0],[3,27],[7,27],[7,29]],right:[[11,0],[11,27],[7,27],[7,29]]}},
  twin_s:{name:'双子S字ライン',spawns:[{id:'left',x:2,y:0},{id:'right',x:12,y:0}],base:{x:7,y:29},routes:{left:[[2,0],[2,7],[6,7],[6,15],[2,15],[2,23],[7,23],[7,29]],right:[[12,0],[12,7],[8,7],[8,15],[12,15],[12,23],[7,23],[7,29]]}}
  ,display_test:{
    name:'表示確認用・全要素ショーケース',
    spawns:[{id:'main',x:7,y:0}],
    base:{x:7,y:29},
    routes:{main:[[7,0],[7,29]]},
    showcase:{
      // These are runtime landscape coordinates. They are intentionally kept
      // on the route's five-cell-wide display area so every object is visible.
      buildings:[
        // One instance of every level (1-6) for each building type.
        {type:'farm',gx:4,gy:5,level:1},{type:'farm',gx:10,gy:5,level:2},{type:'farm',gx:16,gy:5,level:3},{type:'farm',gx:22,gy:5,level:4},{type:'farm',gx:24,gy:5,level:5},{type:'farm',gx:28,gy:5,level:6},
        {type:'lab',gx:1,gy:5,level:1},{type:'lab',gx:3,gy:5,level:2},{type:'lab',gx:6,gy:5,level:3},{type:'lab',gx:9,gy:5,level:4},{type:'lab',gx:15,gy:5,level:5},{type:'lab',gx:20,gy:5,level:6},
        {type:'mg',gx:1,gy:8,level:1},{type:'mg',gx:4,gy:8,level:2},{type:'mg',gx:10,gy:8,level:3},{type:'mg',gx:16,gy:8,level:4},{type:'mg',gx:22,gy:8,level:5},{type:'mg',gx:28,gy:8,level:6},
        {type:'missile',gx:5,gy:5,level:1},{type:'missile',gx:8,gy:5,level:2},{type:'missile',gx:12,gy:5,level:3},{type:'missile',gx:14,gy:5,level:4},{type:'missile',gx:18,gy:5,level:5},{type:'missile',gx:26,gy:5,level:6},
        // BASE周辺のマップ4列（x=26..29）の空きマスにレベル1-6を分散させた畑を追加
        {type:'farm',gx:26,gy:6,level:1},{type:'farm',gx:26,gy:7,level:4},{type:'farm',gx:26,gy:8,level:2},{type:'farm',gx:26,gy:9,level:5},
        {type:'farm',gx:27,gy:5,level:3},{type:'farm',gx:27,gy:6,level:6},{type:'farm',gx:27,gy:7,level:1},{type:'farm',gx:27,gy:8,level:4},{type:'farm',gx:27,gy:9,level:2},
        {type:'farm',gx:28,gy:6,level:3},{type:'farm',gx:28,gy:7,level:5},{type:'farm',gx:28,gy:9,level:1},
        {type:'farm',gx:29,gy:5,level:2},{type:'farm',gx:29,gy:6,level:4},{type:'farm',gx:29,gy:8,level:3},{type:'farm',gx:29,gy:9,level:6},
      ],
      traps:[
        {id:'trap_tile_slow',gx:3,gy:7},{id:'trap_tile_slow',gx:9,gy:7},{id:'trap_tile_slow',gx:15,gy:7},{id:'trap_tile_slow',gx:21,gy:7},
        {id:'trap_tile_poison',gx:4,gy:7},{id:'trap_tile_poison',gx:10,gy:7},{id:'trap_tile_poison',gx:16,gy:7},{id:'trap_tile_poison',gx:22,gy:7},
        {id:'trap_tile_burn',gx:5,gy:7},{id:'trap_tile_burn',gx:11,gy:7},{id:'trap_tile_burn',gx:17,gy:7},{id:'trap_tile_burn',gx:23,gy:7},
        {id:'trap_tile_armor_down',gx:6,gy:7},{id:'trap_tile_armor_down',gx:12,gy:7},{id:'trap_tile_armor_down',gx:18,gy:7},{id:'trap_tile_armor_down',gx:24,gy:7}
      ],
      droneCounts:{sow:4,water:4,harvest:4,excavation:4},
      wave:{werebear:96,knight_templar:48,priest:16,necromancer:16,wizard:8},
      spawnInterval:12
    }
  }
};
// The showcase keeps every line-trap combination visible at once: four
// directions, each with levels 1–6.  Its broad horizontal route already has
// two clear rows available, so no global map-size change is necessary.
const displayShowcase=MAP_DEFINITIONS.display_test.showcase;
function addShowcaseLineTraps(id,y){
  const directions=['up','down','left','right'];
  directions.forEach((direction,directionIndex)=>{
    for(let level=1;level<=6;level++){
      displayShowcase.traps.push({
        id,
        gx:1+directionIndex*6+(level-1),
        gy:y,
        direction,
        level
      });
    }
  });
}
addShowcaseLineTraps('trap_line_knockback',6);
addShowcaseLineTraps('trap_line_pull',9);
// Keep map authoring data compact while rotating the runtime map 90 degrees:
// the former top edge becomes the left edge and the former bottom edge becomes the right edge.
Object.values(MAP_DEFINITIONS).forEach(map=>{
  const point=[p=>Array.isArray(p)?[p[1],p[0]]:{...p,x:p.y,y:p.x}];
  map.spawns=map.spawns.map(point[0]);
  map.base=point[0](map.base);
  map.routes=Object.fromEntries(Object.entries(map.routes).map(([id,route])=>[id,route.map(point[0])]));
  if(map.obstacles)map.obstacles=map.obstacles.map(([x1,y1,x2,y2])=>[y1,x1,y2,x2]);
});
let activeMapId='twin_s',activeMap=MAP_DEFINITIONS[activeMapId],mapRouteCells={},mapShapeCells=new Set();
function expandRoute(points){const out=[];for(let i=0;i<points.length-1;i++){let [x,y]=points[i],[tx,ty]=points[i+1],dx=Math.sign(tx-x),dy=Math.sign(ty-y);if(dx&&dy)throw new Error('Routes must be axis-aligned');while(x!==tx||y!==ty){if(!out.some(p=>p[0]===x&&p[1]===y))out.push([x,y]);x+=dx;y+=dy}if(!out.some(p=>p[0]===tx&&p[1]===ty))out.push([tx,ty])}return out}
function rebuildMapRouteCells(){mapRouteCells={};Object.entries(activeMap.routes).forEach(([id,points])=>{mapRouteCells[id]=expandRoute(points)})}
function rebuildMapShapeCells(){
  mapShapeCells=new Set();
  const radius=2;
  Object.values(mapRouteCells).flat().forEach(([cx,cy])=>{
    for(let y=cy-radius;y<=cy+radius;y++)for(let x=cx-radius;x<=cx+radius;x++){
      if(x>=0&&y>=0&&x<CONFIG.gridCols&&y<CONFIG.gridRows)mapShapeCells.add(`${x},${y}`)
    }
  });
}
function isMapCell(x,y){return mapShapeCells.has(`${x},${y}`)}
function getMapBounds(){
  const cells=[...mapShapeCells].map(key=>key.split(',').map(Number)).filter(([x,y])=>Number.isFinite(x)&&Number.isFinite(y));
  if(!cells.length)return {minX:2,maxX:canvas.width-2,minY:2,maxY:canvas.height-2};
  const xs=cells.map(([x])=>x),ys=cells.map(([,y])=>y);
  return {minX:Math.min(...xs)*tile+2,maxX:(Math.max(...xs)+1)*tile-2,minY:Math.min(...ys)*tile+2,maxY:(Math.max(...ys)+1)*tile-2};
}
function mapObstacleCells(){const cells=[];(activeMap.obstacles||[]).forEach(([x1,y1,x2,y2])=>{for(let y=Math.min(y1,y2);y<=Math.max(y1,y2);y++)for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++)cells.push([x,y])});return cells}
function randomBlockedCells(){
  const occupied=new Set(mapObstacleCells().map(([x,y])=>`${x},${y}`));
  const reserved=new Set([...activeMap.spawns.map(({x,y})=>`${x},${y}`),`${activeMap.base.x},${activeMap.base.y}`]);
  const showcase=activeMapId==='display_test'?activeMap.showcase:null;
  for(const item of [...(showcase?.buildings||[]),...(showcase?.traps||[])])reserved.add(`${item.gx},${item.gy}`);
  const candidates=[];
  for(let y=0;y<CONFIG.gridRows;y++)for(let x=1;x<CONFIG.gridCols-1;x++){
    const key=`${x},${y}`;
    if(isMapCell(x,y)&&!occupied.has(key)&&!reserved.has(key))candidates.push([x,y]);
  }
  for(let i=candidates.length-1;i>0;i--){const j=Math.floor(gameRandom()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]]}
  const rate=Math.max(0,Math.min(1,Number(CONFIG.blockedTileSpawnRate)||0));
  const target=Math.floor(candidates.length*rate);
  let placed=0;
  for(const [x,y] of candidates){
    if(placed>=target)break;
    grid[y][x]='blocked';
    if(activeMap.spawns.every(spawn=>findPath(spawn.x,spawn.y,activeMap.base.x,activeMap.base.y).length>0))placed++;
    else grid[y][x]=null;
  }
  return placed;
}
function renderMapSelector(){let host=$('map-selector');if(!host){host=document.createElement('label');host.id='map-selector';host.className='map-selector-label';$('header-game-controls')?.appendChild(host)}host.innerHTML=`マップ <select id="map-select">${Object.entries(MAP_DEFINITIONS).map(([id,m])=>`<option value="${id}" ${id===activeMapId?'selected':''}>${m.name}</option>`).join('')}</select>`;host.querySelector('#map-select').onchange=e=>{activeMapId=e.target.value;activeMap=MAP_DEFINITIONS[activeMapId];resetGame()}}
 function configureDisplayTestShowcase(){
  if(activeMapId!=='display_test')return;
  const showcase=activeMap.showcase;if(!showcase)return;
  const levelOf=item=>Math.max(1,Math.min(6,Math.floor(Number(item.level)||1)));
  for(const item of showcase.buildings||[]){
    const {type,gx,gy}=item,level=levelOf(item);
    if(type==='farm'){
      if(!grid[gy]?.[gx]){
        addFarm(gx,gy);
        const farm=farms[farms.length-1];
        farm.level=level;
        farm.maxHp=Math.floor(100*(1+(level-1)*.5)*mult('farm_hp'));
        farm.hp=farm.maxHp;
      }
      continue;
    }
    if(grid[gy]?.[gx])continue;
    grid[gy][gx]=type;
    const building=new Building(type,gx,gy);
    building.level=level;
    building.maxHp=100*Math.pow(1.35,level-1);
    building.hp=building.maxHp;
    buildings.push(building);
  }
  for(const item of showcase.traps||[]){
    const baseDefinition=TRAP_DEFINITIONS[item.id];
    const definition=item.level?{...baseDefinition,showcaseLevel:item.level}:baseDefinition;
    if(definition&&!grid[item.gy]?.[item.gx]&&trapEngine.place(item.gx,item.gy,definition,item.direction||lineDirection).ok){}
  }
  for(const [type,count] of Object.entries(showcase.droneCounts||{})){
    for(let i=1;i<Math.max(1,Number(count)||0);i++)drones.push(new Drone(type));
  }
}
function configureActiveMap(){activeMap=MAP_DEFINITIONS[activeMapId];rebuildMapRouteCells();rebuildMapShapeCells();grid=Array.from({length:CONFIG.gridRows},()=>Array(CONFIG.gridCols).fill(null));farms=[];buildings=[];const blocked=new Set(mapObstacleCells().map(p=>`${p[0]},${p[1]}`));for(const key of blocked){const [x,y]=key.split(',').map(Number);if(x>=0&&y>=0&&x<CONFIG.gridCols&&y<CONFIG.gridRows&&isMapCell(x,y))grid[y][x]='blocked'}randomBlockedCells();addFarm(activeMap.base.x,activeMap.base.y);configureDisplayTestShowcase();renderMapSelector();renderAll()}
const legacyResetGameForMaps=resetGame;
resetGame=function(){legacyResetGameForMaps();configureActiveMap();$('btn-start-wave').onclick=startWave;$('reset').onclick=resetGame};
const legacyRepathForMaps=Enemy.prototype.repath;
Enemy.prototype.repath=function(){return legacyRepathForMaps.call(this)};
function canMapReachBase(extraX=null,extraY=null){const old=extraX===null?null:grid[extraY][extraX];if(extraX!==null)grid[extraY][extraX]='blocked';const ok=activeMap.spawns.every(spawn=>findPath(spawn.x,spawn.y,activeMap.base.x,activeMap.base.y).length>0);if(extraX!==null)grid[extraY][extraX]=old;return ok}
validPlace=function(x,y){if(x<1||y<0||x>=CONFIG.gridCols-1||y>=CONFIG.gridRows||!isMapCell(x,y)||grid[y]?.[x])return false;return canMapReachBase(x,y)};
const mainLayout=document.querySelector('main');
if(mainLayout){mainLayout.style.maxWidth='none';mainLayout.style.width='100%';mainLayout.style.padding='12px 24px';}
const sidebarLayout=document.querySelector('#sidebar');
if(sidebarLayout){sidebarLayout.style.flex='0 0 360px';sidebarLayout.style.width='360px';}
canvas.width=1440;canvas.height=720;canvas.style.width='100%';canvas.style.height='auto';canvas.parentElement.style.flex='1 1 auto';canvas.parentElement.style.width='auto';canvas.parentElement.style.minWidth='0';tile=canvas.width/CONFIG.gridCols;
configureActiveMap();
function renderParams(){
 $('param-editor').innerHTML=Object.entries(CONFIG).map(([k,v])=>`<div class="param"><label>${k}<output>${v}</output></label><input data-param="${k}" type="range" min="0" max="${k==='blockedTileSpawnRate'?1:Math.max(v*3,1)}" step="${k==='blockedTileSpawnRate'?'.01':v%1?'.01':'1'}" value="${v}"></div>`).join('');
 document.querySelectorAll('[data-param]').forEach(i=>i.oninput=()=>{CONFIG[i.dataset.param]=Number(i.value);i.previousElementSibling.querySelector('output').value=i.value;tile=canvas.width/CONFIG.gridCols;renderStats()});
 $('buff-editor').innerHTML=BUFF_DEFINITIONS.map(b=>`<div class="param buff-param"><label>${b[1]} <span class="buff-id">${b[0]}</span></label><small>${b[4]}</small><label>効果量 <output>${b[3]}</output></label><input data-buff-effect="${b[0]}" type="number" min="0" step="0.01" value="${b[3]}"><label>レアリティ <output>R${b[5]}</output></label><input data-buff-rarity="${b[0]}" type="number" min="1" step="1" value="${b[5]}"></div>`).join('');
 document.querySelectorAll('[data-buff-effect]').forEach(i=>i.oninput=()=>{let b=buffDefinition(i.dataset.buffEffect);b[3]=Number(i.value);i.previousElementSibling.querySelector('output').value=i.value});
 document.querySelectorAll('[data-buff-rarity]').forEach(i=>i.oninput=()=>{let b=buffDefinition(i.dataset.buffRarity);b[5]=Math.max(1,Math.floor(Number(i.value)||1));i.previousElementSibling.querySelector('output').value=`R${b[5]}`});
 $('excavation-editor').innerHTML=Object.entries(EXCAVATION_DRONE_CONFIG).map(([k,v])=>`<div class="param"><label>${k}<output>${v}</output></label><input data-exc-param="${k}" type="range" min="0" max="${Math.max(v*3,1)}" step="${v%1?'.01':'1'}" value="${v}"></div>`).join('');
 document.querySelectorAll('[data-exc-param]').forEach(i=>i.oninput=()=>{EXCAVATION_DRONE_CONFIG[i.dataset.excParam]=Number(i.value);i.previousElementSibling.querySelector('output').value=i.value});
 let rows=[['default','共通設定',WAVE_BUFF_CONFIG.default]];for(let n=1;n<=CONFIG.maxWave;n++)rows.push([n,`Wave ${n}`,WAVE_BUFF_CONFIG.waves[n]||WAVE_BUFF_CONFIG.default]);
 $('wave-buff-editor').innerHTML=rows.map(([key,label,c])=>`<div class="wave-buff-row"><strong>${label}</strong><label>出現数 <input data-wave-field="appearanceCount" data-wave="${key}" type="number" min="0" value="${c.appearanceCount}"></label><label>R1割合 <input data-wave-field="r1" data-wave="${key}" type="number" min="0" value="${c.rarityWeights?.[1]||0}"></label><label>R2割合 <input data-wave-field="r2" data-wave="${key}" type="number" min="0" value="${c.rarityWeights?.[2]||0}"></label><label>取得数 <input data-wave-field="acquireCount" data-wave="${key}" type="number" min="0" value="${c.acquireCount}"></label></div>`).join('');
 document.querySelectorAll('[data-wave-field]').forEach(i=>i.onchange=()=>{let key=i.dataset.wave,c=key==='default'?WAVE_BUFF_CONFIG.default:(WAVE_BUFF_CONFIG.waves[key]||(WAVE_BUFF_CONFIG.waves[key]=structuredClone(WAVE_BUFF_CONFIG.default)));let v=Math.max(0,Number(i.value)||0);if(i.dataset.waveField==='r1')c.rarityWeights[1]=v;else if(i.dataset.waveField==='r2')c.rarityWeights[2]=v;else c[i.dataset.waveField]=v;renderParams()});
}
setTimeout(()=>document.head.insertAdjacentHTML('beforeend','<style>.wave-buff-editor{display:grid;gap:8px;margin-bottom:28px}.wave-buff-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:var(--panel);border:1px solid var(--line);border-radius:7px;padding:10px}.wave-buff-row strong{min-width:100px;color:var(--gold)}.wave-buff-row label{color:var(--muted)}.wave-buff-row input{width:70px;margin-left:4px;background:var(--panel2);border:1px solid var(--line);color:var(--text);padding:5px}.buff-param{display:flex;flex-direction:column;gap:5px}.buff-param label{display:flex;justify-content:space-between}.buff-param input[type=number]{width:100%;background:var(--panel2);border:1px solid var(--line);color:var(--text);padding:5px}.buff-id{font-size:10px;color:var(--muted)}.choice .rarity{display:block;font-style:normal;font-size:11px;margin-bottom:4px}.rarity-1{color:#b9c5cc}.rarity-2{color:#5bd5e6}.rarity-3{color:#d889ff}.rarity-4{color:#f8c85d}</style>'),0);
function waveClear(){
 inWave=false;if(wave>=CONFIG.maxWave){endGame(true);return}
 let cfg=waveBuffConfig(wave),choices=pickBuffChoices(wave),remaining=Math.min(Math.max(0,Number(cfg.acquireCount)||0),choices.length);
 if(!choices.length||!remaining){toast('このウェーブの取得バフはありません');return}
 $('buff-choices').innerHTML=choices.map(b=>`<div class="choice"><strong>${b[1]}</strong><em class="rarity rarity-${b[5]}">R${b[5]}</em><small>${b[4]}</small><button data-buff="${b[0]}">獲得</button></div>`).join('');$('wave-buff-caption').textContent=`${remaining}個選択（出現 ${choices.length}個）`;$('wave-buff-overlay').classList.remove('hidden');
 document.querySelectorAll('[data-buff]').forEach(b=>b.onclick=()=>{if(!buffs[b.dataset.buff]){buffs[b.dataset.buff]=b.dataset.buff;let def=buffDefinition(b.dataset.buff);if(def?.[2]==='instant_money')money+=Number(def[3])||0;remaining--}b.disabled=true;if(remaining<=0){$('wave-buff-overlay').classList.add('hidden');renderAll()}else $('wave-buff-caption').textContent=`残り${remaining}個選択`})
}

// Data-driven extended buffs. Effects are intentionally handled by a small set
// of shared rules instead of one implementation branch per buff.
const EXTENDED_BUFFS = (() => {
 const statTargets = [
  ['money','お金'],['science','科学ポイント'],['player_hp','現在HP'],['max_hp','最大HP'],
  ['reroll','リロール回数'],['buff_count','バフ取得数'],['farm_hp','畑の最大HP'],['heal','畑の回復量'],
  ['crop_sell','作物売却額'],['crop_speed','作物成長速度'],['drone_speed','ドローン移動速度'],
  ['drone_work_speed','ドローン作業速度'],['drop_rate','発掘ドロップ率'],['drop_reward','発掘報酬量'],
  ['building_cost','建築費'],['drone_cost','ドローン購入費'],['upgrade_cost','アップグレード費'],
  ['mg_damage','マシンガンダメージ'],['missile_damage','ミサイルダメージ'],['missile_range','ミサイル射程'],
  ['mg_cooldown','マシンガン攻撃間隔'],['missile_cooldown','ミサイル攻撃間隔'],['slow_tile','スロー効果'],
  ['enemy_damage','敵への固定ダメージ'],['enemy_speed_down','敵移動速度低下'],['enemy_attack_down','敵攻撃力低下'],
  ['enemy_hp_down','敵最大HP低下'],['wave_activations','Wave中の発動回数'],['wave_buildings','Wave中の新規建築数'],
  ['extra_buffs','Wave終了時の追加バフ数'],['heal_amount','HP回復量'],['max_hp_fixed','最大HP固定増加量'],
  ['max_hp_percent','最大HP割合増加量'],['choice_count','バフ選択肢数'],['acquire_count','バフ取得可能数']
 ];
 const carryTargets = [
  ['buff_choices','Wave終了時のバフ選択肢'],['acquire_count','未使用のバフ取得回数'],
  ['reroll','未使用のリロール回数'],['temporary_stats','Wave中の一時ステータス上昇'],
  ['max_hp_effect','バフ取得時の最大HP増加効果'],['activation_count','発動回数の累計'],
  ['building_count','Wave中の新規建築数カウント'],['wave_effects','Wave限定効果']
 ];
 const out=[];
 const add=(id,name,type,amount,desc,rarity=1,meta={})=>out.push([id,name,type,amount,desc,rarity,{...meta}]);
 add('buff_discount_building','建築費20%引き','discount_building',.2,'建築費が20%引き',2);
 add('buff_discount_drone','ドローン購入費20%引き','discount_drone',.2,'ドローン購入費が20%引き',2);
 add('buff_discount_tile_trap','タイル罠作成費20%引き','discount_tile_trap',.2,'タイル罠の作成費が20%引き',2);
 add('buff_discount_upgrade','アップグレード費20%引き','discount_upgrade',.2,'アップグレード費が20%引き',2);
 carryTargets.forEach(([key,label],i)=>add(`buff_carry_${key}`,`${label}持ち越し`,'carry_over',1,`${label}を次のWaveへ持ち越す`,2,{target:key}));
 add('buff_heal_on_activation','発動時回復','heal_on_activation',10,'任意の発動ごとにHP回復（回復量は設定可能）',2);
 add('buff_reroll_wave','Wave報酬リロール','reroll_wave',1,'Wave終了時のバフ選択を無料でリロール',2);
 add('buff_reroll_drop','発掘報酬リロール','reroll_drop',1,'発掘ドロップの選択を無料でリロール',2);
 statTargets.forEach(([key,label],i)=>add(`buff_choice_stat_${key}`,`バフの代わりに${label}上昇`,'replace_with_stat',.1,`ランダムバフの代わりに${label}を上昇`,3,{target:key}));
 statTargets.forEach(([key,label],i)=>add(`buff_wave_stat_${key}`,`Wave発動で${label}上昇`,'wave_activation_stat',.1,`Wave中の発動時に${label}を上昇（Wave終了まで）`,3,{target:key}));
 add('buff_max_hp_fixed','取得時最大HP固定増加','max_hp_on_acquire',20,'バフ取得時、最大HPが固定値増加',2,{mode:'fixed'});
 add('buff_max_hp_percent','取得時最大HP割合増加','max_hp_on_acquire',.1,'バフ取得時、最大HPが割合増加',2,{mode:'percent'});
 add('buff_extra_buffs_low_build','少数建築ボーナス','extra_buffs_low_build',1,'Wave中の新規建築がn個以下なら追加バフを得る',3,{threshold:3});
 add('buff_replace_wave_max_hp','Wave報酬を最大HPへ変更','replace_wave_reward_hp',20,'Wave終了時、バフ取得の代わりに最大HPを増加',3);
 add('buff_replace_drop_max_hp','発掘報酬を最大HPへ変更','replace_drop_reward_hp',20,'発掘時、バフ選択の代わりに最大HPを増加',3);
 return {defs:out,stats:statTargets,carry:carryTargets};
})();

EXTENDED_BUFFS.defs.forEach(b=>{if(!BUFF_DEFINITIONS.some(existing=>existing[0]===b[0]))BUFF_DEFINITIONS.push(b)});
const BUFF_RUNTIME = {waveActivations:0,waveBuildings:0,waveTemp:{},carry:{},rerolls:{wave:0,drop:0},maxHp:100,hp:100};
const extDef = buffDefinition;
const extHas = type => Object.values(buffs).some(id=>extDef(id)?.[2]===type);
const extDefs = type => Object.values(buffs).map(extDef).filter(b=>b?.[2]===type);
function emitBuffEvent(event, payload={}) {
 const ctx={event,...payload};
 if(event==='abilityActivated') {
  BUFF_RUNTIME.waveActivations++;
  extDefs('heal_on_activation').forEach(b=>changePlayerHp(Number(b[3])||10));
  extDefs('wave_activation_stat').forEach(b=>modifyBuffStat(b[6]?.target,Number(b[3])||0,true));
 }
 if(event==='buffAcquired') {
  extDefs('max_hp_on_acquire').forEach(b=>changeMaxHp(Number(b[3])||0,b[6]?.mode));
 }
 if(event==='buildingPlaced') BUFF_RUNTIME.waveBuildings++;
 if(event==='waveEnded') {
  extDefs('extra_buffs_low_build').forEach(b=>{if(BUFF_RUNTIME.waveBuildings<=Number(b[6]?.threshold??3))ctx.extraBuffs=(ctx.extraBuffs||0)+(Number(b[3])||1)});
  BUFF_RUNTIME.waveActivations=0;BUFF_RUNTIME.waveBuildings=0;BUFF_RUNTIME.waveTemp={};
 }
 return ctx;
}
function modifyBuffStat(target, amount, temporary=false) {
 if(!target)return;
 const bucket=temporary?BUFF_RUNTIME.waveTemp:BUFF_RUNTIME;
 bucket[target]=(Number(bucket[target])||0)+amount;
 if(target==='money')money+=amount;
 else if(target==='science')science+=amount;
 else if(target==='player_hp')changePlayerHp(amount);
 else if(target==='max_hp')changeMaxHp(amount,'fixed');
 else if(target==='reroll')BUFF_RUNTIME.rerolls.wave+=amount;
 else if(target==='max_hp_fixed')changeMaxHp(amount,'fixed');
 else if(target==='max_hp_percent')changeMaxHp(amount,'percent');
}
function changePlayerHp(amount){BUFF_RUNTIME.hp=Math.max(0,Math.min(BUFF_RUNTIME.maxHp,BUFF_RUNTIME.hp+amount));}
function changeMaxHp(amount,mode='fixed'){
 const n=Number(amount)||0;BUFF_RUNTIME.maxHp=mode==='percent'?BUFF_RUNTIME.maxHp*(1+n):BUFF_RUNTIME.maxHp+n;BUFF_RUNTIME.hp+=mode==='percent'?BUFF_RUNTIME.maxHp*n:n;
}
function extDiscount(kind){return extDefs(`discount_${kind}`).reduce((n,b)=>n*(1-(Number(b[3])||0)),1)}
function addExtendedBuff(id){const b=extDef(id);if(!b)return false;buffs[id]=id;emitBuffEvent('buffAcquired',{buff:b});return true;}
function extendedBuffCount(){return EXTENDED_BUFFS.defs.length}

// Connect the generic events to existing game operations with thin wrappers.
const originalPlace=place;
place=function(x,y,type){const before=money,key=buildingCostKey(type),old=key?CONFIG[key]:undefined;if(key)CONFIG[key]=old*extDiscount('building');const ok=originalPlace(x,y,type);if(key)CONFIG[key]=old;if(ok)emitBuffEvent('buildingPlaced',{type,cost:before-money});return ok};
const originalBuyDrone=buyDrone;
buyDrone=function(type){const count=droneCount(type),base=CONFIG.costDrone*Math.pow(1.5,count),required=Math.floor(base*extDiscount('drone'));if(money<required){toast('資金が足りません');return}const old=CONFIG.costDrone;CONFIG.costDrone=required/Math.pow(1.5,count);originalBuyDrone(type);CONFIG.costDrone=old};
const farmUpgrade=Farm.prototype.upgrade;
Farm.prototype.upgrade=function(){const c=Math.floor(getFarmUpgradeCost(this)*extDiscount('upgrade'));if(money>=c){money-=c;this.level++;this.maxHp=Math.floor(100*(1+(this.level-1)*.5)*mult('farm_hp'));this.hp=this.maxHp;toast('畑をアップグレードしました')}};
const buildingUpgrade=Building.prototype.upgrade;
Building.prototype.upgrade=function(){const c=Math.floor(getBuildingUpgradeCost(this)*extDiscount('upgrade'));if(money>=c){money-=c;this.level++;this.maxHp*=1.35;this.hp=this.maxHp;toast('建物を強化しました')}};
const originalWaveClear=waveClear;
waveClear=function(){const ctx=emitBuffEvent('waveEnded'),extra=Number(ctx.extraBuffs)||0,cfg=waveBuffConfig(wave),oldAcquire=cfg.acquireCount;if(extra>0)cfg.acquireCount=(Number(oldAcquire)||0)+extra;const result=originalWaveClear.call(this,ctx);cfg.acquireCount=oldAcquire;return result};
const originalBulletUpdate=Bullet.prototype.update;
Bullet.prototype.update=function(){const wasDead=this.dead;originalBulletUpdate.call(this);if(!wasDead&&this.dead)emitBuffEvent('abilityActivated',{source:this.t?.type||'attack',target:this.e})};

document.addEventListener('click',event=>{
 const button=event.target.closest?.('[data-buff]');
 if(!button)return;
 const def=extDef(button.dataset.buff);
 if(def?.[2]==='replace_with_stat')modifyBuffStat(def[6]?.target,Number(def[3])||0);
});

// Keep the editor data-driven and expose a compact count for verification.
function renderDifficultyEditor(){let host=$('difficulty-editor');if(!host){host=document.createElement('div');host.id='difficulty-editor';$('params-tab')?.appendChild(host)}const d=difficultyConfig(),waveRows=Array.from({length:CONFIG.maxWave},(_,i)=>{const n=i+1,w=d.waves?.[n]||{};return `<div class="wave-buff-row"><strong>Wave ${n}</strong>${DIFFICULTY_WAVE_KEYS.map(k=>`<label>${k}<input type="number" min="0" step="0.01" data-diff-wave="${n}" data-diff-key="${k}" value="${w[k]??''}" placeholder="${d.enemyDefaults[k]}"></label>`).join('')}</div>`}).join('');host.innerHTML=`<h2>難易度設定</h2><label>現在の難易度 <select id="difficulty-level">${[1,2,3,4,5].map(n=>`<option value="${n}" ${n===currentDifficultyLevel?'selected':''}>レベル ${n}</option>`).join('')}</select></label><div class="param-editor">${DIFFICULTY_KEYS.map(k=>`<div class="param"><label>${k}<output>${d[k]}</output></label><input type="number" min="0" step="0.01" data-diff-fixed="${k}" value="${d[k]}"></div>`).join('')}</div><h3>敵Wave倍率（未設定項目はデフォルト倍率）</h3><div class="param"><label>enemyHp デフォルト <input type="number" min="0" step="0.01" data-diff-default="enemyHp" value="${d.enemyDefaults.enemyHp}"></label><label>enemyDamage デフォルト <input type="number" min="0" step="0.01" data-diff-default="enemyDamage" value="${d.enemyDefaults.enemyDamage}"></label><label>enemySpeed デフォルト <input type="number" min="0" step="0.01" data-diff-default="enemySpeed" value="${d.enemyDefaults.enemySpeed}"></label><label>enemyCount デフォルト <input type="number" min="0" step="0.01" data-diff-default="enemyCount" value="${d.enemyDefaults.enemyCount}"></label></div>${waveRows}`;host.querySelector('#difficulty-level').onchange=e=>{currentDifficultyLevel=normalizeDifficultyLevel(e.target.value);renderAll()};host.querySelectorAll('[data-diff-fixed]').forEach(i=>i.onchange=()=>{d[i.dataset.diffFixed]=Math.max(0,Number(i.value)||0);renderDifficultyEditor()});host.querySelectorAll('[data-diff-default]').forEach(i=>i.onchange=()=>{d.enemyDefaults[i.dataset.diffDefault]=Math.max(0,Number(i.value)||0);renderDifficultyEditor()});host.querySelectorAll('[data-diff-wave]').forEach(i=>i.onchange=()=>{const n=i.dataset.diffWave,k=i.dataset.diffKey;d.waves[n]??={};if(i.value==='')delete d.waves[n][k];else d.waves[n][k]=Math.max(0,Number(i.value)||0);if(!Object.keys(d.waves[n]).length)delete d.waves[n];renderDifficultyEditor()})}
const originalRenderTrapEditor=renderTrapEditor;
renderTrapEditor=function(){
 originalRenderTrapEditor();
 const host=$('trap-editor');
 if(!host)return;
 host.querySelectorAll('[data-trap-field="name"]').forEach(nameInput=>{
  const id=nameInput.dataset.trapId,def=TRAP_DEFINITIONS[id];
  if(!def)return;
  const label=document.createElement('label');
  label.textContent='アイコン ';
  const input=document.createElement('input');
  input.value=def.icon||'🪤';input.maxLength=8;input.setAttribute('aria-label',`${def.name}のアイコン`);
  input.onchange=()=>{def.icon=input.value||'🪤';renderTrapEditor()};
  label.appendChild(input);nameInput.closest('label')?.after(label);
 });
};
const originalRenderParams=renderParams;
renderParams=function(){originalRenderParams();const note=document.getElementById('buff-editor');if(note&&!document.getElementById('extended-buff-count')){const p=document.createElement('p');p.id='extended-buff-count';p.textContent=`実装バフ: ${extendedBuffCount()}個（データ駆動）`;note.prepend(p)}renderDifficultyEditor()};
setTimeout(()=>{if(extendedBuffCount()!==90)console.error(`Expected 90 extended buffs, got ${extendedBuffCount()}`);renderAll()},0);
setTimeout(()=>{$('btn-start-wave').onclick=startWave;$('restart').onclick=()=>{$('game-overlay').classList.add('hidden');resetGame()};},0);

// Data-driven enemy extension.
const BaseEnemy=Enemy;
function enemyDefinition(id){return ENEMY_DEFINITIONS[id]||ENEMY_DEFINITIONS.slime}
function enemyDistance(a,b){return dist(a.x,a.y,b.x,b.y)}
function refreshEnemyAuras(){
 enemies.forEach(e=>{e.speedMultiplier=1;e.attackMultiplier=1});
 const aura=(ability,range,apply)=>enemies.filter(e=>e.abilities?.includes(ability)).forEach(source=>enemies.filter(target=>target!==source&&enemyDistance(source,target)<=range*tile).forEach(target=>apply(target)));
 aura('speed_aura',ENEMY_ABILITY_CONFIG.drummerAuraRange,e=>e.speedMultiplier=Math.max(e.speedMultiplier,1+Number(ENEMY_ABILITY_CONFIG.drummerSpeedRate)||1));
 aura('attack_aura',ENEMY_ABILITY_CONFIG.drummerAuraRange,e=>e.attackMultiplier=Math.max(e.attackMultiplier,1+Number(ENEMY_ABILITY_CONFIG.drummerAttackRate)||1));
 aura('wizard_speed',ENEMY_ABILITY_CONFIG.wizardAuraRange,e=>e.speedMultiplier=Math.max(e.speedMultiplier,1+Number(ENEMY_ABILITY_CONFIG.wizardSpeedRate)||1));
 aura('wizard_attack',ENEMY_ABILITY_CONFIG.wizardAuraRange,e=>e.attackMultiplier=Math.max(e.attackMultiplier,1+Number(ENEMY_ABILITY_CONFIG.wizardAttackRate)||1));
}
Enemy=class extends BaseEnemy{
 constructor(id){super(id);this.definition=enemyDefinition(id);this.abilities=this.definition.abilities||[];this.hp=this.maxHp=Number(this.definition.hp)||0;this.baseSpeed=Number(this.definition.speed)||0;this.speed=this.baseSpeed;this.baseDamage=Number(this.definition.damage)||0;this.damage=this.baseDamage;this.armor=Number(this.definition.armor)||0;this.trapResistance=Math.max(0,Math.min(1,Number(this.definition.trapResistance)||0));this.abilityTimer=0}
 update(){
   if(this.dead){this.deathTimer=Math.max(0,(this.deathTimer||0)-1);this.moveX=0;this.moveY=0;return}
   if(this.hitTimer>0)this.hitTimer--;
   if(!this.statusEffects)this.statusEffects=[];trapEngine.updateEnemy(this);this.speed=this.baseSpeed*(this.speedMultiplier||1)*(this.trapSpeedMultiplier||1);this.damage=this.baseDamage*(this.attackMultiplier||1);const previousX=this.x,previousY=this.y;const result=this.trapStunned?undefined:BaseEnemy.prototype.update.call(this);this.moveX=this.x-previousX;this.moveY=this.y-previousY;this.abilityTimer++;const healing=this.abilities.includes('heal_aura')||this.abilities.includes('wizard_heal'),range=this.abilities.includes('wizard_heal')?ENEMY_ABILITY_CONFIG.wizardAuraRange:ENEMY_ABILITY_CONFIG.priestHealRange,amount=this.abilities.includes('wizard_heal')?ENEMY_ABILITY_CONFIG.wizardHealAmount:ENEMY_ABILITY_CONFIG.priestHealAmount,interval=this.abilities.includes('wizard_heal')?ENEMY_ABILITY_CONFIG.wizardHealInterval:ENEMY_ABILITY_CONFIG.priestHealInterval;if(healing&&this.abilityTimer>=interval){this.abilityTimer=0;enemies.filter(e=>e!==this&&enemyDistance(this,e)<=range*tile).forEach(e=>e.hp=Math.min(e.maxHp,e.hp+Number(amount)||0))}
   updateEnemySpriteState(this);
   return result;
 }
};
 const originalDamageEnemy=damageEnemy;
 damageEnemy=function(enemy,damage,source={}){if(!enemy||enemy.hp<=0)return;const armored=Math.max(0,Math.min(.95,(Number(enemy.armor)||0)-(Number(enemy.trapArmor)||0)));let reduction=armored;if(enemy.abilities?.includes('front_shield')&&source.x!==undefined){const mx=enemy.moveX||enemy.x-enemy.lastX,my=enemy.moveY||enemy.y-enemy.lastY,ml=Math.hypot(mx,my)||1,ax=source.x-enemy.x,ay=source.y-enemy.y,al=Math.hypot(ax,ay)||1;const angle=Math.acos(Math.max(-1,Math.min(1,(mx*ax+my*ay)/(ml*al))))*180/Math.PI;if(angle<=Number(ENEMY_ABILITY_CONFIG.shieldmasterFrontAngle)/2)reduction=Math.max(reduction,Number(ENEMY_ABILITY_CONFIG.shieldmasterFrontReduction)||0)}originalDamageEnemy(enemy,damage*(1-reduction),source)};
const originalBulletUpdateForEnemies=Bullet.prototype.update;
Bullet.prototype.update=function(){const oldDamage=damageEnemy;damageEnemy=(enemy,damage,source={})=>oldDamage(enemy,damage,{...source,x:this.x,y:this.y});try{return originalBulletUpdateForEnemies.call(this)}finally{damageEnemy=oldDamage}};
const originalGameUpdateForEnemies=update;
update=function(){refreshEnemyAuras();originalGameUpdateForEnemies()};

function renderEnemyEditor(){
 const params=$('params-tab');if(!params)return;let host=$('enemy-editor');if(!host){host=document.createElement('div');host.id='enemy-editor';params.appendChild(host)}
 const abilityOptions=['','heal_aura','speed_aura','attack_aura','wizard_speed','wizard_attack','wizard_heal','front_shield'];
 host.innerHTML='<h2>敵設定</h2><p>敵の追加・削除・名称・ステータス・能力を編集できます。</p><button id="add-enemy">＋敵を追加</button>'+Object.entries(ENEMY_DEFINITIONS).map(([id,e])=>`<div class="tree-editor enemy-editor-card"><h3>${e.nameJa} (${id})</h3><div class="research-row"><label>英語 <input data-enemy-field="nameEn" data-enemy="${id}" value="${e.nameEn}"></label><label>日本語 <input data-enemy-field="nameJa" data-enemy="${id}" value="${e.nameJa}"></label><label>分類 <input data-enemy-field="category" data-enemy="${id}" value="${e.category}"></label></div><div class="research-row"><label>HP <input type="number" min="1" data-enemy-field="hp" data-enemy="${id}" value="${e.hp}"></label><label>速度 <input type="number" min="0" step=".01" data-enemy-field="speed" data-enemy="${id}" value="${e.speed}"></label><label>攻撃力 <input type="number" min="0" step=".1" data-enemy-field="damage" data-enemy="${id}" value="${e.damage}"></label><label>装甲率 <input type="number" min="0" max=".95" step=".01" data-enemy-field="armor" data-enemy="${id}" value="${e.armor}"></label><label>罠耐性 <input type="number" min="0" max="1" step=".01" data-enemy-field="trapResistance" data-enemy="${id}" value="${e.trapResistance}"></label></div><label>能力 <select multiple data-enemy-abilities="${id}">${abilityOptions.map(a=>`<option value="${a}" ${e.abilities.includes(a)?'selected':''}>${a||'なし'}</option>`).join('')}</select></label> <button data-delete-enemy="${id}">削除</button></div>`).join('');
 host.innerHTML+='<h2>敵能力設定</h2><div class="param-editor">'+Object.entries(ENEMY_ABILITY_CONFIG).map(([k,v])=>`<div class="param"><label>${k}<output>${v}</output></label><input type="number" step=".01" min="0" data-enemy-ability-param="${k}" value="${v}"></div>`).join('')+'</div>';
 host.querySelector('#add-enemy').onclick=()=>{let id=`enemy_${Date.now()}`;ENEMY_DEFINITIONS[id]={nameEn:'New Enemy',nameJa:'新しい敵',category:'basic',hp:50,speed:1,damage:8,armor:0,trapResistance:0,abilities:[]};renderAll()};
 host.querySelectorAll('[data-enemy-field]').forEach(i=>i.onchange=()=>{const e=ENEMY_DEFINITIONS[i.dataset.enemy],f=i.dataset.enemyField;e[f]=['nameEn','nameJa','category'].includes(f)?i.value:Number(i.value);renderEnemyEditor()});
 host.querySelectorAll('[data-enemy-abilities]').forEach(i=>i.onchange=()=>{ENEMY_DEFINITIONS[i.dataset.enemyAbilities].abilities=[...i.selectedOptions].map(o=>o.value).filter(Boolean);renderEnemyEditor()});
 host.querySelectorAll('[data-delete-enemy]').forEach(b=>b.onclick=()=>{if(Object.keys(ENEMY_DEFINITIONS).length<=1){toast('敵は1種類以上必要です');return}delete ENEMY_DEFINITIONS[b.dataset.deleteEnemy];REGULATIONS.forEach(r=>Object.values(r.difficulties||{}).forEach(d=>Object.values(d.waves||{}).forEach(w=>delete w[b.dataset.deleteEnemy])));renderAll()});
 host.querySelectorAll('[data-enemy-ability-param]').forEach(i=>i.onchange=()=>{ENEMY_ABILITY_CONFIG[i.dataset.enemyAbilityParam]=Number(i.value);renderEnemyEditor()});
}
renderDifficultyEditor=function(){
 const params=$('params-tab');if(!params)return;let host=$('difficulty-editor');if(!host){host=document.createElement('div');host.id='difficulty-editor';params.insertBefore(host,params.firstChild)}
 const active=activeRegulation();
 const tabs=REGULATIONS.map(r=>`<button type="button" class="regulation-tab ${r.id===activeRegulationId?'active':''}" data-regulation-tab="${r.id}">${r.name}</button>`).join('');
 const levels=Array.from({length:5},(_,li)=>{const level=li+1,d=active.difficulties[level],rows=Array.from({length:CONFIG.maxWave},(_,wi)=>{const n=wi+1,w=d.waves[n];return `<div class="wave-buff-row"><strong>Wave ${n}</strong>${Object.entries(ENEMY_DEFINITIONS).map(([id,e])=>`<label>${e.nameJa}<input type="number" min="0" step="1" data-reg-wave="${n}" data-reg-level="${level}" data-reg-enemy="${id}" value="${w[id]??0}"></label>`).join('')}</div>`}).join('');return `<section class="regulation-level"><h3>レベル ${level}</h3><label>初期資金 <input type="number" min="0" step="1" data-reg-money="${level}" value="${d.initialMoney}"></label>${rows}</section>`}).join('');
 host.innerHTML=`<h2>レギュレーション</h2><div class="regulation-tabs">${tabs}</div><p>タブ切り替え時も編集内容は保持され、ゲームはリセットされます。</p><button type="button" id="add-regulation">＋レギュレーションを複製</button><button type="button" id="rename-regulation">名称変更</button><button type="button" id="delete-regulation">削除</button><div class="regulation-editor"><h3>${active.name}</h3>${levels}</div>`;
 host.insertAdjacentHTML('beforeend',`<details id="sprite-editor"><summary>共通スプライト設定</summary>${Object.entries(SPRITE_CONFIG).map(([key,value])=>`<label>${key}<textarea rows="3" data-sprite-key="${key}">${JSON.stringify(value,null,2)}</textarea></label>`).join('')}</details>`);
 host.querySelectorAll('[data-regulation-tab]').forEach(b=>b.onclick=()=>activateRegulation(b.dataset.regulationTab));
 host.querySelector('#add-regulation').onclick=()=>{const source=activeRegulation(),id=`regulation_${Date.now()}`;REGULATIONS.push({id,name:`新しいレギュレーション`,difficulties:structuredClone(source.difficulties),techTrees:structuredClone(source.techTrees)});activeRegulationId=id;currentDifficultyLevel=1;resetGame({persistTechTrees:false})};
 host.querySelector('#rename-regulation').onclick=()=>{const name=prompt('レギュレーション名',active.name);if(name?.trim()){active.name=name.trim();renderAll()}};
 host.querySelector('#delete-regulation').onclick=()=>{if(REGULATIONS.length<=1){toast('レギュレーションは1件以上必要です');return}REGULATIONS=REGULATIONS.filter(r=>r.id!==activeRegulationId);activeRegulationId=REGULATIONS[0].id;currentDifficultyLevel=1;resetGame()};
 host.querySelectorAll('[data-reg-money]').forEach(i=>i.onchange=()=>{active.difficulties[i.dataset.regMoney].initialMoney=Math.max(0,Math.floor(Number(i.value)||0));renderDifficultyEditor()});
 host.querySelectorAll('[data-reg-wave]').forEach(i=>i.onchange=()=>{const d=active.difficulties[i.dataset.regLevel],w=d.waves[i.dataset.regWave];w[i.dataset.regEnemy]=Math.max(0,Math.floor(Number(i.value)||0));renderDifficultyEditor()});
 host.querySelectorAll('[data-sprite-key]').forEach(i=>i.onchange=()=>{try{const value=JSON.parse(i.value);Object.assign(SPRITE_CONFIG[i.dataset.spriteKey],value);renderDifficultyEditor()}catch(error){toast('スプライト設定のJSONが不正です')}});
};
const originalRenderAll=renderAll;renderAll=function(){originalRenderAll();const host=$('build-grid');Object.values(TRAP_DEFINITIONS).forEach(def=>{const b=document.createElement('button');b.type='button';b.dataset.build=def.id;b.innerHTML=`🪤 ${def.name}<span class="cost">$${getBuildingCost(def.id)}</span>`;host.appendChild(b);b.onclick=()=>setBuildMode(def.id)});renderTrapEditor();renderEnemyEditor()};
exportConfig=function(){const current=activeRegulation();if(current&&TECH_TREES?.length)current.techTrees=structuredClone(TECH_TREES);let out=`let savedConfig = ${JSON.stringify({common:{CONFIG,ENEMY_DEFINITIONS,ENEMY_ABILITY_CONFIG,TRAP_DEFINITIONS,BUFF_DEFINITIONS,EXCAVATION_DRONE_CONFIG,WAVE_BUFF_CONFIG,SPRITE_CONFIG},regulations:REGULATIONS,activeRegulationId,currentDifficultyLevel},null,2)};`;navigator.clipboard?.writeText(out);toast('設定をクリップボードへコピーしました');return out};
function renderLineTrapBuildOptions(){
  const host=$('build-grid');
  if(!host)return;
  Object.values(TRAP_DEFINITIONS).filter(def=>def.type==='line').forEach(def=>{
    const button=[...host.querySelectorAll('[data-build]')].find(item=>item.dataset.build===def.id);
    if(!button||button.closest('.line-build-option'))return;
    const wrapper=document.createElement('div');
    wrapper.className='line-build-option';
    button.replaceWith(wrapper);
    wrapper.appendChild(button);
    button.onclick=()=>setBuildMode(def.id);
    const options=document.createElement('div');
    options.className='line-direction-options';
    options.setAttribute('aria-label',`${def.name}の作動方向`);
    LINE_DIRECTIONS.forEach(({value,label,icon})=>{
      const directionButton=document.createElement('button');
      directionButton.type='button';
      directionButton.dataset.lineTrap=def.id;
      directionButton.dataset.lineDirection=value;
      directionButton.title=`${def.name}：${label}`;
      directionButton.setAttribute('aria-label',`${def.name}を${label}向きで設置`);
      directionButton.textContent=icon;
      directionButton.onclick=event=>{event.stopPropagation();selectLineDirection(def.id,value)};
      options.appendChild(directionButton);
    });
    wrapper.appendChild(options);
  });
  refreshLineDirectionButtons();
}
const renderAllWithLayout=renderAll;
renderAll=function(){
  renderAllWithLayout();
  document.querySelector('[data-build="slow"]')?.remove();
  document.querySelector('[data-build="select"]')?.remove();
  document.querySelectorAll('#build-grid [data-build]').forEach(button=>{const def=TRAP_DEFINITIONS[button.dataset.build];if(def)button.firstChild.textContent=`${def.icon||'🪤'} ${def.name}`});
  renderLineTrapBuildOptions();
  setBuildMode(buildMode);
  const selectButton=$('btn-select-mode');if(selectButton)selectButton.onclick=()=>setBuildMode('select');
};
renderAll();
setTimeout(()=>document.head.insertAdjacentHTML('beforeend','<style>.brand{display:none}.header-game-controls{display:flex;gap:10px;align-items:center;margin-left:auto}.header-game-controls select{background:var(--panel2);border:1px solid var(--line);color:var(--text);padding:7px 8px;border-radius:5px}.top-actions{display:grid;grid-template-columns:1.4fr 1fr;gap:8px}.select-action{font-size:15px;border-color:var(--cyan)}.select-action.active{background:#236d78}.drone-grid{grid-template-columns:1fr 1fr}</style>'),0);

// Keep map-aware wave spawning as the final startWave implementation because
// the optional enemy editor extension above also decorates this function.
startWave=function(){if(inWave||wave>=CONFIG.maxWave||!farms.length)return;BUFF_RUNTIME.waveActivations=0;BUFF_RUNTIME.waveBuildings=0;BUFF_RUNTIME.waveTemp={};wave++;inWave=true;spawning=true;const showcase=activeMapId==='display_test'?activeMap.showcase:null;const cfg=(showcase?.wave&&wave<=CONFIG.maxWave)?showcase.wave:(difficultyWaveConfig(wave)||{}),q=[];if(activeMapId==='display_test'){Object.entries(cfg).forEach(([id,count])=>{const baseCount=getDifficultyEnemyCount(count),immuneCount=Math.max(1,Math.round(baseCount/2));let normalLeft=baseCount,immuneLeft=immuneCount;while(normalLeft>0||immuneLeft>0){if(normalLeft>0){q.push({id,lineTrapImmune:false});normalLeft--;}if(normalLeft>0){q.push({id,lineTrapImmune:false});normalLeft--;}if(immuneLeft>0){q.push({id,lineTrapImmune:true});immuneLeft--;}}});}else{Object.entries(cfg).forEach(([id,count])=>{for(let i=0;i<getDifficultyEnemyCount(count);i++)q.push(id)});}let i=0;function spawn(){if(i<q.length){const spawnPoint=activeMap.spawns[i%activeMap.spawns.length],item=q[i++],enemyId=typeof item==='object'?item.id:item,isImmune=typeof item==='object'&&!!item.lineTrapImmune,e=new Enemy(enemyId);if(isImmune)e.lineTrapImmune=true;e.spawnId=spawnPoint.id;e.routeId=spawnPoint.id;e.x=spawnPoint.x*tile+tile/2;e.y=spawnPoint.y*tile+tile/2;e.path=[];e.target=farms[0]||null;e.repath();enemies.push(e);spawnTimer=scheduleGameTask(spawn,Number(showcase?.spawnInterval??CONFIG.waveSpawnInterval)||180)}else spawning=false}spawn();renderAll()};
draw=function(){
 // Keep the map backdrop in the final sprite-aware render path.  This used
 // to be skipped here, which made the route-expanded map shape disappear
 // whenever this later draw implementation replaced the legacy one.
 ctx.clearRect(0,0,canvas.width,canvas.height);
 drawMapBackdrop();
 for(const key of mapShapeCells){const [x,y]=key.split(',').map(Number),v=grid[y]?.[x];if(v==='blocked'){if(!drawSprite('blocked',x*tile+tile/2,y*tile+tile/2)) {ctx.fillStyle='#263844';ctx.fillRect(x*tile+2,y*tile+2,tile-4,tile-4)}}else if(v==='slow'){if(!drawSprite('slow',x*tile+tile/2,y*tile+tile/2)){ctx.fillStyle=colors.slow;ctx.fillRect(x*tile+1,y*tile+1,tile-2,tile-2)}}else if(!v)drawSprite('floor',x*tile+tile/2,y*tile+tile/2)}
 const spawnSprites=new Set(activeMap.spawns.map(s=>`${s.x},${s.y}`));activeMap.spawns.forEach(s=>{if(!drawSprite('spawn',s.x*tile+tile/2,s.y*tile+tile/2)){ctx.fillStyle='#f1d16a';ctx.beginPath();ctx.moveTo(s.x*tile+tile/2,s.y*tile+tile/2+8);ctx.lineTo(s.x*tile+tile/2-7,s.y*tile+tile/2-5);ctx.lineTo(s.x*tile+tile/2+7,s.y*tile+tile/2-5);ctx.closePath();ctx.fill()}});if(!drawSprite('base',activeMap.base.x*tile+tile/2,activeMap.base.y*tile+tile/2)){ctx.strokeStyle='#72e0a0';ctx.beginPath();ctx.arc(activeMap.base.x*tile+tile/2,activeMap.base.y*tile+tile/2,Math.max(9,tile*.42),0,Math.PI*2);ctx.stroke()}
 for(let y=0;y<CONFIG.gridRows;y++)for(let x=0;x<CONFIG.gridCols;x++){const v=grid[y]?.[x];if(!v||v==='blocked'||v==='slow')continue;if(!drawSprite(v,x*tile+tile/2,y*tile+tile/2)){ctx.fillStyle=colors[v]||'#596b72';ctx.fillRect(x*tile+1,y*tile+1,tile-2,tile-2)}}
 farms.forEach(f=>{if(!drawBuildingSprite(f))drawCellFallback('farm',f.gx,f.gy);if(f.state===1||f.state===2||f.state===3){ctx.strokeStyle=f.state===1?'#8eea6b':f.state===2?'#6ed5ef':'#f3c85b';ctx.lineWidth=2;ctx.beginPath();ctx.arc(f.gx*tile+tile/2,f.gy*tile+tile/2,Math.max(4,5+Math.sin((TEST_RUNTIME.frame||0)/5)),0,Math.PI*2);ctx.stroke()}ctx.fillStyle='#19352a';ctx.fillRect(f.gx*tile+3,f.gy*tile+tile-5,(tile-6)*Math.max(0,f.hp/f.maxHp),2)});
 buildings.forEach(b=>{if(!drawBuildingSprite(b))drawCellFallback(b.type,b.gx,b.gy)});
 enemies.forEach(e=>{if(!drawEnemySprite(e)){ctx.fillStyle=e.definition?.color||'#e85d5d';ctx.beginPath();ctx.arc(e.x,e.y,8*ENEMY_SPRITE_LAYOUT.displayScale,0,Math.PI*2);ctx.fill()}if(e.lineTrapImmune){ctx.save();ctx.strokeStyle='#4dd0e1';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,Math.max(9,tile*.42),0,Math.PI*2);ctx.stroke();ctx.restore()}});
 drones.forEach(d=>{if(!drawDroneSprite(d)){ctx.fillStyle=d.color;ctx.fillRect(d.x-tile/2,d.y-tile/2,tile,tile)}});bullets.forEach(b=>{if(!drawProjectileSprite(b.t?.type,b.x,b.y,{rotation:b.angle})){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(b.x,b.y,2,0,Math.PI*2);ctx.fill()}});effects.forEach(e=>{if(e instanceof Explosion){if(!drawSprite('explosion',e.x,e.y,{definition:{}})){ctx.strokeStyle='#ffb347';ctx.beginPath();ctx.arc(e.x,e.y,Math.max(2,20-e.life),0,Math.PI*2);ctx.stroke()}}else if(e instanceof SpriteEffect){const key=e.type.endsWith('-effect')?e.type.replace('-effect','')+'Effect':'trapEffect';if(!drawSprite(key,e.x,e.y,{definition:{}})){ctx.fillStyle=e.type==='excavation-effect'?'#d596ff':'#d48cff';ctx.globalAlpha=Math.max(0,e.life/24);ctx.fillRect(e.x-5,e.y-5,10,10);ctx.globalAlpha=1}}else if(e.t){ctx.save();ctx.fillStyle=e.c;ctx.globalAlpha=Math.min(1,e.life/18);ctx.font=e.kind==='trap-effect'?'bold 10px sans-serif':e.kind==='enemy-damage'?'bold 12px sans-serif':'bold 11px sans-serif';ctx.textAlign='center';ctx.shadowColor='#101820';ctx.shadowBlur=3;ctx.fillText(e.t,e.x,e.y);ctx.restore()}});trapEngine.draw(ctx);
};
document.getElementById('btn-start-wave').onclick=startWave;
resetGame();
if(!GAME_TEST_MODE)requestAnimationFrame(loop);

// The level selector lives in the header between the game and tech-tree tabs.
function setDifficultyLevel(value){
 const next=normalizeDifficultyLevel(value);
 if(next===currentDifficultyLevel)return;
 currentDifficultyLevel=next;
 resetGame();
}
function levelSelectMarkup(){
 return `<label class="level-toolbar" for="header-level"><span>Lv.</span><select id="header-level" aria-label="ゲームレベル">${[1,2,3,4,5].map(n=>`<option value="${n}">レベル ${n}</option>`).join('')}</select></label>`;
}
function renderLevelControls(){
 const techTab=document.querySelector('nav [data-tab="techtree-tab"]');
 if(techTab&&!document.getElementById('header-level'))techTab.insertAdjacentHTML('beforebegin',levelSelectMarkup());
 const select=document.getElementById('header-level');
 if(!select)return;
 select.value=String(currentDifficultyLevel);
 select.onchange=e=>setDifficultyLevel(e.target.value);
}
const renderAllWithLevelControls=renderAll;
renderAll=function(){renderAllWithLevelControls();renderLevelControls()};
renderLevelControls();

// Deterministic integration-test surface. It is intentionally additive: normal
// play still uses the animation loop, browser timers, and native randomness.
function createTestRandom(seed){
  let state=(Number(seed)>>>0)||1;
  return ()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296};
}
 function testEnemyState(enemy){return {type:enemy.type,id:enemy.spawnId||null,x:enemy.x,y:enemy.y,hp:enemy.hp,maxHp:enemy.maxHp,speed:enemy.speed,baseSpeed:enemy.baseSpeed,speedMultiplier:enemy.speedMultiplier||1,damage:enemy.damage,baseDamage:enemy.baseDamage,attackMultiplier:enemy.attackMultiplier||1,armor:enemy.armor,trapResistance:enemy.trapResistance,trapSpeedMultiplier:enemy.trapSpeedMultiplier,trapStunned:!!enemy.trapStunned,trapArmor:enemy.trapArmor,pathTick:enemy.pathTick,pathLength:enemy.path?.length||0,stuckFrames:enemy.stuckFrames,facing:enemy.facing,spriteState:enemy.spriteState,hitTimer:enemy.hitTimer,deathTimer:enemy.deathTimer,dead:!!enemy.dead,abilities:[...(enemy.abilities||[])],statusEffects:(enemy.statusEffects||[]).map(e=>({type:e.type,amount:e.amount,remaining:e.remaining,timer:e.timer,interval:e.interval}))}}
function testState(){return {frame:TEST_RUNTIME.frame,mapId:activeMapId,wave,inWave,spawning,money,science,gameResult:$('game-result')?.textContent||'',farms:farms.map(f=>({gx:f.gx,gy:f.gy,hp:f.hp,maxHp:f.maxHp,level:f.level,state:f.state,progress:f.progress})),buildings:buildings.map(b=>({type:b.type,gx:b.gx,gy:b.gy,hp:b.hp,maxHp:b.maxHp,level:b.level,cool:b.cool})),enemies:enemies.map(testEnemyState),traps:trapEngine.traps.map(t=>({gx:t.gx,gy:t.gy,cooldown:t.cooldown,life:t.life,definition:structuredClone(t.definition)})),buffs:Object.values(buffs),buffRuntime:structuredClone(typeof BUFF_RUNTIME==='undefined'?{}:BUFF_RUNTIME),grid:structuredClone(grid)}}
function testReset(options={}){
  if(options.mapId){if(!MAP_DEFINITIONS[options.mapId])throw new Error(`Unknown map: ${options.mapId}`);activeMapId=options.mapId;activeMap=MAP_DEFINITIONS[activeMapId]}
  if(options.difficulty!==undefined)currentDifficultyLevel=Number(options.difficulty)||1;
  if(options.blockedTileSpawnRate!==undefined)CONFIG.blockedTileSpawnRate=Number(options.blockedTileSpawnRate);
  TEST_RUNTIME.frame=0;TEST_RUNTIME.tasks=[];resetGame();
  if(options.disableDrones!==false)drones=[];
  if(options.disableBuffs!==false){buffs={};techs={}}
  $('start-tech-overlay')?.classList.add('hidden');
  if($('game-result'))$('game-result').textContent='';
  if($('game-result-detail'))$('game-result-detail').textContent='';
  $('game-overlay')?.classList.add('hidden');
  renderAll();
  return testState();
}
function testStep(frames=1){const count=Math.max(0,Math.floor(Number(frames)||0));for(let i=0;i<count;i++){for(let speed=0;speed<gameSpeed;speed++){runTestTasks();update()}TEST_RUNTIME.frame++}return testState()}
function testSpawnEnemy(id,x,y){if(!ENEMY_DEFINITIONS[id])throw new Error(`Unknown enemy: ${id}`);const e=new Enemy(id),px=Number(x),py=Number(y);e.spawnId=id;e.x=Number.isFinite(px)?px*tile+tile/2:activeMap.spawns[0].x*tile+tile/2;e.y=Number.isFinite(py)?py*tile+tile/2:activeMap.spawns[0].y*tile+tile/2;e.target=farms[0]||null;if(e.target)e.repath();enemies.push(e);inWave=true;spawning=false;return testEnemyState(e)}
function testPlaceTrap(id,x,y,direction){const definition=TRAP_DEFINITIONS[id];if(!definition)throw new Error(`Unknown trap: ${id}`);const result=trapEngine.place(Number(x),Number(y),definition,direction||lineDirection);if(!result.ok)throw new Error(result.error);inWave=true;return {gx:Number(x),gy:Number(y),definition:structuredClone(result.trap.definition)}}
function testPlaceTrapDefinition(definition,x,y,direction){const result=trapEngine.place(Number(x),Number(y),structuredClone(definition),direction||lineDirection);if(!result.ok)throw new Error(result.error);inWave=true;return {gx:Number(x),gy:Number(y),definition:structuredClone(result.trap.definition)}}
function testTryPlaceTrapDefinition(definition,x,y,direction){const result=trapEngine.place(Number(x),Number(y),structuredClone(definition),direction||lineDirection);if(result.ok)inWave=true;return {ok:result.ok,error:result.error||null}}
function testSetWaveActive(value){inWave=Boolean(value);spawning=false;return testState()}
function testSetDifficultyConfig(level,config){const n=normalizeDifficultyLevel(level);activeRegulation().difficulties[n]=structuredClone(config);currentDifficultyLevel=n;return structuredClone(activeRegulation().difficulties[n])}
function testSetWaveConfig(config){const d=activeRegulation().difficulties[currentDifficultyLevel];d.waves[wave+1]=structuredClone(config);return structuredClone(d.waves)}
function testSetMaxWave(value){CONFIG.maxWave=Math.max(1,Math.floor(Number(value)||1));return CONFIG.maxWave}
function testBlockCell(x,y,value='blocked'){const gx=Number(x),gy=Number(y);if(!grid[gy])throw new Error('Unknown grid row');grid[gy][gx]=value;return testState()}
function testFindPath(sx,sy,tx,ty){return findPath(Number(sx),Number(sy),Number(tx),Number(ty))}
function testTryStartWave(){const before=testState();startWave();return {before,after:testState()}}
function testApplyBuff(id){const definition=buffDefinition(id);if(!definition)throw new Error(`Unknown buff: ${id}`);if(typeof addExtendedBuff==='function'&&EXTENDED_BUFFS.defs.some(b=>b[0]===id))addExtendedBuff(id);else{buffs[id]=id;if(definition[2]==='instant_money')money+=Number(definition[3])||0}return id}
function testPlaceBuilding(type,x,y){if(!['mg','missile','lab'].includes(type))throw new Error(`Unsupported test building: ${type}`);const gx=Number(x),gy=Number(y);grid[gy][gx]=type;buildings.push(new Building(type,gx,gy));inWave=true;spawning=true;return {type,gx,gy}}
function testPlaceFarm(x,y){const gx=Number(x),gy=Number(y);addFarm(gx,gy);return {gx,gy}}
function testRemoveAllFarms(){farms.forEach(f=>{if(grid[f.gy])grid[f.gy][f.gx]=null});farms=[];return testState()}
function testSetEnemyHp(index,hp){const enemy=enemies[Number(index)];if(!enemy)throw new Error(`Unknown enemy index: ${index}`);enemy.hp=Math.max(0,Number(hp));return testEnemyState(enemy)}
function testSetEnemyDamage(index,damage){const enemy=enemies[Number(index)];if(!enemy)throw new Error(`Unknown enemy index: ${index}`);enemy.baseDamage=Number(damage)||0;enemy.damage=enemy.baseDamage;return testEnemyState(enemy)}
function testDamageEnemy(index,damage,sourceX,sourceY){const enemy=enemies[Number(index)];if(!enemy)throw new Error(`Unknown enemy index: ${index}`);damageEnemy(enemy,Number(damage),{type:'test',x:Number(sourceX),y:Number(sourceY)});return testEnemyState(enemy)}
function testBuffMetrics(){return {mgDamage:mult('mg_damage'),cropSell:mult('crop_sell'),droneSpeed:mult('drone_speed'),missileRange:mult('missile_range'),farmHp:mult('farm_hp'),mgCooldown:1-buff('mg_cooldown'),missileDamage:mult('missile_damage'),cropSpeed:mult('crop_speed'),slowTile:mult('slow_tile'),scienceGen:Math.max(1,Math.round(mult('science_gen'))),instantMoney:buff('instant_money')}}
if(GAME_TEST_MODE){
  window.__TEST_API__={
    setSeed(seed){TEST_RUNTIME.random=createTestRandom(seed);return Number(seed)>>>0},
    setSpeed:setGameSpeed,
    getSpeed(){return gameSpeed},
    reset:testReset,
    step:testStep,
    getState:testState,
    spawnEnemy:testSpawnEnemy,
    placeTrap:testPlaceTrap,
    placeTrapDefinition:testPlaceTrapDefinition,
    tryPlaceTrapDefinition:testTryPlaceTrapDefinition,
    setWaveActive:testSetWaveActive,
    setDifficultyConfig:testSetDifficultyConfig,
    setWaveConfig:testSetWaveConfig,
    setMaxWave:testSetMaxWave,
    blockCell:testBlockCell,
    findPath:testFindPath,
    tryStartWave:testTryStartWave,
    applyBuff:testApplyBuff,
    placeBuilding:testPlaceBuilding,
    placeFarm:testPlaceFarm,
    removeAllFarms:testRemoveAllFarms,
    setEnemyHp:testSetEnemyHp,
    setEnemyDamage:testSetEnemyDamage,
    damageEnemy:testDamageEnemy,
    getBuffMetrics:testBuffMetrics,
    startWave,
    getDefinitions(){return {CONFIG:structuredClone(CONFIG),REGULATIONS:structuredClone(REGULATIONS),ENEMY_DEFINITIONS:structuredClone(ENEMY_DEFINITIONS),MAP_DEFINITIONS:structuredClone(MAP_DEFINITIONS),TRAP_DEFINITIONS:structuredClone(TRAP_DEFINITIONS),BUFF_DEFINITIONS:structuredClone(BUFF_DEFINITIONS),SPRITE_CONFIG:structuredClone(SPRITE_CONFIG)}}
  };
}
