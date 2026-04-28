import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const supabase = createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <main className="min-h-screen bg-slate-950 font-sans text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
            Inventory Optimizer
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Daily inventory risk detection for multi-location supply chains.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Upload inventory data, detect stockout and overstock risk, and
            generate explainable transfer, markdown, and reorder-hold
            recommendations.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-3xl font-bold text-cyan-300">1</p>
              <h2 className="mt-3 font-semibold">Upload CSV</h2>
              <p className="mt-2 text-sm text-slate-400">
                Import inventory snapshots by SKU and location.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-3xl font-bold text-cyan-300">2</p>
              <h2 className="mt-3 font-semibold">Score Risk</h2>
              <p className="mt-2 text-sm text-slate-400">
                Flag stockout, overstock, and service-level pressure.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-3xl font-bold text-cyan-300">3</p>
              <h2 className="mt-3 font-semibold">Act Daily</h2>
              <p className="mt-2 text-sm text-slate-400">
                Review explainable recommendations and export actions.
              </p>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-5">
            <p className="text-sm font-medium text-cyan-200">
              MVP status: Phase 1 bootstrap in progress.
            </p>

            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300">
              <p className="font-semibold text-white">
                Supabase connection check
              </p>

              <p className="mt-2">
                Client created:{" "}
                <span className="font-mono text-cyan-300">
                  {supabase ? "yes" : "no"}
                </span>
              </p>

              <p className="mt-2">
                Project URL loaded:{" "}
                <span className="font-mono text-cyan-300">
                  {supabaseUrl ? "yes" : "no"}
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}