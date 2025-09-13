import { useState } from "react";

export default function ChangePass() {
  const [password, setPassword] = useState("");
  const [confpassword, setConfPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const email =
    typeof window !== "undefined" ? localStorage.getItem("email") : null;

  // Build API base from Vite env (handles trailing slash)
  const API_BASE = (() => {
    const raw = import.meta.env.VITE_API_URL || "http://localhost:3000/";
    const base = raw.replace(/\s+$/, "");
    const noTrail = base.replace(/\/+$/, "");
    return `${noTrail}/api`;
  })();

  const matched = () => password === confpassword;

  const onChange = (e) => {
    const { name, value } = e.target;
    if (name === "password") setPassword(value);
    if (name === "confpassword") setConfPassword(value);
  };

  const changePass = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setOkMsg("");

    if (!email) {
      return setErrorMsg("No email found. Please restart the reset flow.");
    }
    if (!matched()) {
      return setErrorMsg("Passwords do not match");
    }
    if (password.length < 8) {
      return setErrorMsg("Password must be at least 8 characters");
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/users/changePass`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to change password");
      }

      setOkMsg("Password changed successfully. Redirecting to login…");
      // small delay so the user can read the message
      setTimeout(() => {
        window.location.href = "/#/login";
      }, 900);
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-r from-indigo-500 to-blue-500">
      <form
        onSubmit={changePass}
        className="flex flex-col gap-4 bg-white rounded-2xl shadow-lg p-8 w-full max-w-md border-2 border-[#967aa1]"
      >
        <h1 className="text-2xl font-bold text-[#192a51]">Reset Password</h1>

        <input
          id="password"
          name="password"
          type="password"
          placeholder="Enter your password"
          required
          value={password}
          onChange={onChange}
          className="w-full px-4 py-3 text-[#192a51] border border-[#aaa1c8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#192a51] transition"
        />
        <input
          id="confpassword"
          name="confpassword"
          type="password"
          placeholder="Confirm password"
          required
          value={confpassword}
          onChange={onChange}
          className="w-full px-4 py-3 text-[#192a51] border border-[#aaa1c8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#192a51] transition"
        />

        <button
          type="submit"
          disabled={submitting}
          className="bg-[#192a51] w-full py-3 rounded-lg font-semibold text-white transition transform hover:scale-[1.02] hover:shadow-md disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Next"}
        </button>

        {errorMsg ? (
          <p className="text-sm text-red-500">{errorMsg}</p>
        ) : okMsg ? (
          <p className="text-sm text-emerald-600">{okMsg}</p>
        ) : null}

        <p className="text-sm text-gray-500">
          Already have an account?{" "}
          <a
            href="/#/login"
            className="text-[#967aa1] font-medium hover:underline"
          >
            Log in
          </a>
        </p>
      </form>
    </div>
  );
}
