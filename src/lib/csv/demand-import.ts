import { guessCsvColumnMappings } from "@/lib/csv/column-mapping"
import { parseCsvText } from "@/lib/csv/parser"

export type DemandImportRow = {
  sku: string
  location_name: string
  demand_date: string
  demand_qty: number
  demand_type: "historical" | "forecast"
  notes: string | null
}

export type DemandImportParseResult =
  | {
      ok: true
      rows: DemandImportRow[]
    }
  | {
      ok: false
      error: string
    }

export function parseDemandCsvForImport(csvText: string): DemandImportParseResult {
  const parsedCsv = parseCsvText(csvText)

  if (!parsedCsv.ok) {
    return parsedCsv
  }

  const mappings = guessCsvColumnMappings("demand_history", parsedCsv.data.headers)
  const fieldToColumnIndex = new Map<string, number>()

  mappings.forEach((mapping, index) => {
    if (mapping.matchedField && !fieldToColumnIndex.has(mapping.matchedField)) {
      fieldToColumnIndex.set(mapping.matchedField, index)
    }
  })

  const requiredFields = ["sku", "location_name", "demand_date", "demand_qty"]

  if (requiredFields.some((field) => !fieldToColumnIndex.has(field))) {
    return {
      ok: false,
      error:
        "Demand CSV must include SKU, location, demand date, and demand quantity columns.",
    }
  }

  const rows = parsedCsv.data.rows.map((row) => ({
    sku: getRequiredText(row, fieldToColumnIndex, "sku"),
    location_name: getRequiredText(row, fieldToColumnIndex, "location_name"),
    demand_date: getDateText(row, fieldToColumnIndex, "demand_date"),
    demand_qty: getRequiredInteger(row, fieldToColumnIndex, "demand_qty"),
    demand_type: getDemandType(row, fieldToColumnIndex),
    notes: getOptionalText(row, fieldToColumnIndex, "notes"),
  }))

  const invalidRowIndex = rows.findIndex(
    (row) =>
      !row.sku ||
      !row.location_name ||
      !row.demand_date ||
      row.demand_qty < 0
  )

  if (invalidRowIndex >= 0) {
    return {
      ok: false,
      error:
        `Row ${invalidRowIndex + 2} is missing required demand data ` +
        "or contains a negative quantity.",
    }
  }

  return {
    ok: true,
    rows,
  }
}

function getRequiredText(
  row: string[],
  fieldToColumnIndex: Map<string, number>,
  field: string
) {
  return row[fieldToColumnIndex.get(field) ?? -1]?.trim() ?? ""
}

function getOptionalText(
  row: string[],
  fieldToColumnIndex: Map<string, number>,
  field: string
) {
  const value = row[fieldToColumnIndex.get(field) ?? -1]?.trim()

  return value || null
}

function getDateText(
  row: string[],
  fieldToColumnIndex: Map<string, number>,
  field: string
) {
  const value = getRequiredText(row, fieldToColumnIndex, field)

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ""
}

function getRequiredInteger(
  row: string[],
  fieldToColumnIndex: Map<string, number>,
  field: string
) {
  const value = getOptionalText(row, fieldToColumnIndex, field)

  if (!value) {
    return -1
  }

  const parsedValue = Number(value)

  return Number.isInteger(parsedValue) ? parsedValue : -1
}

function getDemandType(
  row: string[],
  fieldToColumnIndex: Map<string, number>
): DemandImportRow["demand_type"] {
  const value = getOptionalText(row, fieldToColumnIndex, "demand_type")
    ?.toLowerCase()
    .trim()

  return value === "forecast" ? "forecast" : "historical"
}
