// 打地鼠核心逻辑（纯逻辑，不依赖任何 @system.*，可在 Node 里直接测试）。
// 时间全部用调用方传入的毫秒时间戳，随机数可注入，方便做确定性测试。
//
// 规则（与 README 一致）：
// - 单局默认 30 秒，可传 durationMs = 15000（现场改动）；
// - 3×3 棋盘，同时最多 2 只地鼠，同一格不连续刷新，金鼠概率 18%；
// - 命中得分 = (10 + 2 × min(连击-1, 5)) × (金鼠 ? 3 : 1)，单次最高 20 / 60；
// - 漏打（存活到期）只清空连击，不扣分；
// - 空点不扣分、不清连击（只统计 misses）；
// - 暂停冻结倒计时，恢复不补时，暂停期间不刷新。

export const BOARD = { cols: 3, rows: 3, size: 9 }

export const RULES = {
  DURATION_MS: 30000,
  MAX_ACTIVE: 2,
  BASE_POINTS: 10,
  COMBO_STEP: 2,
  COMBO_CAP: 5,
  GOLDEN_RATE: 0.16,
  GOLDEN_MULTIPLIER: 3,
  // 炸弹鼠：打了要扣分并断连击，逼玩家“看清再点”，而不是无脑轮流点格子。
  BOMB_RATE: 0.16,
  BOMB_PENALTY: 12,
  // 加时鼠：稀有，打中 +2 秒并 +5 分，最后几秒的救命稻草。
  CLOCK_RATE: 0.06,
  CLOCK_BONUS_MS: 2000,
  CLOCK_POINTS: 5,
  // 狂暴段：最后 10 秒同时最多 3 只，节奏明显加快。
  RAGE_LAST_MS: 10000,
  MAX_ACTIVE_RAGE: 3,
  // 连击窗口：两次命中间隔 ≤ 2s 就继续累积。漏打不再瞬间清空连击，
  // 否则同时有 2 只地鼠时连击几乎不可达（手环上尤其不公平）。
  COMBO_WINDOW_MS: 2000,
  FIRST_SPAWN_MS: 600,
  SPAWN_MIN_MS: 480,
  SPAWN_MAX_MS: 900,
  LIFE_MIN_MS: 700,
  LIFE_MAX_MS: 1150
}

// 难度曲线：0s → 900ms 刷新 / 1150ms 存活；结束前 → 480ms / 700ms。
// 线性递减，测试里断言单调。
export function spawnIntervalMs(elapsedMs) {
  const duration = RULES.DURATION_MS
  const progress = clamp(elapsedMs / duration, 0, 1)
  return Math.round(RULES.SPAWN_MAX_MS - (RULES.SPAWN_MAX_MS - RULES.SPAWN_MIN_MS) * progress)
}

export function moleLifeMs(elapsedMs) {
  const duration = RULES.DURATION_MS
  const progress = clamp(elapsedMs / duration, 0, 1)
  return Math.round(RULES.LIFE_MAX_MS - (RULES.LIFE_MAX_MS - RULES.LIFE_MIN_MS) * progress)
}

// combo = 本次命中后的连击数（1 起步）。
export function pointsFor(combo, golden) {
  const safeCombo = Math.max(1, Math.floor(combo || 1))
  const bonus = RULES.COMBO_STEP * Math.min(safeCombo - 1, RULES.COMBO_CAP)
  const base = RULES.BASE_POINTS + bonus
  return golden ? base * RULES.GOLDEN_MULTIPLIER : base
}

