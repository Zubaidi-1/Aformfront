import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const HIDDEN_COLS = new Set([
  "id",
  "_id",
  "created_at",
  "updated_at",
  "createdat",
  "updatedat",
  "email",
  "done_at",
  "doneat",
  "flagged",
  "notes",
]);

// Build API base from Vite env (handles trailing slash)
const API_BASE = (() => {
  const raw = import.meta.env.VITE_API_URL || "http://localhost:3000/";
  const base = raw.replace(/\s+$/, "");
  const noTrail = base.replace(/\/+$/, "");
  return `${noTrail}/api`;
})();

export default function TablesLikeForm({ onSubmit, accent = "" }) {
  const [tables, setTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [tablesError, setTablesError] = useState("");

  const [selectedTable, setSelectedTable] = useState("");
  const [loadingCols, setLoadingCols] = useState(false);
  const [colsError, setColsError] = useState("");
  const [columns, setColumns] = useState([]);

  const [formValues, setFormValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Fetch tables
  useEffect(() => {
    const fetchTables = async () => {
      setLoadingTables(true);
      setTablesError("");
      try {
        const res = await fetch(`${API_BASE}/tables/getTables`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.message || "Failed to load tables");
        }
        const data = await res.json();

        const list = (Array.isArray(data?.tables) ? data.tables : [])
          .map((t) =>
            typeof t === "string"
              ? t
              : t?.TABLE_NAME || t?.table_name || t?.name || null
          )
          .filter(Boolean);

        setTables(list);
      } catch (e) {
        setTablesError(e.message || "Error loading tables");
      } finally {
        setLoadingTables(false);
      }
    };
    fetchTables();
  }, [token]);

  // Fetch column names for selected table
  useEffect(() => {
    if (!selectedTable) {
      setColumns([]);
      setFormValues({});
      return;
    }
    const fetchCols = async () => {
      setLoadingCols(true);
      setColsError("");
      setSubmitMsg("");
      try {
        const res = await fetch(`${API_BASE}/tables/getColumns`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            tableName: selectedTable,
            includeSystem: false,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.message || "Failed to load column names");
        }

        const meta =
          (Array.isArray(data?.visibleColumns) &&
            data.visibleColumns.length > 0 &&
            data.visibleColumns) ||
          (Array.isArray(data?.columns) ? data.columns : []);

        const names = (meta || [])
          .map((c) =>
            typeof c === "string"
              ? c
              : c?.name || c?.COLUMN_NAME || c?.column_name || null
          )
          .filter(Boolean)
          .filter((n) => !HIDDEN_COLS.has(String(n).toLowerCase()));

        setColumns(names);

        const initial = {};
        names.forEach((c) => (initial[c] = ""));
        setFormValues(initial);
      } catch (e) {
        setColsError(e.message || "Error loading columns");
        setColumns([]);
        setFormValues({});
      } finally {
        setLoadingCols(false);
      }
    };
    fetchCols();
  }, [selectedTable, token]);

  const handleChange = (name, value) => {
    setFormValues((p) => ({ ...p, [name]: value }));
  };

  const handleReset = () => {
    const reset = {};
    columns.forEach((c) => (reset[c] = ""));
    setFormValues(reset);
    setSubmitMsg("");
  };

  const buildRowForSubmit = () => {
    const row = {};
    for (const c of columns) {
      let v = formValues[c];
      if (v === "") v = null;
      row[c] = v;
    }
    return row;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMsg("");

    try {
      if (onSubmit) {
        await onSubmit({ tableName: selectedTable, values: formValues });
        setSubmitMsg("Saved.");
        return;
      }

      const row = buildRowForSubmit();

      const res = await fetch(`${API_BASE}/tables/addRows`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          tableName: selectedTable,
          rows: [row],
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || "Failed to insert row");
      }

      setSubmitMsg(
        json?.message ||
          `Saved ${json?.insertedCount ?? 1} row${
            (json?.insertedCount ?? 1) > 1 ? "s" : ""
          }.`
      );
    } catch (err) {
      setSubmitMsg(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const title = useMemo(
    () => (selectedTable ? `New ${selectedTable} entry` : "Pick a table"),
    [selectedTable]
  );

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
      {/* Header Card */}
      <div className="rounded-2xl bg-white/80 backdrop-blur shadow-lg p-4 md:p-6 border border-black/5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-semibold">
            {selectedTable ? `Fill ${selectedTable}` : "Pick a table"}
          </h2>
          <div
            className={`hidden md:block h-2 w-28 rounded-full bg-gradient-to-r ${
              accent || "from-indigo-500 to-blue-500"
            }`}
          />
        </div>

        {/* Tables Grid */}
        <div className="mt-4">
          {loadingTables ? (
            <p className="text-sm text-gray-600">Loading tables…</p>
          ) : tablesError ? (
            <p className="text-sm text-red-600">{tablesError}</p>
          ) : tables.length === 0 ? (
            <p className="text-sm text-gray-600">No tables found.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {tables.map((t) => {
                const active = selectedTable === t;
                return (
                  <motion.button
                    key={t}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedTable(t)}
                    className={`rounded-xl border px-3 py-2 text-sm text-left shadow-sm transition ${
                      active
                        ? "border-black/10 bg-black text-white"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`${active ? "opacity-100" : "opacity-90"}`}
                      >
                        {t}
                      </span>
                      <span
                        className={`h-2 w-2 rounded-full ${
                          active ? "bg-white" : "bg-gray-300"
                        }`}
                      />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Form Card */}
      <AnimatePresence>
        {selectedTable && (
          <motion.div
            key={selectedTable}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-6 rounded-2xl bg-white/80 backdrop-blur shadow-lg p-4 md:p-6 border border-black/5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg md:text-xl font-semibold">
                New {selectedTable} entry
              </h3>
              <div
                className={`h-1.5 w-20 rounded-full bg-gradient-to-r ${
                  accent || "from-indigo-500 to-blue-500"
                }`}
              />
            </div>

            {loadingCols && (
              <p className="text-sm text-gray-600">Loading columns…</p>
            )}
            {!!colsError && (
              <p className="text-sm text-red-600 mb-2">{colsError}</p>
            )}
            {!loadingCols && !colsError && columns.length === 0 && (
              <p className="text-sm text-gray-600">
                No columns to fill for{" "}
                <span className="font-medium">{selectedTable}</span>.
              </p>
            )}

            {columns.length > 0 && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Inputs grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {columns.map((col) => (
                    <div
                      key={col}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm"
                    >
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {col}
                      </label>
                      <input
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/40"
                        name={col}
                        value={formValues[col] ?? ""}
                        onChange={(e) => handleChange(col, e.target.value)}
                        placeholder={`Enter ${col}`}
                      />
                    </div>
                  ))}
                </div>

                {/* Feedback */}
                {!!submitMsg && (
                  <p
                    className={`text-sm ${
                      submitMsg.startsWith("Error")
                        ? "text-red-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {submitMsg}
                  </p>
                )}

                {/* Action bar */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting || loadingCols || columns.length === 0}
                    className="rounded-xl px-4 py-2 bg-black text-white hover:bg-black/90 transition disabled:opacity-50"
                  >
                    {submitting ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={submitting}
                    className="rounded-xl px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 transition"
                  >
                    Reset
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
