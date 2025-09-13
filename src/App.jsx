import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Otp from "./components/Otp";
import Signup from "./components/Signup";
import Login from "./components/Login";
import Reset from "./components/Reset";
import ChangePass from "./components/changePass";
import PassOtp from "./components/PassOtp";
import Dashboard from "./pages/Dashboard";
import TableView from "./pages/TableView";
import Submissions from "./pages/Submissions";

function App() {
  const [count, setCount] = useState(0);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/verifyOtp" element={<Otp />} />
      <Route path="/verifyPassOtp" element={<PassOtp />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset" element={<Reset />} />
      <Route path="/change" element={<ChangePass />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/table/:name" element={<TableView />} />
      <Route path="/submissions" element={<Submissions />} />
    </Routes>
  );
}

export default App;
