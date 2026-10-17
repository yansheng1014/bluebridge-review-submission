// 最高分持久化：单一数据源，页面只调这里。
// 存储结构：{"v":1,"best":120}；读取时保留未知字段，脏数据一律回落为 0。
import storage from "@system.storage"

export const BEST_KEY = "bb_mole_best_v1"

function toScore(value) {
  const number = typeof value === "number" ? value : parseInt(value, 10)
  if (!isFinite(number) || number < 0) return 0
  return Math.floor(number)
}

function parseRaw(value) {
  if (!value) return { v: 1, best: 0 }
  try {
    const raw = JSON.parse(value)
    if (!raw || typeof raw !== "object") return { v: 1, best: 0 }
    const next = Object.assign({}, raw)
    next.v = 1
    next.best = toScore(raw.best)
    return next
  } catch (error) {
    return { v: 1, best: 0 }
  }
}

export function readBest(callback) {
  const done = typeof callback === "function" ? callback : function () {}
  storage.get({
    key: BEST_KEY,
    default: "",
    success: function (value) {
      done(parseRaw(value).best)
    },
    fail: function () {
      done(0)
    }
  })
}

// 读取旧最高分，只有更高才写入；回调 { best, isRecord }。
export function submitScore(score, callback) {
  const done = typeof callback === "function" ? callback : function () {}
  const safeScore = toScore(score)
  storage.get({
    key: BEST_KEY,
    default: "",
    success: function (value) {
      const raw = parseRaw(value)
      const isRecord = safeScore > raw.best
      const next = Object.assign({}, raw, { v: 1, best: isRecord ? safeScore : raw.best })
      if (!isRecord) {
        done({ best: next.best, isRecord: false })
        return
      }
      storage.set({
        key: BEST_KEY,
        value: JSON.stringify(next),
        success: function () {
          done({ best: next.best, isRecord: true })
        },
        fail: function () {
          done({ best: next.best, isRecord: true })
        }
      })
    },
    fail: function () {
      const isRecord = safeScore > 0
      if (!isRecord) {
        done({ best: 0, isRecord: false })
        return
      }
      storage.set({
        key: BEST_KEY,
        value: JSON.stringify({ v: 1, best: safeScore }),
        success: function () {
          done({ best: safeScore, isRecord: true })
        },
        fail: function () {
          done({ best: safeScore, isRecord: true })
        }
      })
    }
  })
}
