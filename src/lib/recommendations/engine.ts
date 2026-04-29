export type RecommendationType =
  | "transfer"
  | "reorder_hold"
  | "markdown"
  | "service_level_tradeoff"

export type RecommendationPriority = "low" | "medium" | "high" | "critical"

export type RecommendationInput = {
  productId: string
  sourceLocationId: string | null
  destinationLocationId: string | null
  riskType: "stockout" | "overstock"
  riskScore: number
  severity: RecommendationPriority
  daysOfCover: number | null
  onHandQty: number
  onOrderQty: number
  reservedQty: number
  safetyStockQty: number
  averageDailyDemand: number
}

export type GeneratedRecommendation = {
  productId: string
  sourceLocationId: string | null
  destinationLocationId: string | null
  recommendationType: RecommendationType
  priority: RecommendationPriority
  quantity: number | null
  holdUntilDate: string | null
  markdownPercent: number | null
  daysToAct: number | null
  serviceLevelBefore: number | null
  serviceLevelAfter: number | null
  expectedImpact: string
  explanation: string
  auditLog: {
    ruleCode: string
    ruleName: string
    inputSnapshot: Record<string, number | string | null>
    calculationSummary: string
    resultSummary: string
  }
}

export function generateRecommendations(
  inputs: RecommendationInput[]
): GeneratedRecommendation[] {
  return [
    ...generateTransferRecommendations(inputs),
    ...generateReorderHoldRecommendations(inputs),
    ...generateMarkdownRecommendations(inputs),
    ...generateServiceLevelTradeoffRecommendations(inputs),
  ]
}

function generateTransferRecommendations(inputs: RecommendationInput[]) {
  const stockoutRisks = inputs.filter(
    (input) => input.riskType === "stockout" && input.riskScore >= 50
  )
  const overstockRisks = inputs.filter(
    (input) => input.riskType === "overstock" && input.riskScore >= 25
  )
  const recommendations: GeneratedRecommendation[] = []

  stockoutRisks.forEach((stockoutRisk) => {
    const matchingSurplus = overstockRisks.find(
      (overstockRisk) =>
        overstockRisk.productId === stockoutRisk.productId &&
        overstockRisk.sourceLocationId !== stockoutRisk.sourceLocationId
    )

    if (!matchingSurplus?.sourceLocationId || !stockoutRisk.sourceLocationId) {
      return
    }

    const shortageQty = estimateShortageQuantity(stockoutRisk)
    const surplusQty = estimateSurplusQuantity(matchingSurplus)
    const transferQty = toWholeNumber(Math.min(shortageQty, surplusQty))

    if (transferQty <= 0) {
      return
    }

    recommendations.push({
      productId: stockoutRisk.productId,
      sourceLocationId: matchingSurplus.sourceLocationId,
      destinationLocationId: stockoutRisk.sourceLocationId,
      recommendationType: "transfer",
      priority: stockoutRisk.severity,
      quantity: transferQty,
      holdUntilDate: null,
      markdownPercent: null,
      daysToAct: getDaysToAct(stockoutRisk.severity),
      serviceLevelBefore: null,
      serviceLevelAfter: null,
      expectedImpact: `Move ${transferQty} units from a surplus location to a shortage location.`,
      explanation:
        "Transfer recommendation created because one location has stockout risk while another location has overstock risk for the same product.",
      auditLog: {
        ruleCode: "TRANSFER_001",
        ruleName: "Rebalance stockout with surplus inventory",
        inputSnapshot: getAuditInputSnapshot(stockoutRisk, matchingSurplus),
        calculationSummary:
          `Shortage estimate ${shortageQty}; surplus estimate ${surplusQty}; transfer quantity ${transferQty}.`,
        resultSummary: `Recommend transferring ${transferQty} units.`,
      },
    })
  })

  return recommendations
}

function generateReorderHoldRecommendations(inputs: RecommendationInput[]) {
  return inputs
    .filter((input) => input.riskType === "overstock" && input.riskScore >= 50)
    .map((input) => ({
      productId: input.productId,
      sourceLocationId: input.sourceLocationId,
      destinationLocationId: null,
      recommendationType: "reorder_hold" as const,
      priority: input.severity,
      quantity: null,
      holdUntilDate: getFutureDate(14),
      markdownPercent: null,
      daysToAct: 3,
      serviceLevelBefore: null,
      serviceLevelAfter: null,
      expectedImpact:
        "Avoid adding more inventory while current stock already exceeds the MVP overstock threshold.",
      explanation:
        "Reorder hold recommendation created because overstock risk is high enough that new replenishment should be paused temporarily.",
      auditLog: {
        ruleCode: "REORDER_HOLD_001",
        ruleName: "Pause replenishment for high overstock risk",
        inputSnapshot: getAuditInputSnapshot(input),
        calculationSummary:
          `Overstock risk score ${input.riskScore} with ${formatDaysOfCover(input.daysOfCover)} days of cover.`,
        resultSummary: "Recommend holding reorders for 14 days.",
      },
    }))
}

