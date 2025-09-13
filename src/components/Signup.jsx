import { useState } from "react";

// Build API base from Vite env (handles trailing slash/spaces)
const API_BASE = (() => {
  const raw = import.meta.env.VITE_API_URL || "http://localhost:3000/";
  const base = raw.replace(/\s+$/, "");
  const noTrail = base.replace(/\/+$/, "");
  return `${noTrail}/api`;
})();

export default function Signup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confpassword, setConfPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const email =
    typeof window !== "undefined"
      ? (localStorage.getItem("email") || "").trim()
      : "";

  const matched = () => password === confpassword;

  const onChange = (e) => {
    const { name, value } = e.target;
    if (name === "firstName") setFirstName(value);
    if (name === "lastName") setLastName(value);
    if (name === "password") setPassword(value);
    if (name === "confpassword") setConfPassword(value);
  };

  const signup = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email)
      return setErrorMsg("Email missing. Please start from the email step.");
    if (!matched()) return setErrorMsg("Passwords do not match");
    if (password.length < 8)
      return setErrorMsg("Password must be at least 8 characters");

    try {
      setSubmitting(true);
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email,
        password,
      };

      const result = await fetch(`${API_BASE}/users/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await result.json().catch(() => ({}));
      if (!result.ok) {
        throw new Error(data?.message || "Sign up failed");
      }

      // success → go to login
      window.location.href = "/#/login";
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-r from-indigo-500 to-blue-500">
      <form
        onSubmit={signup}
        className="flex flex-col gap-4 bg-white rounded-2xl shadow-lg p-8 w-full max-w-md border-2 border-[#967aa1]"
      >
        <h1 className="text-2xl font-bold text-[#192a51]">Sign up</h1>

        <input
          id="firstName"
          name="firstName"
          value={firstName}
          onChange={onChange}
          placeholder="Enter your name"
          required
          className="w-full px-4 py-3 text-[#192a51] border border-[#aaa1c8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#192a51] transition"
        />
        <input
          id="lastName"
          name="lastName"
          value={lastName}
          onChange={onChange}
          placeholder="Enter your last name"
          required
          className="w-full px-4 py-3 text-[#192a51] border border-[#aaa1c8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#192a51] transition"
        />
        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={onChange}
          placeholder="Enter your password"
          required
          className="w-full px-4 py-3 text-[#192a51] border border-[#aaa1c8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#192a51] transition"
        />
        <input
          id="confpassword"
          name="confpassword"
          type="password"
          value={confpassword}
          onChange={onChange}
          placeholder="Confirm password"
          required
          className="w-full px-4 py-3 text-[#192a51] border border-[#aaa1c8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#192a51] transition"
        />

        <button
          type="submit"
          disabled={submitting}
          className="bg-[#192a51] w-full py-3 rounded-lg font-semibold text-white transition transform hover:scale-[1.02] hover:shadow-md text-center disabled:opacity-50"
        >
          {submitting ? "Creating account…" : "Next"}
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
    </div>
  );
}
