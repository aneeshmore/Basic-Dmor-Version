import React, { useMemo } from 'react';
import { decodeHtml } from '@/utils/stringUtils';
import { DeliveryRecord } from '../types';
import { DataTable } from '@/components/ui/data-table/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/ui/data-table/DataTableColumnHeader';
import { MapPin, Package, FileText, Loader2, RotateCcw, XCircle, Truck } from 'lucide-react';

interface DeliveryCompleteTableProps {
  data: DeliveryRecord[];
  isLoading: boolean;
  onReturnOrder: (orderId: number) => void;
}

export const DeliveryCompleteTable: React.FC<DeliveryCompleteTableProps> = ({
  data,
  isLoading,
  onReturnOrder,
}) => {
  const columns = useMemo<ColumnDef<DeliveryRecord>[]>(
    () => [
      {
        accessorKey: 'orderId',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Order ID" />,
        cell: ({ row }) => (
          <span className="font-medium text-[var(--text-primary)]">
            {row.original.orderNumber || `ORD-${row.original.orderId}`}
          </span>
        ),
        size: 100,
      },
      {
        accessorKey: 'companyName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Company" />,
        cell: ({ row }) => (
          <span className="font-medium text-[var(--primary)]">{decodeHtml(row.original.companyName)}</span>
        ),
      },
      {
        accessorKey: 'location',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <MapPin className="w-3.5 h-3.5" />
            {decodeHtml(row.original.location)}
          </div>
        ),
      },
      {
        id: 'products',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            {row.original.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-[var(--text-primary)]">
                <Package className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <span className="text-sm">{decodeHtml(item.productName)}</span>
              </div>
            ))}
          </div>
        ),
      },
      {
        id: 'quantity',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Qty" />,
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            {row.original.items.map((item, idx) => (
              <span key={idx} className="font-semibold text-[var(--text-primary)] text-sm">
                {item.quantity} {item.unit || ''}
              </span>
            ))}
          </div>
        ),
      },
      {
        accessorKey: 'vehicleNo',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Vehicle No" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <Truck className="w-3.5 h-3.5" />
            <span className="uppercase">{row.original.vehicleNo}</span>
          </div>
        ),
      },
      {
        accessorKey: 'dispatchDate',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Dispatch Date" />,
        cell: ({ row }) => (
          <span className="text-[var(--text-primary)]">
            {new Date(row.original.dispatchDate).toLocaleDateString('en-GB')}
          </span>
        ),
      },
      {
        accessorKey: 'billNo',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Bill No" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <FileText className="w-3.5 h-3.5" />
            {row.original.billNo || (
              <span className="italic text-[var(--text-tertiary)]">Pending</span>
            )}
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onReturnOrder(row.original.orderId)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors dark:text-amber-400 dark:bg-amber-950 dark:border-amber-800 dark:hover:bg-amber-900"
              title="Undispatch Order"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Undispatch
            </button>
          </div>
        ),
      },
    ],
    [onReturnOrder]
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
      <DataTable columns={columns} data={data} searchPlaceholder="Search orders..." />
    </div>
  );
};
