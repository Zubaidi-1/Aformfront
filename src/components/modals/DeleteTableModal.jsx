import { useState } from "react";

export default function DeleteTableModal({
  tableName,
  token,
  onClose,
  onDeleted,
}) {
  const [working, setWorking] = useState(false);
  const [msg, setMsg] = useState("");

  const doDelete = async () => {
    setMsg("");
    try {
      setWorking(true);

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}api/tables/deleteTables`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tableName }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to delete table");

      setMsg("Table deleted.");
      onDeleted?.();
    } catch (e) {
      setMsg(`Error: ${e.message}`);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="px-5 py-4 border-b">
          <h3 className="text-lg font-semibold text-red-700">Delete Table</h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{tableName}</span>? This action
            cannot be undone.
          </p>
          {!!msg && (
            <div
              className={`text-sm rounded-lg px-3 py-2 border ${
                msg.startsWith("Error")
                  ? "text-red-700 bg-red-50 border-red-200"
                  : "text-emerald-700 bg-emerald-50 border-emerald-200"
              }`}
            >
              {msg}
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={doDelete}
            disabled={working}
            className="rounded-xl px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
          >
            {"Delete table"}
          </button>
        </div>
      </div>
    </div>
  );
}
