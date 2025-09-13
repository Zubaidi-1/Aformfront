import { useState, useMemo } from "react";

// Protected/system columns (not editable/deletable/creatable)
const PROTECTED = new Set([
  "id",
  "_id",
  "email",
  "created_at",
  "updated_at",
  "createdat",
  "updatedat",
  "done_at",
  "notes",
  "flagged",
]);

// sanitize to MySQL-ish identifiers: letters, numbers, underscores
const sanitizeName = (s) =>
  String(s || "")
    .trim()
    .replace(/[^\w]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);

// base URL helper (handles trailing slash on VITE_API_URL)
const API_BASE = (() => {
  const raw = import.meta.env.VITE_API_URL || "http://localhost:3000/";
  const base = raw.replace(/\s+$/, ""); // trim accidental trailing spaces
  const noTrail = base.replace(/\/+$/, ""); // drop trailing slashes
  return `${noTrail}/api`;
})();

export default function ManageColumnsModal({
  tableName,
  token,
  columns,
  onClose,
  onChanged,
}) {
  const [tab, setTab] = useState("add"); // 'add' | 'edit' | 'delete'
  const [message, setMessage] = useState("");

  // --- Add states ---
  const [newColsText, setNewColsText] = useState("");
  const [adding, setAdding] = useState(false);

  // --- Edit states ---
  const [selectedCol, setSelectedCol] = useState("");
  const [newName, setNewName] = useState("");
  const [def, setDef] = useState("VARCHAR(255)");
  const [saving, setSaving] = useState(false);

  // --- Delete states ---
  const [checked, setChecked] = useState({});
  const [deleting, setDeleting] = useState(false);

  const editableColumns = useMemo(
    () => columns.filter((c) => !PROTECTED.has(String(c).toLowerCase())),
    [columns]
  );

  const existingLower = useMemo(
    () => new Set(columns.map((c) => String(c).toLowerCase())),
    [columns]
  );

  const toggleCheck = (col) => setChecked((p) => ({ ...p, [col]: !p[col] }));

  // ---------- ADD ----------
  const parseNewCols = () => {
    // split by commas or line breaks
    const rawParts = newColsText
      .split(/[\n,]+/g)
      .map((s) => s.trim())
      .filter(Boolean);

    // sanitize, de-dupe, reject protected + existing
    const unique = new Set();
    const safe = [];

    for (const raw of rawParts) {
      const s = sanitizeName(raw);
      if (!s) continue;

      const lower = s.toLowerCase();
      if (PROTECTED.has(lower)) continue;
      if (existingLower.has(lower)) continue;
      if (unique.has(lower)) continue;

      unique.add(lower);
      safe.push(s);
    }

    return safe;
  };

  const doAdd = async () => {
    setMessage("");
    const safe = parseNewCols();
    if (safe.length === 0) {
      setMessage(
        "Provide at least one valid, non-duplicate, non-protected column name."
      );
      return;
    }

    try {
      setAdding(true);
      const res = await fetch(`${API_BASE}/tables/addCol`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tableName, cols: safe }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Add column(s) failed");

      setMessage(`Added ${safe.length} column(s).`);
      setNewColsText("");
      await onChanged?.();
    } catch (e) {
      setMessage(`Error: ${e.message}`);
    } finally {
      setAdding(false);
    }
  };

  // ---------- EDIT / RENAME / MODIFY DEF ----------
  const doUpdate = async () => {
    setMessage("");
    if (!selectedCol) return setMessage("Pick a column to edit.");
    if (PROTECTED.has(String(selectedCol).toLowerCase()))
      return setMessage("That column is protected.");

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/tables/updateCol`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tableName,
          changes: [
            {
              name: selectedCol,
              ...(newName ? { newName: sanitizeName(newName) } : {}),
              def: def || "VARCHAR(255)",
            },
          ],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Update failed");

      setMessage("Column updated.");
      setNewName("");
      await onChanged?.();
    } catch (e) {
      setMessage(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ---------- DELETE ----------
  const doDelete = async () => {
    setMessage("");
    const cols = Object.keys(checked).filter((k) => checked[k]);
    if (cols.length === 0)
      return setMessage("Select at least one column to delete.");
    if (cols.some((c) => PROTECTED.has(String(c).toLowerCase())))
      return setMessage("One or more selected columns are protected.");

    try {
      setDeleting(true);
      const res = await fetch(`${API_BASE}/tables/delCol`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tableName, cols }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Delete failed");

      setMessage(`Deleted ${cols.length} column(s)..`);
      setChecked({});
      await onChanged?.();
    } catch (e) {
      setMessage(`Error: ${e.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // Preview of sanitized names & rejections
  const preview = (() => {
    if (!newColsText.trim()) return null;
    const raw = newColsText
      .split(/[\n,]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
    if (raw.length === 0) return null;

    const items = raw.map((r) => {
      const s = sanitizeName(r);
      const lower = s.toLowerCase();
      let status = "ok";
      let reason = "";

      if (!s) {
        status = "bad";
        reason = "invalid";
      } else if (PROTECTED.has(lower)) {
        status = "bad";
        reason = "protected";
      } else if (existingLower.has(lower)) {
        status = "bad";
        reason = "exists";
      }
      return { raw: r, safe: s, status, reason };
    });
    return items;
  })();

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-lg font-semibold">
            Manage columns – {tableName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="inline-flex rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setTab("add")}
              className={`px-4 py-2 text-sm ${
                tab === "add" ? "bg-gray-100 font-medium" : "bg-white"
              }`}
            >
              Add Columns
            </button>
            <button
              onClick={() => setTab("edit")}
              className={`px-4 py-2 text-sm ${
                tab === "edit" ? "bg-gray-100 font-medium" : "bg-white"
              }`}
            >
              Edit / Rename
            </button>
            <button
              onClick={() => setTab("delete")}
              className={`px-4 py-2 text-sm ${
                tab === "delete" ? "bg-gray-100 font-medium" : "bg-white"
              }`}
            >
              Delete Columns
            </button>
          </div>
        </div>

        {/* ---- ADD TAB ---- */}
        {tab === "add" && (
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                New column name(s)
              </label>
              <textarea
                value={newColsText}
                onChange={(e) => setNewColsText(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[90px]"
                placeholder={`e.g.\nphone\naddress_line_1, address_line_2\nDOB`}
              />
              {!!preview && (
                <div className="mt-2 text-xs text-gray-600 space-y-1">
                  <div className="font-medium">Preview:</div>
                  <ul className="list-disc ml-5 space-y-0.5">
                    {preview.map((p, i) => (
                      <li key={i}>
                        <span className="font-mono">{p.raw}</span>{" "}
                        {p.safe && p.safe !== p.raw && (
                          <>
                            → <span className="font-mono">{p.safe}</span>{" "}
                          </>
                        )}
                        {p.status === "bad" && (
                          <span className="text-red-600">({p.reason})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={doAdd}
                disabled={adding}
                className="rounded-xl px-4 py-2 bg-black text-white hover:bg-black/90 transition disabled:opacity-50"
              >
                {adding ? "Adding…" : "Add column(s)"}
              </button>
              <button
                onClick={() => {
                  setNewColsText("");
                  setMessage("");
                }}
                className="rounded-xl px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 transition"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* ---- EDIT TAB ---- */}
        {tab === "edit" && (
          <div className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Current column
                </label>
                <select
                  value={selectedCol}
                  onChange={(e) => setSelectedCol(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="">Select…</option>
                  {columns.map((c) => {
                    const protectedCol = PROTECTED.has(c.toLowerCase());
                    return (
                      <option key={c} value={c} disabled={protectedCol}>
                        {c} {protectedCol ? "(protected)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  New name (optional)
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="e.g. customer_phone"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Definition (SQL)
                </label>
                <input
                  value={def}
                  onChange={(e) => setDef(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="VARCHAR(255) | INT | DATETIME | TEXT …"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={doUpdate}
                disabled={
                  !selectedCol ||
                  PROTECTED.has(String(selectedCol).toLowerCase()) ||
                  saving
                }
                className="rounded-xl px-4 py-2 bg-black text-white hover:bg-black/90 transition disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button
                onClick={() => {
                  setSelectedCol("");
                  setNewName("");
                  setDef("VARCHAR(255)");
                  setMessage("");
                }}
                className="rounded-xl px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 transition"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* ---- DELETE TAB ---- */}
        {tab === "delete" && (
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-gray-700">
              Select columns to delete (protected columns are not available).
            </p>
            <div className="max-h-64 overflow-auto rounded-xl border border-gray-200">
              {editableColumns.length === 0 ? (
                <div className="p-3 text-sm text-gray-600">
                  No deletable columns.
                </div>
              ) : (
                <ul className="divide-y">
                  {editableColumns.map((c) => (
                    <li key={c} className="flex items-center gap-3 px-3 py-2">
                      <input
                        id={`chk-${c}`}
                        type="checkbox"
                        checked={!!checked[c]}
                        onChange={() => toggleCheck(c)}
                        className="h-4 w-4"
                      />
                      <label htmlFor={`chk-${c}`} className="text-sm">
                        {c}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              onClick={doDelete}
              disabled={deleting || Object.values(checked).every((v) => !v)}
              className="rounded-xl px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete selected"}
            </button>
          </div>
        )}

        {!!message && (
          <div
            className={`mx-5 mb-4 text-sm rounded-lg px-3 py-2 border ${
              message.startsWith("Error")
                ? "text-red-700 bg-red-50 border-red-200"
                : "text-emerald-700 bg-emerald-50 border-emerald-200"
            }`}
          >
            {message}
          </div>
        )}

        <div className="px-5 py-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
