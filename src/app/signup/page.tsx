import Link from "next/link"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

type SignupPageProps = {
  searchParams: Promise<{
    error?: string
  }>
}

async function signup(formData: FormData) {
  "use server"

  const email = String(formData.get("email") || "").trim()
  const password = String(formData.get("password") || "")

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  if (!data.session) {
    redirect(
      "/login?message=Account created. Check your email if confirmation is required, then log in."
    )
  }

  redirect("/dashboard")
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md items-center">
        <Card className="w-full border-slate-800 bg-slate-900 text-slate-100 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Create account</CardTitle>
            <CardDescription className="text-slate-400">
              Start your inventory optimization workspace.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {params.error ? (
              <Alert className="mb-6 border-red-900 bg-red-950 text-red-100">
                <AlertDescription>{params.error}</AlertDescription>
              </Alert>
            ) : null}

            <form action={signup} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="planner@example.com"
                  required
                  className="border-slate-700 bg-slate-950 text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  minLength={6}
                  required
                  className="border-slate-700 bg-slate-950 text-slate-100"
                />
              </div>

              <Button type="submit" className="w-full">
                Create account
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-400">
              Already have an account?{" "}
              <Link href="/login" className="text-slate-100 underline">
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}