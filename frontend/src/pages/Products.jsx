import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Download,
  Edit2,
  Archive,
  Package,
  RotateCw
} from "lucide-react";

import apiClient from "../api/client";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import DataTable from "../components/ui/DataTable";
import StatusBadge from "../components/ui/StatusBadge";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";

export const Products = () => {
  const { addToast } = useToast();
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [categoryId, setCategoryId] = useState("");
  const [stockStatus, setStockStatus] = useState(searchParams.get("stock_status") || "");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(searchParams.get("action") === "new");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State for Create/Edit
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    category_id: "",
    unit: "pcs",
    cost_price: "",
    selling_price: "",
    opening_quantity: 0,
    reorder_level: 10
  });

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get("/categories");
      setCategories(res.data);
      if (res.data.length > 0 && !formData.category_id) {
        setFormData((prev) => ({ ...prev, category_id: res.data[0].id }));
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15"
      });
      if (search.trim()) params.append("search", search.trim());
      if (categoryId) params.append("category_id", categoryId);
      if (stockStatus) params.append("stock_status", stockStatus);

      const res = await apiClient.get(`/products?${params.toString()}`);
      setProducts(res.data.items);
      setTotalPages(res.data.total_pages);
      setTotalItems(res.data.total);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      addToast("Failed to load products list", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [page, search, categoryId, stockStatus]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post("/products", {
        name: formData.name,
        sku: formData.sku,
        description: formData.description,
        category_id: parseInt(formData.category_id, 10),
        unit: formData.unit,
        cost_price: parseFloat(formData.cost_price),
        selling_price: parseFloat(formData.selling_price),
        opening_quantity: parseInt(formData.opening_quantity, 10) || 0,
        reorder_level: parseInt(formData.reorder_level, 10) || 0
      });
      addToast(`Product '${formData.name}' created successfully`, "success");
      setCreateModalOpen(false);
      resetForm();
      fetchProducts();
    } catch (err) {
      addToast(err.response?.data?.detail || "Failed to create product", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSubmitting(true);
    try {
      await apiClient.patch(`/products/${selectedProduct.id}`, {
        name: formData.name,
        sku: formData.sku,
        description: formData.description,
        category_id: parseInt(formData.category_id, 10),
        unit: formData.unit,
        cost_price: parseFloat(formData.cost_price),
        selling_price: parseFloat(formData.selling_price),
        reorder_level: parseInt(formData.reorder_level, 10)
      });
      addToast("Product updated successfully", "success");
      setEditModalOpen(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (err) {
      addToast(err.response?.data?.detail || "Failed to update product", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!selectedProduct) return;
    setSubmitting(true);
    try {
      await apiClient.delete(`/products/${selectedProduct.id}`);
      addToast(`Product '${selectedProduct.name}' archived`, "success");
      setArchiveDialogOpen(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (err) {
      addToast(err.response?.data?.detail || "Failed to archive product", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (p) => {
    setSelectedProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku,
      description: p.description || "",
      category_id: p.category_id,
      unit: p.unit,
      cost_price: p.cost_price,
      selling_price: p.selling_price,
      reorder_level: p.reorder_level
    });
    setEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      description: "",
      category_id: categories[0]?.id || "",
      unit: "pcs",
      cost_price: "",
      selling_price: "",
      opening_quantity: 0,
      reorder_level: 10
    });
  };

  const handleExportCSV = async () => {
    try {
      const res = await apiClient.get("/reports/export?report_type=inventory", {
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `products_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast("Products catalog exported to CSV", "success");
    } catch (err) {
      addToast("Failed to export products", "error");
    }
  };

  const columns = [
    {
      header: "SKU",
      accessor: "sku",
      className: "w-28",
      render: (row) => <span className="font-semibold text-charcoal">{row.sku}</span>
    },
    {
      header: "Product Name",
      accessor: "name",
      render: (row) => (
        <div>
          <div className="font-semibold text-charcoal">{row.name}</div>
          {row.description && <div className="text-xs text-secondary truncate max-w-xs">{row.description}</div>}
        </div>
      )
    },
    {
      header: "Category",
      accessor: "category_name",
      render: (row) => <span className="text-xs font-medium text-secondary">{row.category_name || "N/A"}</span>
    },
    {
      header: "In Stock",
      accessor: "quantity",
      className: "text-center",
      render: (row) => (
        <div className="text-center">
          <span className="font-bold text-charcoal">{row.quantity}</span>
          <span className="text-xs text-secondary ml-1">{row.unit}</span>
        </div>
      )
    },
    {
      header: "Cost Price",
      accessor: "cost_price",
      className: "text-right",
      render: (row) => <span className="text-secondary">${Number(row.cost_price).toFixed(2)}</span>
    },
    {
      header: "Selling Price",
      accessor: "selling_price",
      className: "text-right",
      render: (row) => <span className="font-semibold text-charcoal">${Number(row.selling_price).toFixed(2)}</span>
    },
    {
      header: "Status",
      accessor: "stock_status",
      className: "text-center",
      render: (row) => <StatusBadge status={row.stock_status} />
    },
    {
      header: "Actions",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {isAdmin && (
            <>
              <button
                onClick={() => openEditModal(row)}
                title="Edit Product"
                className="p-1.5 rounded-lg text-secondary hover:text-charcoal hover:bg-muted transition"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setSelectedProduct(row);
                  setArchiveDialogOpen(true);
                }}
                title="Archive Product"
                className="p-1.5 rounded-lg text-secondary hover:text-red-600 hover:bg-red-50 transition"
              >
                <Archive className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal tracking-tight">Products</h1>
          <p className="text-sm text-secondary mt-1">Manage catalog items, pricing, reorder points, and stock status</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchProducts}
            className="p-2.5 rounded-xl border border-border bg-white text-secondary hover:text-charcoal shadow-sm transition"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-vermilion" : ""}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-xl border border-border bg-white text-charcoal hover:bg-muted font-semibold text-xs shadow-sm transition flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-secondary" />
            <span>Export CSV</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                resetForm();
                setCreateModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-vermilion hover:bg-vermilion-hover text-white font-semibold text-xs shadow-md shadow-vermilion/20 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by product name or SKU..."
            className="w-full pl-10 pr-4 py-2 bg-muted/60 focus:bg-white text-sm text-charcoal rounded-xl border border-transparent focus:border-border focus:outline-none transition"
          />
        </div>

        {/* Category Filter */}
        <div className="w-full md:w-52">
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-muted/60 focus:bg-white text-sm text-charcoal rounded-xl border border-transparent focus:border-border focus:outline-none transition cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Stock Status Filter */}
        <div className="w-full md:w-48">
          <select
            value={stockStatus}
            onChange={(e) => {
              setStockStatus(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-muted/60 focus:bg-white text-sm text-charcoal rounded-xl border border-transparent focus:border-border focus:outline-none transition cursor-pointer"
          >
            <option value="">All Stock Statuses</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Products Data Table */}
      <DataTable
        columns={columns}
        data={products}
        loading={loading}
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setPage}
        emptyMessage="No products match your active search or filters."
      />

      {/* Create Product Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Product"
        subtitle="SKU and opening inventory will be recorded immediately"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Product Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Wireless Headphones"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">SKU (Unique) *</label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. SKU-1842"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Category *</label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Unit of Measurement</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="pcs, box, kg, etc."
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Cost Price ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Selling Price ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Opening Stock Quantity</label>
              <input
                type="number"
                min="0"
                value={formData.opening_quantity}
                onChange={(e) => setFormData({ ...formData, opening_quantity: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
              />
              <span className="text-[11px] text-secondary">Creates auditable opening stock movement</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Reorder Level Alert</label>
              <input
                type="number"
                min="0"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                placeholder="10"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
              />
              <span className="text-[11px] text-secondary">Triggers low stock alert when breached</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">Description (Optional)</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
              Create Product
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Product Details"
        subtitle="Stock quantities can only be modified via Stock Receipts or Adjustments"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Product Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">SKU *</label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Category *</label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Unit</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Cost Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Selling Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Reorder Level</label>
              <input
                type="number"
                min="0"
                required
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-border">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
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
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Archive Product Confirmation */}
      <ConfirmDialog
        isOpen={archiveDialogOpen}
        onClose={() => setArchiveDialogOpen(false)}
        onConfirm={handleArchiveConfirm}
        title="Archive Product"
        message={`Are you sure you want to archive '${selectedProduct?.name}' (${selectedProduct?.sku})? This product will be deactivated from future sales while preserving its full audit history.`}
        confirmText="Archive Product"
        confirmVariant="danger"
        loading={submitting}
      />
    </div>
  );
};

export default Products;
