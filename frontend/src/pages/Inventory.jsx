import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Boxes,
  ArrowDownLeft,
  SlidersHorizontal,
  History,
  RotateCw,
  Search,
  Package,
  AlertCircle
} from "lucide-react";

import apiClient from "../api/client";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import DataTable from "../components/ui/DataTable";
import Modal from "../components/ui/Modal";

export const Inventory = () => {
  const { addToast } = useToast();
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();

  // Summary & Products
  const [summary, setSummary] = useState(null);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedMovementType, setSelectedMovementType] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMovements, setTotalMovements] = useState(0);

  // Modals
  const [receiveModalOpen, setReceiveModalOpen] = useState(searchParams.get("action") === "receive");
  const [adjustModalOpen, setAdjustModalOpen] = useState(searchParams.get("action") === "adjust");
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [receiveForm, setReceiveForm] = useState({
    product_id: "",
    quantity: 10,
    unit_cost: "",
    reference: "DIRECT_RECEIPT",
    notes: ""
  });

  const [adjustForm, setAdjustForm] = useState({
    product_id: "",
    adjustment_type: "INCREASE",
    quantity: 5,
    reason: ""
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, prodRes] = await Promise.all([
        apiClient.get("/inventory/summary"),
        apiClient.get("/products?limit=100")
      ]);
      setSummary(sumRes.data);
      setProducts(prodRes.data.items);
      if (prodRes.data.items.length > 0 && !receiveForm.product_id) {
        setReceiveForm((prev) => ({ ...prev, product_id: prodRes.data.items[0].id }));
        setAdjustForm((prev) => ({ ...prev, product_id: prodRes.data.items[0].id }));
      }
    } catch (err) {
      console.error("Failed to load inventory summary:", err);
      addToast("Failed to load inventory summary", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15"
      });
      if (selectedProductId) params.append("product_id", selectedProductId);
      if (selectedMovementType) params.append("movement_type", selectedMovementType);

      const res = await apiClient.get(`/inventory/movements?${params.toString()}`);
      setMovements(res.data.items);
      setTotalPages(res.data.total_pages);
      setTotalMovements(res.data.total);
    } catch (err) {
      console.error("Failed to fetch movements:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadMovements();
  }, [page, selectedProductId, selectedMovementType]);

  const handleReceiveSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post("/inventory/receive", {
        product_id: parseInt(receiveForm.product_id, 10),
        quantity: parseInt(receiveForm.quantity, 10),
        unit_cost: receiveForm.unit_cost ? parseFloat(receiveForm.unit_cost) : undefined,
        reference: receiveForm.reference || "DIRECT_RECEIPT",
        notes: receiveForm.notes || undefined
      });
      addToast("Stock received successfully", "success");
      setReceiveModalOpen(false);
      loadData();
      loadMovements();
    } catch (err) {
      addToast(err.response?.data?.detail || "Failed to receive stock", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustForm.reason || adjustForm.reason.trim().length < 3) {
      addToast("A mandatory reason is required for adjustments", "error");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post("/inventory/adjust", {
        product_id: parseInt(adjustForm.product_id, 10),
        adjustment_type: adjustForm.adjustment_type,
        quantity: parseInt(adjustForm.quantity, 10),
        reason: adjustForm.reason.trim()
      });
      addToast("Inventory adjusted successfully", "success");
      setAdjustModalOpen(false);
      setAdjustForm((prev) => ({ ...prev, reason: "", quantity: 5 }));
      loadData();
      loadMovements();
    } catch (err) {
      addToast(err.response?.data?.detail || "Failed to adjust stock", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const movementColumns = [
    {
      header: "Timestamp",
      accessor: "created_at",
      className: "w-40",
      render: (row) => (
        <span className="text-xs text-secondary font-mono">
          {new Date(row.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
      )
    },
    {
      header: "Product / SKU",
      accessor: "product_name",
      render: (row) => (
        <div>
          <div className="font-semibold text-charcoal">{row.product_name}</div>
          <div className="text-xs font-mono text-secondary">{row.sku}</div>
        </div>
      )
    },
    {
      header: "Movement Type",
      accessor: "movement_type",
      render: (row) => {
        const type = row.movement_type;
        const isPositive = row.quantity_change > 0;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            type === "OPENING_STOCK" ? "bg-blue-50 text-blue-700 border border-blue-200" :
            type === "PURCHASE_RECEIPT" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
            type === "SALE" ? "bg-orange-50 text-orange-700 border border-orange-200" :
            isPositive ? "bg-teal-50 text-teal-700 border border-teal-200" :
            "bg-rose-50 text-rose-700 border border-rose-200"
          }`}>
            {type.replace("_", " ")}
          </span>
        );
      }
    },
    {
      header: "Change",
      accessor: "quantity_change",
      className: "text-center",
      render: (row) => (
        <span className={`font-bold font-mono ${row.quantity_change > 0 ? "text-emerald-600" : "text-rose-600"}`}>
          {row.quantity_change > 0 ? `+${row.quantity_change}` : row.quantity_change}
        </span>
      )
    },
    {
      header: "Old → New",
      className: "text-center",
      render: (row) => (
        <span className="text-xs text-secondary font-mono">
          {row.quantity_before} → <strong className="text-charcoal">{row.quantity_after}</strong>
        </span>
      )
    },
    {
      header: "Reference & Reason",
      render: (row) => (
        <div>
          {row.reference_id && (
            <span className="text-xs font-semibold text-charcoal block">{row.reference_id}</span>
          )}
          <span className="text-xs text-secondary line-clamp-1">{row.reason || "N/A"}</span>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal tracking-tight">Inventory</h1>
          <p className="text-sm text-secondary mt-1">Stock levels, receiving, adjustments, and immutable movement history</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              loadData();
              loadMovements();
            }}
            className="p-2.5 rounded-xl border border-border bg-white text-secondary hover:text-charcoal shadow-sm transition"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-vermilion" : ""}`} />
          </button>

          <button
            onClick={() => setReceiveModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl border border-border bg-white text-charcoal hover:bg-muted font-semibold text-xs shadow-sm transition flex items-center gap-2"
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            <span>Receive Stock</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setAdjustModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-charcoal hover:bg-charcoal-light text-white font-semibold text-xs shadow-md transition flex items-center gap-2"
            >
              <SlidersHorizontal className="w-4 h-4 text-vermilion" />
              <span>Manual Adjustment</span>
            </button>
          )}
        </div>
      </div>

      {/* Stock Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
          <div className="text-xs uppercase font-semibold text-secondary">Total In-Stock Units</div>
          <div className="text-2xl sm:text-3xl font-bold text-charcoal mt-1">
            {summary ? summary.total_units_in_stock.toLocaleString() : "0"}
          </div>
          <div className="text-xs text-secondary mt-1">Across all active items</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
          <div className="text-xs uppercase font-semibold text-secondary">Inventory Cost Valuation</div>
          <div className="text-2xl sm:text-3xl font-bold text-charcoal mt-1">
            ${summary ? Number(summary.total_inventory_cost).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
          </div>
          <div className="text-xs text-secondary mt-1">Asset valuation at cost</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
          <div className="text-xs uppercase font-semibold text-amber-700">Low Stock Breaches</div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-600 mt-1">
            {summary ? summary.low_stock_count : "0"}
          </div>
          <div className="text-xs text-secondary mt-1">Products below reorder point</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
          <div className="text-xs uppercase font-semibold text-rose-700">Depleted Items</div>
          <div className="text-2xl sm:text-3xl font-bold text-rose-600 mt-1">
            {summary ? summary.out_of_stock_count : "0"}
          </div>
          <div className="text-xs text-secondary mt-1">Completely out of stock</div>
        </div>
      </div>

      {/* Stock Movement Audit Log Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-vermilion" />
            <h2 className="text-lg font-bold text-charcoal">Stock Movement History</h2>
            <span className="text-xs text-secondary">({totalMovements} entries recorded)</span>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <select
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-white border border-border rounded-xl text-xs font-medium text-charcoal focus:outline-none cursor-pointer"
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>

            <select
              value={selectedMovementType}
              onChange={(e) => {
                setSelectedMovementType(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-white border border-border rounded-xl text-xs font-medium text-charcoal focus:outline-none cursor-pointer"
            >
              <option value="">All Movement Types</option>
              <option value="OPENING_STOCK">Opening Stock</option>
              <option value="PURCHASE_RECEIPT">Purchase Receipt</option>
              <option value="SALE">Sale</option>
              <option value="ADJUSTMENT_INCREASE">Adjustment (Increase)</option>
              <option value="ADJUSTMENT_DECREASE">Adjustment (Decrease)</option>
            </select>
          </div>
        </div>

        <DataTable
          columns={movementColumns}
          data={movements}
          loading={loading}
          page={page}
          totalPages={totalPages}
          totalItems={totalMovements}
          onPageChange={setPage}
          emptyMessage="No stock movements match the selected filters."
        />
      </div>

      {/* Receive Stock Modal */}
      <Modal
        isOpen={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        title="Direct Stock Receive"
        subtitle="Record arriving stock to increment physical quantities"
      >
        <form onSubmit={handleReceiveSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">Select Product *</label>
            <select
              required
              value={receiveForm.product_id}
              onChange={(e) => setReceiveForm({ ...receiveForm, product_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name} (Current: {p.quantity} {p.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Quantity to Receive *</label>
              <input
                type="number"
                min="1"
                required
                value={receiveForm.quantity}
                onChange={(e) => setReceiveForm({ ...receiveForm, quantity: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Unit Cost ($ optional)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={receiveForm.unit_cost}
                onChange={(e) => setReceiveForm({ ...receiveForm, unit_cost: e.target.value })}
                placeholder="Leave blank to keep existing"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">Reference / Invoice #</label>
            <input
              type="text"
              value={receiveForm.reference}
              onChange={(e) => setReceiveForm({ ...receiveForm, reference: e.target.value })}
              placeholder="e.g. INV-2026-901"
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">Notes</label>
            <textarea
              rows={2}
              value={receiveForm.notes}
              onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-border">
            <button
              type="button"
              onClick={() => setReceiveModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-border text-sm font-semibold text-secondary hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-vermilion hover:bg-vermilion-hover text-white text-sm font-semibold shadow-md shadow-vermilion/20 transition flex items-center gap-2"
            >
              {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              Confirm Receive
            </button>
          </div>
        </form>
      </Modal>

      {/* Manual Stock Adjust Modal */}
      <Modal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title="Manual Stock Adjustment"
        subtitle="Adjustments require a mandatory audit reason and cannot result in negative stock"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">Select Product *</label>
            <select
              required
              value={adjustForm.product_id}
              onChange={(e) => setAdjustForm({ ...adjustForm, product_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name} (Current: {p.quantity} {p.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Adjustment Action *</label>
              <select
                value={adjustForm.adjustment_type}
                onChange={(e) => setAdjustForm({ ...adjustForm, adjustment_type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
              >
                <option value="INCREASE">Increase Stock (+)</option>
                <option value="DECREASE">Decrease Stock (-)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Units *</label>
              <input
                type="number"
                min="1"
                required
                value={adjustForm.quantity}
                onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              Mandatory Reason * <span className="text-secondary font-normal">(required for audit trail)</span>
            </label>
            <textarea
              rows={3}
              required
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
              placeholder="e.g. Cycle count discrepancy resolved, damaged in transit, etc."
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-border">
            <button
              type="button"
              onClick={() => setAdjustModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-border text-sm font-semibold text-secondary hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-charcoal hover:bg-charcoal-light text-white text-sm font-semibold shadow-md transition flex items-center gap-2"
            >
              {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              Save Adjustment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Inventory;
