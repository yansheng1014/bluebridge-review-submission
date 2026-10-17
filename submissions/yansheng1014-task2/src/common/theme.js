// 全局主题系统：预设主题、持久化、样式令牌。
// 设计说明：
// - Vela 不支持 CSS 变量，也不支持后代选择器，因此主题色统一通过「内联样式绑定」注入；
// - 页面只需把 buildStyles() 返回的角色对象绑定到 style 上（style="{{t.text}}"），
//   颜色从令牌层取，布局仍由 theme.css / 页面 <style> 的 class 决定；
// - 存储结构带版本号 v，并保留未知字段，新增字段时旧数据可平滑升级。
import storage from "@system.storage"

export const THEME_STORAGE_KEY = "bb_theme_v1"
export const DEFAULT_THEME_ID = "midnight"

// 五套预设：midnight 为工程原色（默认），其余为可选主题。
export const THEMES = [
  {
    id: "midnight",
    name: "午夜黑金",
    note: "工程原色 · 黑底金字",
    tokens: {
      bg: "#000000",
      surface: "#171717",
      surfaceAlt: "#242424",
      surfaceSoft: "#191c1e",
      text: "#ffffff",
      sub: "#a0a0a0",
      muted: "#636366",
      accent: "#ffd400",
      onAccent: "#050505",
      border: "#555a5f",
      line: "#2b2b2b",
      key: "#1c1c1e",
      keyText: "#ffffff",
      tab: "#171717",
      success: "#30d158",
      danger: "#ff453a",
      warning: "#ffd400"
    }
  },
  {
    id: "amber",
    name: "琥珀暖金",
    note: "深棕底 · 琥珀金强调",
    tokens: {
      bg: "#120c04",
      surface: "#1d1408",
      surfaceAlt: "#2a1d0c",
      surfaceSoft: "#170f06",
      text: "#fff6e6",
      sub: "#c9a97a",
      muted: "#8a7250",
      accent: "#ffb020",
      onAccent: "#1a1000",
      border: "#4a3818",
      line: "#2a1d0c",
      key: "#1d1408",
      keyText: "#fff6e6",
      tab: "#1d1408",
      success: "#7bd88f",
      danger: "#ff6b5e",
      warning: "#ffd166"
    }
  },
  {
    id: "bronze",
    name: "青铜古金",
    note: "墨色底 · 青铜金强调",
    tokens: {
      bg: "#0e0e0c",
      surface: "#191913",
      surfaceAlt: "#24241b",
      surfaceSoft: "#131310",
      text: "#f5f1e3",
      sub: "#b3ab8f",
      muted: "#7a7461",
      accent: "#d4a94e",
      onAccent: "#12100a",
      border: "#3b382a",
      line: "#24241b",
      key: "#191913",
      keyText: "#f5f1e3",
      tab: "#191913",
      success: "#86c98f",
      danger: "#e07a6a",
      warning: "#e6c15a"
    }
  },
  {
    id: "champagne",
    name: "香槟暖金",
    note: "深褐底 · 香槟金强调",
    tokens: {
      bg: "#0f0c08",
      surface: "#1a140d",
      surfaceAlt: "#261c12",
      surfaceSoft: "#140f09",
      text: "#fdf5e8",
      sub: "#c8b49a",
      muted: "#8a7a66",
      accent: "#e8c07a",
      onAccent: "#1a1206",
      border: "#453424",
      line: "#261c12",
      key: "#1a140d",
      keyText: "#fdf5e8",
      tab: "#1a140d",
      success: "#8fd39a",
      danger: "#e58170",
      warning: "#e8c07a"
    }
  },
  {
    id: "sunset",
    name: "落日暖橙",
    note: "暖黑底 · 落日橙强调",
    tokens: {
      bg: "#16100c",
      surface: "#241a13",
      surfaceAlt: "#33241a",
      surfaceSoft: "#1c130e",
      text: "#fff4ea",
      sub: "#c3a189",
      muted: "#8a6f5c",
      accent: "#ff9e64",
      onAccent: "#1a0f08",
      border: "#4a3222",
      line: "#33241a",
      key: "#241a13",
      keyText: "#fff4ea",
      tab: "#241a13",
      success: "#7bd88f",
      danger: "#ff6b6b",
      warning: "#ffd166"
    }
  }
]

// 自定义强调色（主题页可选）；与每套主题的背景都有足够对比度。
export const ACCENT_SWATCHES = [
  "#ffd400",
  "#ffb020",
  "#e8c07a",
  "#d4a94e",
  "#ff9e64",
  "#f2b84b"
]

const DEFAULT_STATE = { v: 1, themeId: DEFAULT_THEME_ID, accent: "" }

// 首屏占位样式：storage 是异步的，先按默认主题渲染，读到存储后再覆盖，避免闪白。
export const DEFAULT_STYLES = buildStyles(DEFAULT_STATE)

let cachedState = null

export function hasTheme(themeId) {
  for (let i = 0; i < THEMES.length; i += 1) {
    if (THEMES[i].id === themeId) return true
  }
  return false
}

export function getTheme(themeId) {
  for (let i = 0; i < THEMES.length; i += 1) {
    if (THEMES[i].id === themeId) return THEMES[i]
  }
  return THEMES[0]
}

// 兼容旧数据 / 脏数据：只信任已知字段，未知字段原样保留（向后兼容的基础）。
export function normalizeState(raw) {
  const state = Object.assign({}, raw || {})
  if (!hasTheme(state.themeId)) state.themeId = DEFAULT_THEME_ID
  if (typeof state.accent !== "string" || !/^#[0-9a-fA-F]{6}$/.test(state.accent)) {
    state.accent = ""
  }
  state.v = 1
  return state
}

