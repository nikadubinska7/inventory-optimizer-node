import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { parseDemandCsvForImport } from "@/lib/csv/demand-import"
import { parseInventoryCsvForImport } from "@/lib/csv/inventory-import"
import { parseLocationsCsvForImport } from "@/lib/csv/location-import"
import { parseProductsCsvForImport } from "@/lib/csv/product-import"
import {
  type CsvImportProgress,
  getCsvImportStepStatuses,
} from "@/lib/csv/import-order"
import { CsvUploadPreview } from "@/components/csv/csv-upload-preview"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

async function getCsvImportProgress(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<CsvImportProgress> {
  const [
    productsResult,
    locationsResult,
    inventorySnapshotsResult,
    demandHistoryResult,
  ] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("locations").select("id", { count: "exact", head: true }),
    supabase
      .from("inventory_snapshots")
      .select("id", { count: "exact", head: true }),
    supabase.from("demand_history").select("id", { count: "exact", head: true }),
  ])

  return {
    products: (productsResult.count ?? 0) > 0,
    locations: (locationsResult.count ?? 0) > 0,
    inventory_snapshots: (inventorySnapshotsResult.count ?? 0) > 0,
    demand_history: (demandHistoryResult.count ?? 0) > 0,
  }
}

async function importProductsCsv(formData: FormData) {
  "use server"

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const csvFile = formData.get("csvFile")

  if (!(csvFile instanceof File)) {
    redirect("/dashboard?error=Choose a products CSV file first.")
  }

  const csvText = await csvFile.text()
  const parsedProducts = parseProductsCsvForImport(csvText)

  if (!parsedProducts.ok) {
    redirect(`/dashboard?error=${encodeURIComponent(parsedProducts.error)}`)
  }

  const { error } = await supabase.from("products").upsert(
    parsedProducts.rows.map((row) => ({
      ...row,
      user_id: user.id,
    })),
    {
      onConflict: "user_id,sku",
    }
  )

  if (error) {
    redirect(
      `/dashboard?error=${encodeURIComponent("Products could not be imported.")}`
    )
  }

  redirect(
    `/dashboard?message=${encodeURIComponent(
      `Imported ${parsedProducts.rows.length} products.`
    )}`
  )
}

async function importLocationsCsv(formData: FormData) {
  "use server"

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const csvFile = formData.get("csvFile")

  if (!(csvFile instanceof File)) {
    redirect("/dashboard?error=Choose a locations CSV file first.")
  }

  const csvText = await csvFile.text()
  const parsedLocations = parseLocationsCsvForImport(csvText)

  if (!parsedLocations.ok) {
    redirect(`/dashboard?error=${encodeURIComponent(parsedLocations.error)}`)
  }

  const { error } = await supabase.from("locations").upsert(
    parsedLocations.rows.map((row) => ({
      ...row,
      user_id: user.id,
    })),
    {
      onConflict: "user_id,name",
    }
  )

  if (error) {
    redirect(
      `/dashboard?error=${encodeURIComponent("Locations could not be imported.")}`
    )
  }

  redirect(
    `/dashboard?message=${encodeURIComponent(
      `Imported ${parsedLocations.rows.length} locations.`
    )}`
  )
}

