import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const DataTable = ({
  columns,
  data = [],
  loading = false,
  emptyMessage = "No records found",
  page,
  totalPages,
  onPageChange,
  totalItems
}) => {
  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-[#FAFAFB]">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`py-3.5 px-4 text-xs font-semibold text-secondary uppercase tracking-wider ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-sm text-secondary">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-vermilion border-t-transparent rounded-full animate-spin"></div>
                    Loading data...
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-sm text-secondary">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={row.id || rowIdx}
                  className="hover:bg-muted/60 transition-colors"
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={`py-3.5 px-4 text-sm text-charcoal ${col.cellClassName || ""}`}
                    >
                      {col.render ? col.render(row, rowIdx) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-[#FAFAFB] text-sm text-secondary">
          <div>
            Showing page <span className="font-semibold text-charcoal">{page}</span> of{" "}
            <span className="font-semibold text-charcoal">{totalPages}</span>
            {totalItems ? ` (${totalItems} items)` : ""}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-border bg-white text-charcoal hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-border bg-white text-charcoal hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
