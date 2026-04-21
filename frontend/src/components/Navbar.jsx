import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { MessageSquare, LayoutDashboard, Layers, BookOpen, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/chat",        icon: MessageSquare,   label: "Chat"       },
  { to: "/dashboard",   icon: LayoutDashboard, label: "Dashboard"  },
  { to: "/flashcards",  icon: Layers,          label: "Flashcards" },
  { to: "/exam/setup",  icon: BookOpen,        label: "Exam"       },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <nav className="bg-gray-900 border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">

        {/* Logo */}
        <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 text-lg">
          JEE/NEET AI
        </span>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </div>

        {/* User + logout */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 hidden md:block truncate max-w-[140px]">
            {user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