async function importInventoryCsv(formData: FormData) {
  "use server"

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const csvFile = formData.get("csvFile")

  if (!(csvFile instanceof File)) {
    redirect("/dashboard?error=Choose an inventory snapshots CSV file first.")
  }

  const csvText = await csvFile.text()
  const parsedInventory = parseInventoryCsvForImport(csvText)

  if (!parsedInventory.ok) {
    redirect(`/dashboard?error=${encodeURIComponent(parsedInventory.error)}`)
  }

  const [{ data: products }, { data: locations }] = await Promise.all([
    supabase.from("products").select("id, sku"),
    supabase.from("locations").select("id, name"),
  ])

  const productIdBySku = new Map(
    products?.map((product) => [product.sku.toLowerCase(), product.id]) ?? []
  )
  const locationIdByName = new Map(
    locations?.map((location) => [
      location.name.toLowerCase(),
      location.id,
    ]) ?? []
  )

  const missingProduct = parsedInventory.rows.find(
    (row) => !productIdBySku.has(row.sku.toLowerCase())
  )
  const missingLocation = parsedInventory.rows.find(
    (row) => !locationIdByName.has(row.location_name.toLowerCase())
  )

  if (missingProduct) {
    redirect(
      `/dashboard?error=${encodeURIComponent(
        `Product SKU not found: ${missingProduct.sku}. Import products first.`
      )}`
    )
  }

  if (missingLocation) {
    redirect(
      `/dashboard?error=${encodeURIComponent(
        `Location not found: ${missingLocation.location_name}. Import locations first.`
      )}`
    )
  }

  const { error } = await supabase.from("inventory_snapshots").upsert(
    parsedInventory.rows.map((row) => ({
      user_id: user.id,
      product_id: productIdBySku.get(row.sku.toLowerCase()),
      location_id: locationIdByName.get(row.location_name.toLowerCase()),
      snapshot_date: row.snapshot_date,
      on_hand_qty: row.on_hand_qty,
      on_order_qty: row.on_order_qty,
      reserved_qty: row.reserved_qty,
      safety_stock_qty: row.safety_stock_qty,
      source_type: "csv_import",
      notes: row.notes,
    })),
    {
      onConflict: "user_id,product_id,location_id,snapshot_date",
    }
  )

  if (error) {
    redirect(
      `/dashboard?error=${encodeURIComponent(
        "Inventory snapshots could not be imported."
      )}`
    )
  }

  redirect(
    `/dashboard?message=${encodeURIComponent(
      `Imported ${parsedInventory.rows.length} inventory snapshots.`
    )}`
  )
}

async function importDemandCsv(formData: FormData) {
  "use server"

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const csvFile = formData.get("csvFile")

  if (!(csvFile instanceof File)) {
    redirect("/dashboard?error=Choose a demand history CSV file first.")
  }

  const csvText = await csvFile.text()
  const parsedDemand = parseDemandCsvForImport(csvText)

  if (!parsedDemand.ok) {
    redirect(`/dashboard?error=${encodeURIComponent(parsedDemand.error)}`)
  }

  const [{ data: products }, { data: locations }] = await Promise.all([
    supabase.from("products").select("id, sku"),
    supabase.from("locations").select("id, name"),
  ])

  const productIdBySku = new Map(
    products?.map((product) => [product.sku.toLowerCase(), product.id]) ?? []
  )
  const locationIdByName = new Map(
    locations?.map((location) => [
      location.name.toLowerCase(),
      location.id,
    ]) ?? []
  )

  const missingProduct = parsedDemand.rows.find(
    (row) => !productIdBySku.has(row.sku.toLowerCase())
  )
  const missingLocation = parsedDemand.rows.find(
    (row) => !locationIdByName.has(row.location_name.toLowerCase())
  )

  if (missingProduct) {
    redirect(
      `/dashboard?error=${encodeURIComponent(
        `Product SKU not found: ${missingProduct.sku}. Import products first.`
      )}`
    )
  }

  if (missingLocation) {
    redirect(
      `/dashboard?error=${encodeURIComponent(
        `Location not found: ${missingLocation.location_name}. Import locations first.`
      )}`
    )
  }

  const { error } = await supabase.from("demand_history").upsert(
    parsedDemand.rows.map((row) => ({
      user_id: user.id,
      product_id: productIdBySku.get(row.sku.toLowerCase()),
      location_id: locationIdByName.get(row.location_name.toLowerCase()),
      demand_date: row.demand_date,
      demand_qty: row.demand_qty,
      demand_type: row.demand_type,
      source_type: "csv_import",
      notes: row.notes,
    })),
    {
      onConflict: "user_id,product_id,location_id,demand_date,demand_type",
    }
  )

  if (error) {
    redirect(
      `/dashboard?error=${encodeURIComponent(
        "Demand history could not be imported."
      )}`
    )
  }

  redirect(
    `/dashboard?message=${encodeURIComponent(
      `Imported ${parsedDemand.rows.length} demand history rows.`
    )}`
  )
}

