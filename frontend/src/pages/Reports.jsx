import React, { useState, useEffect } from "react";
import {
  FileBarChart2,
  Download,
  RotateCw,
  TrendingUp,
  AlertTriangle,
  Boxes,
  DollarSign
} from "lucide-react";

import apiClient from "../api/client";
import { useToast } from "../context/ToastContext";
import DataTable from "../components/ui/DataTable";

export const Reports = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState("inventory"); // inventory, low-stock, movements, sales-summary, product-sales
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [salesSummary, setSalesSummary] = useState(null);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      if (activeTab === "inventory") {
        const res = await apiClient.get("/reports/inventory");
        setData(res.data);
      } else if (activeTab === "low-stock") {
        const res = await apiClient.get("/reports/low-stock");
        setData(res.data);
      } else if (activeTab === "movements") {
        const res = await apiClient.get("/reports/stock-movements");
        setData(res.data);
      } else if (activeTab === "sales-summary") {
        const res = await apiClient.get("/reports/sales-summary");
        setSalesSummary(res.data);
      } else if (activeTab === "product-sales") {
        const res = await apiClient.get("/reports/sales-by-product");
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to load report:", err);
      addToast("Failed to load report data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [activeTab]);

  const handleExportCSV = async () => {
    try {
      let exportType = "inventory";
      if (activeTab === "low-stock") exportType = "low-stock";
      else if (activeTab === "movements") exportType = "movements";
      else if (activeTab === "sales-summary" || activeTab === "product-sales") exportType = "sales";

      const res = await apiClient.get(`/reports/export?report_type=${exportType}`, {
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `stockpilot_report_${exportType}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast(`Exported ${exportType} report as CSV`, "success");
    } catch (err) {
      addToast("Failed to export report", "error");
    }
  };

  const tabs = [
    { id: "inventory", label: "Inventory Valuation", icon: Boxes },
    { id: "low-stock", label: "Low Stock Alert", icon: AlertTriangle },
    { id: "movements", label: "Stock Movements", icon: FileBarChart2 },
    { id: "sales-summary", label: "Sales & Profit Summary", icon: DollarSign },
    { id: "product-sales", label: "Product-wise Sales", icon: TrendingUp }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-secondary mt-1">Audited inventory valuations, profit summaries, and exportable business data</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchReportData}
            className="p-2.5 rounded-xl border border-border bg-white text-secondary hover:text-charcoal shadow-sm transition"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-vermilion" : ""}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-vermilion hover:bg-vermilion-hover text-white font-semibold text-xs shadow-md shadow-vermilion/20 transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-charcoal text-white shadow-sm"
                  : "bg-white text-secondary border border-border hover:text-charcoal"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-vermilion" : ""}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Inventory Valuation */}
      {activeTab === "inventory" && (
        <DataTable
          columns={[
            { header: "SKU", accessor: "sku", render: (r) => <span className="font-semibold text-charcoal">{r.sku}</span> },
            { header: "Product", accessor: "name" },
            { header: "Category", accessor: "category" },
            { header: "Units", accessor: "quantity", className: "text-center", render: (r) => <span className="font-bold">{r.quantity} {r.unit}</span> },
            { header: "Cost Price", accessor: "cost_price", className: "text-right", render: (r) => `$${Number(r.cost_price).toFixed(2)}` },
            { header: "Retail Price", accessor: "selling_price", className: "text-right", render: (r) => `$${Number(r.selling_price).toFixed(2)}` },
            { header: "Total Cost Value", accessor: "total_cost", className: "text-right", render: (r) => <span className="font-semibold text-charcoal">${Number(r.total_cost).toFixed(2)}</span> },
            { header: "Total Retail Value", accessor: "total_retail", className: "text-right", render: (r) => `$${Number(r.total_retail).toFixed(2)}` },
            { header: "Gross Margin", accessor: "margin_pct", className: "text-right", render: (r) => <span className="font-bold text-emerald-600">{r.margin_pct}%</span> }
          ]}
          data={data}
          loading={loading}
          emptyMessage="No inventory items found."
        />
      )}

      {/* Tab 2: Low Stock */}
      {activeTab === "low-stock" && (
        <DataTable
          columns={[
            { header: "SKU", accessor: "sku", render: (r) => <span className="font-semibold text-charcoal">{r.sku}</span> },
            { header: "Product", accessor: "name" },
            { header: "Category", accessor: "category" },
            { header: "Current Stock", accessor: "quantity", className: "text-center", render: (r) => <span className="font-bold text-rose-600">{r.quantity} {r.unit}</span> },
            { header: "Reorder Point", accessor: "reorder_level", className: "text-center" },
            { header: "Deficit", accessor: "deficit", className: "text-center", render: (r) => <span className="font-bold text-amber-600">+{r.deficit} needed</span> }
          ]}
          data={data}
          loading={loading}
          emptyMessage="All stock quantities are above reorder thresholds."
        />
      )}

      {/* Tab 3: Stock Movements */}
      {activeTab === "movements" && (
        <DataTable
          columns={[
            { header: "Timestamp", accessor: "timestamp", className: "w-44 font-mono text-xs text-secondary", render: (r) => new Date(r.timestamp).toLocaleString() },
            { header: "SKU", accessor: "sku", render: (r) => <span className="font-semibold">{r.sku}</span> },
            { header: "Product", accessor: "product_name" },
            { header: "Type", accessor: "movement_type" },
            { header: "Change", accessor: "quantity_change", className: "text-center", render: (r) => <span className={`font-bold ${r.quantity_change > 0 ? "text-emerald-600" : "text-rose-600"}`}>{r.quantity_change > 0 ? `+${r.quantity_change}` : r.quantity_change}</span> },
            { header: "Old → New", className: "text-center font-mono text-xs", render: (r) => `${r.quantity_before} → ${r.quantity_after}` },
            { header: "Reference / Reason", render: (r) => <span className="text-xs text-secondary">{r.reason || r.reference || "N/A"}</span> }
          ]}
          data={data}
          loading={loading}
          emptyMessage="No stock movements recorded."
        />
      )}

      {/* Tab 4: Sales Summary */}
      {activeTab === "sales-summary" && (
        <div className="space-y-5">
          {salesSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-border shadow-sm">
                <div className="text-xs font-semibold text-secondary uppercase">Completed Orders</div>
                <div className="text-2xl font-bold text-charcoal mt-1">{salesSummary.total_orders}</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-border shadow-sm">
                <div className="text-xs font-semibold text-secondary uppercase">Net Sales Revenue</div>
                <div className="text-2xl font-bold text-charcoal mt-1">${Number(salesSummary.net_sales).toFixed(2)}</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-border shadow-sm">
                <div className="text-xs font-semibold text-secondary uppercase">Estimated COGS</div>
                <div className="text-2xl font-bold text-secondary mt-1">${Number(salesSummary.estimated_cogs).toFixed(2)}</div>
              </div>
              <div className="bg-charcoal text-white p-5 rounded-2xl border border-charcoal-light shadow-sm">
                <div className="text-xs font-semibold text-white/60 uppercase">Estimated Gross Profit</div>
                <div className="text-2xl font-bold text-white mt-1">${Number(salesSummary.estimated_gross_profit).toFixed(2)}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Product-wise Sales */}
      {activeTab === "product-sales" && (
        <DataTable
          columns={[
            { header: "SKU", accessor: "sku", render: (r) => <span className="font-semibold text-charcoal">{r.sku}</span> },
            { header: "Product", accessor: "name" },
            { header: "Category", accessor: "category" },
            { header: "Units Sold", accessor: "units_sold", className: "text-center font-bold text-charcoal" },
            { header: "Total Revenue", accessor: "revenue", className: "text-right", render: (r) => <span className="font-bold text-charcoal">${Number(r.revenue).toFixed(2)}</span> },
            { header: "Wholesale COGS", accessor: "cogs", className: "text-right text-secondary", render: (r) => `$${Number(r.cogs).toFixed(2)}` },
            { header: "Gross Profit", accessor: "gross_profit", className: "text-right", render: (r) => <span className="font-bold text-emerald-600">${Number(r.gross_profit).toFixed(2)}</span> }
          ]}
          data={data}
          loading={loading}
          emptyMessage="No product sales records found."
        />
      )}
    </div>
  );
};

export default Reports;
