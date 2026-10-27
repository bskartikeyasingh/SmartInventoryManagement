import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Truck,
  Edit2,
  RotateCw,
  Mail,
  Phone,
  MapPin,
  FileText
} from "lucide-react";

import apiClient from "../api/client";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/ui/Modal";

export const Suppliers = () => {
  const { addToast } = useToast();
  const { isAdmin } = useAuth();

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    business_name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    notes: ""
  });

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/suppliers${search ? `?search=${encodeURIComponent(search)}` : ""}`);
      setSuppliers(res.data);
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
      addToast("Failed to load suppliers", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post("/suppliers", formData);
      addToast(`Supplier '${formData.business_name}' added`, "success");
      setCreateModalOpen(false);
      resetForm();
      fetchSuppliers();
    } catch (err) {
      addToast(err.response?.data?.detail || "Failed to add supplier", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    setSubmitting(true);
    try {
      await apiClient.patch(`/suppliers/${selectedSupplier.id}`, formData);
      addToast("Supplier updated successfully", "success");
      setEditModalOpen(false);
      setSelectedSupplier(null);
      fetchSuppliers();
    } catch (err) {
      addToast(err.response?.data?.detail || "Failed to update supplier", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (sup) => {
    setSelectedSupplier(sup);
    setFormData({
      business_name: sup.business_name,
      contact_name: sup.contact_name || "",
      email: sup.email || "",
      phone: sup.phone || "",
      address: sup.address || "",
      notes: sup.notes || ""
    });
    setEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      business_name: "",
      contact_name: "",
      email: "",
      phone: "",
      address: "",
      notes: ""
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal tracking-tight">Suppliers</h1>
          <p className="text-sm text-secondary mt-1">Manage vendor directories, contact details, and procurement partners</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchSuppliers}
            className="p-2.5 rounded-xl border border-border bg-white text-secondary hover:text-charcoal shadow-sm transition"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-vermilion" : ""}`} />
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
              <span>Add Supplier</span>
            </button>
          )}
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
            placeholder="Search suppliers by name, contact or email..."
            className="w-full pl-10 pr-4 py-2 bg-muted/60 focus:bg-white text-sm text-charcoal rounded-xl border border-transparent focus:border-border focus:outline-none transition"
          />
        </div>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-secondary text-sm">
            Loading suppliers...
          </div>
        ) : suppliers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-secondary text-sm">
            No suppliers match your search.
          </div>
        ) : (
          suppliers.map((sup) => (
            <div
              key={sup.id}
              className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:border-gray-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-muted text-charcoal flex items-center justify-center">
                      <Truck className="w-5 h-5 text-vermilion" />
                    </div>
                    <div>
                      <h3 className="font-bold text-charcoal leading-snug">{sup.business_name}</h3>
                      <div className="text-xs text-secondary">{sup.contact_name || "Primary Vendor"}</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-secondary">
                    {sup.orders_count} orders
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-secondary mt-4">
                  {sup.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-secondary shrink-0" />
                      <span className="truncate">{sup.email}</span>
                    </div>
                  )}
                  {sup.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-secondary shrink-0" />
                      <span>{sup.phone}</span>
                    </div>
                  )}
                  {sup.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-secondary shrink-0" />
                      <span className="truncate">{sup.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {isAdmin && (
                <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-end">
                  <button
                    onClick={() => openEditModal(sup)}
                    className="p-1.5 rounded-lg text-secondary hover:text-charcoal hover:bg-muted transition text-xs font-medium flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Supplier Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add Supplier"
        subtitle="Record vendor business and contact information"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">Business Name *</label>
            <input
              type="text"
              required
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              placeholder="e.g. Acme Logistics & Supply Co."
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Contact Name</label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="e.g. Jane Doe"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="orders@vendor.com"
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">Address</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street address, City, State, Country"
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
              Save Supplier
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Supplier Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Supplier"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">Business Name *</label>
            <input
              type="text"
              required
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Contact Name</label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-vermilion"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">Address</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
    </div>
  );
};

export default Suppliers;
