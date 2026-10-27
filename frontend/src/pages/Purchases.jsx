import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  ShoppingCart,
  CheckCircle,
  Truck,
  RotateCw,
  Eye,
  XCircle,
  PackageCheck,
  Trash2
} from "lucide-react";

import apiClient from "../api/client";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import DataTable from "../components/ui/DataTable";
import StatusBadge from "../components/ui/StatusBadge";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";

export const Purchases = () => {
  const { addToast } = useToast();
  const { isAdmin } = useAuth();

  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Create PO Form State
  const [createForm, setCreateForm] = useState({
    supplier_id: "",
    notes: "",
    items: [{ product_id: "", ordered_quantity: 10, unit_cost: "0.00" }]
  });

  // Receive PO Form State
  const [receiptItems, setReceiptItems] = useState([]);
  const [receiptRef, setReceiptRef] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [poRes, supRes, prodRes] = await Promise.all([
        apiClient.get(`/purchases${statusFilter ? `?status=${statusFilter}` : ""}`),
        apiClient.get("/suppliers"),
        apiClient.get("/products?limit=100")
      ]);
      setOrders(poRes.data);
      setSuppliers(supRes.data);
      setProducts(prodRes.data.items);
      if (supRes.data.length > 0 && !createForm.supplier_id) {
        setCreateForm((prev) => ({ ...prev, supplier_id: supRes.data[0].id }));
      }
      if (prodRes.data.items.length > 0 && !createForm.items[0].product_id) {
        setCreateForm((prev) => ({
          ...prev,
          items: [{
            product_id: prodRes.data.items[0].id,
            ordered_quantity: 10,
            unit_cost: prodRes.data.items[0].cost_price.toString()
          }]
        }));
      }
    } catch (err) {
      console.error("Failed to load purchases:", err);
      addToast("Failed to load purchase orders", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleAddItemRow = () => {
    const defaultProduct = products[0];
    setCreateForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: defaultProduct ? defaultProduct.id : "",
          ordered_quantity: 10,
          unit_cost: defaultProduct ? defaultProduct.cost_price.toString() : "0.00"
        }
      ]
    }));
  };

  const handleRemoveItemRow = (index) => {
    setCreateForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...createForm.items];
    updated[index][field] = value;
    if (field === "product_id") {
      const p = products.find((prod) => prod.id.toString() === value.toString());
      if (p) {
        updated[index].unit_cost = p.cost_price.toString();
      }
    }
    setCreateForm((prev) => ({ ...prev, items: updated }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (createForm.items.length === 0) {
      addToast("Add at least one item to purchase order", "error");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post("/purchases", {
        supplier_id: parseInt(createForm.supplier_id, 10),
        notes: createForm.notes || undefined,
        items: createForm.items.map((it) => ({
          product_id: parseInt(it.product_id, 10),
          ordered_quantity: parseInt(it.ordered_quantity, 10),
          unit_cost: parseFloat(it.unit_cost)
        }))
      });
      addToast("Purchase order drafted successfully", "success");
      setCreateModalOpen(false);
      loadData();
    } catch (err) {
      addToast(err.response?.data?.detail || "Failed to create purchase order", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOrderPO = async (poId) => {
    setSubmitting(true);
    try {
      await apiClient.post(`/purchases/${poId}/order`);
      addToast("Purchase order marked as ORDERED", "success");
      loadData();
      if (selectedOrder && selectedOrder.id === poId) {
        const fresh = await apiClient.get(`/purchases/${poId}`);
        setSelectedOrder(fresh.data);
      }
    } catch (err) {
      addToast(err.response?.data?.detail || "Failed to submit purchase order", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openReceiveModal = (order) => {
    setSelectedOrder(order);
    // Initialize receipt input for items that have remaining receivable quantity
    const itemsToReceive = order.items
      .filter((it) => it.remaining_quantity > 0)
      .map((it) => ({
        purchase_item_id: it.id,
        product_name: it.product_name,
        sku: it.sku,
        ordered: it.ordered_quantity,
        already_received: it.received_quantity,
        remaining: it.remaining_quantity,
        quantity_received: it.remaining_quantity // default to receiving all remaining
      }));
    setReceiptItems(itemsToReceive);
    setReceiptRef(`REC-${order.order_number}`);
    setReceiveModalOpen(true);
  };

  const handleReceiveSubmit = async (e) => {
    e.preventDefault();
    const validItems = receiptItems.filter((it) => parseInt(it.quantity_received, 10) > 0);
    if (validItems.length === 0) {
      addToast("Specify received quantity for at least one item", "error");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(`/purchases/${selectedOrder.id}/receipts`, {
        reference_number: receiptRef || undefined,
        items: validItems.map((it) => ({
          purchase_item_id: it.purchase_item_id,
          quantity_received: parseInt(it.quantity_received, 10)
        }))
      });
      addToast("Purchase receipt recorded and inventory incremented", "success");
      setReceiveModalOpen(false);
      loadData();
      if (selectedOrder) {
        const fresh = await apiClient.get(`/purchases/${selectedOrder.id}`);
        setSelectedOrder(fresh.data);
      }
    } catch (err) {
      addToast(err.response?.data?.detail || "Failed to process receipt", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPO = async () => {
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/purchases/${selectedOrder.id}/cancel`);
      addToast("Purchase order cancelled", "success");
      setCancelDialogOpen(false);
      loadData();
    } catch (err) {
      addToast(err.response?.data?.detail || "Failed to cancel order", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: "PO Number",
      accessor: "order_number",
      render: (row) => <span className="font-bold text-charcoal">{row.order_number}</span>
    },
    {
      header: "Supplier",
      accessor: "supplier_name",
      render: (row) => <span className="font-medium text-charcoal">{row.supplier_name || "N/A"}</span>
    },
    {
      header: "Order Date",
      accessor: "order_date",
      render: (row) => (
        <span className="text-xs text-secondary font-mono">
          {new Date(row.order_date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
        </span>
      )
    },
    {
      header: "Items",
      render: (row) => <span className="text-xs font-semibold text-charcoal">{row.items.length} line items</span>
    },
    {
      header: "Total Value",
      accessor: "total_amount",
      className: "text-right",
      render: (row) => <span className="font-semibold text-charcoal">${Number(row.total_amount).toFixed(2)}</span>
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
              setSelectedOrder(row);
              setDetailModalOpen(true);
            }}
            title="View Details"
            className="p-1.5 rounded-lg text-secondary hover:text-charcoal hover:bg-muted transition"
          >
            <Eye className="w-4 h-4" />
          </button>

          {row.status === "DRAFT" && isAdmin && (
            <button
              onClick={() => handleOrderPO(row.id)}
              title="Submit Order"
              className="px-2.5 py-1 bg-charcoal hover:bg-charcoal-light text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              Order
            </button>
          )}

          {(row.status === "ORDERED" || row.status === "PARTIALLY_RECEIVED") && (
            <button
              onClick={() => openReceiveModal(row)}
              title="Receive Stock"
              className="px-2.5 py-1 bg-vermilion hover:bg-vermilion-hover text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1"
            >
              <PackageCheck className="w-3.5 h-3.5" />
              Receive
            </button>
          )}

          {row.status === "DRAFT" && isAdmin && (
            <button
              onClick={() => {
                setSelectedOrder(row);
                setCancelDialogOpen(true);
              }}
              title="Cancel Order"
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal tracking-tight">Purchase Orders</h1>
          <p className="text-sm text-secondary mt-1">Manage vendor restock orders, tracking, and itemized receipt intake</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-border bg-white text-secondary hover:text-charcoal shadow-sm transition"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-vermilion" : ""}`} />
          </button>

          {isAdmin && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-vermilion hover:bg-vermilion-hover text-white font-semibold text-xs shadow-md shadow-vermilion/20 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Purchase Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-border shadow-sm flex items-center gap-3">
        <div className="w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-muted/60 focus:bg-white text-sm text-charcoal rounded-xl border border-transparent focus:border-border focus:outline-none transition cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ORDERED">Ordered</option>
            <option value="PARTIALLY_RECEIVED">Partially Received</option>
            <option value="RECEIVED">Received</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        emptyMessage="No purchase orders found."
      />

      {/* Create Purchase Order Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Purchase Order"
        subtitle="Draft a restock order with line item quantities and wholesale unit costs"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">Supplier *</label>
            <select
              required
              value={createForm.supplier_id}
              onChange={(e) => setCreateForm({ ...createForm, supplier_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.business_name} ({s.contact_name || s.email || "No contact"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-charcoal uppercase tracking-wider">Order Line Items</label>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs font-semibold text-vermilion hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {createForm.items.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2.5 bg-muted/70 rounded-xl border border-border">
                  <div className="flex-1">
                    <select
                      value={row.product_id}
                      onChange={(e) => handleItemChange(idx, "product_id", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border text-xs focus:outline-none bg-white"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24">
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="Qty"
                      value={row.ordered_quantity}
                      onChange={(e) => handleItemChange(idx, "ordered_quantity", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border text-xs focus:outline-none bg-white text-center"
                    />
                  </div>

                  <div className="w-28">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="Unit Cost"
                      value={row.unit_cost}
                      onChange={(e) => handleItemChange(idx, "unit_cost", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border text-xs focus:outline-none bg-white text-right"
                    />
                  </div>

                  {createForm.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(idx)}
                      className="p-1 text-secondary hover:text-red-600 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">Notes (Optional)</label>
            <textarea
              rows={2}
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-border">
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
              className="px-4 py-2 rounded-xl bg-vermilion hover:bg-vermilion-hover text-white text-sm font-semibold shadow-md shadow-vermilion/20 transition flex items-center gap-2"
            >
              {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              Save Draft PO
            </button>
          </div>
        </form>
      </Modal>

      {/* PO Details Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={selectedOrder ? `Purchase Order ${selectedOrder.order_number}` : "PO Details"}
        subtitle={`Supplier: ${selectedOrder?.supplier_name || "N/A"}`}
        maxWidth="max-w-2xl"
      >
        {selectedOrder && (
          <div className="space-y-5">
            <div className="flex items-center justify-between p-3 bg-muted rounded-xl text-xs">
              <div>Status: <StatusBadge status={selectedOrder.status} /></div>
              <div>Order Date: <strong>{new Date(selectedOrder.order_date).toLocaleDateString()}</strong></div>
              <div>Total: <strong>${Number(selectedOrder.total_amount).toFixed(2)}</strong></div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider mb-2">Ordered Items</h4>
              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                {selectedOrder.items.map((it) => (
                  <div key={it.id} className="p-3 bg-white flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-charcoal">{it.product_name}</div>
                      <div className="text-secondary font-mono">{it.sku}</div>
                    </div>
                    <div className="text-right">
                      <div>Ordered: <strong>{it.ordered_quantity}</strong> | Received: <strong className="text-emerald-600">{it.received_quantity}</strong></div>
                      <div className="text-secondary">Remaining: {it.remaining_quantity} @ ${Number(it.unit_cost).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedOrder.receipts && selectedOrder.receipts.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider mb-2">Receipt History</h4>
                <div className="space-y-1.5">
                  {selectedOrder.receipts.map((r) => (
                    <div key={r.id} className="p-2.5 bg-muted/50 rounded-lg text-xs flex justify-between text-secondary">
                      <span>Ref: <strong className="text-charcoal">{r.reference_number || "Direct"}</strong></span>
                      <span>Received: {new Date(r.received_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-border flex justify-end">
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

      {/* Receive Purchase Order Modal */}
      <Modal
        isOpen={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        title="Receive Purchase Items"
        subtitle={selectedOrder ? `Recording delivery against ${selectedOrder.order_number}` : ""}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleReceiveSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">Receipt Reference / Bill of Lading</label>
            <input
              type="text"
              value={receiptRef}
              onChange={(e) => setReceiptRef(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-charcoal uppercase tracking-wider mb-2">Items to Receive</label>
            <div className="space-y-2">
              {receiptItems.map((item, idx) => (
                <div key={item.purchase_item_id} className="p-3 bg-muted rounded-xl flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-xs font-bold text-charcoal">{item.product_name}</div>
                    <div className="text-[11px] text-secondary font-mono">{item.sku}</div>
                    <div className="text-[11px] text-secondary mt-0.5">
                      Ordered: {item.ordered} | Remaining: <strong className="text-charcoal">{item.remaining}</strong>
                    </div>
                  </div>

                  <div className="w-24">
                    <label className="block text-[10px] font-semibold text-secondary mb-0.5">Quantity</label>
                    <input
                      type="number"
                      min="0"
                      max={item.remaining}
                      value={item.quantity_received}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        const copy = [...receiptItems];
                        copy[idx].quantity_received = Math.min(item.remaining, Math.max(0, val));
                        setReceiptItems(copy);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border text-xs focus:outline-none bg-white font-bold text-center"
                    />
                  </div>
                </div>
              ))}
            </div>
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
              Confirm Intake
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel Order Confirmation */}
      <ConfirmDialog
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={handleCancelPO}
        title="Cancel Purchase Order"
        message={`Are you sure you want to cancel ${selectedOrder?.order_number}? Only unreceived orders can be cancelled.`}
        confirmText="Cancel Purchase Order"
        confirmVariant="danger"
        loading={submitting}
      />
    </div>
  );
};

export default Purchases;
