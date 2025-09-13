// components/UsersQuality.jsx
import { useEffect, useState, useMemo } from "react";

// Build API base from Vite env (handles trailing slash/spaces)
const API_BASE = (() => {
  const raw = import.meta.env.VITE_API_URL || "http://localhost:3000/";
  const base = raw.replace(/\s+$/, "");
  const noTrail = base.replace(/\/+$/, "");
  return `${noTrail}/api`;
})();

export default function UsersQuality() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // normalize various "boolean-ish" values we might see for flagged
  const isFlagged = (v) => {
    const t = String(v ?? "")
      .trim()
      .toLowerCase();
    return (
      v === true ||
      v === 1 ||
      t === "1" ||
      t === "true" ||
      t === "flag" ||
      t === "yes" ||
      t === "on"
    );
  };

  useEffect(() => {
    let abort = false;

    async function load() {
      if (!token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(`${API_BASE}/tables/all/submissions`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "Failed to fetch");
        if (!abort) setRows(Array.isArray(data?.rows) ? data.rows : []);
      } catch (e) {
        if (!abort) setErr(e.message || "Something went wrong");
      } finally {
        if (!abort) setLoading(false);
      }
    }

    load();
    return () => {
      abort = true;
    };
  }, [token]);

  // aggregate per user
  const perUser = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const email = r?.email || "unknown";
      if (!map.has(email)) map.set(email, { email, submissions: 0, errors: 0 });
      const obj = map.get(email);
      obj.submissions += 1;
      if (isFlagged(r?.flagged)) obj.errors += 1;
    }
    return Array.from(map.values()).sort(
      (a, b) => b.submissions - a.submissions
    );
  }, [rows]);

  return (
    <div className="max-w-6xl mx-auto px-5 py-10 text-white">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Users Quality</h1>
          <p className="text-white/70 mt-1">
            Overview of submissions and flagged items per user.
          </p>
          {!!err && <p className="mt-2 text-red-300 text-sm">{err}</p>}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/20 bg-white/5 backdrop-blur">
        <table className="min-w-full border-collapse">
          <thead className="bg-white/10 text-left text-sm">
            <tr>
              <th className="px-4 py-3 font-medium text-white/80">Email</th>
              <th className="px-4 py-3 font-medium text-white/80">
                Submissions
              </th>
              <th className="px-4 py-3 font-medium text-white/80">
                Errors (flagged)
              </th>
              <th className="px-4 py-3 font-medium text-white/80">Accuracy</th>
              <th className="px-4 py-3 font-medium text-white/80">Bars</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-white/10">
            {loading ? (
              <tr>
                <td className="px-4 py-4" colSpan={5}>
                  Loading…
                </td>
              </tr>
            ) : perUser.length === 0 ? (
              <tr>
                <td className="px-4 py-4" colSpan={5}>
                  No data.
                </td>
              </tr>
            ) : (
              perUser.map((u) => {
                const accuracy =
                  u.submissions > 0
                    ? Math.round(
                        ((u.submissions - u.errors) / u.submissions) * 100
                      )
                    : 0;
                const errorPct =
                  u.submissions > 0
                    ? Math.min(100, (u.errors / u.submissions) * 100)
                    : 0;

                return (
                  <tr key={u.email} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{u.submissions}</td>
                    <td className="px-4 py-3">{u.errors}</td>
                    <td className="px-4 py-3">{accuracy}%</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 w-64 max-w-full">
                        <div className="flex-1">
                          <div className="h-1.5 rounded bg-white/20">
                            <div
                              className="h-1.5 rounded bg-red-400"
                              style={{ width: `${errorPct}%` }}
                              title={`Errors: ${u.errors}/${u.submissions}`}
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="h-1.5 rounded bg-white/20">
                            <div
                              className="h-1.5 rounded bg-green-400"
                              style={{ width: `${accuracy}%` }}
                              title={`Accuracy: ${accuracy}%`}
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
