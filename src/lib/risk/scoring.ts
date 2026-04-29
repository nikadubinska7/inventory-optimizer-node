export type RiskType = "stockout" | "overstock"
export type RiskSeverity = "low" | "medium" | "high" | "critical"

export type RiskScoringInput = {
  productId: string
  locationId: string
  scoreDate: string
  onHandQty: number
  onOrderQty: number
  reservedQty: number
  safetyStockQty: number
  leadTimeDays: number | null
  recentDemandQty: number[]
}

export type CalculatedRiskScore = {
  productId: string
  locationId: string
  scoreDate: string
  riskType: RiskType
  riskScore: number
  severity: RiskSeverity
  daysOfCover: number | null
  explanation: string
  inputsSummary: Record<string, number | string | null>
}

const DEFAULT_LEAD_TIME_DAYS = 14
const REORDER_BUFFER_DAYS = 7
const MVP_OVERSTOCK_COVERAGE_TARGET_DAYS = 60

export function calculateRiskScores(
  input: RiskScoringInput
): CalculatedRiskScore[] {
  const averageDailyDemand = calculateAverage(input.recentDemandQty)
  const availableQty = Math.max(input.onHandQty - input.reservedQty, 0)
  const daysOfCover =
    averageDailyDemand > 0 ? roundToTwoDecimals(availableQty / averageDailyDemand) : null
  const leadTimeDays = input.leadTimeDays ?? DEFAULT_LEAD_TIME_DAYS

  return [
    calculateStockoutRisk(input, averageDailyDemand, availableQty, daysOfCover, leadTimeDays),
    calculateOverstockRisk(input, averageDailyDemand, availableQty, daysOfCover),
  ]
}

function calculateStockoutRisk(
  input: RiskScoringInput,
  averageDailyDemand: number,
  availableQty: number,
  daysOfCover: number | null,
  leadTimeDays: number
): CalculatedRiskScore {
  const reorderWindowDays = leadTimeDays + REORDER_BUFFER_DAYS
  const demandDuringReorderWindow = averageDailyDemand * reorderWindowDays
  const projectedShortageQty = Math.max(
    demandDuringReorderWindow + input.safetyStockQty - availableQty - input.onOrderQty,
    0
  )
  const riskScore =
    averageDailyDemand === 0
      ? 0
      : clampScore((projectedShortageQty / Math.max(demandDuringReorderWindow, 1)) * 100)

  return {
    productId: input.productId,
    locationId: input.locationId,
    scoreDate: input.scoreDate,
    riskType: "stockout",
    riskScore,
    severity: getSeverity(riskScore),
    daysOfCover,
    explanation:
      riskScore === 0
        ? "Stockout risk is low because available and incoming inventory covers expected near-term demand."
        : `Stockout risk uses the MVP reorder rule: ${daysOfCover ?? 0} days of cover versus a ${reorderWindowDays}-day reorder window.`,
    inputsSummary: {
      available_qty: availableQty,
      on_order_qty: input.onOrderQty,
      safety_stock_qty: input.safetyStockQty,
      average_daily_demand: averageDailyDemand,
      lead_time_days: leadTimeDays,
      reorder_buffer_days: REORDER_BUFFER_DAYS,
      reorder_window_days: reorderWindowDays,
      projected_shortage_qty: roundToTwoDecimals(projectedShortageQty),
    },
  }
}

function calculateOverstockRisk(
  input: RiskScoringInput,
  averageDailyDemand: number,
  availableQty: number,
  daysOfCover: number | null
): CalculatedRiskScore {
  const targetInventoryQty =
    averageDailyDemand > 0
      ? averageDailyDemand * MVP_OVERSTOCK_COVERAGE_TARGET_DAYS +
        input.safetyStockQty
      : input.safetyStockQty
  const excessQty = Math.max(availableQty + input.onOrderQty - targetInventoryQty, 0)
  const riskScore =
    targetInventoryQty === 0
      ? clampScore(availableQty + input.onOrderQty > 0 ? 100 : 0)
      : clampScore((excessQty / Math.max(targetInventoryQty, 1)) * 100)

  return {
    productId: input.productId,
    locationId: input.locationId,
    scoreDate: input.scoreDate,
    riskType: "overstock",
    riskScore,
    severity: getSeverity(riskScore),
    daysOfCover,
    explanation:
      riskScore === 0
        ? "Overstock risk is low because inventory is within the MVP 60-day coverage target."
        : "Overstock risk uses the MVP overstock rule: inventory exceeds the 60-day coverage target.",
    inputsSummary: {
      available_qty: availableQty,
      on_order_qty: input.onOrderQty,
      safety_stock_qty: input.safetyStockQty,
      average_daily_demand: averageDailyDemand,
      overstock_coverage_target_days: MVP_OVERSTOCK_COVERAGE_TARGET_DAYS,
      target_inventory_qty: roundToTwoDecimals(targetInventoryQty),
      excess_qty: roundToTwoDecimals(excessQty),
    },
  }
}

function calculateAverage(values: number[]) {
  const cleanValues = values.filter((value) => Number.isFinite(value) && value >= 0)

  if (cleanValues.length === 0) {
    return 0
  }

  return roundToTwoDecimals(
    cleanValues.reduce((total, value) => total + value, 0) / cleanValues.length
  )
}

function clampScore(score: number) {
  return roundToTwoDecimals(Math.min(Math.max(score, 0), 100))
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100
}

function getSeverity(score: number): RiskSeverity {
  if (score >= 80) {
    return "critical"
  }

  if (score >= 50) {
    return "high"
  }

  if (score >= 25) {
    return "medium"
  }

  return "low"
}
