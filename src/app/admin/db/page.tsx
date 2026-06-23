"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Database, RefreshCw, Wrench } from "lucide-react";

interface Status {
  pages: number | string;
  categories: number | string;
  users: number | string;
  tags: number | string;
  timeline: number | string;
}

export default function AdminDbPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [info, setInfo] = useState<Status | null>(null);
  const [report, setReport] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [error, setError] = useState("");

  const role = (session?.user as { role?: string })?.role;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const check = async () => {
    setLoading(true); setError("");
    const res = await fetch("/api/admin/migrate");
    if (res.ok) setInfo(await res.json());
    else setError((await res.json()).error ?? "Erreur");
    setLoading(false);
  };

  const migrate = async () => {
    if (!confirm("Lancer la migration ? (sans danger : aucune donnée n'est supprimée)")) return;
    setMigrating(true); setError("");
    const res = await fetch("/api/admin/migrate", { method: "POST" });
    const data = await res.json();
    if (res.ok) { setReport(data.report); check(); }
    else setError(data.error ?? "Erreur");
    setMigrating(false);
  };

  useEffect(() => {
    if (status === "authenticated" && role === "ADMIN") check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, role]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
          <Database size={18} className="text-green-600" />
          <h1 className="text-xl font-bold text-gray-900">Maintenance base de données</h1>
        </header>

        <div className="max-w-xl mx-auto px-6 py-8 space-y-6">
          {role !== "ADMIN" ? (
            <p className="text-gray-500">Cette page est réservée aux administrateurs.</p>
          ) : (
            <>
              <section className="bg-white border border-gray-100 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-800">État de la base</h2>
                  <button onClick={check} disabled={loading}
                    className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-800 disabled:opacity-60">
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />Vérifier
                  </button>
                </div>
                {info ? (
                  <ul className="grid grid-cols-2 gap-2 text-sm">
                    {([
                      ["Pages", info.pages],
                      ["Rubriques", info.categories],
                      ["Utilisateurs", info.users],
                      ["Tags", info.tags],
                      ["Événements", info.timeline],
                    ] as const).map(([label, val]) => (
                      <li key={label} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-gray-500">{label}</span>
                        <span className="font-semibold text-gray-900">{String(val)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">Cliquez sur « Vérifier ».</p>
                )}
                <p className="text-xs text-gray-400 mt-3">
                  Si « Pages » affiche un nombre &gt; 0, tes données sont intactes — il ne reste qu&apos;à appliquer la migration ci-dessous.
                  Si une ligne affiche « erreur : no such column / table », c&apos;est justement ce que la migration corrige.
                </p>
              </section>

              <section className="bg-white border border-gray-100 rounded-xl p-5">
                <h2 className="font-semibold text-gray-800 mb-2">Appliquer la migration</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Ajoute les colonnes/tables récentes (<code className="text-xs bg-gray-100 px-1 rounded">Page.order</code>,{" "}
                  <code className="text-xs bg-gray-100 px-1 rounded">Tag.group</code>,{" "}
                  <code className="text-xs bg-gray-100 px-1 rounded">TimelineEvent</code>).
                  Opération idempotente : <strong>aucune donnée n&apos;est supprimée</strong>.
                </p>
                <button onClick={migrate} disabled={migrating}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                  <Wrench size={15} />{migrating ? "Migration…" : "Lancer la migration"}
                </button>
                {report && (
                  <div className="mt-4 bg-gray-900 text-green-200 rounded-lg p-3 text-xs font-mono space-y-1 max-h-60 overflow-y-auto">
                    {report.map((line, i) => <div key={i}>{line}</div>)}
                  </div>
                )}
              </section>

              {error && <p className="text-sm text-red-500">{error}</p>}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
