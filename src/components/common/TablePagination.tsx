import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export const TablePagination: React.FC<Props> = ({
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(totalItems, currentPage * pageSize);

  return (
    <div className="px-4 py-3 bg-white border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-600">
      <div className="flex items-center gap-4">
        <span>
          Showing <span className="font-semibold text-neutral-900">{startIndex}</span> to{' '}
          <span className="font-semibold text-neutral-900">{endIndex}</span> of{' '}
          <span className="font-semibold text-neutral-900">{totalItems}</span> entries
        </span>

        <div className="flex items-center gap-1.5">
          <label htmlFor="pageSizeSelect" className="text-neutral-500">
            Per page:
          </label>
          <select
            id="pageSizeSelect"
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="border border-neutral-300 rounded px-2 py-1 text-xs text-neutral-900 bg-white focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value={10}>10</option>
            <option value={20}>20 (Default)</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 border border-neutral-300 rounded hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="px-2 text-xs font-medium text-neutral-700">
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 border border-neutral-300 rounded hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
