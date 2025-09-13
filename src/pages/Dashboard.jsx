import { useState } from "react";
import Dash from "../components/Dash";
import Nav from "../components/Nav";
import Tables from "../components/Tables";
import DynamicTableForm from "../components/Aform";
import UsersQuality from "../components/Quality";

export default function Dashboard({}) {
  const [active, setActive] = useState("Dashboard");

  const navItems = ["Dashboard", "Form", "Tables"];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-r from-indigo-500 to-blue-500">
      {/* Nav at the top */}
      <div className="mt-6 flex justify-center">
        <Nav active={active} setActive={setActive} />
      </div>

      {/* Dash centered */}
      <div className="flex-1 flex justify-center items-center">
        <div className="w-6xl justify-self-center ">
          {active === "Dashboard" ? <Dash setActive={setActive} /> : null}
          {active === "Tables" ? <Tables /> : null}
          {active === "Form" ? <DynamicTableForm /> : null}
          {active === "Quality" ? <UsersQuality /> : null}
        </div>
      </div>
    </div>
  );
}
