import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ManageColumnsModal from "../components/modals/ManageColumnsModal";
import DeleteTableModal from "../components/modals/DeleteTableModal";

// Build API base from Vite env (handles trailing slash/spaces)
const API_BASE = (() => {
  const raw = import.meta.env.VITE_API_URL || "http://localhost:3000/";
  const base = raw.replace(/\s+$/, "");
  const noTrail = base.replace(/\/+$/, "");
  return `${noTrail}/api`;
})();

export default function TableView() {
  const { name } = useParams();
  const tableName = useMemo(() => decodeURIComponent(name || ""), [name]);
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCols, setLoadingCols] = useState(true);
  const [err, setErr] = useState("");
  const [colsErr, setColsErr] = useState("");
  const [edits, setEdits] = useState({});
  const [savingCell, setSavingCell] = useState(null);
  const [banner, setBanner] = useState("");

  // modal visibility
  const [openManageCols, setOpenManageCols] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  // Filters (disabled for users table)
  const [createdMode, setCreatedMode] = useState("all"); // all | exact | between
  const [createdOn, setCreatedOn] = useState(""); // YYYY-MM-DD
  const [createdFrom, setCreatedFrom] = useState(""); // YYYY-MM-DD
  const [createdTo, setCreatedTo] = useState(""); // YYYY-MM-DD
  const [flaggedFilter, setFlaggedFilter] = useState("all"); // all | flagged | unflagged
  const [doneFilter, setDoneFilter] = useState("all"); // all | done | undone

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const isUsersTable = useMemo(
    () => tableName.trim().toLowerCase() === "users",
    [tableName]
  );

  // helpers
  const getRowId = (row) => row.id ?? row.ID ?? row.Id ?? row.email ?? null;

  const getDraftValue = (row, col) => {
    const rid = getRowId(row);
    const draft = edits[rid]?.[col];
    return draft !== undefined ? draft : row[col] ?? "";
  };

  const setDraft = (rowId, col, value) => {
    setEdits((p) => ({
      ...p,
      [rowId]: { ...(p[rowId] || {}), [col]: value },
    }));
  };

  const normalizeBooleanish = (v) => {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    if (typeof v === "string")
      return ["1", "true", "yes", "y", "on"].includes(v.trim().toLowerCase());
    return Boolean(v);
  };

  const pad2 = (n) => String(n).padStart(2, "0");
  const toMySQLDateTime = (date) => {
    const y = date.getFullYear();
    const m = pad2(date.getMonth() + 1);
    const d = pad2(date.getDate());
    const hh = pad2(date.getHours());
    const mm = pad2(date.getMinutes());
    const ss = pad2(date.getSeconds());
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  };

  const dateOnly = (v) => {
    if (!v) return "";
    const dt = new Date(v);
    if (isNaN(dt.getTime())) {
      const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
      return m ? m[1] : "";
    }
    const y = dt.getFullYear();
    const m = pad2(dt.getMonth() + 1);
    const d = pad2(dt.getDate());
    return `${y}-${m}-${d}`;
  };

  // api
  const fetchRows = async () => {
    setLoading(true);
    setErr("");
    try {
      if (isUsersTable) {
        const res = await fetch(`${API_BASE}/users/getusers`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "Failed to fetch users");
        const list = Array.isArray(data?.users)
          ? data.users
          : Array.isArray(data)
          ? data
          : [];
        setRows(list);
        setEdits({});
      } else {
        const res = await fetch(`${API_BASE}/tables/getAll`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tableName }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "Failed to fetch rows");
        const payload = data?.rows;
        const normalized = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.rows)
          ? payload.rows
          : [];
        setRows(normalized);
        setEdits({});
      }
    } catch (e) {
      setErr(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchColumns = async () => {
    setLoadingCols(true);
    setColsErr("");
    try {
      if (isUsersTable) {
        setColumns(["email", "role"]);
      } else {
        const res = await fetch(`${API_BASE}/tables/getColumns`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tableName, includeSystem: true }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(data?.message || "Failed to fetch columns");

        const meta =
          (Array.isArray(data?.columns) && data.columns) ||
          (Array.isArray(data?.visibleColumns) && data.visibleColumns) ||
          [];

        let names = meta
          .map((c) =>
            typeof c === "string"
              ? c
              : c?.name || c?.COLUMN_NAME || c?.column_name || null
          )
          .filter(Boolean);

        if (rows[0]) {
          for (const k of Object.keys(rows[0])) {
            if (!names.includes(k)) names.push(k);
          }
        }

        const lower = names.map((n) => n.toLowerCase());
        const others = names.filter(
          (n) => !["notes", "flagged"].includes(n.toLowerCase())
        );
        const end = [];
        if (lower.includes("notes")) end.push(names[lower.indexOf("notes")]);
        if (lower.includes("flagged"))
          end.push(names[lower.indexOf("flagged")]);

        setColumns([...others, ...end]);
      }
    } catch (e) {
      setColsErr(e.message);
      setColumns([]);
    } finally {
      setLoadingCols(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchRows(), fetchColumns()]);
  };

  useEffect(() => {
    if (!token || !tableName) return;
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tableName, isUsersTable]);

  const saveCell = async (rowId, col, value, rowRef) => {
    if (!rowId) return;
    setSavingCell(`${rowId}:${col}`);
    setBanner("");

    try {
      if (isUsersTable && col.toLowerCase() === "role") {
        const email = rowRef?.email;
        if (!email) throw new Error("Email missing for role change");

        const res = await fetch(`${API_BASE}/users/changeRole`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, role: value }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "Failed to change role");
      } else {
        // generic tables path
        let toSend = value;
        if (col.toLowerCase() === "flagged") {
          if (typeof value === "string") toSend = value.trim() === "1" ? 1 : 0;
          else toSend = value ? 1 : 0;
        }

        const res = await fetch(`${API_BASE}/tables/updateColValue`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tableName, id: rowId, col, value: toSend }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "Failed to update");
      }

      setBanner("Saved.");
      await fetchRows();
    } catch (e) {
      setBanner(`Error: ${e.message}`);
    } finally {
      setSavingCell(null);
      setTimeout(() => setBanner(""), 1500);
    }
  };

  // users-table-specific handlers
  const onRoleChange = async (row, nextRole) => {
    const rid = getRowId(row);
    setEdits((p) => ({ ...p, [rid]: { ...(p[rid] || {}), role: nextRole } }));
    await saveCell(rid, "role", nextRole, row);
  };

  // generic-table handlers
  const onNotesBlur = async (row) => {
    const rid = getRowId(row);
    const draftVal = edits[rid]?.notes;
    const currentVal = row.notes ?? "";
    if (draftVal === undefined || String(draftVal) === String(currentVal))
      return;
    await saveCell(rid, "notes", draftVal, row);
  };

  const onToggleFlagged = async (row) => {
    const rid = getRowId(row);
    const current = row.flagged ?? 0;
    const isOn = normalizeBooleanish(current);
    const next = isOn ? 0 : 1;
    setEdits((p) => ({ ...p, [rid]: { ...(p[rid] || {}), flagged: next } }));
    await saveCell(rid, "flagged", next, row);
  };

  const onMarkDoneNow = async (row) => {
    const rid = getRowId(row);
    if (!rid) return;
    const stamp = toMySQLDateTime(new Date());
    await saveCell(rid, "done_at", stamp, row);
  };

  const onInputKeyDown = (e, handler) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
      if (handler) handler();
    }
  };

  // filter application (skip for users table)
  const applyFilters = (list) => {
    if (isUsersTable) return list;
    return list.filter((row) => {
      if (createdMode === "exact") {
        if (!createdOn) return false;
        const rowD = dateOnly(row.created_at);
        if (rowD !== createdOn) return false;
      } else if (createdMode === "between") {
        if (!createdFrom || !createdTo) return false;
        const rowD = dateOnly(row.created_at);
        if (!rowD) return false;
        if (rowD < createdFrom || rowD > createdTo) return false;
      }

      if (flaggedFilter !== "all") {
        const isOn = normalizeBooleanish(row.flagged ?? 0);
        if (flaggedFilter === "flagged" && !isOn) return false;
        if (flaggedFilter === "unflagged" && isOn) return false;
      }

      if (doneFilter !== "all") {
        const hasDone = !!row.done_at;
        if (doneFilter === "done" && !hasDone) return false;
        if (doneFilter === "undone" && hasDone) return false;
      }

      return true;
    });
  };

  const filteredRows = applyFilters(rows);

  // render
  return (
    <div className="min-h-screen flex justify-center items-start bg-gradient-to-r from-indigo-500 to-blue-500 py-8">
      <div className="w-11/12 max-w-[120rem] bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 rounded-2xl shadow-2xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Table: <span className="font-mono">{tableName}</span>
            </h1>
            <p className="text-blue-100 text-base mt-1">
              {loading
                ? "Loading rows…"
                : `${filteredRows.length} row(s) shown`}
            </p>
            {!!banner && (
              <p
                className={`text-sm mt-1 ${
                  banner.startsWith("Error")
                    ? "text-red-200"
                    : "text-emerald-200"
                }`}
              >
                {banner}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {!isUsersTable && (
              <>
                <button
                  onClick={() => setOpenManageCols(true)}
                  className="px-4 py-2 rounded-xl bg-white text-indigo-700 font-semibold shadow hover:bg-white/90 transition"
                  title="Add / rename / delete columns"
                >
                  Manage columns
                </button>
                <button
                  onClick={() => setOpenDelete(true)}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold shadow hover:bg-red-700 transition"
                  title="Delete this table"
                >
                  Delete table
                </button>
              </>
            )}
            <button
              onClick={() => refreshAll()}
              className="px-4 py-2 rounded-xl bg-blue-400 text-white font-semibold shadow hover:bg-blue-500 transition"
            >
              Refresh
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-xl bg-blue-900/50 text-blue-100 hover:bg-blue-900/70 transition"
            >
              Back
            </button>
          </div>
        </div>

        {/* Filters (hidden for users table) */}
        {!isUsersTable && (
          <div className="mb-6 flex flex-wrap gap-4 text-white items-end">
            <div>
              <label className="block text-sm mb-1">Created at</label>
              <select
                value={createdMode}
                onChange={(e) => {
                  setCreatedMode(e.target.value);
                  setCreatedOn("");
                  setCreatedFrom("");
                  setCreatedTo("");
                }}
                className="rounded-lg bg-white/90 text-gray-900 px-2 py-1"
              >
                <option value="all">All</option>
                <option value="exact">Exact date</option>
                <option value="between">Between dates</option>
              </select>
            </div>
            {createdMode === "exact" && (
              <div>
                <label className="block text-sm mb-1">Date</label>
                <input
                  type="date"
                  value={createdOn}
                  onChange={(e) => setCreatedOn(e.target.value)}
                  className="rounded-lg bg-white/90 text-gray-900 px-2 py-1"
                />
              </div>
            )}
            {createdMode === "between" && (
              <>
                <div>
                  <label className="block text-sm mb-1">From</label>
                  <input
                    type="date"
                    value={createdFrom}
                    onChange={(e) => setCreatedFrom(e.target.value)}
                    className="rounded-lg bg-white/90 text-gray-900 px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">To</label>
                  <input
                    type="date"
                    value={createdTo}
                    onChange={(e) => setCreatedTo(e.target.value)}
                    className="rounded-lg bg-white/90 text-gray-900 px-2 py-1"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm mb-1">Flagged</label>
              <select
                value={flaggedFilter}
                onChange={(e) => setFlaggedFilter(e.target.value)}
                className="rounded-lg bg-white/90 text-gray-900 px-2 py-1"
              >
                <option value="all">All</option>
                <option value="flagged">Flagged</option>
                <option value="unflagged">Unflagged</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Done</label>
              <select
                value={doneFilter}
                onChange={(e) => setDoneFilter(e.target.value)}
                className="rounded-lg bg-white/90 text-gray-900 px-2 py-1"
              >
                <option value="all">All</option>
                <option value="done">Done</option>
                <option value="undone">Undone</option>
              </select>
            </div>
          </div>
        )}

        {err && (
          <div className="mb-4 text-base text-red-200 bg-red-900/30 border border-red-400/30 rounded-lg px-4 py-3">
            {err}
          </div>
        )}
        {colsErr && (
          <div className="mb-4 text-base text-yellow-100 bg-yellow-900/30 border border-yellow-400/30 rounded-lg px-4 py-3">
            {colsErr}
          </div>
        )}

        <div className="overflow-auto rounded-xl border border-white/10">
          <table className="min-w-[60rem] table-fixed text-left text-base">
            <thead className="bg-blue-900/60 text-blue-100">
              <tr>
                {(columns.length > 0 ? columns : ["(no columns)"]).map(
                  (col) => (
                    <th
                      key={col}
                      className="px-5 py-4 font-semibold whitespace-nowrap"
                    >
                      {col}
                    </th>
                  )
                )}
                {!isUsersTable && (
                  <th className="px-5 py-4 font-semibold whitespace-nowrap">
                    Done
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td
                    className="px-5 py-5 text-blue-100"
                    colSpan={(columns.length || 1) + (isUsersTable ? 0 : 1)}
                  >
                    Loading…
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td
                    className="px-5 py-5 text-blue-100"
                    colSpan={(columns.length || 1) + (isUsersTable ? 0 : 1)}
                  >
                    No matching data.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, i) => {
                  const rid = getRowId(row);
                  return (
                    <tr
                      key={rid ?? i}
                      className="hover:bg-blue-900/30 transition"
                    >
                      {columns.map((col) => {
                        const keyLower = String(col).toLowerCase();

                        if (isUsersTable) {
                          if (keyLower === "email") {
                            return (
                              <td key={col} className="px-5 py-4 text-white">
                                {row.email}
                              </td>
                            );
                          }
                          if (keyLower === "role") {
                            const busy = savingCell === `${rid}:role`;
                            const value =
                              getDraftValue(row, "role") || row.role || "";
                            return (
                              <td key={col} className="px-5 py-4">
                                <select
                                  className="rounded-lg bg-white/90 text-gray-900 px-3 py-2 disabled:opacity-50"
                                  value={value}
                                  onChange={(e) =>
                                    onRoleChange(row, e.target.value)
                                  }
                                  disabled={busy}
                                >
                                  {/* adjust to your 4 privileges */}
                                  <option value="viewer">viewer</option>
                                  <option value="editor">editor</option>
                                  <option value="admin">supervisor</option>
                                  <option value="owner">admin</option>
                                </select>
                              </td>
                            );
                          }
                          return (
                            <td key={col} className="px-5 py-4 text-white">
                              {row[col] ?? ""}
                            </td>
                          );
                        }

                        // generic tables
                        const rawVal = row[col];
                        if (keyLower === "notes") {
                          const value = getDraftValue(row, "notes");
                          const busy = savingCell === `${rid}:notes`;
                          return (
                            <td key={col} className="px-5 py-4">
                              <input
                                className="w-[36rem] max-w-full rounded-lg bg-white/95 text-gray-900 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300"
                                value={String(value ?? "")}
                                onChange={(e) =>
                                  setDraft(rid, "notes", e.target.value)
                                }
                                onKeyDown={(e) =>
                                  onInputKeyDown(e, () => onNotesBlur(row))
                                }
                                onBlur={() => onNotesBlur(row)}
                                disabled={busy}
                                placeholder="Add notes…"
                              />
                            </td>
                          );
                        }

                        if (keyLower === "flagged") {
                          const isOn = normalizeBooleanish(rawVal ?? 0);
                          const busy = savingCell === `${rid}:flagged`;
                          return (
                            <td key={col} className="px-5 py-4">
                              <button
                                onClick={() => onToggleFlagged(row)}
                                disabled={busy}
                                className="px-4 py-2 rounded-lg font-semibold shadow bg-white/20 text-white hover:bg-white/30 disabled:opacity-50"
                                title="Toggle flagged"
                              >
                                {busy ? "…" : isOn ? "Flagged" : "Unflagged"}
                              </button>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={col}
                            className="px-5 py-4 text-white whitespace-pre-wrap break-words"
                          >
                            {rawVal === null || rawVal === undefined
                              ? ""
                              : String(rawVal)}
                          </td>
                        );
                      })}

                      {!isUsersTable && (
                        <td className="px-5 py-4">
                          <button
                            onClick={() => onMarkDoneNow(row)}
                            className="px-4 py-2 rounded-lg font-semibold shadow bg-black text-white hover:bg-black/90 transition"
                            title="Set done_at to now"
                          >
                            Done now
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {openManageCols && !isUsersTable && (
        <ManageColumnsModal
          tableName={tableName}
          token={token}
          columns={columns}
          onClose={() => setOpenManageCols(false)}
          onChanged={() => {
            setOpenManageCols(false);
            refreshAll();
          }}
        />
      )}

      {openDelete && !isUsersTable && (
        <DeleteTableModal
          tableName={tableName}
          token={token}
          onClose={() => setOpenDelete(false)}
          onDeleted={() => {
            setOpenDelete(false);
            navigate("/dashboard");
          }}
        />
      )}
    </div>
  );
}