export function buildStyles(state) {
  const theme = getTheme(state.themeId)
  const tokens = Object.assign({}, theme.tokens)
  if (state.accent) tokens.accent = state.accent
  // 图标有两套（w 白描边 / d 深描边），浅色主题自动切到深色图标，避免“白底白图标”。
  const iconDir = luminance(tokens.bg) > 0.5 ? "/common/icons/d/" : "/common/icons/w/"
  return {
    id: theme.id,
    name: theme.name,
    note: theme.note,
    tokens: tokens,
    page: { backgroundColor: tokens.bg },
    topbar: { backgroundColor: tokens.bg },
    card: { backgroundColor: tokens.surface },
    cardAlt: { backgroundColor: tokens.surfaceAlt },
    soft: { backgroundColor: tokens.surfaceSoft },
    key: { backgroundColor: tokens.key },
    keyText: { color: tokens.keyText },
    tabBg: { backgroundColor: tokens.tab },
    text: { color: tokens.text },
    sub: { color: tokens.sub },
    muted: { color: tokens.muted },
    tile: { backgroundColor: tokens.surfaceSoft, borderColor: tokens.border },
    accent: { color: tokens.accent },
    accentBg: { backgroundColor: tokens.accent },
    accentBorder: { borderColor: tokens.accent },
    onAccent: { color: tokens.onAccent },
    border: { borderColor: tokens.border },
    line: { backgroundColor: tokens.line },
    success: { color: tokens.success },
    danger: { color: tokens.danger },
    warning: { color: tokens.warning },
    successBg: { backgroundColor: tokens.success },
    dangerBg: { backgroundColor: tokens.danger },
    fadeTop: "/common/fade-" + theme.id + "-top.png",
    fadeBottom: "/common/fade-" + theme.id + "-bottom.png",
    iconDir: iconDir,
    iconBack: iconDir + "arrow-left.png",
    iconChevron: iconDir + "chevron-right.png",
    iconInfo: iconDir + "info.png",
    iconSettings: iconDir + "settings.png",
    iconUser: iconDir + "user-round.png",
    iconGift: iconDir + "gift.png",
    iconTheme: iconDir + "palette.png",
    iconTasks: iconDir + "checklist.png",
    iconTrophy: iconDir + "trophy.png",
    iconStar: iconDir + "star.png",
    iconCheck: iconDir + "check.png",
    iconFlame: iconDir + "flame.png",
    iconCoins: iconDir + "coins.png",
    iconClock: iconDir + "clock.png"
  }
}

function parseStoredState(value) {
  if (!value) return normalizeState(null)
  try {
    return normalizeState(JSON.parse(value))
  } catch (e) {
    return normalizeState(null)
  }
}

// 强制从 storage 重读并刷新缓存（跨页同步的关键：主题在别的页面被修改后，
// 本页 onShow 必须再读一次，否则内存缓存会停留在旧主题）。
export function refreshTheme(callback) {
  storage.get({
    key: THEME_STORAGE_KEY,
    success: function (value) {
      cachedState = parseStoredState(value)
      callback(cachedState, buildStyles(cachedState))
    },
    fail: function () {
      callback(cachedState || normalizeState(null), buildStyles(cachedState || normalizeState(null)))
    }
  })
}

// 读取主题：有缓存先同步回调（首帧不闪），随后 refreshTheme 再校正一次。
export function readTheme(callback) {
  if (cachedState) {
    callback(cachedState, buildStyles(cachedState))
    return
  }
  refreshTheme(callback)
}

// 页面统一入口：把样式令牌写入 vm.t（页面 data 中需声明 t: {}）。
// 先按缓存/默认主题同步渲染，再从 storage 刷新 → 支持“在主题页切换后返回即变色”。
export function applyTheme(vm, callback) {
  if (cachedState) {
    const cachedStyles = buildStyles(cachedState)
    vm.t = cachedStyles
    if (callback) callback(cachedState, cachedStyles)
  }
  refreshTheme(function (state, styles) {
    vm.t = styles
    if (callback) callback(state, styles)
  })
}

// 写入主题（局部更新），成功后执行回调；storage 失败也先更新内存与 UI。
export function writeTheme(patch, callback) {
  readTheme(function (state) {
    const next = normalizeState(Object.assign({}, state, patch))
    cachedState = next
    const done = function () {
      if (callback) callback(next, buildStyles(next))
    }
    storage.set({
      key: THEME_STORAGE_KEY,
      value: JSON.stringify(next),
      success: done,
      fail: done
    })
  })
}

export function resetTheme(callback) {
  writeTheme({ themeId: DEFAULT_THEME_ID, accent: "" }, callback)
}

// 对比度计算（WCAG 2.1），用于主题页的“可读性”提示。
export function hexToRgb(hex) {
  let value = String(hex || "").replace("#", "")
  if (value.length === 3) {
    value = value[0] + value[0] + value[1] + value[1] + value[2] + value[2]
  }
  return {
    r: parseInt(value.slice(0, 2), 16) || 0,
    g: parseInt(value.slice(2, 4), 16) || 0,
    b: parseInt(value.slice(4, 6), 16) || 0
  }
}

function channelLuminance(channel) {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

export function luminance(hex) {
  const rgb = hexToRgb(hex)
  return 0.2126 * channelLuminance(rgb.r) + 0.7152 * channelLuminance(rgb.g) + 0.0722 * channelLuminance(rgb.b)
}

export function contrastRatio(foreground, background) {
  const a = luminance(foreground)
  const b = luminance(background)
  const high = Math.max(a, b)
  const low = Math.min(a, b)
  return (high + 0.05) / (low + 0.05)
}

export function contrastLabel(ratio) {
  if (ratio >= 7) return "优秀"
  if (ratio >= 4.5) return "良好"
  if (ratio >= 3) return "勉强"
  return "不足"
}