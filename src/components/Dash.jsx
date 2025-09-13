import { useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { motion } from "framer-motion";

// Build API base from Vite env (handles trailing slash/spaces)
const API_BASE = (() => {
  const raw = import.meta.env.VITE_API_URL || "http://localhost:3000/";
  const base = raw.replace(/\s+$/, "");
  const noTrail = base.replace(/\/+$/, "");
  return `${noTrail}/api`;
})();

export default function Dash({ setActive }) {
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

  // --- state for API data ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);

  // normalize various "boolean-ish" or legacy values for flagged
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

    async function fetchSubmissions() {
      if (!decoded || !token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");

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

        const list = Array.isArray(data?.rows) ? data.rows : [];
        if (!abort) setRows(list);
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

  const total = rows.length;
  const wrong = rows.reduce(
    (acc, r) => (isFlagged(r?.flagged) ? acc + 1 : acc),
    0
  );
  const accuracy = total ? Math.round(((total - wrong) / total) * 100) : 0;

  if (!decoded) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-white">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold mb-2">You’re not signed in</h1>
          <p className="text-white/80 mb-6">
            We couldn’t read a valid token. Please log in again to view your
            dashboard.
          </p>
          <a
            href="/login"
            className="inline-block rounded-xl px-5 py-3 bg-white text-indigo-700 font-medium hover:bg-white/90 transition"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[40vh] text-white rounded-2xl">
      <div className="max-w-5xl mx-auto px-5 py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-end justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">
              Hi,{" "}
              <span className="text-white/90">{decoded.name ?? "there"}</span>!
            </h1>
            <p className="text-white/70 mt-1">
              Here’s a quick snapshot of your activity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="rounded-xl px-4 py-2 bg-white text-indigo-700 font-medium hover:bg-white/90 transition"
              onClick={() => setActive("Form")}
            >
              Submit Form
            </button>
            <a
              href="/#/submissions"
              className="rounded-xl px-4 py-2 border border-white/50 hover:border-white transition"
            >
              See Submissions
            </a>
          </div>
        </motion.div>

        {/* Loading / Error */}
        {loading && (
          <div className="mb-6 text-white/80">Loading your stats…</div>
        )}
        {!!error && <div className="mb-6 text-red-200">{error}</div>}

        {/* Stats cards */}
        {!loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur p-5">
              <p className="text-white/70 text-sm">My submissions</p>
              <p className="text-3xl font-semibold mt-1">{total}</p>
              <div className="mt-3 h-1.5 rounded bg-white/20">
                <div
                  className="h-1.5 rounded bg-yellow-400"
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur p-5">
              <p className="text-white/70 text-sm">Wrong submissions</p>
              <p className="text-3xl font-semibold mt-1">{wrong}</p>
              <div className="mt-3 h-1.5 rounded bg-white/20">
                <div
                  className="h-1.5 rounded bg-red-400"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, (wrong / (total || 1)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur p-5">
              <p className="text-white/70 text-sm">Accuracy</p>
              <p className="text-3xl font-semibold mt-1">{accuracy}%</p>
              <div className="mt-3 h-1.5 rounded bg-white/20">
                <div
                  className="h-1.5 rounded bg-green-400"
                  style={{ width: `${accuracy}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="mt-8 rounded-2xl border border-white/20 bg-white/10 backdrop-blur p-6"
        >
          <h2 className="text-xl font-semibold mb-3">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-xl px-4 py-2 bg-white text-indigo-700 font-medium hover:bg-white/90 transition"
              onClick={() => setActive("Form")}
            >
              Submit a new form
            </button>
            <a
              href="/#/submissions"
              className="rounded-xl px-4 py-2 border border-white/50 hover:border-white transition"
            >
              Review submissions
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
