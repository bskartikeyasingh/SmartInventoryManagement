import React, { useState } from "react";
import {
  User,
  Shield,
  Database,
  CheckCircle2,
  RotateCw,
  Sparkles,
  Server,
  Key
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import apiClient from "../api/client";

export const Settings = () => {
  const { user, isAdmin, loginDev } = useAuth();
  const { addToast } = useToast();
  const [switchingRole, setSwitchingRole] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://dcnpylkjncogzsfuvoyq.supabase.co";

  const handleRoleToggle = async (newRole) => {
    setSwitchingRole(true);
    try {
      const email = newRole === "ADMIN" ? "admin@stockpilot.io" : "staff@stockpilot.io";
      const name = newRole === "ADMIN" ? "Alex Mercer (Admin)" : "Jordan Reed (Staff)";
      await loginDev(email, newRole, name);
      addToast(`Switched active session to ${newRole} role`, "success");
    } catch (err) {
      addToast("Failed to switch role", "error");
    } finally {
      setSwitchingRole(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal tracking-tight">Settings & Workspace</h1>
        <p className="text-sm text-secondary mt-1">Manage user identity, Supabase database integration, and role permissions</p>
      </div>

      {/* User Profile & Role Switcher */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-muted text-charcoal flex items-center justify-center">
            <User className="w-5 h-5 text-vermilion" />
          </div>
          <div>
            <h2 className="text-base font-bold text-charcoal">Active User Profile</h2>
            <p className="text-xs text-secondary">Authenticated session and backend authority</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 bg-muted rounded-xl">
            <div className="text-[11px] font-semibold text-secondary uppercase">Full Name</div>
            <div className="text-sm font-bold text-charcoal mt-0.5">{user?.full_name || "Admin User"}</div>
          </div>

          <div className="p-3.5 bg-muted rounded-xl">
            <div className="text-[11px] font-semibold text-secondary uppercase">Email Address</div>
            <div className="text-sm font-bold text-charcoal mt-0.5">{user?.email || "admin@stockpilot.io"}</div>
          </div>
        </div>

        {/* Role Switcher Test Box */}
        <div className="p-4 bg-muted/70 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-vermilion" />
              <span className="text-sm font-bold text-charcoal">Role-Based Access Control</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                isAdmin ? "bg-charcoal text-white" : "bg-muted border border-border text-charcoal"
              }`}>
                {user?.role || "STAFF"}
              </span>
            </div>
            <p className="text-xs text-secondary mt-1">
              Switch role instantly to test backend permissions (Admin vs Staff)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRoleToggle("ADMIN")}
              disabled={switchingRole || isAdmin}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                isAdmin
                  ? "bg-charcoal text-white shadow-sm"
                  : "bg-white border border-border text-secondary hover:text-charcoal"
              }`}
            >
              ADMIN Role
            </button>
            <button
              onClick={() => handleRoleToggle("STAFF")}
              disabled={switchingRole || !isAdmin}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                !isAdmin
                  ? "bg-charcoal text-white shadow-sm"
                  : "bg-white border border-border text-secondary hover:text-charcoal"
              }`}
            >
              STAFF Role
            </button>
          </div>
        </div>
      </div>

      {/* Database & Supabase Integration Status */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-muted text-charcoal flex items-center justify-center">
            <Database className="w-5 h-5 text-vermilion" />
          </div>
          <div>
            <h2 className="text-base font-bold text-charcoal">Supabase & Database Architecture</h2>
            <p className="text-xs text-secondary">Real database connection and persistence settings</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="p-3 bg-muted rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-charcoal">Supabase Endpoint</span>
            </div>
            <span className="font-mono text-secondary truncate max-w-xs">{supabaseUrl}</span>
          </div>

          <div className="p-3 bg-muted rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-vermilion" />
              <span className="font-semibold text-charcoal">FastAPI Backend Authority</span>
            </div>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Active (/api/v1)
            </span>
          </div>

          <div className="p-3 bg-muted rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-charcoal">PostgreSQL Schema Migrations</span>
            </div>
            <span className="text-secondary font-mono">backend/supabase_schema.sql</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