async function logout() {
  "use server"

  const supabase = await createClient()

  await supabase.auth.signOut()

  redirect("/login?message=You have been logged out.")
}

type DashboardPageProps = {
  searchParams: Promise<{
    error?: string
    message?: string
  }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const importProgress = await getCsvImportProgress(supabase)
  const importStepStatuses = getCsvImportStepStatuses(importProgress)

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">
                Inventory Optimizer
              </h1>
              <Badge variant="secondary">MVP</Badge>
            </div>
            <p className="text-sm text-slate-400">
              Daily decision workspace for rebalancing inventory and detecting
              supply chain risk.
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
            <div>
              <p className="text-slate-400">Signed in as</p>
              <p className="font-medium text-slate-100">{user.email}</p>
            </div>

            <form action={logout}>
              <Button
                type="submit"
                variant="secondary"
                className="w-full"
              >
                Log out
              </Button>
            </form>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-800 bg-slate-900 text-slate-100">
            <CardHeader>
              <CardTitle className="text-base">Stockout Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">
                Locations likely to run out before the next replenishment cycle.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900 text-slate-100">
            <CardHeader>
              <CardTitle className="text-base">Overstock Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">
                Locations holding more inventory than expected demand supports.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900 text-slate-100">
            <CardHeader>
              <CardTitle className="text-base">Transfer Suggestions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">
                Recommended movements from surplus locations to shortage
                locations.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900 text-slate-100">
            <CardHeader>
              <CardTitle className="text-base">Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">
                Explainable reasoning behind each recommendation.
              </p>
            </CardContent>
          </Card>
        </section>

        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardTitle>CSV import order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {params.error ? (
              <Alert className="border-red-900 bg-red-950 text-red-100">
                <AlertDescription className="text-red-100">
                  {params.error}
                </AlertDescription>
              </Alert>
            ) : null}

            {params.message ? (
              <Alert className="border-emerald-900 bg-emerald-950 text-emerald-100">
                <AlertDescription className="text-emerald-100">
                  {params.message}
                </AlertDescription>
              </Alert>
            ) : null}

            <p className="text-sm text-slate-400">
              Upload source data in this order so later files can reference the
              products and locations already in the database.
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              {importStepStatuses.map((step, index) => (
                <div
                  key={step.importType}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase text-slate-500">
                        Step {index + 1}
                      </p>
                      <h2 className="text-base font-medium text-slate-100">
                        {step.label}
                      </h2>
                    </div>

                    <Badge
                      variant={step.completed ? "default" : "secondary"}
                      className={
                        step.enabled
                          ? ""
                          : "bg-slate-800 text-slate-400"
                      }
                    >
                      {step.completed
                        ? "Uploaded"
                        : step.enabled
                          ? "Ready"
                          : "Locked"}
                    </Badge>
                  </div>

                  <p className="text-sm text-slate-400">{step.description}</p>

                  {step.lockedReason ? (
                    <p className="mt-3 text-sm text-amber-300">
                      {step.lockedReason}
                    </p>
                  ) : null}

                  {step.enabled && !step.completed ? (
                    <CsvUploadPreview
                      importType={step.importType}
                      action={
                        step.importType === "products"
                          ? importProductsCsv
                          : step.importType === "locations"
                            ? importLocationsCsv
                            : step.importType === "inventory_snapshots"
                              ? importInventoryCsv
                              : step.importType === "demand_history"
                                ? importDemandCsv
                          : undefined
                      }
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
