import { type CsvImportType } from "@/lib/csv/column-mapping"

export type CsvImportStep = {
  importType: CsvImportType
  label: string
  description: string
}

export type CsvImportProgress = Record<CsvImportType, boolean>

export type CsvImportStepStatus = CsvImportStep & {
  completed: boolean
  enabled: boolean
  lockedReason: string | null
}

export const CSV_IMPORT_ORDER: CsvImportStep[] = [
  {
    importType: "products",
    label: "Products",
    description: "Upload the SKU/item list first.",
  },
  {
    importType: "locations",
    label: "Locations",
    description: "Upload warehouses, stores, or fulfillment nodes second.",
  },
  {
    importType: "inventory_snapshots",
    label: "Inventory snapshots",
    description: "Upload inventory by product, location, and date third.",
  },
  {
    importType: "demand_history",
    label: "Demand history",
    description: "Upload sales history or forecast demand last.",
  },
]

export function getCsvImportStepStatuses(
  progress: CsvImportProgress
): CsvImportStepStatus[] {
  return CSV_IMPORT_ORDER.map((step, index) => {
    const previousIncompleteStep = CSV_IMPORT_ORDER.slice(0, index).find(
      (previousStep) => !progress[previousStep.importType]
    )

    return {
      ...step,
      completed: progress[step.importType],
      enabled: !previousIncompleteStep,
      lockedReason: previousIncompleteStep
        ? `Upload ${previousIncompleteStep.label.toLowerCase()} first.`
        : null,
    }
  })
}
