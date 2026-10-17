// 棋盘几何：唯一计算入口（9 个格子的 left/top/宽高都由这里算，页面不写死坐标）。
// 目的：格子尺寸/间距只改一处，模板用函数结果渲染，避免 flex 累积误差导致九宫格不对齐。
import { SIZE } from "./tokens.js"

export const BOARD_COLS = 3
export const BOARD_ROWS = 3

// 由内容宽与格距反推格子边长：3*cell + 2*gap = boardSize，保证两侧贴齐内容边界。
// 除数关系：3*cell + 2*gap 必须等于 boardSize（严格对齐，不留 1px 缝）。
// 令牌取值满足 (304 - 2*8)/3 = 96 为整数；若令牌改动导致除不尽，这里抛错让构建/测试失败。
export function cellSize(boardSize, gap) {
  const usable = boardSize - gap * (BOARD_COLS - 1)
  const cell = Math.floor(usable / BOARD_COLS)
  if (cell * BOARD_COLS !== usable) {
    throw new Error("棋盘无法整除对齐：board=" + boardSize + " gap=" + gap)
  }
  return cell
}

export function cellOffset(index, cell, gap) {
  const col = index % BOARD_COLS
  const row = Math.floor(index / BOARD_COLS)
  return { left: col * (cell + gap), top: row * (cell + gap) }
}

// 生成 9 个格子的定位样式字符串（Vela 内联 style 接受字符串）。
export function cellStyles(hitColor) {
  const gap = SIZE.cellGap
  const board = SIZE.content
  const cell = cellSize(board, gap)
  const styles = []
  for (let i = 0; i < BOARD_COLS * BOARD_ROWS; i += 1) {
    const pos = cellOffset(i, cell, gap)
    const base = "position:absolute;left:" + pos.left + "px;top:" + pos.top + "px;width:" + cell + "px;height:" + cell + "px;"
    styles.push({ base: base, cell: cell })
  }
  return { board: board, gap: gap, cell: cell, styles: styles }
}