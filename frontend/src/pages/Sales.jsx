import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Receipt,
  Plus,
  Search,
  RotateCw,
  Eye,
  Trash2,
  XCircle,
  ShoppingBag,
  ArrowRight
} from "lucide-react";

import apiClient from "../api/client";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import DataTable from "../components/ui/DataTable";
import StatusBadge from "../components/ui/StatusBadge";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";

export const Sales = () => {
  const { addToast } = useToast();
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();

  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(searchParams.get("action") === "new");
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // New Sale Form
  const [saleItems, setSaleItems] = useState([
    { product_id: "", quantity: 1, unit_price: "0.00" }
  ]);
  const [discountAmount, setDiscountAmount] = useState("0.00");
  const [notes, setNotes] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [salesRes, prodsRes] = await Promise.all([
        apiClient.get(`/sales${search ? `?search=${encodeURIComponent(search)}` : ""}`),
        apiClient.get("/products?limit=100")
      ]);
      setSales(salesRes.data);
      setProducts(prodsRes.data.items);
      if (prodsRes.data.items.length > 0 && !saleItems[0].product_id) {
        const first = prodsRes.data.items[0];
        setSaleItems([{
          product_id: first.id,
          quantity: 1,
          unit_price: first.selling_price.toString()
        }]);
      }
    } catch (err) {
      console.error("Failed to load sales data:", err);
      addToast("Failed to load sales records", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const handleAddItem = () => {
    const first = products[0];
    setSaleItems((prev) => [
      ...prev,
      {
        product_id: first ? first.id : "",
        quantity: 1,
        unit_price: first ? first.selling_price.toString() : "0.00"
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    setSaleItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...saleItems];
    updated[index][field] = value;
    if (field === "product_id") {
      const p = products.find((prod) => prod.id.toString() === value.toString());
      if (p) {
        updated[index].unit_price = p.selling_price.toString();
      }
    }
    setSaleItems(updated);
  };

  // Calculations
  const calculatedSubtotal = saleItems.reduce((acc, it) => {
    const q = parseInt(it.quantity, 10) || 0;
    const p = parseFloat(it.unit_price) || 0;
    return acc + (q * p);
  }, 0);

  const discountVal = parseFloat(discountAmount) || 0;
  const calculatedTotal = Math.max(0, calculatedSubtotal - discountVal);

  const handleCreateSaleSubmit = async (e) => {
    e.preventDefault();
    if (saleItems.length === 0) {
      addToast("Add at least one item to sale", "error");
      return;
    }

    // Check frontend stock preview
    for (const it of saleItems) {
      const p = products.find((prod) => prod.id.toString() === it.product_id.toString());
      if (p && it.quantity > p.quantity) {
        addToast(`Insufficient stock for ${p.name} (Available: ${p.quantity}, Requested: ${it.quantity})`, "error");
        return;
      }
    }

    setSubmitting(true);
    try {
      await apiClient.post("/sales", {
        items: saleItems.map((it) => ({
          product_id: parseInt(it.product_id, 10),
          quantity: parseInt(it.quantity, 10),
          unit_price: parseFloat(it.unit_price)
        })),
        discount_amount: discountVal,
        notes: notes || undefined
      });
      addToast("Sale registered successfully and stock deducted", "success");
      setCreateModalOpen(false);
      loadData();
    } catch (err) {
      addToast(err.response?.data?.detail || "Failed to record sale", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSale = async () => {
    if (!selectedSale) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/sales/${selectedSale.id}/cancel`);
      addToast(`Sale ${selectedSale.sale_number} cancelled and inventory restored`, "success");
      setCancelDialogOpen(false);
      loadData();
    } catch (err) {
      addToast(err.response?.data?.detail || "Failed to cancel sale", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: "Receipt #",
      accessor: "sale_number",
      render: (row) => <span className="font-bold text-charcoal">{row.sale_number}</span>
    },
    {
      header: "Date",
      accessor: "created_at",
      render: (row) => (
        <span className="text-xs text-secondary font-mono">
          {new Date(row.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
      )
    },
    {
      header: "Items",
      render: (row) => <span className="text-xs font-semibold text-charcoal">{row.items.length} product(s)</span>
    },
    {
      header: "Subtotal",
      accessor: "subtotal",
      className: "text-right",
      render: (row) => <span className="text-secondary">${Number(row.subtotal).toFixed(2)}</span>
    },
    {
      header: "Discount",
      accessor: "discount_amount",
      className: "text-right",
      render: (row) => <span className="text-xs text-secondary">-${Number(row.discount_amount).toFixed(2)}</span>
    },
    {
      header: "Total Paid",
      accessor: "total_amount",
      className: "text-right",
      render: (row) => <span className="font-bold text-charcoal">${Number(row.total_amount).toFixed(2)}</span>
    },
    {
      header: "Status",
      accessor: "status",
      className: "text-center",
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      header: "Actions",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => {
              setSelectedSale(row);
              setDetailModalOpen(true);
            }}
            title="View Receipt"
            className="p-1.5 rounded-lg text-secondary hover:text-charcoal hover:bg-muted transition"
          >
            <Eye className="w-4 h-4" />
          </button>

          {row.status === "COMPLETED" && isAdmin && (
            <button
              onClick={() => {
                setSelectedSale(row);
                setCancelDialogOpen(true);
              }}
              title="Cancel Sale"
              className="p-1.5 rounded-lg text-secondary hover:text-red-600 hover:bg-red-50 transition"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal tracking-tight">Sales Records</h1>
          <p className="text-sm text-secondary mt-1">Record retail transactions, customer checkouts, and historical receipts</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-border bg-white text-secondary hover:text-charcoal shadow-sm transition"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-vermilion" : ""}`} />
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-vermilion hover:bg-vermilion-hover text-white font-semibold text-xs shadow-md shadow-vermilion/20 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Sale</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sales by receipt number..."
            className="w-full pl-10 pr-4 py-2 bg-muted/60 focus:bg-white text-sm text-charcoal rounded-xl border border-transparent focus:border-border focus:outline-none transition"
          />
        </div>
      </div>

      {/* Sales DataTable */}
      <DataTable
        columns={columns}
        data={sales}
        loading={loading}
        emptyMessage="No sales recorded yet. Click 'Record New Sale' to start POS checkout."
      />

      {/* POS / Sale Creation Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Record Retail Sale"
        subtitle="Stock will be validated and deducted atomically upon completion"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSaleSubmit} className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-charcoal uppercase tracking-wider">Sale Line Items</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-semibold text-vermilion hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {saleItems.map((row, idx) => {
                const currentProd = products.find((p) => p.id.toString() === row.product_id.toString());
                const avail = currentProd ? currentProd.quantity : 0;
                const isOver = row.quantity > avail;

                return (
                  <div key={idx} className={`p-3 rounded-xl border transition ${isOver ? "bg-red-50/50 border-red-200" : "bg-muted/60 border-border"}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <select
                          value={row.product_id}
                          onChange={(e) => handleItemChange(idx, "product_id", e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-border text-xs focus:outline-none bg-white font-medium"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku} — {p.name} (${Number(p.selling_price).toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-20">
                        <input
                          type="number"
                          min="1"
                          required
                          value={row.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-border text-xs focus:outline-none bg-white text-center font-bold"
                        />
                      </div>

                      <div className="w-24 text-right">
                        <div className="text-xs font-bold text-charcoal">
                          ${(parseFloat(row.unit_price || 0) * parseInt(row.quantity || 0, 10)).toFixed(2)}
                        </div>
                      </div>

                      {saleItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-secondary hover:text-red-600 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] mt-1.5 px-1">
                      <span className={isOver ? "text-red-600 font-semibold" : "text-secondary"}>
                        Available Stock: {avail} {currentProd?.unit || "units"} {isOver && "(Insufficient stock!)"}
                      </span>
                      <span className="text-secondary">Unit Price: ${parseFloat(row.unit_price || 0).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Discount Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Sale Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Walk-in retail customer"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
              />
            </div>
          </div>

          {/* Pricing Summary Breakdown */}
          <div className="p-4 bg-muted rounded-xl space-y-1.5 text-xs">
            <div className="flex justify-between text-secondary">
              <span>Subtotal:</span>
              <span className="font-semibold text-charcoal">${calculatedSubtotal.toFixed(2)}</span>
            </div>
            {discountVal > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount Applied:</span>
                <span className="font-semibold">-${discountVal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-charcoal pt-2 border-t border-border">
              <span>Final Total:</span>
              <span className="text-vermilion">${calculatedTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-border text-sm font-semibold text-secondary hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-vermilion hover:bg-vermilion-hover text-white text-sm font-semibold shadow-md shadow-vermilion/20 transition flex items-center gap-2"
            >
              {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              Confirm & Complete Sale
            </button>
          </div>
        </form>
      </Modal>

      {/* Receipt Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={selectedSale ? `Receipt ${selectedSale.sale_number}` : "Sale Receipt"}
        subtitle={`Processed: ${selectedSale ? new Date(selectedSale.created_at).toLocaleString() : ""}`}
      >
        {selectedSale && (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-xl flex items-center justify-between text-xs">
              <div>Status: <StatusBadge status={selectedSale.status} /></div>
              <div>Staff: <strong>{selectedSale.creator_name || "Sales Staff"}</strong></div>
            </div>

            <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
              {selectedSale.items.map((it) => (
                <div key={it.id} className="p-3 bg-white flex justify-between text-xs">
                  <div>
                    <div className="font-semibold text-charcoal">{it.product_name}</div>
                    <div className="text-secondary">{it.quantity} x ${Number(it.unit_price).toFixed(2)}</div>
                  </div>
                  <div className="font-bold text-charcoal">${Number(it.line_total).toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-muted rounded-xl space-y-1 text-xs">
              <div className="flex justify-between text-secondary">
                <span>Subtotal:</span>
                <span>${Number(selectedSale.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-secondary">
                <span>Discount:</span>
                <span>-${Number(selectedSale.discount_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-charcoal pt-1.5 border-t border-border">
                <span>Total Amount:</span>
                <span>${Number(selectedSale.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-charcoal hover:bg-muted"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Sale Confirmation */}
      <ConfirmDialog
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={handleCancelSale}
        title="Cancel Sale & Restore Stock"
        message={`Are you sure you want to cancel ${selectedSale?.sale_number}? All sold items will be safely restocked into inventory with movement audit records.`}
        confirmText="Cancel Sale"
        confirmVariant="danger"
        loading={submitting}
      />
    </div>
  );
};

export default Sales;
