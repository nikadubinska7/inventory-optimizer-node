"use client"

import { useState } from "react"

import { analyzeCsvForImport, type CsvAnalysis } from "@/lib/csv/analyze"
import { type CsvImportType } from "@/lib/csv/column-mapping"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type CsvUploadPreviewProps = {
  importType: CsvImportType
  action?: (formData: FormData) => void | Promise<void>
}

export function CsvUploadPreview({ importType, action }: CsvUploadPreviewProps) {
  const [analysis, setAnalysis] = useState<CsvAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    setAnalysis(null)
    setError(null)

    if (!file) {
      return
    }

    const csvText = await file.text()
    const result = analyzeCsvForImport(importType, csvText)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setAnalysis(result.data)
  }

  return (
    <form action={action} className="mt-4 space-y-4">
      <Input
        id={`${importType}-csv`}
        name="csvFile"
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileChange}
        className="cursor-pointer border-slate-700 bg-slate-900 text-slate-100 file:cursor-pointer file:text-slate-100"
      />

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {analysis ? (
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-3">
          <div className="flex flex-col gap-1 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
            <p>{analysis.rowCount} rows found</p>
            <p>
              {analysis.readyToImport
                ? "Required fields detected"
                : "Missing required fields"}
            </p>
          </div>

          <div className="space-y-2">
            {analysis.mappings.map((mapping) => (
              <div
                key={mapping.csvHeader}
                className="flex flex-col gap-1 rounded-md border border-slate-800 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-slate-100">{mapping.csvHeader}</span>
                <span
                  className={
                    mapping.matchedLabel ? "text-emerald-300" : "text-amber-300"
                  }
                >
                  {mapping.matchedLabel
                    ? `Maps to ${mapping.matchedLabel}`
                    : "Needs manual mapping"}
                </span>
              </div>
            ))}
          </div>

          {analysis.missingRequiredFields.length > 0 ? (
            <div className="text-sm text-amber-300">
              Missing:{" "}
              {analysis.missingRequiredFields
                .map((field) => field.label)
                .join(", ")}
            </div>
          ) : null}

          {action ? (
            <Button
              type="submit"
              disabled={!analysis.readyToImport}
              className="w-full"
            >
              Import {analysis.importType.replaceAll("_", " ")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </form>
  )
}
