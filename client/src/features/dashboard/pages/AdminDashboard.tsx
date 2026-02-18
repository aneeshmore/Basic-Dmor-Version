import { ColumnDef } from '@tanstack/react-table';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Crown } from 'lucide-react';
import { PageHeader } from '@/components/common';
import { useProductStock } from '../hooks/useDashboard';
import { ProductStock } from '../api/dashboardApi';
import { DataTable } from '@/components/common/DataTable';
import { useAuth } from '@/contexts/AuthContext';
import { isBasicPlan } from '@/utils/planAccess';

const getStockStatusBadge = (status: string) => {
  switch (status) {
    case 'Sufficient':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--success)]/10 text-[var(--success)]">
          <CheckCircle className="h-3 w-3" />
          Sufficient
        </span>
      );
    case 'Low Stock':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--warning)]/10 text-[var(--warning)]">
          <AlertCircle className="h-3 w-3" />
          Low Stock
        </span>
      );
    case 'Critical':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--danger)]/10 text-[var(--danger)]">
          <XCircle className="h-3 w-3" />
          Critical
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--surface-highlight)] text-[var(--text-secondary)]">
          {status}
        </span>
      );
  }
};

const columns: ColumnDef<ProductStock>[] = [
  {
    accessorKey: 'MasterProductName',
    header: 'Master Product',
    cell: ({ row }) => (
      <div className="font-medium text-[var(--text-primary)]">
        {row.getValue('MasterProductName')}
      </div>
    ),
  },
  {
    accessorKey: 'ProductName',
    header: 'Product',
    cell: ({ row }) => (
      <div className="text-[var(--text-secondary)]">{row.getValue('ProductName')}</div>
    ),
  },
  {
    accessorKey: 'OrderQty',
    header: 'Ordered',
    cell: ({ row }) => (
      <div className="text-right font-mono text-[var(--text-primary)]">
        {row.getValue('OrderQty')}
      </div>
    ),
  },
  {
    accessorKey: 'AvailableQty',
    header: 'Available',
    cell: ({ row }) => (
      <div className="text-right font-mono text-[var(--text-primary)]">
        {row.getValue('AvailableQty')}
      </div>
    ),
  },
  {
    accessorKey: 'ProductionQty',
    header: 'In Production',
    cell: ({ row }) => (
      <div className="text-right font-mono text-[var(--text-primary)]">
        {row.getValue('ProductionQty')}
      </div>
    ),
  },
  {
    accessorKey: 'StockStatus',
    header: 'Status',
    cell: ({ row }) => getStockStatusBadge(row.getValue('StockStatus')),
  },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const basicUser = isBasicPlan(user);
  const { data: stocks, isLoading, error, refetch } = useProductStock();

  if (error) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Stock Analysis"
          description="Real-time product stock monitoring and analysis"
        />

        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-8">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-[var(--danger)]" />
            <h3 className="mt-4 text-lg font-medium text-[var(--text-primary)]">
              Failed to load data
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {error.message || 'An error occurred'}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Stock Analysis"
        description="Real-time product stock monitoring and analysis"
        actions={
          <button
            onClick={() => refetch()}
            disabled={isLoading || basicUser}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {basicUser ? 'Pro Feature' : 'Refresh'}
          </button>
        }
      />

      <div className="relative bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className={`p-6 ${basicUser ? 'opacity-60 pointer-events-none' : ''}`}>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Product Stock Status
          </h2>

          <DataTable columns={columns} data={stocks || []} searchPlaceholder="Search products..." />
        </div>
        {basicUser && (
          <div className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            <Crown className="h-3 w-3" />
            Pro
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {stocks && stocks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            className={`relative bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 ${
              basicUser ? 'opacity-60' : ''
            }`}
          >
            {basicUser && (
              <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                <Crown className="h-3 w-3" />
                Pro
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[var(--success)]/10 rounded-lg">
                <CheckCircle className="h-6 w-6 text-[var(--success)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Sufficient Stock</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {stocks.filter(s => s.StockStatus === 'Sufficient').length}
                </p>
              </div>
            </div>
          </div>

          <div
            className={`relative bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 ${
              basicUser ? 'opacity-60' : ''
            }`}
          >
            {basicUser && (
              <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                <Crown className="h-3 w-3" />
                Pro
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[var(--warning)]/10 rounded-lg">
                <AlertCircle className="h-6 w-6 text-[var(--warning)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Low Stock</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {stocks.filter(s => s.StockStatus === 'Low Stock').length}
                </p>
              </div>
            </div>
          </div>

          <div
            className={`relative bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 ${
              basicUser ? 'opacity-60' : ''
            }`}
          >
            {basicUser && (
              <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                <Crown className="h-3 w-3" />
                Pro
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[var(--danger)]/10 rounded-lg">
                <XCircle className="h-6 w-6 text-[var(--danger)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Critical</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {stocks.filter(s => s.StockStatus === 'Critical').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
