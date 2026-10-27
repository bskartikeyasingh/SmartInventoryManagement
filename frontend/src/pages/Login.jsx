import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export const Login = () => {
  const { loginWithSupabase, loginDev } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSupabaseSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);
    try {
      await loginWithSupabase(email, password);
      addToast("Signed in successfully with Supabase Auth", "success");
      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      setErrorMessage(err.message || "Invalid email or password");
      addToast(err.message || "Failed to log in", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDevLogin = async (role) => {
    setLoading(true);
    try {
      const devEmail = role === "ADMIN" ? "admin@stockpilot.io" : "staff@stockpilot.io";
      const devName = role === "ADMIN" ? "Alex Mercer (Admin)" : "Jordan Reed (Staff)";
      await loginDev(devEmail, role, devName);
      addToast(`Logged in as ${role}`, "success");
      navigate("/");
    } catch (err) {
      addToast("Quick login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center p-4 select-none">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-vermilion text-white shadow-xl shadow-vermilion/25 mb-3">
            <Compass className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-charcoal tracking-tight">StockPilot</h1>
          <p className="text-sm text-secondary mt-1">Retail Operations & Real-time Inventory Management</p>
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-3xl border border-border p-7 sm:p-8 shadow-sm space-y-6">
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSupabaseSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-muted/60 focus:bg-white text-sm text-charcoal rounded-xl border border-border focus:border-vermilion focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-muted/60 focus:bg-white text-sm text-charcoal rounded-xl border border-border focus:border-vermilion focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-secondary hover:text-charcoal absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-vermilion hover:bg-vermilion-hover text-white text-sm font-semibold shadow-md shadow-vermilion/20 transition flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In with Supabase</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-secondary font-medium">Or One-Click Demo Access</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleQuickDevLogin("ADMIN")}
              disabled={loading}
              className="py-2.5 px-3 rounded-xl border border-border hover:border-charcoal bg-white text-charcoal text-xs font-semibold flex items-center justify-center gap-2 transition hover:bg-muted"
            >
              <ShieldCheck className="w-4 h-4 text-vermilion" />
              <span>Admin Demo</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDevLogin("STAFF")}
              disabled={loading}
              className="py-2.5 px-3 rounded-xl border border-border hover:border-charcoal bg-white text-charcoal text-xs font-semibold flex items-center justify-center gap-2 transition hover:bg-muted"
            >
              <UserCheck className="w-4 h-4 text-secondary" />
              <span>Staff Demo</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-secondary mt-6">
          StockPilot Retail Inventory System • Production Minded
        </div>
      </div>
    </div>
  );
};

export default Login;
