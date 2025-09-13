// Nav.jsx
export default function Nav({ active, setActive }) {
  const navItems = ["Dashboard", "Form", "Tables", "Quality"];

  const onLogout = () => {
    try {
      localStorage.removeItem("token");
      // (optional) clear any other auth/cache you use
      // sessionStorage.clear();
      // localStorage.clear(); // <- only if you want to wipe everything
    } catch {}
    window.location.href = "/"; // hard redirect to home
  };

  return (
    <nav className="bg-white/10 backdrop-blur text-white text-lg border border-white/20 px-6 py-3 rounded-xl shadow-md w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-6">
        {/* Left: nav items */}
        <div className="flex items-center gap-6">
          {navItems.map((item) => (
            <span
              key={item}
              onClick={() => setActive(item)}
              className={`cursor-pointer relative pb-1 transition-colors duration-300
                ${active === item ? "font-semibold" : "hover:text-gray-200"}
              `}
            >
              {item}
              {active === item && (
                <span className="absolute left-0 bottom-0 w-full h-[2px] bg-white rounded-md"></span>
              )}
            </span>
          ))}
        </div>

        {/* Right: logout */}
        <button
          onClick={onLogout}
          className="px-4 py-2 rounded-lg bg-white text-indigo-700 font-medium hover:bg-white/90 transition shadow"
          aria-label="Log out"
          title="Log out"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
