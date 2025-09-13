import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// Build API base from Vite env (handles trailing slash)
const API_BASE = (() => {
  const raw = import.meta.env.VITE_API_URL || "http://localhost:3000/";
  const base = raw.replace(/\s+$/, "");
  const noTrail = base.replace(/\/+$/, "");
  return `${noTrail}/api`;
})();

export default function PassOtp() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const email =
    typeof window !== "undefined" ? localStorage.getItem("email") : null;
  const route =
    (typeof window !== "undefined" && localStorage.getItem("route")) ||
    "/#/login";

  const onChange = (e) => setOtp(e.target.value);

  const verifyOtp = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email)
      return setErrorMsg("No email found. Please restart the reset flow.");
    if (!otp || otp.trim().length < 4)
      return setErrorMsg("Enter the 4–8 digit code from your email.");

    try {
      setSubmitting(true);
      const result = await fetch(`${API_BASE}/users/verifyotp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "reset", otp: otp.trim() }),
      });

      const data = await result.json().catch(() => ({}));
      if (!result.ok) {
        throw new Error(data?.message || "Invalid or expired code");
      }

      navigate(`${route}`, { replace: true });
    } catch (err) {
      setErrorMsg(err.message || "Verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-r from-indigo-500 to-blue-500">
      <form
        onSubmit={verifyOtp}
        className="flex flex-col gap-4 bg-white rounded-2xl shadow-lg p-8 w-full max-w-md border-2 border-[#967aa1]"
      >
        {/* Title */}
        <h1 className="text-2xl font-bold text-[#192a51]">Verify OTP</h1>

        <input
          onChange={onChange}
          id="otp"
          name="otp"
          value={otp}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Enter OTP"
          required
          className="w-full px-4 py-3 text-[#192a51] border border-[#aaa1c8] rounded-lg 
                   focus:outline-none focus:ring-2 focus:ring-[#192a51] 
                   transition"
        />

        <button
          type="submit"
          disabled={submitting}
          className="bg-[#192a51] w-full py-3 rounded-lg font-semibold text-white 
                   transition transform hover:scale-[1.02] hover:shadow-md text-center disabled:opacity-50"
        >
          {submitting ? "Verifying…" : "Next"}
        </button>

        {errorMsg ? <p className="text-sm text-red-500">{errorMsg}</p> : null}

        {/* Small link */}
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
    </div>
  );
}