function clamp(value, min, max) {
  if (!isFinite(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

function emptyCells() {
  const cells = []
  for (let i = 0; i < BOARD.size; i += 1) {
    cells.push({ mole: false, golden: false, kind: "mole", expireAt: 0 })
  }
  return cells
}

export function createGame(options) {
  const config = options || {}
  const durationMs = config.durationMs && config.durationMs > 0 ? config.durationMs : RULES.DURATION_MS
  const random = typeof config.random === "function" ? config.random : Math.random

  const engine = {
    phase: "idle",
    durationMs: durationMs,
    state: null,
    start: function (now) {
      const time = toNow(now)
      this.state = {
        startedAt: time,
        lastNow: time,
        timeLeftMs: durationMs,
        pausedAt: 0,
        score: 0,
        combo: 0,
        maxCombo: 0,
        lastHitAt: 0,
        hits: 0,
        misses: 0,
        goldenHits: 0,
        bombs: 0,
        clocks: 0,
        escaped: 0,
        spawned: 0,
        nextSpawnAt: time + RULES.FIRST_SPAWN_MS,
        lastSpawnIndex: -1,
        cells: emptyCells()
      }
      this.phase = "playing"
      return this.snapshot()
    },
    update: function (now) {
      const time = toNow(now)
      const state = this.state
      if (this.phase !== "playing" || !state) {
        return { ended: false, spawned: 0, escaped: 0, changed: false }
      }
      const delta = Math.max(0, time - state.lastNow)
      state.lastNow = time
      state.timeLeftMs -= delta
      if (state.timeLeftMs <= 0) {
        state.timeLeftMs = 0
        clearMoles(state)
        this.phase = "over"
        return { ended: true, spawned: 0, escaped: 0, changed: true }
      }

      let escaped = 0
      for (let i = 0; i < state.cells.length; i += 1) {
        const cell = state.cells[i]
        if (cell.mole && cell.expireAt > 0 && time >= cell.expireAt) {
          cell.mole = false
          cell.golden = false
          cell.expireAt = 0
          state.escaped += 1
          escaped += 1
        }
      }

      // 连击窗口衰减：2s 没命中就自然断连（不是被漏打打断）。
      if (state.combo > 0 && state.lastHitAt > 0 && time - state.lastHitAt > RULES.COMBO_WINDOW_MS) {
        state.combo = 0
      }

      let spawned = 0
      let guard = 0
      const maxActive = state.timeLeftMs <= RULES.RAGE_LAST_MS ? RULES.MAX_ACTIVE_RAGE : RULES.MAX_ACTIVE
      while (time >= state.nextSpawnAt && guard < 4) {
        const elapsed = durationMs - state.timeLeftMs
        if (countActive(state) < maxActive) {
          this.spawn(time, elapsed)
          spawned += 1
        }
        state.nextSpawnAt = time + spawnIntervalMs(elapsed)
        guard += 1
      }

      return {
        ended: false,
        spawned: spawned,
        escaped: escaped,
        changed: spawned > 0 || escaped > 0
      }
    },
    spawn: function (time, elapsed) {
      const state = this.state
      const candidates = []
      for (let i = 0; i < state.cells.length; i += 1) {
        const cell = state.cells[i]
        if (!cell.mole && i !== state.lastSpawnIndex) candidates.push(i)
      }
      if (!candidates.length) {
        // 极端情况下（棋盘被旧规则占满）允许与上次同格，保证游戏不卡死。
        for (let i = 0; i < state.cells.length; i += 1) {
          if (!state.cells[i].mole) candidates.push(i)
        }
      }
      if (!candidates.length) return -1
      const index = candidates[Math.floor(random() * candidates.length) % candidates.length]
      const kind = pickKind(random())
      const cell = state.cells[index]
      cell.mole = true
      cell.kind = kind
      cell.golden = kind === "golden"
      cell.expireAt = time + moleLifeMs(elapsed)
      state.lastSpawnIndex = index
      state.spawned += 1
      return index
    },
    hit: function (index, now) {
      const time = toNow(now)
      const state = this.state
      if (this.phase !== "playing" || !state) return { ok: false, points: 0, golden: false, combo: 0 }
      const cell = state.cells[index]
      if (!cell || !cell.mole) {
        state.misses += 1
        return { ok: false, points: 0, golden: false, combo: state.combo }
      }
      const kind = cell.kind || (cell.golden ? "golden" : "mole")

      // 炸弹鼠：扣分 + 断连击（分数不会为负）。
      if (kind === "bomb") {
        state.score = Math.max(0, state.score - RULES.BOMB_PENALTY)
        state.combo = 0
        state.bombs += 1
        cell.mole = false
        cell.kind = "mole"
        cell.golden = false
        cell.expireAt = 0
        return { ok: true, points: -RULES.BOMB_PENALTY, golden: false, kind: kind, combo: 0, now: time }
      }

      // 加时鼠：+2 秒（不超过本局总时长上限的 1.5 倍，避免无限续命）+5 分，连击照常累积。
      if (kind === "clock") {
        const cap = Math.round(durationMs * 1.5)
        state.timeLeftMs = Math.min(cap, state.timeLeftMs + RULES.CLOCK_BONUS_MS)
        state.clocks += 1
      }

      const withinWindow = state.lastHitAt > 0 && time - state.lastHitAt <= RULES.COMBO_WINDOW_MS
      state.combo = withinWindow ? state.combo + 1 : 1
      state.lastHitAt = time
      if (state.combo > state.maxCombo) state.maxCombo = state.combo
      const golden = kind === "golden"
      const points = kind === "clock" ? RULES.CLOCK_POINTS : pointsFor(state.combo, golden)
      state.score += points
      state.hits += 1
      if (golden) state.goldenHits += 1
      cell.mole = false
      cell.kind = "mole"
      cell.golden = false
      cell.expireAt = 0
      return { ok: true, points: points, golden: golden, kind: kind, combo: state.combo, now: time }
    },
    pause: function (now) {
      const time = toNow(now)
      if (this.phase !== "playing" || !this.state) return false
      this.state.pausedAt = time
      this.state.lastNow = time
      this.phase = "paused"
      return true
    },
    resume: function (now) {
      const time = toNow(now)
      if (this.phase !== "paused" || !this.state) return false
      const state = this.state
      const pauseDuration = Math.max(0, time - state.pausedAt)
      state.nextSpawnAt += pauseDuration
      if (state.lastHitAt > 0) state.lastHitAt += pauseDuration
      for (let i = 0; i < state.cells.length; i += 1) {
        if (state.cells[i].mole && state.cells[i].expireAt > 0) {
          state.cells[i].expireAt += pauseDuration
        }
      }
      state.lastNow = time
      state.pausedAt = 0
      this.phase = "playing"
      return true
    },
    stop: function () {
      if (this.state) clearMoles(this.state)
      this.phase = "stopped"
    },
    snapshot: function () {
      const state = this.state
      if (!state) {
        return {
          phase: this.phase,
          timeLeftMs: durationMs,
          score: 0,
          combo: 0,
          maxCombo: 0,
          hits: 0,
          misses: 0,
          goldenHits: 0,
          bombs: 0,
          clocks: 0,
          escaped: 0,
          cells: emptySnapshotCells()
        }
      }
      const cells = []
      for (let i = 0; i < state.cells.length; i += 1) {
        const cell = state.cells[i]
        cells.push({ mole: !!cell.mole, golden: !!cell.golden, kind: cell.kind || "mole" })
      }
      return {
        phase: this.phase,
        timeLeftMs: Math.max(0, Math.round(state.timeLeftMs)),
        score: state.score,
        combo: state.combo,
        maxCombo: state.maxCombo,
        hits: state.hits,
        misses: state.misses,
        goldenHits: state.goldenHits,
        bombs: state.bombs,
        clocks: state.clocks,
        escaped: state.escaped,
        cells: cells
      }
    }
  }

  engine.state = null
  return engine
}

// 目标种类：一次随机决定，概率互斥（clock + golden + bomb < 1，其余是普通鼠）。
export function pickKind(roll) {
  if (roll < RULES.CLOCK_RATE) return "clock"
  if (roll < RULES.CLOCK_RATE + RULES.GOLDEN_RATE) return "golden"
  if (roll < RULES.CLOCK_RATE + RULES.GOLDEN_RATE + RULES.BOMB_RATE) return "bomb"
  return "mole"
}

function countActive(state) {
  let count = 0
  for (let i = 0; i < state.cells.length; i += 1) {
    if (state.cells[i].mole) count += 1
  }
  return count
}

function clearMoles(state) {
  for (let i = 0; i < state.cells.length; i += 1) {
    state.cells[i].mole = false
    state.cells[i].golden = false
    state.cells[i].kind = "mole"
    state.cells[i].expireAt = 0
  }
}

function emptySnapshotCells() {
  const cells = []
  for (let i = 0; i < BOARD.size; i += 1) cells.push({ mole: false, golden: false, kind: "mole" })
  return cells
}

function toNow(now) {
  return typeof now === "number" && isFinite(now) ? now : Date.now()
}