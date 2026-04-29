import { guessCsvColumnMappings } from "@/lib/csv/column-mapping"
import { parseCsvText } from "@/lib/csv/parser"

export type ProductImportRow = {
  sku: string
  name: string
  category: string | null
  unit_cost: number | null
  price: number | null
  lead_time_days: number | null
  case_pack: number | null
}

export type ProductImportParseResult =
  | {
      ok: true
      rows: ProductImportRow[]
    }
  | {
      ok: false
      error: string
    }

export function parseProductsCsvForImport(
  csvText: string
): ProductImportParseResult {
  const parsedCsv = parseCsvText(csvText)

  if (!parsedCsv.ok) {
    return parsedCsv
  }

  const mappings = guessCsvColumnMappings("products", parsedCsv.data.headers)
  const fieldToColumnIndex = new Map<string, number>()

  mappings.forEach((mapping, index) => {
    if (mapping.matchedField && !fieldToColumnIndex.has(mapping.matchedField)) {
      fieldToColumnIndex.set(mapping.matchedField, index)
    }
  })

  if (!fieldToColumnIndex.has("sku") || !fieldToColumnIndex.has("name")) {
    return {
      ok: false,
      error: "Products CSV must include SKU and product name columns.",
    }
  }

  const rows = parsedCsv.data.rows.map((row) => ({
    sku: getRequiredText(row, fieldToColumnIndex, "sku"),
    name: getRequiredText(row, fieldToColumnIndex, "name"),
    category: getOptionalText(row, fieldToColumnIndex, "category"),
    unit_cost: getOptionalNumber(row, fieldToColumnIndex, "unit_cost"),
    price: getOptionalNumber(row, fieldToColumnIndex, "price"),
    lead_time_days: getOptionalInteger(row, fieldToColumnIndex, "lead_time_days"),
    case_pack: getOptionalInteger(row, fieldToColumnIndex, "case_pack"),
  }))

  const invalidRowIndex = rows.findIndex((row) => !row.sku || !row.name)

  if (invalidRowIndex >= 0) {
    return {
      ok: false,
      error: `Row ${invalidRowIndex + 2} is missing SKU or product name.`,
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

function getOptionalNumber(
  row: string[],
  fieldToColumnIndex: Map<string, number>,
  field: string
) {
  const value = getOptionalText(row, fieldToColumnIndex, field)

  if (!value) {
    return null
  }

  const parsedValue = Number(value)

  return Number.isFinite(parsedValue) ? parsedValue : null
}

function getOptionalInteger(
  row: string[],
  fieldToColumnIndex: Map<string, number>,
  field: string
) {
  const value = getOptionalNumber(row, fieldToColumnIndex, field)

  return value === null ? null : Math.trunc(value)
}
