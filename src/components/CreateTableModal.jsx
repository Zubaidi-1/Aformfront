// components/CreateTableModal.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Build API base from Vite env (handles trailing slash/spaces)
const API_BASE = (() => {
  const raw = import.meta.env.VITE_API_URL || "http://localhost:3000/";
  const base = raw.replace(/\s+$/, "");
  const noTrail = base.replace(/\/+$/, "");
  return `${noTrail}/api`;
})();

export default function CreateTableModal({
  open,
  onClose,
  onCreated, // callback after successful create to refresh list
  token,
}) {
  const [tableName, setTableName] = useState("");
  const [columnsRaw, setColumnsRaw] = useState(""); // comma-separated
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // sanitized columns
  const columns = useMemo(() => {
    return columnsRaw
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => c.replace(/\W+/g, "_")); // safe-ish col names
  }, [columnsRaw]);

  const safeTableName = useMemo(
    () => tableName.trim().replace(/\W+/g, "_"),
    [tableName]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!safeTableName) {
      setError("Please provide a table name.");
      return;
    }
    if (columns.length === 0) {
      setError("Please provide at least one column (comma-separated).");
      return;
    }

    setLoading(true);
    try {
      // 1) create the table
      const createRes = await fetch(`${API_BASE}/tables/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tableName: safeTableName }),
      });
      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok)
        throw new Error(createData?.message || "Create failed");

      // 2) add columns (controller expects `cols`)
      const addColRes = await fetch(`${API_BASE}/tables/addCol`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tableName: safeTableName, cols: columns }),
      });
      const addColData = await addColRes.json().catch(() => ({}));
      if (!addColRes.ok)
        throw new Error(addColData?.message || "Add columns failed");

      // success 🎉
      setTableName("");
      setColumnsRaw("");
      onClose?.();
      onCreated?.(safeTableName);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
          >
            <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden bg-gradient-to-br from-blue-800 via-blue-700 to-indigo-800 border border-white/10">
              <div className="px-6 py-4 border-b border-white/10">
                <h2 className="text-xl font-bold text-white">
                  Create New Table
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  Define a table name and its initial columns.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm text-blue-100 mb-1">
                    Table Name
                  </label>
                  <input
                    type="text"
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                    placeholder="e.g., customers"
                    className="w-full rounded-xl bg-blue-900/40 text-white placeholder-blue-200/60 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  {safeTableName && safeTableName !== tableName && (
                    <p className="text-xs text-blue-200 mt-1">
                      Saved as{" "}
                      <span className="font-mono">{safeTableName}</span>{" "}
                      (sanitized)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-blue-100 mb-1">
                    Columns (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={columnsRaw}
                    onChange={(e) => setColumnsRaw(e.target.value)}
                    placeholder="e.g., email, first_name, last_name"
                    className="w-full rounded-xl bg-blue-900/40 text-white placeholder-blue-200/60 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  {columns.length > 0 && (
                    <p className="text-xs text-blue-200 mt-1">
                      Will create:{" "}
                      <span className="font-mono">
                        {columns.map((c) => `\`${c}\``).join(", ")}
                      </span>
                    </p>
                  )}
                </div>

                {error && (
                  <div className="text-sm text-red-200 bg-red-900/30 border border-red-400/30 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-blue-900/50 text-blue-100 hover:bg-blue-900/70 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 rounded-xl bg-blue-400 text-white font-semibold shadow hover:bg-blue-500 transition disabled:opacity-60"
                  >
                    {loading ? "Creating..." : "Create Table"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
