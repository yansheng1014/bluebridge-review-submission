// 招新评测基底工程的唯一数据源。
// 所有公司名称、行情、现金与持仓均为虚构演示数据，仅用于静态界面展示。
export const DEFAULT_CASH = 80000

export const ACCOUNT = {
  gameDay: 12,
  cash: DEFAULT_CASH
}

export const STOCKS = [
  {
    id: "STK_BLUE",
    symbol: "BLUE",
    name: "蓝桥科技",
    mark: "蓝",
    sectorName: "科技",
    avatarTone: "avatar-blue",
    price: 128,
    change: 3.2,
    history: [112, 116, 114, 120, 122, 125, 128],
    holding: { shares: 300, averageCost: 118 }
  },
  {
    id: "SH600519",
    symbol: "600519",
    name: "贵州茅坛",
    mark: "茅",
    sectorName: "消费",
    avatarTone: "avatar-gold",
    price: 1468,
    change: -1.4,
    history: [1490, 1475, 1482, 1460, 1472, 1465, 1468],
    holding: { shares: 20, averageCost: 1430 }
  },
  {
    id: "SZ300750",
    symbol: "300750",
    name: "宁德时达",
    mark: "宁",
    sectorName: "能源",
    avatarTone: "avatar-green",
    price: 242,
    change: 1.8,
    history: [230, 234, 233, 238, 240, 239, 242],
    holding: { shares: 100, averageCost: 236 }
  },
  {
    id: "SH601318",
    symbol: "601318",
    name: "中国平顺",
    mark: "平",
    sectorName: "金融",
    avatarTone: "avatar-red",
    price: 54,
    change: -0.6,
    history: [51, 52, 51, 53, 54, 53, 54],
    holding: { shares: 500, averageCost: 51 }
  },
  {
    id: "SH600036",
    symbol: "600036",
    name: "招商银号",
    mark: "招",
    sectorName: "金融",
    avatarTone: "avatar-blue",
    price: 41,
    change: 0.9,
    history: [39, 40, 39, 40, 41, 40, 41],
    holding: { shares: 200, averageCost: 40 }
  },
  {
    id: "SZ000333",
    symbol: "000333",
    name: "美好集团",
    mark: "美",
    sectorName: "家电",
    avatarTone: "avatar-gray",
    price: 77,
    change: 2.4,
    history: [71, 72, 74, 73, 75, 76, 77],
    holding: { shares: 0, averageCost: 0 }
  }
]

export function formatMoney(value) {
  const rounded = Math.round(value || 0)
  const sign = rounded < 0 ? "-" : ""
  const digits = String(Math.abs(rounded))
  return sign + "¥" + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

export function formatSignedMoney(value) {
  if (value > 0) return "+" + formatMoney(value)
  return formatMoney(value)
}

export function formatPercent(value) {
  const rounded = Math.round(value * 10) / 10
  return (rounded > 0 ? "+" : "") + rounded.toFixed(1) + "%"
}

export function trendClass(value) {
  if (value > 0) return "red"
  if (value < 0) return "green"
  return "neutral"
}

export function getStockById(stockId) {
  return STOCKS.find(function (stock) {
    return stock.id === stockId
  }) || null
}

export function heldStocks() {
  return STOCKS.filter(function (stock) {
    return stock.holding.shares > 0
  })
}

export function stockHoldingValue(stock) {
  return stock.price * stock.holding.shares
}

export function stockHoldingProfit(stock) {
  return (stock.price - stock.holding.averageCost) * stock.holding.shares
}

export function totalHoldingValue() {
  return STOCKS.reduce(function (total, stock) {
    return total + stockHoldingValue(stock)
  }, 0)
}

export function totalHoldingProfit() {
  return STOCKS.reduce(function (total, stock) {
    return total + stockHoldingProfit(stock)
  }, 0)
}

export function totalAssets() {
  return ACCOUNT.cash + totalHoldingValue()
}
