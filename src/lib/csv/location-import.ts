import { guessCsvColumnMappings } from "@/lib/csv/column-mapping"
import { parseCsvText } from "@/lib/csv/parser"

export type LocationImportRow = {
  name: string
  location_type: "warehouse" | "store" | "fulfillment" | "other"
  region: string | null
  city: string | null
  is_active: boolean
}

export type LocationImportParseResult =
  | {
      ok: true
      rows: LocationImportRow[]
    }
  | {
      ok: false
      error: string
    }

export function parseLocationsCsvForImport(
  csvText: string
): LocationImportParseResult {
  const parsedCsv = parseCsvText(csvText)

  if (!parsedCsv.ok) {
    return parsedCsv
  }

  const mappings = guessCsvColumnMappings("locations", parsedCsv.data.headers)
  const fieldToColumnIndex = new Map<string, number>()

  mappings.forEach((mapping, index) => {
    if (mapping.matchedField && !fieldToColumnIndex.has(mapping.matchedField)) {
      fieldToColumnIndex.set(mapping.matchedField, index)
    }
  })

  if (!fieldToColumnIndex.has("name")) {
    return {
      ok: false,
      error: "Locations CSV must include a location name column.",
    }
  }

  const rows = parsedCsv.data.rows.map((row) => ({
    name: getRequiredText(row, fieldToColumnIndex, "name"),
    location_type: getLocationType(row, fieldToColumnIndex),
    region: getOptionalText(row, fieldToColumnIndex, "region"),
    city: getOptionalText(row, fieldToColumnIndex, "city"),
    is_active: getOptionalBoolean(row, fieldToColumnIndex, "is_active") ?? true,
  }))

  const invalidRowIndex = rows.findIndex((row) => !row.name)

  if (invalidRowIndex >= 0) {
    return {
      ok: false,
      error: `Row ${invalidRowIndex + 2} is missing location name.`,
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

function getLocationType(
  row: string[],
  fieldToColumnIndex: Map<string, number>
): LocationImportRow["location_type"] {
  const value = getOptionalText(row, fieldToColumnIndex, "location_type")
    ?.toLowerCase()
    .replaceAll(" ", "_")

  if (value === "warehouse" || value === "store" || value === "fulfillment") {
    return value
  }

  return "other"
}

function getOptionalBoolean(
  row: string[],
  fieldToColumnIndex: Map<string, number>,
  field: string
) {
  const value = getOptionalText(row, fieldToColumnIndex, field)?.toLowerCase()

  if (!value) {
    return null
  }

  if (["true", "yes", "y", "1", "active"].includes(value)) {
    return true
  }

  if (["false", "no", "n", "0", "inactive"].includes(value)) {
    return false
  }

  return null
}