function generateMarkdownRecommendations(inputs: RecommendationInput[]) {
  return inputs
    .filter(
      (input) =>
        input.riskType === "overstock" &&
        input.riskScore >= 25 &&
        (input.daysOfCover === null || input.daysOfCover >= 60)
    )
    .map((input) => ({
      productId: input.productId,
      sourceLocationId: input.sourceLocationId,
      destinationLocationId: null,
      recommendationType: "markdown" as const,
      priority: input.severity,
      quantity: estimateSurplusQuantity(input),
      holdUntilDate: null,
      markdownPercent: input.riskScore >= 50 ? 15 : 10,
      daysToAct: 7,
      serviceLevelBefore: null,
      serviceLevelAfter: null,
      expectedImpact:
        "Reduce excess inventory by increasing sell-through at the affected location.",
      explanation:
        "Markdown timing recommendation created because inventory coverage is above the MVP overstock target.",
      auditLog: {
        ruleCode: "MARKDOWN_001",
        ruleName: "Recommend markdown for excess coverage",
        inputSnapshot: getAuditInputSnapshot(input),
        calculationSummary:
          `Overstock risk score ${input.riskScore}; days of cover ${formatDaysOfCover(input.daysOfCover)}.`,
        resultSummary: "Recommend a short-term markdown action.",
      },
    }))
}

function generateServiceLevelTradeoffRecommendations(
  inputs: RecommendationInput[]
) {
  return inputs
    .filter((input) => input.riskType === "stockout" && input.riskScore >= 50)
    .map((input) => ({
      productId: input.productId,
      sourceLocationId: input.sourceLocationId,
      destinationLocationId: null,
      recommendationType: "service_level_tradeoff" as const,
      priority: input.severity,
      quantity: null,
      holdUntilDate: null,
      markdownPercent: null,
      daysToAct: getDaysToAct(input.severity),
      serviceLevelBefore: clampPercent(100 - input.riskScore),
      serviceLevelAfter: clampPercent(100 - input.riskScore + 15),
      expectedImpact:
        "Surface the likely service-level tradeoff if no transfer or replenishment action is taken.",
      explanation:
        "Service-level tradeoff recommendation created because stockout risk is high and the planner may need to prioritize this product/location.",
      auditLog: {
        ruleCode: "SERVICE_LEVEL_001",
        ruleName: "Show service-level tradeoff for high stockout risk",
        inputSnapshot: getAuditInputSnapshot(input),
        calculationSummary:
          `Stockout risk score ${input.riskScore}; estimated current service level ${clampPercent(100 - input.riskScore)}%.`,
        resultSummary: "Recommend reviewing the service-level tradeoff.",
      },
    }))
}

function estimateShortageQuantity(input: RecommendationInput) {
  const targetQty = input.averageDailyDemand * 21 + input.safetyStockQty
  const availableQty = Math.max(input.onHandQty - input.reservedQty, 0)

  return toWholeNumber(targetQty - availableQty - input.onOrderQty)
}

function estimateSurplusQuantity(input: RecommendationInput) {
  const targetQty = input.averageDailyDemand * 60 + input.safetyStockQty
  const availableQty = Math.max(input.onHandQty - input.reservedQty, 0)

  return toWholeNumber(availableQty + input.onOrderQty - targetQty)
}

function getDaysToAct(severity: RecommendationPriority) {
  if (severity === "critical") {
    return 1
  }

  if (severity === "high") {
    return 3
  }

  return 7
}

function getFutureDate(daysFromToday: number) {
  const date = new Date()

  date.setDate(date.getDate() + toWholeNumber(daysFromToday))

  return date.toISOString().slice(0, 10)
}

function clampPercent(value: number) {
  return Math.min(Math.max(Math.round(value), 0), 100)
}

function toWholeNumber(value: number) {
  return Math.max(Math.ceil(value), 0)
}

function formatDaysOfCover(daysOfCover: number | null) {
  return daysOfCover === null ? "no demand" : String(toWholeNumber(daysOfCover))
}

function getAuditInputSnapshot(
  primaryInput: RecommendationInput,
  secondaryInput?: RecommendationInput
) {
  return {
    primary_risk_type: primaryInput.riskType,
    primary_risk_score: primaryInput.riskScore,
    primary_severity: primaryInput.severity,
    primary_days_of_cover: primaryInput.daysOfCover,
    primary_on_hand_qty: primaryInput.onHandQty,
    primary_on_order_qty: primaryInput.onOrderQty,
    primary_reserved_qty: primaryInput.reservedQty,
    primary_safety_stock_qty: primaryInput.safetyStockQty,
    primary_average_daily_demand: primaryInput.averageDailyDemand,
    secondary_risk_type: secondaryInput?.riskType ?? null,
    secondary_risk_score: secondaryInput?.riskScore ?? null,
    secondary_days_of_cover: secondaryInput?.daysOfCover ?? null,
  }
}
