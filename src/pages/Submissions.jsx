import { useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";

// Build API base from Vite env (handles trailing slash/spaces)
const API_BASE = (() => {
  const raw = import.meta.env.VITE_API_URL || "http://localhost:3000/";
  const base = raw.replace(/\s+$/, "");
  const noTrail = base.replace(/\/+$/, "");
  return `${noTrail}/api`;
})();

export default function Submissions() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const decoded = useMemo(() => {
    if (!token) return null;
    try {
      return jwtDecode(token);
    } catch {
      return null;
    }
  }, [token]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let abort = false;

    async function fetchSubmissions() {
      if (!decoded || !token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/tables/user/submissions`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.message || "Failed to fetch submissions");
        }
        if (!abort) setRows(Array.isArray(data?.rows) ? data.rows : []);
      } catch (e) {
        if (!abort) setError(e.message || "Something went wrong");
      } finally {
        if (!abort) setLoading(false);
      }
    }

    fetchSubmissions();
    return () => {
      abort = true;
    };
  }, [decoded, token]);

  if (!decoded) {
    return (
      <div className="min-h-screen grid place-items-center text-white">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold mb-2">You’re not signed in</h1>
          <p className="text-white/80 mb-6">
            Please log in to view your submissions.
          </p>
          <a
            href="/#/login"
            className="inline-block rounded-xl px-5 py-3 bg-white text-indigo-700 font-medium hover:bg-white/90 transition"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-500 to-blue-500 mx-auto px-5 py-10 text-white">
      <h1 className="text-3xl font-bold mb-6">My Submissions</h1>

      {loading && <p className="text-white/70">Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="text-white/70">No submissions found.</p>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-white/20 bg-white/5 backdrop-blur">
          <table className="min-w-full border-collapse">
            <thead className="bg-white/10 text-sm">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-white/80">
                  ID
                </th>
                <th className="px-4 py-3 text-left font-medium text-white/80">
                  Table
                </th>
                <th className="px-4 py-3 text-left font-medium text-white/80">
                  Created
                </th>
                <th className="px-4 py-3 text-left font-medium text-white/80">
                  Notes
                </th>
                <th className="px-4 py-3 text-left font-medium text-white/80">
                  Flagged
                </th>
                <th className="px-4 py-3 text-left font-medium text-white/80">
                  Done
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-sm">
              {rows.map((row) => (
                <tr
                  key={`${row._table}-${row.id}`}
                  className="hover:bg-white/5 transition"
                >
                  <td className="px-4 py-2">{row.id}</td>
                  <td className="px-4 py-2">{row._table}</td>
                  <td className="px-4 py-2">{row.created_at}</td>
                  <td className="px-4 py-2">{row.notes ?? "-"}</td>
                  <td className="px-4 py-2">
                    {row.flagged ? (
                      <span className="px-2 py-1 rounded bg-red-500/20 text-red-300 text-xs font-medium">
                        Yes
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded bg-green-500/20 text-green-300 text-xs font-medium">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">{row.done_at ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
