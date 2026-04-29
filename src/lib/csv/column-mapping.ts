export type CsvImportType =
  | "products"
  | "locations"
  | "inventory_snapshots"
  | "demand_history"

export type CsvFieldDefinition = {
  field: string
  label: string
  required: boolean
  aliases: string[]
}

export type CsvColumnMapping = {
  csvHeader: string
  normalizedHeader: string
  matchedField: string | null
  matchedLabel: string | null
  confidence: "exact" | "alias" | "unmatched"
}

export const CSV_IMPORT_DEFINITIONS: Record<
  CsvImportType,
  CsvFieldDefinition[]
> = {
  products: [
    {
      field: "sku",
      label: "SKU",
      required: true,
      aliases: [
        "sku",
        "item_sku",
        "item code",
        "item_code",
        "product code",
        "product_code",
      ],
    },
    {
      field: "name",
      label: "Product name",
      required: true,
      aliases: [
        "name",
        "product name",
        "product_name",
        "item name",
        "item_name",
        "description",
      ],
    },
    {
      field: "category",
      label: "Category",
      required: false,
      aliases: ["category", "product category", "product_category", "department"],
    },
    {
      field: "unit_cost",
      label: "Unit cost",
      required: false,
      aliases: ["unit cost", "unit_cost", "cost", "item cost", "item_cost"],
    },
    {
      field: "price",
      label: "Price",
      required: false,
      aliases: ["price", "selling price", "selling_price", "retail price", "retail_price"],
    },
    {
      field: "lead_time_days",
      label: "Lead time days",
      required: false,
      aliases: ["lead time", "lead_time", "lead time days", "lead_time_days"],
    },
    {
      field: "case_pack",
      label: "Case pack",
      required: false,
      aliases: ["case pack", "case_pack", "pack size", "pack_size"],
    },
  ],
  locations: [
    {
      field: "name",
      label: "Location name",
      required: true,
      aliases: ["name", "location name", "location_name", "warehouse", "store", "site"],
    },
    {
      field: "location_type",
      label: "Location type",
      required: false,
      aliases: ["type", "location type", "location_type", "site type", "site_type"],
    },
    {
      field: "region",
      label: "Region",
      required: false,
      aliases: ["region", "area", "territory"],
    },
    {
      field: "city",
      label: "City",
      required: false,
      aliases: ["city", "town"],
    },
    {
      field: "is_active",
      label: "Active",
      required: false,
      aliases: ["active", "is_active", "enabled"],
    },
  ],
  inventory_snapshots: [
    {
      field: "sku",
      label: "SKU",
      required: true,
      aliases: [
        "sku",
        "item_sku",
        "item code",
        "item_code",
        "product code",
        "product_code",
      ],
    },
    {
      field: "location_name",
      label: "Location name",
      required: true,
      aliases: ["location", "location name", "location_name", "warehouse", "store", "site"],
    },
    {
      field: "snapshot_date",
      label: "Snapshot date",
      required: true,
      aliases: ["date", "snapshot date", "snapshot_date", "inventory date", "inventory_date"],
    },
    {
      field: "on_hand_qty",
      label: "On hand quantity",
      required: true,
      aliases: [
        "on hand",
        "on_hand",
        "on hand qty",
        "on_hand_qty",
        "inventory",
        "quantity",
        "qty",
      ],
    },
    {
      field: "on_order_qty",
      label: "On order quantity",
      required: false,
      aliases: ["on order", "on_order", "on order qty", "on_order_qty", "incoming"],
    },
    {
      field: "reserved_qty",
      label: "Reserved quantity",
      required: false,
      aliases: ["reserved", "reserved qty", "reserved_qty", "allocated"],
    },
    {
      field: "safety_stock_qty",
      label: "Safety stock quantity",
      required: false,
      aliases: ["safety stock", "safety_stock", "safety stock qty", "safety_stock_qty"],
    },
    {
      field: "notes",
      label: "Notes",
      required: false,
      aliases: ["notes", "note", "comments", "comment"],
    },
  ],
  demand_history: [
    {
      field: "sku",
      label: "SKU",
      required: true,
      aliases: [
        "sku",
        "item_sku",
        "item code",
        "item_code",
        "product code",
        "product_code",
      ],
    },
    {
      field: "location_name",
      label: "Location name",
      required: true,
      aliases: ["location", "location name", "location_name", "warehouse", "store", "site"],
    },
    {
      field: "demand_date",
      label: "Demand date",
      required: true,
      aliases: [
        "date",
        "demand date",
        "demand_date",
        "sales date",
        "sales_date",
        "forecast date",
        "forecast_date",
      ],
    },
    {
      field: "demand_qty",
      label: "Demand quantity",
      required: true,
      aliases: [
        "demand",
        "demand qty",
        "demand_qty",
        "sales",
        "units sold",
        "units_sold",
        "quantity",
        "qty",
        "forecast",
      ],
    },
    {
      field: "demand_type",
      label: "Demand type",
      required: false,
      aliases: ["demand type", "demand_type", "type"],
    },
    {
      field: "notes",
      label: "Notes",
      required: false,
      aliases: ["notes", "note", "comments", "comment"],
    },
  ],
}

export function normalizeCsvHeader(header: string) {
  return header.trim().toLowerCase().replace(/[-\s]+/g, "_")
}

export function getRequiredCsvFields(importType: CsvImportType) {
  return CSV_IMPORT_DEFINITIONS[importType].filter((field) => field.required)
}

export function guessCsvColumnMappings(
  importType: CsvImportType,
  headers: string[]
): CsvColumnMapping[] {
  const fields = CSV_IMPORT_DEFINITIONS[importType]
  const aliasLookup = new Map<string, CsvFieldDefinition>()

  fields.forEach((field) => {
    aliasLookup.set(normalizeCsvHeader(field.field), field)

    field.aliases.forEach((alias) => {
      aliasLookup.set(normalizeCsvHeader(alias), field)
    })
  })

  return headers.map((csvHeader) => {
    const normalizedHeader = normalizeCsvHeader(csvHeader)
    const matchedField = aliasLookup.get(normalizedHeader) ?? null

    return {
      csvHeader,
      normalizedHeader,
      matchedField: matchedField?.field ?? null,
      matchedLabel: matchedField?.label ?? null,
      confidence:
        matchedField?.field === normalizedHeader
          ? "exact"
          : matchedField
            ? "alias"
            : "unmatched",
    }
  })
}

export function getMissingRequiredFields(
  importType: CsvImportType,
  mappings: CsvColumnMapping[]
) {
  const mappedFields = new Set(
    mappings
      .map((mapping) => mapping.matchedField)
      .filter((field): field is string => Boolean(field))
  )

  return getRequiredCsvFields(importType).filter(
    (field) => !mappedFields.has(field.field)
  )
}
