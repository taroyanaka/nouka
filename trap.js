// Data-driven trap engine. The engine is deliberately independent from the
// game globals; script.js supplies live state through getter functions.
(function () {
  const EFFECT_TYPES = ['slow', 'poison', 'burn', 'armor_down', 'stun', 'knockback', 'pull'];
  const TRAP_TYPES = ['line', 'tile', 'area'];
  // Trap time settings are expressed in seconds. The game advances at 60
  // updates per second when the speed is 1x; higher game speeds simply run
  // more of these updates per render tick.
  const TRAP_UPDATES_PER_SECOND = 60;
  const TYPE_RULES = {
    line: { targeting: 'line' },
    tile: { targeting: 'tile' },
    area: { targeting: 'area' }
  };
  const DIRECTION_VECTORS = Object.freeze({
    up: Object.freeze({ x: 0, y: -1 }),
    down: Object.freeze({ x: 0, y: 1 }),
    left: Object.freeze({ x: -1, y: 0 }),
    right: Object.freeze({ x: 1, y: 0 })
  });

  const DEFAULT_TRAPS = {
    trap_tile_slow: { id: 'trap_tile_slow', name: '減速タイル', icon: '🐌', color: '#4b82d1', type: 'tile', cost: 60, cooldown: 0.75, duration: 2, sprite: { uri: 'sprite_sheets/trap_tile_slow.png', frames: 144, columns: 12, rows: 12, frameDuration: 6 }, effects: [{ type: 'slow', amount: 0.45, duration: 2 }] },
    trap_tile_poison: { id: 'trap_tile_poison', name: '毒タイル', icon: '☠️', color: '#8b55c7', type: 'tile', cost: 80, cooldown: 1, duration: 4, sprite: { uri: 'sprite_sheets/trap_tile_poison.png', frames: 120, columns: 10, rows: 12, frameDuration: 6 }, effects: [{ type: 'poison', amount: 2, interval: 1, duration: 4 }] },
    trap_tile_burn: { id: 'trap_tile_burn', name: '焼夷タイル', icon: '🔥', color: '#d65b32', type: 'tile', cost: 85, cooldown: 1.2, duration: 3, sprite: { uri: 'sprite_sheets/trap_tile_burn.png', frames: 120, columns: 10, rows: 12, frameDuration: 6 }, effects: [{ type: 'burn', amount: 3, interval: 0.75, duration: 3 }] },
    trap_tile_armor_down: { id: 'trap_tile_armor_down', name: '装甲破壊タイル', icon: '🛡️', color: '#b99235', type: 'tile', cost: 75, cooldown: 1.5, duration: 3, sprite: { uri: 'sprite_sheets/trap_tile_armor_down.png', frames: 120, columns: 10, rows: 12, frameDuration: 6 }, effects: [{ type: 'armor_down', amount: 0.25, duration: 3 }] },
    trap_line_pull: { id: 'trap_line_pull', name: '吸引ライン', icon: '🌀', type: 'line', cost: 90, cooldown: 2, range: 7, width: 1, sprite: { uri: 'sprite_sheets/trap_line_pull.png', frames: 144, columns: 12, rows: 12, frameDuration: 6 }, effects: [{ type: 'pull', amount: 1.5, duration: 0.25 }] },
    trap_line_knockback: { id: 'trap_line_knockback', name: '撃退ライン', icon: '💥', type: 'line', cost: 95, cooldown: 2, range: 7, width: 1, sprite: { uri: 'sprite_sheets/trap_line_knockback.png', frames: 120, columns: 10, rows: 12, frameDuration: 6 }, effects: [{ type: 'knockback', amount: 1.5, duration: 0.25 }] }
  };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function number(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
  function normalizeDirection(value, fallback = 'down') { return DIRECTION_VECTORS[value] ? value : fallback; }
  function secondsToFrames(value, fallbackSeconds = 1) {
    return Math.max(0, Math.ceil(number(value, fallbackSeconds) * TRAP_UPDATES_PER_SECOND));
  }
  function center(trap, tile) { return { x: trap.gx * tile + tile / 2, y: trap.gy * tile + tile / 2 }; }
  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function pointLineDistance(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (!len2) return distance(p, a);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
  }

  function validateDefinition(definition) {
    if (!definition || !definition.id || !definition.name || !TRAP_TYPES.includes(definition.type)) return '罠ID・名称・タイプが必要です';
    if (number(definition.cost, -1) < 0 || number(definition.cooldown, -1) < 0) return 'コストとクールダウンは0以上にしてください';
    if (!Array.isArray(definition.effects) || definition.effects.length < 1) return '効果を1つ以上設定してください';
    if (definition.type === 'line' && number(definition.range, 0) <= 0) return 'ライン罠には射程が必要です';
    if (definition.type === 'area' && number(definition.radius, 0) <= 0) return '広域罠には半径が必要です';
    for (const effect of definition.effects) {
      if (!EFFECT_TYPES.includes(effect.type)) return `未対応の効果です: ${effect.type}`;
      if (['poison', 'burn'].includes(effect.type) && number(effect.interval, 0) <= 0) return '毒・火傷には発動間隔が必要です';
      if (number(effect.duration, 1) <= 0) return '効果時間は0より大きい値にしてください';
    }
    return '';
  }

  class Trap {
    constructor(definition, gx, gy, direction = 'down') {
      this.definition = clone(definition);
      if (this.definition.type === 'line') this.definition.direction = normalizeDirection(direction, normalizeDirection(this.definition.direction));
      this.gx = gx;
      this.gy = gy;
      this.cooldown = 0;
      this.life = Infinity;
    }
    update(engine) {
      if (!engine.state.isWaveActive()) return true;
      if (this.cooldown > 0) this.cooldown--;
      if (this.definition.type === 'tile') {
        engine.targetsFor(this).forEach(enemy => engine.applyEffects(enemy, this.definition.effects, this));
      } else if (this.cooldown <= 0) {
        engine.targetsFor(this).forEach(enemy => engine.applyEffects(enemy, this.definition.effects, this));
        this.cooldown = secondsToFrames(this.definition.cooldown, 1);
      }
      return true;
    }
  }

  class TrapEngine {
    constructor(context) {
      this.context = context;
      this.traps = [];
      this.projectiles = [];
    }
    get state() { return this.context; }
    place(gx, gy, definition, direction) {
      const error = validateDefinition(definition);
      if (error) return { ok: false, error };
      if (this.traps.some(trap => trap.gx === gx && trap.gy === gy)) return { ok: false, error: '同じマスには罠を重ねて設置できません' };
      const trap = new Trap(definition, gx, gy, direction || definition.direction);
      this.traps.push(trap);
      return { ok: true, trap };
    }
    remove(gx, gy) {
      const index = this.traps.findIndex(trap => trap.gx === gx && trap.gy === gy);
      if (index < 0) return null;
      return this.traps.splice(index, 1)[0];
    }
    reset() { this.traps = []; this.projectiles = []; }
    targetsFor(trap) {
      const enemies = this.state.getEnemies();
      const tile = this.state.getTile();
      const c = center(trap, tile);
      const def = trap.definition;
      if (def.type === 'area') return enemies.filter(e => distance(e, c) <= number(def.radius, 3) * tile);
      if (def.type === 'tile') {
        return enemies.filter(e => Math.floor(e.x / tile) === trap.gx && Math.floor(e.y / tile) === trap.gy);
      }
      const direction = DIRECTION_VECTORS[normalizeDirection(def.direction)];
      const end = { x: c.x + direction.x * number(def.range, 8) * tile, y: c.y + direction.y * number(def.range, 8) * tile };
      return enemies.filter(e => pointLineDistance(e, c, end) <= number(def.width, 1) * tile / 2 && distance(e, c) <= number(def.range, 8) * tile);
    }
    applyEffects(enemy, effects, source) {
      if (!enemy || enemy.hp <= 0) return;
      if (enemy.lineTrapImmune && source?.definition?.type === 'line') return;
      if (!enemy.statusEffects) enemy.statusEffects = [];
      const resistance = Math.max(0, Math.min(1, Number(enemy.trapResistance) || 0));
      effects.forEach(effect => {
        const trapMultiplier = window.getTrapBuffMultiplier ? window.getTrapBuffMultiplier(effect.type) : 1;
        const durationMultiplier = window.getTrapBuffDurationMultiplier ? window.getTrapBuffDurationMultiplier(effect.type) : 1;
        const tuned = { ...effect, amount: number(effect.amount, 0) * trapMultiplier, duration: number(effect.duration, 1) * durationMultiplier };
        const copy = { ...tuned, amount: number(tuned.amount, 0) * (1 - resistance), remaining: Math.max(1, Math.floor(secondsToFrames(tuned.duration, 1) * (1 - resistance))), timer: 0, source };
        const existing = enemy.statusEffects.find(x => x.type === effect.type);
        if (existing) Object.assign(existing, copy);
        else enemy.statusEffects.push(copy);
        this.state.spawnVisualEffect?.(effect.type, enemy.x, enemy.y, source);
        if (!existing) {
          const labels = { slow: '🐌', poison: '☠', burn: '🔥', armor_down: '🛡↓', stun: '✦', knockback: '↗', pull: '↙' };
          const colors = { slow: '#8bd3ff', poison: '#c59cff', burn: '#ff9b54', armor_down: '#ffd166', stun: '#fff27a', knockback: '#ff8f70', pull: '#9de1ff' };
          const amount = effect.amount === undefined ? '' : ` ${number(copy.amount, 0).toFixed(1).replace(/\.0$/, '')}`;
          this.state.spawnFct?.(enemy.x, enemy.y, `${labels[effect.type] || '✦'}${amount}`, colors[effect.type] || '#fff', 'trap-effect');
        }
        if (effect.type === 'knockback' || effect.type === 'pull') this.applyDisplacement(enemy, source, effect);
      });
    }
    applyDisplacement(enemy, source, effect) {
      const tile = this.state.getTile();
      const c = center(source, tile);
      let dx = enemy.x - c.x, dy = enemy.y - c.y;
      if (source.definition.type === 'line') {
        const direction = DIRECTION_VECTORS[normalizeDirection(source.definition.direction)];
        dx = direction.x; dy = direction.y;
        if (effect.type === 'pull') { dx = -dx; dy = -dy; }
      } else if (effect.type === 'pull') { dx = -dx; dy = -dy; }
      const len = Math.hypot(dx, dy) || 1;
      const amount = number(effect.amount, 1) * tile;
      enemy.x += dx / len * amount;
      enemy.y += dy / len * amount;
      // Displacement is allowed to be large, but the resulting enemy position
      // must stay inside the playable map.  Using the map bounds supplied by
      // the game keeps irregular maps from being treated as the whole canvas.
      const canvasBounds = {
        minX: 2,
        maxX: this.state.getCanvasWidth() - 2,
        minY: 2,
        maxY: this.state.getCanvasHeight() - 2
      };
      const bounds = this.state.getMapBounds?.() || canvasBounds;
      const minX = number(bounds.minX, canvasBounds.minX);
      const maxX = number(bounds.maxX, canvasBounds.maxX);
      const minY = number(bounds.minY, canvasBounds.minY);
      const maxY = number(bounds.maxY, canvasBounds.maxY);
      enemy.x = Math.max(minX, Math.min(maxX, enemy.x));
      enemy.y = Math.max(minY, Math.min(maxY, enemy.y));
    }
    updateEnemy(enemy) {
      const effects = enemy.statusEffects || [];
      enemy.trapSpeedMultiplier = 1;
      enemy.trapStunned = false;
      enemy.trapArmor = 0;
      for (const effect of effects) {
        effect.remaining--;
        if (effect.type === 'slow') enemy.trapSpeedMultiplier *= Math.max(0.05, 1 - number(effect.amount, 0.5));
        if (effect.type === 'stun') enemy.trapStunned = true;
        if (effect.type === 'armor_down') enemy.trapArmor += number(effect.amount, 0);
        if (['poison', 'burn'].includes(effect.type) && ++effect.timer >= secondsToFrames(effect.interval, 0.5)) {
          effect.timer = 0;
          this.state.damageEnemy(enemy, number(effect.amount, 1), { type: effect.type });
        }
      }
      enemy.statusEffects = effects.filter(effect => effect.remaining > 0);
    }
    update() {
      this.traps = this.traps.filter(trap => trap.update(this));
    }
    draw(ctx) {
      const tile = this.state.getTile();
      this.traps.forEach(trap => {
        const def = trap.definition, x = trap.gx * tile, y = trap.gy * tile;
        ctx.save();
        ctx.globalAlpha = def.type === 'tile' ? 0.45 : 0.85;
        // A trap may override the shared trap sprite with its own sprite-sheet definition.
        const spriteDefinition = {
          ...def,
          ...(def.sprite && typeof def.sprite === 'object' ? def.sprite : {}),
          width: Number(def.sprite?.width) || tile,
          height: Number(def.sprite?.height) || tile
        };
        const lineDirectionAngles = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
        const columns = Math.max(1, Math.floor(Number(spriteDefinition.columns) || 0));
        const rows = Math.max(1, Math.floor(Number(spriteDefinition.rows) || 0));
        const frameCount = Math.max(1, Math.floor(Number(spriteDefinition.frames) || 0));
        const hasBuildingSheet = columns >= 10 && rows >= 12 && frameCount >= columns * rows;
        const animationColumn = Math.floor((Number(this.state.getFrame?.()) || 0) / Math.max(1, Number(spriteDefinition.frameDuration) || 6)) % columns;
        const showcaseLevel = Math.max(1, Math.min(6, Math.floor(Number(def.showcaseLevel) || 1)));
        const frameIndex = hasBuildingSheet
          ? (def.type === 'line' ? (Math.min(rows - 1, Math.floor(rows / 2) + showcaseLevel - 1) * columns) : (this.state.isWaveActive() ? Math.floor(rows / 2) * columns : 0)) + animationColumn
          : undefined;
        const drawn = this.state.drawSprite?.('trap', x + tile / 2, y + tile / 2, {
          definition: spriteDefinition,
          frameIndex,
          rotation: def.type === 'line' ? (lineDirectionAngles[def.direction] ?? 0) : undefined
        });
        if (!drawn) {
          const color = def.color || (def.type === 'line' ? '#e87555' : def.type === 'tile' ? '#6d75d9' : '#be76dc');
          ctx.fillStyle = color;
          if (def.type === 'line') {
            // Keep line traps visible even while a sprite is still loading.
            // The beam orientation mirrors the sprite rotation below.
            const angle = lineDirectionAngles[def.direction] ?? 0;
            ctx.translate(x + tile / 2, y + tile / 2);
            ctx.rotate(angle);
            ctx.fillRect(-tile / 2 + 2, -3, tile - 4, 6);
            ctx.beginPath();
            ctx.moveTo(tile / 2 - 2, 0);
            ctx.lineTo(tile / 2 - 8, -6);
            ctx.lineTo(tile / 2 - 8, 6);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillRect(x + 3, y + 3, tile - 6, tile - 6);
          }
        }
        ctx.restore();
      });
    }
  }

  window.TRAP_EFFECT_TYPES = EFFECT_TYPES;
  window.TRAP_TYPE_RULES = TYPE_RULES;
  window.TRAP_UPDATES_PER_SECOND = TRAP_UPDATES_PER_SECOND;
  window.DEFAULT_TRAPS = DEFAULT_TRAPS;
  window.validateTrapDefinition = validateDefinition;
  window.TrapEngine = TrapEngine;
})();
