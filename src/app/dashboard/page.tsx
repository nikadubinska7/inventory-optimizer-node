import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

async function logout() {
  "use server"

  const supabase = await createClient()

  await supabase.auth.signOut()

  redirect("/login?message=You have been logged out.")
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

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
            <CardTitle>Next MVP step</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">
              After authentication is complete, we will create the database
              schema for products, locations, inventory snapshots, demand data,
              risk scores, recommendations, and audit logs.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}