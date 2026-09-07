// Data-driven trap engine. The engine is deliberately independent from the
// game globals; script.js supplies live state through getter functions.
(function () {
  const EFFECT_TYPES = ['slow', 'freeze', 'poison', 'burn', 'armor_down', 'stun', 'knockback', 'pull'];
  const TRAP_TYPES = ['single', 'line', 'tile', 'area'];
  const TYPE_RULES = {
    single: { targeting: 'single' },
    line: { targeting: 'line' },
    tile: { targeting: 'tile' },
    area: { targeting: 'area' }
  };

  const DEFAULT_TRAPS = {
    trap_single: { id: 'trap_single', name: '単体罠', type: 'single', cost: 60, cooldown: 50, range: 4, effects: [{ type: 'poison', amount: 2, duration: 120, interval: 30 }] },
    trap_line: { id: 'trap_line', name: 'ライン罠', type: 'line', cost: 90, cooldown: 90, range: 8, width: 1, effects: [{ type: 'armor_down', amount: 0.2, duration: 120 }] },
    trap_tile: { id: 'trap_tile', name: '床面罠', type: 'tile', cost: 70, cooldown: 0, duration: 120, effects: [{ type: 'slow', amount: 0.5, duration: 120 }] },
    trap_area: { id: 'trap_area', name: '広域罠', type: 'area', cost: 120, cooldown: 120, radius: 3, effects: [{ type: 'stun', duration: 45 }] }
  };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function number(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
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
      if (number(effect.duration, 1) <= 0) return '効果時間は1以上にしてください';
    }
    return '';
  }

  class Trap {
    constructor(definition, gx, gy) {
      this.definition = clone(definition);
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
        this.cooldown = number(this.definition.cooldown, 60);
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
    place(gx, gy, definition) {
      const error = validateDefinition(definition);
      if (error) return { ok: false, error };
      if (this.traps.some(trap => trap.gx === gx && trap.gy === gy)) return { ok: false, error: '同じマスには罠を重ねて設置できません' };
      const trap = new Trap(definition, gx, gy);
      this.traps.push(trap);
      return { ok: true, trap };
    }
    reset() { this.traps = []; this.projectiles = []; }
    targetsFor(trap) {
      const enemies = this.state.getEnemies();
      const tile = this.state.getTile();
      const c = center(trap, tile);
      const def = trap.definition;
      if (def.type === 'single') {
        return enemies.filter(e => distance(e, c) <= number(def.range, 4) * tile)
          .sort((a, b) => distance(a, c) - distance(b, c)).slice(0, 1);
      }
      if (def.type === 'area') return enemies.filter(e => distance(e, c) <= number(def.radius, 3) * tile);
      if (def.type === 'tile') {
        return enemies.filter(e => Math.floor(e.x / tile) === trap.gx && Math.floor(e.y / tile) === trap.gy);
      }
      const end = { x: c.x, y: c.y + number(def.range, 8) * tile };
      return enemies.filter(e => pointLineDistance(e, c, end) <= number(def.width, 1) * tile / 2 && distance(e, c) <= number(def.range, 8) * tile);
    }
    applyEffects(enemy, effects, source) {
      if (!enemy || enemy.hp <= 0) return;
      if (!enemy.statusEffects) enemy.statusEffects = [];
      const resistance = Math.max(0, Math.min(1, Number(enemy.trapResistance) || 0));
      effects.forEach(effect => {
        const copy = { ...effect, amount: number(effect.amount, 0) * (1 - resistance), remaining: Math.max(1, Math.floor(number(effect.duration, 60) * (1 - resistance))), timer: 0, source };
        const existing = enemy.statusEffects.find(x => x.type === effect.type);
        if (existing) Object.assign(existing, copy);
        else enemy.statusEffects.push(copy);
        this.state.spawnVisualEffect?.(effect.type, enemy.x, enemy.y, source);
        if (effect.type === 'knockback' || effect.type === 'pull') this.applyDisplacement(enemy, source, effect);
      });
    }
    applyDisplacement(enemy, source, effect) {
      const tile = this.state.getTile();
      const c = center(source, tile);
      let dx = enemy.x - c.x, dy = enemy.y - c.y;
      if (effect.type === 'pull') { dx = -dx; dy = -dy; }
      const len = Math.hypot(dx, dy) || 1;
      const amount = number(effect.amount, 1) * tile;
      enemy.x += dx / len * amount;
      enemy.y += dy / len * amount;
      enemy.x = Math.max(2, Math.min(this.state.getCanvasWidth() - 2, enemy.x));
      enemy.y = Math.max(tile + 2, Math.min(this.state.getCanvasHeight() - 2, enemy.y));
    }
    updateEnemy(enemy) {
      const effects = enemy.statusEffects || [];
      enemy.trapSpeedMultiplier = 1;
      enemy.trapFrozen = false;
      enemy.trapStunned = false;
      enemy.trapArmor = 0;
      for (const effect of effects) {
        effect.remaining--;
        if (effect.type === 'slow') enemy.trapSpeedMultiplier *= Math.max(0.05, number(effect.amount, 0.5));
        if (effect.type === 'freeze') enemy.trapFrozen = true;
        if (effect.type === 'stun') enemy.trapStunned = true;
        if (effect.type === 'armor_down') enemy.trapArmor += number(effect.amount, 0);
        if (['poison', 'burn'].includes(effect.type) && ++effect.timer >= number(effect.interval, 30)) {
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
        const drawn = this.state.drawSprite?.('trap', x + tile / 2, y + tile / 2, { definition: def });
        if (!drawn) {
          ctx.fillStyle = def.type === 'single' ? '#e6b84f' : def.type === 'line' ? '#e87555' : def.type === 'tile' ? '#6d75d9' : '#be76dc';
          ctx.fillRect(x + 3, y + 3, tile - 6, tile - 6);
        }
        ctx.restore();
      });
    }
  }

  window.TRAP_EFFECT_TYPES = EFFECT_TYPES;
  window.TRAP_TYPE_RULES = TYPE_RULES;
  window.DEFAULT_TRAPS = DEFAULT_TRAPS;
  window.validateTrapDefinition = validateDefinition;
  window.TrapEngine = TrapEngine;
})();
