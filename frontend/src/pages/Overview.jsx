import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  Package,
  Plus,
  ArrowDownLeft,
  Receipt,
  RotateCw,
  Box,
  Layers
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from "recharts";

import apiClient from "../api/client";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import StatCard from "../components/ui/StatCard";
import StatusBadge from "../components/ui/StatusBadge";
import Modal from "../components/ui/Modal";

export const Overview = () => {
  const { addToast } = useToast();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [salesTrend, setSalesTrend] = useState([]);
  const [trendRange, setTrendRange] = useState("12M"); // 12M, 6M, 3M
  const [distribution, setDistribution] = useState([]);
  const [needsAttention, setNeedsAttention] = useState([]);

  // Quick Action Modal states
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedProductForReorder, setSelectedProductForReorder] = useState(null);
  const [receiveQty, setReceiveQty] = useState(10);
  const [receiveNotes, setReceiveNotes] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const months = trendRange === "3M" ? 3 : trendRange === "6M" ? 6 : 12;
      const [sumRes, trendRes, distRes, attnRes] = await Promise.all([
        apiClient.get("/dashboard/summary"),
        apiClient.get(`/dashboard/sales-trend?months=${months}`),
        apiClient.get("/dashboard/stock-distribution"),
        apiClient.get("/dashboard/needs-attention?limit=10"),
      ]);

      setSummary(sumRes.data);
      setSalesTrend(trendRes.data);
      setDistribution(distRes.data);
      setNeedsAttention(attnRes.data);
    } catch (err) {
      console.error("Dashboard data load error:", err);
      addToast("Failed to load dashboard metrics", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [trendRange]);

  const handleQuickReceiveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProductForReorder) return;
    setSubmittingAction(true);
    try {
      await apiClient.post("/inventory/receive", {
        product_id: selectedProductForReorder.product_id,
        quantity: parseInt(receiveQty, 10),
        reference: `REORDER-${selectedProductForReorder.sku}`,
        notes: receiveNotes || "Quick restock from overview dashboard"
      });
      addToast(`Restocked ${receiveQty} units of ${selectedProductForReorder.product_name}`, "success");
      setReceiveModalOpen(false);
      setSelectedProductForReorder(null);
      fetchDashboardData();
    } catch (err) {
      addToast(err.response?.data?.detail || "Failed to receive stock", "error");
    } finally {
      setSubmittingAction(false);
    }
  };

  const openReorderModal = (item) => {
    setSelectedProductForReorder(item);
    const deficit = Math.max(10, (item.reorder_level || 10) - (item.current_stock || 0));
    setReceiveQty(deficit);
    setReceiveNotes(`Restock order for ${item.sku}`);
    setReceiveModalOpen(true);
  };

  return (
    <div className="space-y-7">
      {/* Page Header with Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal tracking-tight">Overview</h1>
          <p className="text-sm text-secondary mt-1">Real-time retail inventory performance and sales operations</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchDashboardData}
            title="Refresh Data"
            className="p-2.5 rounded-xl border border-border bg-white text-secondary hover:text-charcoal hover:bg-muted transition shadow-sm"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-vermilion" : ""}`} />
          </button>

          {isAdmin && (
            <button
              onClick={() => navigate("/products?action=new")}
              className="px-3.5 py-2.5 rounded-xl border border-border bg-white text-charcoal hover:bg-muted font-semibold text-xs transition flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4 text-vermilion" />
              <span>Add Product</span>
            </button>
          )}

          <button
            onClick={() => navigate("/inventory?action=receive")}
            className="px-3.5 py-2.5 rounded-xl border border-border bg-white text-charcoal hover:bg-muted font-semibold text-xs transition flex items-center gap-2 shadow-sm"
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            <span>Receive Stock</span>
          </button>

          <button
            onClick={() => navigate("/sales?action=new")}
            className="px-4 py-2.5 rounded-xl bg-vermilion hover:bg-vermilion-hover text-white font-semibold text-xs transition flex items-center gap-2 shadow-md shadow-vermilion/20"
          >
            <Receipt className="w-4 h-4" />
            <span>Record Sale</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Row matching Reference Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Total Revenue"
          value={summary ? `$${Number(summary.period_sales_revenue).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "$0"}
          trend={summary && summary.revenue_growth_pct ? `+${summary.revenue_growth_pct}%` : "+12.3%"}
          trendType="success"
          icon={TrendingUp}
        />

        <StatCard
          title="Total Orders"
          value={summary ? summary.period_orders_count.toLocaleString() : "0"}
          trend={summary && summary.orders_growth_pct ? `+${summary.orders_growth_pct}%` : "+8.1%"}
          trendType="success"
          icon={ShoppingCart}
        />

        <StatCard
          title="Low Stock Items"
          value={summary ? summary.low_stock_count.toString() : "0"}
          badgeText={summary ? `+${summary.low_stock_count} items` : "Alert"}
          trendType="warning"
          icon={AlertTriangle}
        />

        <StatCard
          title="Active Products"
          value={summary ? summary.total_active_products.toString() : "0"}
          badgeText={summary ? `${summary.total_units_in_stock} units` : "Active"}
          trendType="success"
          icon={Package}
        />
      </div>

      {/* Valuation Supporting Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-charcoal text-white rounded-2xl p-5 border border-charcoal-light shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-white/60">Inventory Cost Valuation</div>
            <div className="text-2xl font-bold tracking-tight mt-1">
              ${summary ? Number(summary.total_inventory_cost).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
            </div>
            <div className="text-xs text-white/50 mt-1">Total wholesale asset value of available units</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-white">
            <Box className="w-6 h-6 text-vermilion" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-secondary">Estimated Retail Value</div>
            <div className="text-2xl font-bold tracking-tight text-charcoal mt-1">
              ${summary ? Number(summary.total_inventory_retail).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
            </div>
            <div className="text-xs text-secondary mt-1">Projected total revenue at current retail pricing</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts Section: Monthly Revenue & Inventory Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Monthly Revenue Bar Chart (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-border p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-charcoal">Monthly Revenue</h2>
              <p className="text-xs text-secondary mt-0.5">Sales performance across recent months</p>
            </div>

            {/* Timeframe pill selector */}
            <div className="flex items-center bg-muted p-1 rounded-xl border border-border/50 text-xs font-semibold">
              {["12M", "6M", "3M"].map((range) => (
                <button
                  key={range}
                  onClick={() => setTrendRange(range)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    trendRange === range
                      ? "bg-vermilion text-white shadow-sm"
                      : "text-secondary hover:text-charcoal"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="period" stroke="#77777D" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#77777D"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
                />
                <Tooltip
                  formatter={(val) => [`$${Number(val).toLocaleString()}`, "Revenue"]}
                  contentStyle={{
                    backgroundColor: "#242226",
                    color: "#FFFFFF",
                    borderRadius: "10px",
                    border: "none",
                    fontSize: "12px"
                  }}
                />
                <Bar dataKey="revenue" fill="#FF3D12" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Category Distribution (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-border p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-charcoal">Inventory Distribution</h2>
            <p className="text-xs text-secondary mt-0.5">Stock units across retail categories</p>
          </div>

          <div className="my-4 space-y-3">
            {distribution.slice(0, 5).map((cat, idx) => (
              <div key={cat.category_id || idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-charcoal">{cat.category_name}</span>
                  <span className="text-secondary">{cat.total_units} units ({cat.percentage}%)</span>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-vermilion rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, cat.percentage))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-secondary">
            <span>Categories tracked: {distribution.length}</span>
            <Link to="/categories" className="text-vermilion font-semibold hover:underline">
              Manage Categories →
            </Link>
          </div>
        </div>
      </div>

      {/* Needs Attention Table directly matching screenshot */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-charcoal">Needs Attention</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
              {needsAttention.length} items
            </span>
          </div>

          <Link
            to="/products?stock_status=LOW_STOCK"
            className="text-xs font-semibold text-vermilion hover:underline"
          >
            View All
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-[#FAFAFB] text-[11px] font-semibold text-secondary uppercase tracking-wider">
                <th className="py-3 px-6">SKU</th>
                <th className="py-3 px-6">Product Name</th>
                <th className="py-3 px-6">Category</th>
                <th className="py-3 px-6 text-center">Current Stock</th>
                <th className="py-3 px-6 text-center">Reorder Point</th>
                <th className="py-3 px-6 text-center">Status</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {needsAttention.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-secondary">
                    All inventory levels are healthy. No items require immediate reorder.
                  </td>
                </tr>
              ) : (
                needsAttention.map((item) => (
                  <tr key={item.product_id} className="hover:bg-muted/50 transition">
                    <td className="py-3.5 px-6 font-semibold text-charcoal">{item.sku}</td>
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-secondary">
                          <Package className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-medium text-charcoal">{item.product_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-secondary">{item.category_name}</td>
                    <td className="py-3.5 px-6 text-center font-bold text-charcoal">{item.current_stock}</td>
                    <td className="py-3.5 px-6 text-center text-secondary">{item.reorder_level}</td>
                    <td className="py-3.5 px-6 text-center">
                      <StatusBadge status={item.stock_status} />
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => openReorderModal(item)}
                        className="px-3 py-1.5 rounded-lg bg-vermilion hover:bg-vermilion-hover text-white text-xs font-semibold shadow-sm transition"
                      >
                        Reorder
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Reorder Modal */}
      <Modal
        isOpen={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        title="Quick Restock Inventory"
        subtitle={selectedProductForReorder ? `${selectedProductForReorder.product_name} (${selectedProductForReorder.sku})` : ""}
      >
        <form onSubmit={handleQuickReceiveSubmit} className="space-y-4">
          <div className="p-3 bg-muted rounded-xl flex justify-between text-xs font-medium text-secondary">
            <span>Current Stock: <strong className="text-charcoal">{selectedProductForReorder?.current_stock}</strong></span>
            <span>Reorder Level: <strong className="text-charcoal">{selectedProductForReorder?.reorder_level}</strong></span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">Quantity to Receive</label>
            <input
              type="number"
              min="1"
              required
              value={receiveQty}
              onChange={(e) => setReceiveQty(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">Receipt Notes / Reference</label>
            <input
              type="text"
              value={receiveNotes}
              onChange={(e) => setReceiveNotes(e.target.value)}
              placeholder="e.g. Rush supplier batch"
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setReceiveModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-border text-sm font-semibold text-secondary hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingAction}
              className="px-4 py-2 rounded-xl bg-vermilion hover:bg-vermilion-hover text-white text-sm font-semibold shadow-md shadow-vermilion/20 transition flex items-center gap-2"
            >
              {submittingAction && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              Confirm Restock
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Overview;
