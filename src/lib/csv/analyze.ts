import {
  type CsvColumnMapping,
  type CsvFieldDefinition,
  type CsvImportType,
  getMissingRequiredFields,
  guessCsvColumnMappings,
} from "@/lib/csv/column-mapping"
import { parseCsvText } from "@/lib/csv/parser"

export type CsvAnalysis = {
  importType: CsvImportType
  headers: string[]
  rowCount: number
  mappings: CsvColumnMapping[]
  missingRequiredFields: CsvFieldDefinition[]
  readyToImport: boolean
}

export type CsvAnalysisResult =
  | {
      ok: true
      data: CsvAnalysis
    }
  | {
      ok: false
      error: string
    }

export function analyzeCsvForImport(
  importType: CsvImportType,
  csvText: string
): CsvAnalysisResult {
  const parsedCsv = parseCsvText(csvText)

  if (!parsedCsv.ok) {
    return parsedCsv
  }

  const mappings = guessCsvColumnMappings(importType, parsedCsv.data.headers)
  const missingRequiredFields = getMissingRequiredFields(importType, mappings)

  return {
    ok: true,
    data: {
      importType,
      headers: parsedCsv.data.headers,
      rowCount: parsedCsv.data.rows.length,
      mappings,
      missingRequiredFields,
      readyToImport: missingRequiredFields.length === 0,
    },
  }
}
