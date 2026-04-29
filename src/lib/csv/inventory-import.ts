import { guessCsvColumnMappings } from "@/lib/csv/column-mapping"
import { parseCsvText } from "@/lib/csv/parser"

export type InventoryImportRow = {
  sku: string
  location_name: string
  snapshot_date: string
  on_hand_qty: number
  on_order_qty: number
  reserved_qty: number
  safety_stock_qty: number
  notes: string | null
}

export type InventoryImportParseResult =
  | {
      ok: true
      rows: InventoryImportRow[]
    }
  | {
      ok: false
      error: string
    }

export function parseInventoryCsvForImport(
  csvText: string
): InventoryImportParseResult {
  const parsedCsv = parseCsvText(csvText)

  if (!parsedCsv.ok) {
    return parsedCsv
  }

  const mappings = guessCsvColumnMappings(
    "inventory_snapshots",
    parsedCsv.data.headers
  )
  const fieldToColumnIndex = new Map<string, number>()

  mappings.forEach((mapping, index) => {
    if (mapping.matchedField && !fieldToColumnIndex.has(mapping.matchedField)) {
      fieldToColumnIndex.set(mapping.matchedField, index)
    }
  })

  const requiredFields = [
    "sku",
    "location_name",
    "snapshot_date",
    "on_hand_qty",
  ]

  if (requiredFields.some((field) => !fieldToColumnIndex.has(field))) {
    return {
      ok: false,
      error:
        "Inventory CSV must include SKU, location, snapshot date, and on hand quantity columns.",
    }
  }

  const rows = parsedCsv.data.rows.map((row) => ({
    sku: getRequiredText(row, fieldToColumnIndex, "sku"),
    location_name: getRequiredText(row, fieldToColumnIndex, "location_name"),
    snapshot_date: getDateText(row, fieldToColumnIndex, "snapshot_date"),
    on_hand_qty: getRequiredInteger(row, fieldToColumnIndex, "on_hand_qty"),
    on_order_qty: getOptionalInteger(row, fieldToColumnIndex, "on_order_qty") ?? 0,
    reserved_qty: getOptionalInteger(row, fieldToColumnIndex, "reserved_qty") ?? 0,
    safety_stock_qty:
      getOptionalInteger(row, fieldToColumnIndex, "safety_stock_qty") ?? 0,
    notes: getOptionalText(row, fieldToColumnIndex, "notes"),
  }))

  const invalidRowIndex = rows.findIndex(
    (row) =>
      !row.sku ||
      !row.location_name ||
      !row.snapshot_date ||
      row.on_hand_qty < 0 ||
      row.on_order_qty < 0 ||
      row.reserved_qty < 0 ||
      row.safety_stock_qty < 0
  )

  if (invalidRowIndex >= 0) {
    return {
      ok: false,
      error:
        `Row ${invalidRowIndex + 2} is missing required inventory data ` +
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
  return getOptionalInteger(row, fieldToColumnIndex, field) ?? -1
}

function getOptionalInteger(
  row: string[],
  fieldToColumnIndex: Map<string, number>,
  field: string
) {
  const value = getOptionalText(row, fieldToColumnIndex, field)

  if (!value) {
    return null
  }

  const parsedValue = Number(value)

  return Number.isInteger(parsedValue) ? parsedValue : null
}
