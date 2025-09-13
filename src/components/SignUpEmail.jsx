import { useState } from "react";
import { Link } from "react-router-dom";

const API_BASE = (() => {
  const raw = import.meta.env.VITE_API_URL || "http://localhost:3000/";
  const base = raw.replace(/\s+$/, "");
  const noTrail = base.replace(/\/+$/, "");
  return `${noTrail}/api`;
})();
console.log(import.meta.env.VITE_API_URL);
export default function SignUpEmail() {
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setEmail(e.target.value);

  const sendSignupOtp = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const trimmed = email.trim();
    if (!trimmed) return setErrorMsg("Please enter your email.");

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/sendotp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, type: "signup" }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data?.message || "Failed to send code. Try again.");
        return;
      }

      localStorage.setItem("route", "/#/signup");
      localStorage.setItem("email", trimmed);
      localStorage.setItem("otp_type", "signup");
      window.location.href = "/#/verifyotp";
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={sendSignupOtp}
      className="flex flex-col gap-4 bg-white rounded-2xl shadow-lg p-8 w-full max-w-md border-2 border-[#967aa1]"
    >
      <h1 className="text-2xl font-bold text-[#192a51]">Sign up</h1>

      <input
        id="email"
        name="email"
        type="email"
        placeholder="Enter your email"
        required
        className="w-full px-4 py-3 text-[#192a51] border border-[#aaa1c8] rounded-lg 
                   focus:outline-none focus:ring-2 focus:ring-[#192a51] transition"
        onChange={onChange}
        value={email}
        disabled={loading}
      />

      <button
        type="submit"
        disabled={loading}
        className="bg-[#192a51] w-full py-3 rounded-lg font-semibold text-white 
                   transition transform hover:scale-[1.02] hover:shadow-md disabled:opacity-60"
      >
        {loading ? "Sending..." : "Create Account"}
      </button>

      {errorMsg ? <p className="text-sm text-red-500">{errorMsg}</p> : null}

      <p className="text-sm text-gray-500">
        Already have an account?{" "}
        <Link
          to="/login"
          className="text-[#967aa1] font-medium hover:underline"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
