import { useState } from "react";

// Build API base from Vite env (handles trailing slash/spaces)
const API_BASE = (() => {
  const raw = import.meta.env.VITE_API_URL || "http://localhost:3000/";
  const base = raw.replace(/\s+$/, "");
  const noTrail = base.replace(/\/+$/, "");
  return `${noTrail}/api`;
})();

export default function Reset() {
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setEmail(e.target.value);

  const sendSignupOtp = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const trimmed = email.trim();
    if (!trimmed) {
      return setErrorMsg("Please enter your email.");
    }

    try {
      setSubmitting(true);
      const result = await fetch(`${API_BASE}/users/sendotp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, type: "reset" }),
      });

      const data = await result.json().catch(() => ({}));
      if (!result.ok) {
        throw new Error(data?.message || "Failed to send OTP");
      }

      // set redirect info for the OTP screen & change password step
      localStorage.setItem("route", "/#/change");
      localStorage.setItem("email", trimmed);
      localStorage.setItem("otp_type", "reset");

      window.location.href = "/#/verifyPassOtp";
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-r from-indigo-500 to-blue-500">
      <form
        onSubmit={sendSignupOtp}
        className="flex flex-col gap-4 bg-white rounded-2xl shadow-lg p-8 w-full max-w-md border-2 border-[#967aa1]"
      >
        {/* Title */}
        <h1 className="text-2xl font-bold text-[#192a51]">Reset</h1>

        <input
          id="email"
          name="email"
          value={email}
          onChange={onChange}
          type="email"
          placeholder="Enter your Email"
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
          {submitting ? "Sending…" : "Next"}
        </button>

        {errorMsg ? <p className="text-red-500 text-sm">{errorMsg}</p> : null}

        {/* Small link */}
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
