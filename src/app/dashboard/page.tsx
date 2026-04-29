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
import { calculateRiskScores } from "@/lib/risk/scoring"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type DashboardRiskScore = {
  id: string
  productName: string
  productSku: string
  locationName: string
  riskType: string
  riskScore: number
  severity: string
  daysOfCover: number | null
  explanation: string
  scoreDate: string
}

type RiskScoreDashboardData = {
  latestScoreDate: string | null
  latestScores: DashboardRiskScore[]
  stockoutCount: number
  overstockCount: number
}

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

async function getRiskScoreDashboardData(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<RiskScoreDashboardData> {
  const [
    { data: riskScores },
    { data: products },
    { data: locations },
  ] = await Promise.all([
    supabase
      .from("risk_scores")
      .select(
        "id, product_id, location_id, risk_type, risk_score, severity, days_of_cover, explanation, score_date"
      )
      .order("score_date", { ascending: false })
      .order("risk_score", { ascending: false }),
    supabase.from("products").select("id, sku, name"),
    supabase.from("locations").select("id, name"),
  ])

  if (!riskScores?.length) {
    return {
      latestScoreDate: null,
      latestScores: [],
      stockoutCount: 0,
      overstockCount: 0,
    }
  }

  const latestScoreDate = riskScores[0].score_date
  const productsById = new Map(
    products?.map((product) => [product.id, product]) ?? []
  )
  const locationsById = new Map(
    locations?.map((location) => [location.id, location]) ?? []
  )
  const latestScores = riskScores
    .filter((riskScore) => riskScore.score_date === latestScoreDate)
    .map((riskScore) => {
      const product = productsById.get(riskScore.product_id)
      const location = locationsById.get(riskScore.location_id)

      return {
        id: riskScore.id,
        productName: product?.name ?? "Unknown product",
        productSku: product?.sku ?? "Unknown SKU",
        locationName: location?.name ?? "Unknown location",
        riskType: riskScore.risk_type,
        riskScore: Number(riskScore.risk_score),
        severity: riskScore.severity,
        daysOfCover:
          riskScore.days_of_cover === null
            ? null
            : Number(riskScore.days_of_cover),
        explanation: riskScore.explanation,
        scoreDate: riskScore.score_date,
      }
    })

  return {
    latestScoreDate,
    latestScores,
    stockoutCount: latestScores.filter((score) => score.riskType === "stockout")
      .length,
    overstockCount: latestScores.filter((score) => score.riskType === "overstock")
      .length,
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

async function calculateRiskScoresForUser() {
  "use server"

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [
    { data: products },
    { data: inventorySnapshots },
    { data: demandHistory },
  ] = await Promise.all([
    supabase.from("products").select("id, lead_time_days"),
    supabase
      .from("inventory_snapshots")
      .select(
        "product_id, location_id, snapshot_date, on_hand_qty, on_order_qty, reserved_qty, safety_stock_qty"
      ),
    supabase
      .from("demand_history")
      .select("product_id, location_id, demand_date, demand_qty"),
  ])

  if (!products?.length || !inventorySnapshots?.length || !demandHistory?.length) {
    redirect(
      "/dashboard?error=Import products, inventory snapshots, and demand history before calculating risk scores."
    )
  }

  const leadTimeDaysByProductId = new Map(
    products.map((product) => [product.id, product.lead_time_days])
  )
  const latestInventoryByProductLocation = new Map<
    string,
    (typeof inventorySnapshots)[number]
  >()

  inventorySnapshots.forEach((snapshot) => {
    const key = `${snapshot.product_id}:${snapshot.location_id}`
    const existingSnapshot = latestInventoryByProductLocation.get(key)

    if (
      !existingSnapshot ||
      snapshot.snapshot_date > existingSnapshot.snapshot_date
    ) {
      latestInventoryByProductLocation.set(key, snapshot)
    }
  })

  const demandByProductLocation = new Map<string, number[]>()

  demandHistory.forEach((demandRow) => {
    const key = `${demandRow.product_id}:${demandRow.location_id}`
    const existingDemand = demandByProductLocation.get(key) ?? []

    existingDemand.push(demandRow.demand_qty)
    demandByProductLocation.set(key, existingDemand)
  })

  const scoreDate = new Date().toISOString().slice(0, 10)
  const riskScores = Array.from(latestInventoryByProductLocation.values())
    .flatMap((snapshot) =>
      calculateRiskScores({
        productId: snapshot.product_id,
        locationId: snapshot.location_id,
        scoreDate,
        onHandQty: snapshot.on_hand_qty,
        onOrderQty: snapshot.on_order_qty,
        reservedQty: snapshot.reserved_qty,
        safetyStockQty: snapshot.safety_stock_qty,
        leadTimeDays: leadTimeDaysByProductId.get(snapshot.product_id) ?? null,
        recentDemandQty:
          demandByProductLocation.get(
            `${snapshot.product_id}:${snapshot.location_id}`
          ) ?? [],
      })
    )
    .map((score) => ({
      user_id: user.id,
      product_id: score.productId,
      location_id: score.locationId,
      score_date: score.scoreDate,
      risk_type: score.riskType,
      risk_score: score.riskScore,
      severity: score.severity,
      days_of_cover: score.daysOfCover,
      explanation: score.explanation,
      inputs_summary: score.inputsSummary,
    }))

  if (riskScores.length === 0) {
    redirect("/dashboard?error=No inventory rows were available for risk scoring.")
  }

  const { error } = await supabase.from("risk_scores").upsert(riskScores, {
    onConflict: "user_id,product_id,location_id,score_date,risk_type",
  })

  if (error) {
    redirect(
      `/dashboard?error=${encodeURIComponent("Risk scores could not be calculated.")}`
    )
  }

  redirect(
    `/dashboard?message=${encodeURIComponent(
      `Calculated ${riskScores.length} risk scores.`
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
  const allImportsComplete = Object.values(importProgress).every(Boolean)
  const riskScoreData = await getRiskScoreDashboardData(supabase)
  const highestRiskScores = riskScoreData.latestScores.slice(0, 8)

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
              {riskScoreData.latestScoreDate ? (
                <div>
                  <p className="text-3xl font-semibold">
                    {riskScoreData.stockoutCount}
                  </p>
                  <p className="text-sm text-slate-400">
                    Latest stockout scores calculated.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  Locations likely to run out before the next replenishment cycle.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900 text-slate-100">
            <CardHeader>
              <CardTitle className="text-base">Overstock Risk</CardTitle>
            </CardHeader>
            <CardContent>
              {riskScoreData.latestScoreDate ? (
                <div>
                  <p className="text-3xl font-semibold">
                    {riskScoreData.overstockCount}
                  </p>
                  <p className="text-sm text-slate-400">
                    Latest overstock scores calculated.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  Locations holding more inventory than expected demand supports.
                </p>
              )}
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

        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardTitle>Risk scoring</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-400">
              Calculate stockout and overstock risk scores from the imported
              inventory and demand data.
            </p>

            <form action={calculateRiskScoresForUser}>
              <Button
                type="submit"
                disabled={!allImportsComplete}
                className="w-full sm:w-auto"
              >
                Calculate risk scores
              </Button>
            </form>

            {!allImportsComplete ? (
              <p className="text-sm text-amber-300">
                Complete all CSV imports before calculating risk scores.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardTitle>Latest risk scores</CardTitle>
          </CardHeader>
          <CardContent>
            {highestRiskScores.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">
                  Showing latest scores from {riskScoreData.latestScoreDate}.
                </p>

                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">Product</TableHead>
                      <TableHead className="text-slate-400">Location</TableHead>
                      <TableHead className="text-slate-400">Risk</TableHead>
                      <TableHead className="text-slate-400">Score</TableHead>
                      <TableHead className="text-slate-400">Severity</TableHead>
                      <TableHead className="text-slate-400">Days cover</TableHead>
                      <TableHead className="text-slate-400">Explanation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {highestRiskScores.map((score) => (
                      <TableRow
                        key={score.id}
                        className="border-slate-800 hover:bg-slate-950"
                      >
                        <TableCell>
                          <div>
                            <p className="text-slate-100">{score.productName}</p>
                            <p className="text-xs text-slate-500">
                              {score.productSku}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {score.locationName}
                        </TableCell>
                        <TableCell className="capitalize text-slate-300">
                          {score.riskType}
                        </TableCell>
                        <TableCell className="text-slate-100">
                          {score.riskScore}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {score.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {score.daysOfCover ?? "No demand"}
                        </TableCell>
                        <TableCell className="max-w-xs whitespace-normal text-slate-400">
                          {score.explanation}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                No risk scores have been calculated yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
