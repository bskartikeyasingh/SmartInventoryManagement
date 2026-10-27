import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Layers, RotateCw, Package } from "lucide-react";
import apiClient from "../api/client";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";

export const Categories = () => {
  const { addToast } = useToast();
  const { isAdmin } = useAuth();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/categories?include_inactive=true");
      setCategories(res.data);
    } catch (err) {
      console.error("Failed to load categories:", err);
      addToast("Failed to load categories", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post("/categories", {
        name: name.trim(),
        description: description.trim() || null
      });
      addToast(`Category '${name.trim()}' created`, "success");
      setCreateModalOpen(false);
      setName("");
      setDescription("");
      fetchCategories();
    } catch (err) {
      addToast(err.response?.data?.detail || "Failed to create category", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCat) return;
    setSubmitting(true);
    try {
      await apiClient.patch(`/categories/${selectedCat.id}`, {
        name: name.trim(),
        description: description.trim() || null
      });
      addToast("Category updated successfully", "success");
      setEditModalOpen(false);
      setSelectedCat(null);
      fetchCategories();
    } catch (err) {
      addToast(err.response?.data?.detail || "Failed to update category", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCat) return;
    setSubmitting(true);
    try {
      await apiClient.delete(`/categories/${selectedCat.id}`);
      addToast(`Category '${selectedCat.name}' deleted`, "success");
      setDeleteDialogOpen(false);
      setSelectedCat(null);
      fetchCategories();
    } catch (err) {
      addToast(err.response?.data?.detail || "Cannot delete category", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (cat) => {
    setSelectedCat(cat);
    setName(cat.name);
    setDescription(cat.description || "");
    setEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal tracking-tight">Categories</h1>
          <p className="text-sm text-secondary mt-1">Organize products into taxonomy hierarchies and track counts</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchCategories}
            className="p-2.5 rounded-xl border border-border bg-white text-secondary hover:text-charcoal shadow-sm transition"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-vermilion" : ""}`} />
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setName("");
                setDescription("");
                setCreateModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-vermilion hover:bg-vermilion-hover text-white font-semibold text-xs shadow-md shadow-vermilion/20 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          )}
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-secondary text-sm">
            Loading categories...
          </div>
        ) : categories.length === 0 ? (
          <div className="col-span-full py-12 text-center text-secondary text-sm">
            No categories defined yet. Click "Add Category" to create your first.
          </div>
        ) : (
          categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:border-gray-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-muted text-charcoal flex items-center justify-center">
                    <Layers className="w-5 h-5 text-vermilion" />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-secondary flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    {cat.product_count} products
                  </span>
                </div>

                <h3 className="text-base font-bold text-charcoal">{cat.name}</h3>
                <p className="text-xs text-secondary mt-1 line-clamp-2 min-h-[32px]">
                  {cat.description || "No description provided."}
                </p>
              </div>

              {isAdmin && (
                <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditModal(cat)}
                    className="p-1.5 rounded-lg text-secondary hover:text-charcoal hover:bg-muted transition text-xs font-medium flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCat(cat);
                      setDeleteDialogOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-secondary hover:text-red-600 hover:bg-red-50 transition text-xs font-medium flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Category Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add Category"
        subtitle="Categories group products and drive retail analytics"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">Category Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Electronics, Footwear, Home Goods"
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">Description (Optional)</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of items in this category"
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
              Create Category
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Category"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">Category Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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

      {/* Delete Category Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        message={`Are you sure you want to delete '${selectedCat?.name}'? Note that categories with linked products cannot be deleted.`}
        confirmText="Delete Category"
        confirmVariant="danger"
        loading={submitting}
      />
    </div>
  );
};

export default Categories;
