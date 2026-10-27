import React, { useState } from "react";
import { Search, Bell, ChevronDown, Menu, MapPin } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export const Header = ({ onOpenMobile }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-18 px-6 sm:px-8 border-b border-border/70 bg-white/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onOpenMobile}
          className="md:hidden p-2 rounded-xl text-secondary hover:text-charcoal hover:bg-muted"
        >
          <Menu className="w-5 h-5" />
        </button>

        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products, orders, SKUs..."
            className="w-full pl-10 pr-4 py-2 bg-muted/70 hover:bg-muted focus:bg-white text-sm text-charcoal rounded-xl border border-transparent focus:border-border focus:outline-none transition-all placeholder:text-secondary/70"
          />
        </form>
      </div>

      {/* Right: Store selector, Notifications, Profile avatar */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Store Location Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-white text-xs font-semibold text-charcoal shadow-sm cursor-pointer hover:bg-muted transition">
          <MapPin className="w-3.5 h-3.5 text-vermilion" />
          <span>Downtown Store</span>
          <ChevronDown className="w-3.5 h-3.5 text-secondary" />
        </div>

        {/* Notification Bell */}
        <button
          title="Notifications"
          onClick={() => navigate("/inventory")}
          className="relative p-2 rounded-xl text-secondary hover:text-charcoal hover:bg-muted transition"
        >
          <Bell className="w-5 h-5" />
          <span className="w-2 h-2 rounded-full bg-vermilion absolute top-2 right-2 ring-2 ring-white"></span>
        </button>

        {/* Avatar circle matching reference */}
        <div
          onClick={() => navigate("/settings")}
          className="w-9 h-9 rounded-full bg-vermilion text-white text-xs font-bold flex items-center justify-center cursor-pointer shadow-sm hover:opacity-90 transition ring-2 ring-vermilion/20"
        >
          {user?.full_name
            ? user.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase()
            : "AD"}
        </div>
      </div>
    </header>
  );
};

export default Header;
