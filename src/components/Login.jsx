import { useState } from "react";
import colors from "../assets/colors";
import { Link, useNavigate } from "react-router-dom";
import { Navigate } from "react-router-dom";

// Normalize backend API base URL from Vite env
const API_BASE = (() => {
  const raw = import.meta.env.VITE_API_URL || "http://localhost:3000/";
  const base = raw.replace(/\s+$/, "");
  const noTrail = base.replace(/\/+$/, "");
  return `${noTrail}/api`;
})();

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();
  const onchange = (e) => {
    const { name, value } = e.target;
    if (name === "email") setEmail(value);
    if (name === "password") setPassword(value);
  };

  const login = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      const result = await fetch(`${API_BASE}/users/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await result.json().catch(() => ({}));
      if (!result.ok || !data?.token) {
        throw new Error(data?.error || "Login failed");
      }

      localStorage.setItem("token", data.token);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-r from-indigo-500 to-blue-500">
      <form
        onSubmit={login}
        className="flex flex-col gap-4 bg-white rounded-2xl shadow-lg p-8 w-full max-w-md border-2 border-[#967aa1]"
      >
        {/* Title */}
        <h1 className="text-2xl font-bold text-[#192a51]">Log in</h1>

        <input
          onChange={onchange}
          id="email"
          name="email"
          value={email}
          placeholder="Enter your Email"
          required
          className="w-full px-4 py-3 text-[#192a51] border border-[#aaa1c8] rounded-lg 
                   focus:outline-none focus:ring-2 focus:ring-[#192a51] 
                   transition"
        />
        <input
          onChange={onchange}
          id="password"
          name="password"
          value={password}
          type="password"
          placeholder="Enter your password"
          required
          className="w-full px-4 py-3 text-[#192a51] border border-[#aaa1c8] rounded-lg 
                   focus:outline-none focus:ring-2 focus:ring-[#192a51] 
                   transition"
        />

        <button
          type="submit"
          className="bg-[#192a51] w-full py-3 rounded-lg font-semibold text-white 
                   transition transform hover:scale-[1.02] hover:shadow-md text-center"
        >
          Next
        </button>

        {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}

        {/* Small link */}
        <p className="text-sm text-gray-500">
          Forgot your password?{" "}
          <Link
            to="/reset"
            className="text-[#967aa1] font-medium hover:underline"
          >
            Reset
          </Link>
        </p>
      </form>
    </div>
  );
}
