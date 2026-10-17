/*
 * 本文件由 scripts/gen-tokens.cjs 从 design/tokens.json 自动生成，请勿手改。
 * 修改设计令牌：改 design/tokens.json 后执行 npm run tokens。
 */
// 颜色角色（参考 Material 3 命名，取值针对 336×480 AMOLED 深色屏校准）。
export const COLORS = {
  "bg": "#2A55C4",
  "bgDeep": "#24499F",
  "surface": "#3F6FE0",
  "surfaceRaised": "#FFC93C",
  "surfaceSunken": "#1F3F99",
  "tile": "#FFE9A3",
  "ink": "#0B2350",
  "primary": "#FFD86B",
  "primaryContainer": "#FFF3CC",
  "onPrimary": "#0B2350",
  "onPrimaryContainer": "#0B2350",
  "secondary": "#FFE9A3",
  "secondaryContainer": "#7A4A00",
  "onSecondary": "#0B2350",
  "onSecondaryContainer": "#FFF3CC",
  "onSurface": "#FFFFFF",
  "onSurfaceVariant": "#EAF1FF",
  "outline": "#1F3F99",
  "outlineStrong": "#0B2350",
  "success": "#7CF5D2",
  "danger": "#FFD1DC",
  "gold": "#FFC93C",
  "goldDeep": "#B37A12",
  "mole": "#E08A3C",
  "moleDark": "#0B2350",
  "overlay": "rgba(11, 35, 80, 0.9)"
}

// 字号阶梯：每个角色锁定 fontSize / lineHeight / fontWeight。
export const TYPE = {
  "display": {
    "fontSize": 104,
    "lineHeight": 108,
    "fontWeight": "bold"
  },
  "numeric": {
    "fontSize": 78,
    "lineHeight": 82,
    "fontWeight": "bold"
  },
  "title": {
    "fontSize": 48,
    "lineHeight": 52,
    "fontWeight": "bold"
  },
  "headline": {
    "fontSize": 40,
    "lineHeight": 46,
    "fontWeight": "bold"
  },
  "body": {
    "fontSize": 34,
    "lineHeight": 40,
    "fontWeight": "normal"
  },
  "button": {
    "fontSize": 38,
    "lineHeight": 42,
    "fontWeight": "bold"
  },
  "label": {
    "fontSize": 34,
    "lineHeight": 40,
    "fontWeight": "normal"
  },
  "caption": {
    "fontSize": 30,
    "lineHeight": 34,
    "fontWeight": "normal"
  },
  "tag": {
    "fontSize": 32,
    "lineHeight": 36,
    "fontWeight": "bold"
  },
  "metric": {
    "fontSize": 56,
    "lineHeight": 60,
    "fontWeight": "bold"
  }
}

// 4px 基准间距阶。
export const SPACE = {
  "0": 0,
  "1": 4,
  "2": 8,
  "3": 12,
  "4": 16,
  "5": 24,
  "6": 32,
  "7": 48,
  "10": 10
}

export const RADIUS = {
  "sm": 8,
  "md": 16,
  "lg": 24,
  "xl": 28,
  "pill": 999
}

// 组件尺寸：页面不出现魔法数字。
export const SIZE = {
  "safeX": 12,
  "safeTop": 24,
  "safeBottom": 20,
  "touch": 56,
  "buttonHeight": 72,
  "buttonPrimaryHeight": 88,
  "buttonWidth": 296,
  "hudHeight": 94,
  "progressHeight": 8,
  "gridSize": 312,
  "cell": 98,
  "cellGap": 9,
  "cellRadius": 24,
  "mole": 72,
  "iconSm": 32,
  "iconMd": 40,
  "iconLg": 48,
  "iconXl": 56,
  "iconHero": 96,
  "artHero": 102,
  "screenWidth": 336,
  "screenHeight": 480,
  "content": 312
}

// 动效令牌：时长(ms) + 缓动。
export const MOTION = {
  "fast": 120,
  "base": 180,
  "slow": 240,
  "pop": 260,
  "easeOut": "ease-out",
  "easeInOut": "ease-in-out"
}

export const OPACITY = {
  "secondary": 0.72,
  "tertiary": 0.5,
  "disabled": 0.38
}

// 图标路径：全部由 design/art/*.svg 统一渲染（同线宽/同圆角）。
export const ICONS = {
  info: "/common/icons/info.png",
  pause: "/common/icons/pause.png",
  pauseDark: "/common/icons/pause-dark.png",
  arrowLeft: "/common/icons/arrow-left.png"
}

// 插画资源：同一套 SVG 渲染，路径固定。
export const ART = {
  "hero": "/common/art/hero.png",
  "mole": "/common/art/mole.png",
  "moleGold": "/common/art/mole-gold.png",
  "bomb": "/common/art/bomb.png",
  "clock": "/common/art/clock.png"
}

// 内联样式角色：动态状态（命中/金色/暂停）用这些角色，静态样式优先用 class。
export const STYLES = {
  page: {
    backgroundColor: COLORS.bg
  },
  surface: {
    backgroundColor: COLORS.surface
  },
  raised: {
    backgroundColor: COLORS.surfaceRaised
  },
  sunken: {
    backgroundColor: COLORS.surfaceSunken
  },
  text: {
    color: COLORS.onSurface
  },
  sub: {
    color: COLORS.onSurfaceVariant
  },
  primary: {
    color: COLORS.primary
  },
  secondary: {
    color: COLORS.secondary
  },
  secondaryBg: {
    backgroundColor: COLORS.secondary
  },
  onSecondary: {
    color: COLORS.onSecondary
  },
  secondaryContainer: {
    backgroundColor: COLORS.secondaryContainer
  },
  onSecondaryContainer: {
    color: COLORS.onSecondaryContainer
  },
  secondaryBorder: {
    borderColor: COLORS.secondary
  },
  gold: {
    color: COLORS.gold
  },
  success: {
    color: COLORS.success
  },
  danger: {
    color: COLORS.danger
  },
  primaryBg: {
    backgroundColor: COLORS.primary
  },
  onPrimary: {
    color: COLORS.onPrimary
  },
  primaryContainer: {
    backgroundColor: COLORS.primaryContainer
  },
  onPrimaryContainer: {
    color: COLORS.onPrimaryContainer
  },
  outline: {
    borderColor: COLORS.outline
  },
  outlineStrong: {
    borderColor: COLORS.outlineStrong
  },
  primaryBorder: {
    borderColor: COLORS.primary
  },
  overlay: {
    backgroundColor: COLORS.overlay
  }
}
