import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Layers,
  Boxes,
  Truck,
  ShoppingCart,
  Receipt,
  FileBarChart2,
  Settings,
  LogOut,
  X,
  Compass
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const Sidebar = ({ isMobileOpen, onCloseMobile }) => {
  const { user, isAdmin, logout } = useAuth();

  const navItems = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Products", path: "/products", icon: Package },
    { label: "Categories", path: "/categories", icon: Layers },
    { label: "Inventory", path: "/inventory", icon: Boxes },
    { label: "Purchases", path: "/purchases", icon: ShoppingCart },
    { label: "Suppliers", path: "/suppliers", icon: Truck },
    { label: "Sales", path: "/sales", icon: Receipt },
    { label: "Reports", path: "/reports", icon: FileBarChart2 },
    { label: "Settings", path: "/settings", icon: Settings },
  ];

  const content = (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-vermilion flex items-center justify-center text-white shadow-md shadow-vermilion/20">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-charcoal">StockPilot</span>
            <span className="block text-[10px] font-semibold text-vermilion uppercase tracking-wider">Retail Ops</span>
          </div>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-secondary hover:text-charcoal hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-vermilion text-white shadow-md shadow-vermilion/25"
                    : "text-secondary hover:text-charcoal hover:bg-muted"
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer Card */}
      <div className="p-4 border-t border-border/60">
        <div className="p-3 bg-muted rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-charcoal text-white text-xs font-bold flex items-center justify-center shrink-0">
              {user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : "SP"}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-charcoal truncate">{user?.full_name || "Staff"}</div>
              <div className="text-[11px] font-medium text-secondary capitalize">{user?.role?.toLowerCase() || "user"}</div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 rounded-lg text-secondary hover:text-red-600 hover:bg-white transition shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border h-screen sticky top-0 shrink-0 bg-white">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-xs h-full bg-white z-10 shadow-2xl animate-slide-in">
            {content}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
