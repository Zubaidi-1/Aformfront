import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import CreateTableModal from "../components/CreateTableModal";

const ACCENT = "from-indigo-500 to-blue-500";

// Build API base from Vite env (handles trailing slash/spaces)
const API_BASE = (() => {
  const raw = import.meta.env.VITE_API_URL || "http://localhost:3000/";
  const base = raw.replace(/\s+$/, "");
  const noTrail = base.replace(/\/+$/, "");
  return `${noTrail}/api`;
})();

export default function Tables() {
  const navigate = useNavigate();

  const [tables, setTables] = useState([]); // array of strings
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [openModal, setOpenModal] = useState(false);

  // users fetched separately
  const [usersCount, setUsersCount] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  const getTablesOnly = async () => {
    const result = await fetch(`${API_BASE}/tables/getTables`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const data = await result.json().catch(() => ({}));
    if (!result.ok) {
      throw new Error(data?.message || "Error fetching tables");
    }
    const list = (Array.isArray(data?.tables) ? data.tables : [])
      .map((t) =>
        typeof t === "string"
          ? t
          : t?.TABLE_NAME || t?.table_name || t?.name || null
      )
      .filter(Boolean);
    return list;
  };

  const getUsersSeparately = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_BASE}/users/getusers`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.message || "Failed to fetch users");

      // accept either {rows:[]} or {users:[]} or just array
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data?.rows)
        ? data.rows
        : Array.isArray(data?.users)
        ? data.users
        : [];
      setUsersCount(arr.length || 0);
      return true; // success
    } catch {
      setUsersCount(0);
      return false;
    } finally {
      setLoadingUsers(false);
    }
  };

  const getEverything = async () => {
    if (!token) return;
    setLoading(true);
    setErr("");
    try {
      const [tableNames] = await Promise.all([
        getTablesOnly(),
        getUsersSeparately(),
      ]);

      // Add synthetic "users" entry (append if not present)
      const names = new Set(tableNames);
      names.add("users");
      setTables(Array.from(names));
    } catch (e) {
      setErr(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getEverything();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
      {/* Card container */}
      <div className="rounded-2xl bg-white/80 backdrop-blur shadow-lg p-4 md:p-6 border border-black/5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">Tables</h1>
            <p className="text-sm text-gray-600 mt-1">
              {loading
                ? "Loading…"
                : `${tables.length} item${tables.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`hidden md:block h-2 w-28 rounded-full bg-gradient-to-r ${ACCENT}`}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={getEverything}
            className="rounded-xl px-3 py-2 border border-gray-300 bg-white hover:bg-gray-50 transition text-sm"
          >
            Refresh {loadingUsers ? "…" : ""}
          </button>
          <button
            onClick={() => setOpenModal(true)}
            className="rounded-xl px-4 py-2 bg-black text-white hover:bg-black/90 transition text-sm"
          >
            + Create New Table
          </button>
        </div>

        {/* Error */}
        {err && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {err}
          </div>
        )}

        {/* Tables grid */}
        <div className="mt-6 min-h-[200px]">
          {loading ? (
            <p className="text-sm text-gray-600">Loading…</p>
          ) : tables.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {tables.map((name) => {
                const label =
                  name.toLowerCase() === "users" && usersCount >= 0
                    ? `users${usersCount ? ` (${usersCount})` : ""}`
                    : name;
                return (
                  <motion.button
                    key={name}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() =>
                      navigate(`/table/${encodeURIComponent(name)}`)
                    }
                    className="rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3 py-2 text-sm text-left shadow-sm transition"
                    title={`Open ${name}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="opacity-90">{label}</span>
                      <span className="h-2 w-2 rounded-full bg-gray-300" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No tables found.</p>
          )}
        </div>
      </div>

      {/* Modal */}
      <CreateTableModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCreated={() => {
          setOpenModal(false);
          getEverything();
        }}
        token={token}
      />
    </div>
  );
}
