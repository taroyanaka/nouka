// Farm Defense レギュレーション設定
let savedConfig = (() => {
  const clone = value => JSON.parse(JSON.stringify(value));

  const standardTechTrees = [
    {
      id: 'standard',
      name: '標準開拓ツリー',
      description: '農業と防衛をバランスよく強化',
      nodes: [
        ['tech_agriculture', '近代農業', 1, 50, [], 'buff_crop_speed'],
        ['tech_defense_1', '簡易防衛線', 1, 50, [], 'buff_mg_damage'],
        ['tech_irrigation', '市場流通改善', 2, 120, ['tech_agriculture'], 'buff_crop_sell'],
        ['tech_ballistics', '自動装填機構', 2, 150, ['tech_defense_1'], 'buff_mg_cooldown'],
        ['tech_science_boost', '学術研究推進', 2, 100, ['tech_agriculture', 'tech_defense_1'], 'buff_science_gen'],
        ['tech_automation', 'ドローン推進器', 3, 250, ['tech_irrigation'], 'buff_drone_speed'],
        ['tech_chemistry', '農薬・焼夷研究', 3, 240, ['tech_science_boost', 'tech_defense_1'], 'buff_trap_damage,buff_trap_duration'],
        ['tech_heavy_artillery', '重火器工学', 3, 300, ['tech_ballistics'], 'buff_missile_damage,buff_missile_range'],
        ['tech_geo_engineering', '環境改変', 4, 450, ['tech_automation', 'tech_heavy_artillery'], 'buff_slow_tile,buff_farm_hp'],
        ['tech_integrated_defense', '統合防衛指揮', 4, 520, ['tech_chemistry', 'tech_geo_engineering'], 'buff_trap_damage,buff_mg_damage,buff_farm_hp']
      ]
    },
    {
      id: 'expedition',
      name: '探検・発掘ツリー',
      description: '発掘ドローンと資源獲得を優先',
      nodes: [
        ['dig_start', '発掘許可', 1, 40, [], 'buff_money_instant'],
        ['dig_science', '地質調査', 1, 70, [], 'buff_science_gen'],
        ['dig_speed', '掘削機構', 2, 130, ['dig_start'], 'buff_drone_speed'],
        ['dig_luck', '幸運の地脈', 2, 180, ['dig_start', 'dig_science'], 'buff_crop_sell'],
        ['dig_yield', '資源精製', 3, 280, ['dig_speed', 'dig_luck'], 'buff_money_instant'],
        ['dig_master', '深層発掘', 4, 420, ['dig_yield'], 'buff_science_gen,buff_money_instant']
      ]
    }
  ];

  const coinTechTrees = [
    {
      id: 'coin_pusher',
      name: '大量出現・総力戦ツリー',
      description: '大量の敵を処理しながら、農業・防衛・科学を伸ばす',
      nodes: [
        ['coin_agriculture', '高速栽培', 1, 60, [], 'buff_crop_speed'],
        ['coin_firepower', '量産火器', 1, 60, [], 'buff_mg_damage'],
        ['coin_income', '連続収穫', 2, 140, ['coin_agriculture'], 'buff_crop_sell'],
        ['coin_cooldown', '連射ライン', 2, 160, ['coin_firepower'], 'buff_mg_cooldown'],
        ['coin_science', '研究所拡張', 2, 180, ['coin_agriculture'], 'buff_science_gen'],
        ['coin_drone', '物流自動化', 3, 260, ['coin_income'], 'buff_drone_speed'],
        ['coin_missile', '重火器配備', 3, 320, ['coin_cooldown'], 'buff_missile_damage,buff_missile_range'],
        ['coin_final', '総力戦農地', 4, 500, ['coin_drone', 'coin_missile'], 'buff_farm_hp,buff_slow_tile']
      ]
    }
  ];

  // CPレギュ2は標準の2ツリーに、CP2専用の2ツリーを追加する。
  const cp2TechTrees = [
    clone(standardTechTrees[0]),
    clone(standardTechTrees[1]),
    {
      id: 'cp2_drone',
      name: 'ドローン強化系（ドローン取得&ドローンコスト低下系）テックツリービルド',
      description: 'ドローンの取得を後押しし、購入コストと運用負担を下げる',
      nodes: [
        ['cp2_drone_start', 'ドローン運用許可', 1, 50, [], 'buff_discount_drone'],
        ['cp2_drone_supply', 'ドローン配備計画', 1, 80, ['cp2_drone_start'], 'buff_money_instant,buff_discount_drone'],
        ['cp2_drone_speed', '高速航行制御', 2, 140, ['cp2_drone_supply'], 'buff_drone_speed'],
        ['cp2_drone_discount', '量産コスト削減', 3, 240, ['cp2_drone_speed'], 'buff_discount_drone,buff_drone_speed'],
        ['cp2_drone_master', '自律採掘群', 4, 420, ['cp2_drone_discount'], 'buff_discount_drone,buff_drone_speed,buff_money_instant']
      ]
    },
    {
      id: 'cp2_tile_trap',
      name: 'タイル罠強化系テックツリービルド',
      description: 'タイル罠の作成コストを抑え、床面防衛を強化する',
      nodes: [
        ['cp2_tile_trap_start', 'タイル罠運用許可', 1, 50, [], 'buff_discount_tile_trap'],
        ['cp2_tile_trap_supply', 'タイル罠資材調達', 1, 80, ['cp2_tile_trap_start'], 'buff_discount_tile_trap,buff_money_instant'],
        ['cp2_tile_trap_design', '敷設効率化', 2, 140, ['cp2_tile_trap_supply'], 'buff_discount_tile_trap,buff_trap_duration'],
        ['cp2_tile_trap_chemistry', '床面薬剤研究', 3, 240, ['cp2_tile_trap_design'], 'buff_discount_tile_trap,buff_trap_damage'],
        ['cp2_tile_trap_master', '完全タイル防衛', 4, 420, ['cp2_tile_trap_chemistry'], 'buff_discount_tile_trap,buff_trap_damage,buff_trap_duration']
      ]
    }
  ];

  const standardWaves = Object.fromEntries(
    Array.from({ length: 10 }, (_, index) => [
      index + 1,
      { peasant: 10, adventurer: 5 }
    ])
  );

  const coinBaseWaves = {
    1:  { peasant: 10, adventurer: 2 },
    2:  { peasant: 14, adventurer: 6 },
    3:  { peasant: 20, adventurer: 10, warrior: 2 },
    4:  { peasant: 28, adventurer: 14, warrior: 4, thief: 2 },
    5:  { peasant: 38, adventurer: 20, warrior: 8, thief: 4 },
    6:  { peasant: 48, adventurer: 25, warrior: 12, thief: 6, horseman: 4 },
    7:  { peasant: 58, adventurer: 30, warrior: 18, thief: 10, horseman: 6, priest: 3 },
    8:  { peasant: 70, adventurer: 35, warrior: 22, thief: 14, horseman: 8, priest: 5, drummer: 3 },
    9:  { peasant: 85, adventurer: 42, warrior: 28, thief: 18, horseman: 12, knight: 5, priest: 5, drummer: 5 },
    10: { peasant: 105, adventurer: 52, warrior: 35, thief: 22, horseman: 16, knight: 8, brute: 3, priest: 6, drummer: 6, wizard_speed: 3 }
  };

  const scaledWaves = multiplier =>
    Object.fromEntries(
      Object.entries(coinBaseWaves).map(([wave, enemies]) => [
        wave,
        Object.fromEntries(
          Object.entries(enemies).map(([enemy, count]) => [
            enemy,
            Math.max(1, Math.round(count * multiplier))
          ])
        )
      ])
    );

  // CPレギュ2は物量重視。序盤から50体程度を出し、Waveが進むほど
  // 戦士・騎兵・騎士・ブルートなどの強敵比率を段階的に高める。
  const cp2BaseWaves = {
    1:  { peasant: 25, adventurer: 15, warrior: 6, thief: 4 },
    2:  { peasant: 28, adventurer: 16, warrior: 10, thief: 6, horseman: 3 },
    3:  { peasant: 30, adventurer: 18, warrior: 14, thief: 8, horseman: 6 },
    4:  { peasant: 32, adventurer: 18, warrior: 18, thief: 9, horseman: 9, priest: 3 },
    5:  { peasant: 34, adventurer: 18, warrior: 22, thief: 10, horseman: 12, knight: 4, priest: 4 },
    6:  { peasant: 35, adventurer: 18, warrior: 25, thief: 10, horseman: 15, knight: 8, priest: 5, drummer: 4 },
    7:  { peasant: 34, adventurer: 18, warrior: 28, thief: 10, horseman: 18, knight: 12, brute: 3, priest: 6, drummer: 5 },
    8:  { peasant: 32, adventurer: 17, warrior: 30, thief: 10, horseman: 21, knight: 16, brute: 6, priest: 7, drummer: 6 },
    9:  { peasant: 30, adventurer: 16, warrior: 32, thief: 10, horseman: 24, knight: 20, brute: 10, priest: 8, drummer: 7, wizard_speed: 3 },
    10: { peasant: 28, adventurer: 15, warrior: 34, thief: 10, horseman: 27, knight: 24, brute: 15, priest: 9, drummer: 8, wizard_speed: 5 }
  };

  const cp2ScaledWaves = multiplier =>
    Object.fromEntries(
      Object.entries(cp2BaseWaves).map(([wave, enemies]) => [
        wave,
        Object.fromEntries(
          Object.entries(enemies).map(([enemy, count]) => [
            enemy,
            Math.max(1, Math.round(count * multiplier))
          ])
        )
      ])
    );

  const makeDifficulties = waves =>
    Object.fromEntries(
      [1, 2, 3, 4, 5].map(level => [
        level,
        {
          initialMoney: 501,
          waves: clone(waves)
        }
      ])
    );

  const standardRegulation = {
    id: 'standard',
    name: '標準設定',
    difficulties: makeDifficulties(standardWaves),
    techTrees: standardTechTrees
  };

  const coinRegulation = {
    id: 'coin_pusher',
    name: '豊穣戦線：コインプッシャー型',
    difficulties: {
      1: { initialMoney: 1000000, waves: scaledWaves(1.0) },
      2: { initialMoney: 1000000, waves: scaledWaves(1.3) },
      3: { initialMoney: 1000000, waves: scaledWaves(1.7) },
      4: { initialMoney: 1000000, waves: scaledWaves(2.2) },
      5: { initialMoney: 1000000, waves: scaledWaves(2.8) }
    },
    techTrees: coinTechTrees,
    trapIcons: {
      trap_tile_slow: '🐌',
      trap_tile_poison: '🪙',
      trap_tile_burn: '🔥',
      trap_tile_armor_down: '🔨',
      trap_line_pull: '🧲',
      trap_line_knockback: '💥'
    }
  };

  const cp2Regulation = {
    ...clone(coinRegulation),
    id: 'coin_pusher_2',
    name: 'CPレギュ2',
    difficulties: {
      1: { initialMoney: 1000000, waves: cp2ScaledWaves(1.0) },
      2: { initialMoney: 1000000, waves: cp2ScaledWaves(1.15) },
      3: { initialMoney: 1000000, waves: cp2ScaledWaves(1.35) },
      4: { initialMoney: 1000000, waves: cp2ScaledWaves(1.6) },
      5: { initialMoney: 1000000, waves: cp2ScaledWaves(1.9) }
    },
    techTrees: cp2TechTrees
  };

  const cp3Regulation = {
    ...clone(cp2Regulation),
    id: 'coin_pusher_3',
    name: 'CPレギュ3',
    techTrees: clone(cp2TechTrees)
  };

  return {
    regulations: [
      standardRegulation,
      coinRegulation,
      cp2Regulation,
      cp3Regulation
    ],
    activeRegulationId: 'standard',
    currentDifficultyLevel: 1
  };
})();
