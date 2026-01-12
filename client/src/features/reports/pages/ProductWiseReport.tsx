import React, { useEffect, useState, useMemo, useRef } from 'react';
import { PageHeader } from '@/components/common';
import { FileDown } from 'lucide-react';
import { showToast } from '@/utils/toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table';
import { Button, Input, SearchableSelect } from '@/components/ui';
import { reportsApi } from '../api/reportsApi';
import { Bar } from 'react-chartjs-2';
import { ProductWiseReportItem, ProductInfo, BOMItem, StockReportItem } from '../types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const ProductWiseReport = () => {
  const chartRef = useRef<ChartJS<'bar'> | null>(null);
  const [chartKey, setChartKey] = useState(0);
  const [data, setData] = useState<ProductWiseReportItem[]>([]);
  const [summaryData, setSummaryData] = useState<StockReportItem[]>([]);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [_bomData, setBomData] = useState<BOMItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [productTypeFilter, setProductTypeFilter] = useState<string>('FG');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [products, setProducts] = useState<
    { id: string; value: string; label: string; type: string }[]
  >([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Everything is a ledger now as per user request
  const isLedgerMode = true;

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  // Increment key to force fresh canvas on data changes
  useEffect(() => {
    setChartKey(k => k + 1);
  }, [selectedProduct, productTypeFilter, data.length]);

  // Fetch products based on product type filter
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const type =
          productTypeFilter === 'Sub-Product'
            ? 'FG'
            : (productTypeFilter as 'FG' | 'RM' | 'PM' | 'All');
        const productsList = await reportsApi.getProductsList(type);

        const formattedProducts = productsList.map(
          (p: {
            productId?: number;
            ProductID?: number;
            productName?: string;
            ProductName?: string;
            masterProductName?: string;
            productType?: string;
            ProductType?: string;
          }) => ({
            id: (p.productId || p.ProductID)?.toString() || '',
            value: (p.productId || p.ProductID)?.toString() || '',
            label: p.productName || p.ProductName || p.masterProductName || 'Unnamed Product',
            type: p.productType || p.ProductType || 'Unknown',
            subLabel:
              p.masterProductName && (p.productName || p.ProductName)
                ? p.masterProductName
                : undefined,
          })
        );

        setProducts(formattedProducts);
      } catch (error) {
        console.error('Error fetching products:', error);
        showToast.error('Failed to load products');
        setProducts([]);
      }
    };

    fetchProducts();
  }, [productTypeFilter]);

  // Reset selected product if it's no longer in the products list
  useEffect(() => {
    if (selectedProduct && products.length > 0) {
      const stillExists = products.find(p => p.value === selectedProduct);
      if (!stillExists) {
        setSelectedProduct('');
        setData([]);
        setProductInfo(null);
        setBomData([]);
      }
    }
  }, [products, selectedProduct]);

  // Fetch data based on selected product or fetch summary if none selected
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // ALL views are now Transaction Ledger views (unified design)
        // Transaction View (Ledger Mode)
        // Pass filter directly (including 'Sub-Product') to backend, which handles the logic
        const type = productTypeFilter;

        const result = await reportsApi.getProductWiseReport(
          selectedProduct || undefined,
          startDate,
          endDate,
          type // Always pass productType so backend knows how to interpret the productId
        );

        setData(result.transactions || []);
        setProductInfo(result.product || null);
        setBomData(result.bom || []);
        setSummaryData([]);
      } catch (error: unknown) {
        console.error('Error fetching data:', error);
        setData([]);
        setSummaryData([]);
        setProductInfo(null);
        setBomData([]);
        const err = error as { response?: { status: number } };
        if (err.response?.status !== 404) {
          showToast.error('Failed to load report data');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedProduct, startDate, endDate, productTypeFilter]);

  const handleExportPdf = () => {
    const isDetailView = !!selectedProduct;
    const exportData = data;

    if (exportData.length === 0) {
      showToast.error('No data to export');
      return;
    }

    const doc = new jsPDF('landscape');

    // Add Title
    doc.setFontSize(18);
    doc.text('Product Transaction Ledger', 14, 20);

    // Add Info
    doc.setFontSize(10);
    if (isDetailView) {
      const selectedProductLabel =
        products.find(p => p.value === selectedProduct)?.label || selectedProduct;
      doc.text(`Product: ${selectedProductLabel}`, 14, 30);
    } else {
      doc.text(`Category: ${productTypeFilter}`, 14, 30);
    }

    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 36);
    if (startDate) doc.text(`From: ${startDate}`, 14, 42);
    if (endDate) doc.text(`To: ${endDate}`, 14, 48);

    // Define columns based on whether a specific product is selected
    const tableColumn = selectedProduct
      ? ['Date', 'Type', 'Avail. Stock', 'CR', 'DR', 'Balance', 'TypeIs']
      : ['Date', 'Product Name', 'Avail. Stock', 'CR', 'DR', 'Balance', 'TypeIs'];

    // Define rows
    const tableRows = (data as ProductWiseReportItem[]).map(item => {
      let typeIs = item.transactionType;
      if (
        item.transactionType === 'Production Output' ||
        item.transactionType === 'Production Consumption'
      ) {
        typeIs = 'Production';
      } else if (item.transactionType === 'Initial Stock') {
        typeIs = 'Inward';
      }

      return selectedProduct
        ? [item.date, item.type || '-', item.stockBefore || 0, item.cr || '0', item.dr || '0', item.balance, typeIs]
        : [item.date, item.productName, item.stockBefore || 0, item.cr || '0', item.dr || '0', item.balance, typeIs];
    });

    // Generate Table
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 54,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [71, 85, 105] },
    });

    // Save PDF
    const fileName = isLedgerMode
      ? `product_ledger_${selectedProduct || productTypeFilter}_${new Date().toISOString().split('T')[0]}.pdf`
      : `stock_summary_all_${new Date().toISOString().split('T')[0]}.pdf`;

    doc.save(fileName);
    showToast.success('Report exported successfully');
  };

  // Define Columns for DataTable
  const columns = useMemo<ColumnDef<any>[]>(() => {
    // Transaction View Columns matching the image format
    const baseColumns: ColumnDef<any>[] = [
      {
        accessorKey: 'date',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date & Time" />,
        cell: ({ row }) => {
          const dateStr = row.original.date;
          if (!dateStr || dateStr === '-')
            return <div className="text-[var(--text-secondary)]">-</div>;

          const dateObj = new Date(dateStr);
          const datePart = dateObj.toLocaleDateString();
          const timePart = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <div className="flex flex-col">
              <span className="font-medium text-[var(--text-primary)]">{datePart}</span>
              <span className="text-xs text-[var(--text-tertiary)]">{timePart}</span>
            </div>
          );
        },
      },
    ];

    // Add Product Name column if not filtering for a single product
    if (!selectedProduct) {
      baseColumns.push({
        accessorKey: 'productName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Product Name" />,
        cell: ({ row }) => (
          <div className="font-semibold text-[var(--text-primary)]">{row.original.productName}</div>
        ),
      });
    }

    // Add Type column (Supplier/Customer name) - shown when a specific product is selected
    if (selectedProduct) {
      baseColumns.push({
        accessorKey: 'type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type / Details" />,
        cell: ({ row }) => {
          const type = row.original.type;
          const batchType = row.original.batchType;

          return (
            <div className="flex flex-col">
              <div
                className="text-[var(--text-primary)] font-medium max-w-[250px] truncate"
                title={type}
              >
                {type || '-'}
              </div>
              {batchType && (
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-tight">
                  {batchType === 'MAKE_TO_STOCK' ? 'Make to Stock' : 'Make to Order'}
                </span>
              )}
            </div>
          );
        },
      });
    }

    baseColumns.push(
      {
        accessorKey: 'stockBefore',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Avail. Stock" />,
        cell: ({ row }) => (
          <div className="text-center font-bold text-gray-700">{row.original.stockBefore || '0'}</div>
        ),
      },

      {
        accessorKey: 'cr',
        header: ({ column }) => <DataTableColumnHeader column={column} title="CR" />,
        cell: ({ row }) => (
          <div className="text-center text-green-600 font-bold">{row.original.cr || '0'}</div>
        ),
      },
      {
        accessorKey: 'dr',
        header: ({ column }) => <DataTableColumnHeader column={column} title="DR" />,
        cell: ({ row }) => (
          <div className="text-center text-red-600 font-bold">{row.original.dr || '0'}</div>
        ),
      },

      {
        accessorKey: 'balance',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Balance" />,
        cell: ({ row }) => (
          <div className="text-center font-bold text-blue-700">{row.original.balance}</div>
        ),
      },

      {
        accessorKey: 'transactionType',
        header: ({ column }) => <DataTableColumnHeader column={column} title="TypeIs" />,
        cell: ({ row }) => {
          const type = row.original.transactionType;
          let colorClass = 'bg-slate-100 text-slate-500';
          let displayType = type;

          if (type === 'Inward') colorClass = 'bg-green-100 text-green-700';
          else if (type === 'Initial Stock') {
            colorClass = 'bg-green-100 text-green-700';
            displayType = 'Inward';
          } else if (type === 'Production Output') {
            colorClass = 'bg-blue-100 text-blue-700';
            displayType = 'Production';
          } else if (type === 'Production Consumption') {
            colorClass = 'bg-orange-100 text-orange-700';
            displayType = 'Production';
          } else if (type === 'Dispatch' || type === 'Outward')
            colorClass = 'bg-red-100 text-red-700';

          return (
            <div
              className={`text-[10px] uppercase font-bold whitespace-nowrap px-2 py-1 rounded inline-block ${colorClass}`}
            >
              {displayType}
            </div>
          );
        },
      }
    );

    return baseColumns;
  }, [selectedProduct]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Wise Stock Report"
        description={
          isLedgerMode
            ? 'Stock movements and transaction ledger'
            : 'Overview of stock levels across products'
        }
        actions={
          <Button
            variant="primary"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleExportPdf}
            leftIcon={<FileDown size={20} />}
            disabled={
              (isLedgerMode && data.length === 0) || (!isLedgerMode && summaryData.length === 0)
            }
          >
            Export PDF
          </Button>
        }
      />

      {/* Filters Container */}
      <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
        <div className="flex items-end gap-4 flex-wrap">
          {/* Product Type Filter Buttons */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 ml-1">Type</label>
            <div className="flex items-center gap-2">
              {(['FG', 'RM', 'PM'] as const).map(type => (
                <Button
                  key={type}
                  size="sm"
                  variant={productTypeFilter === type ? 'primary' : 'secondary'}
                  onClick={() => {
                    setProductTypeFilter(type);
                    setSelectedProduct('');
                  }}
                  className={`min-w-[3rem] transition-all duration-200 ${productTypeFilter === type
                    ? 'bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          <div className="h-10 w-px bg-gray-300 mx-1 hidden lg:block" />

          {/* Product Dropdown */}
          <div className="flex-grow min-w-[250px]">
            <SearchableSelect
              label="Product"
              value={selectedProduct}
              onChange={val => setSelectedProduct(val || '')}
              options={products}
              placeholder="Search Product..."
              className="w-full"
            />
          </div>

          <div className="h-10 w-px bg-gray-300 mx-1 hidden lg:block" />

          {/* Date Range Shortcuts and Inputs */}
          <div className="flex items-end gap-2">
            <div className="flex gap-1 mr-2">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 px-2 text-xs"
                onClick={() => {
                  const today = new Date();
                  const lastWeek = new Date(today);
                  lastWeek.setDate(today.getDate() - 7);
                  setStartDate(lastWeek.toISOString().split('T')[0]);
                  setEndDate(today.toISOString().split('T')[0]);
                }}
              >
                Week
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 px-2 text-xs"
                onClick={() => {
                  const today = new Date();
                  const lastMonth = new Date(today);
                  lastMonth.setMonth(today.getMonth() - 1);
                  setStartDate(lastMonth.toISOString().split('T')[0]);
                  setEndDate(today.toISOString().split('T')[0]);
                }}
              >
                Month
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 px-2 text-xs"
                onClick={() => {
                  const today = new Date();
                  const lastYear = new Date(today);
                  lastYear.setFullYear(today.getFullYear() - 1);
                  setStartDate(lastYear.toISOString().split('T')[0]);
                  setEndDate(today.toISOString().split('T')[0]);
                }}
              >
                Year
              </Button>
            </div>

            <Input
              type="date"
              label="From"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              inputSize="sm"
              fullWidth={false}
              className="w-[130px]"
            />

            <Input
              type="date"
              label="To"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              inputSize="sm"
              fullWidth={false}
              className="w-[130px]"
            />
          </div>
        </div>
      </div>

      {/* Product Details Section (Single Product) */}
      {!isLoading && productInfo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in mb-6">
          <div className="card p-4 border-l-4 border-blue-500 bg-white shadow-sm">
            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
              Available Qty
            </p>
            <p className="text-xl font-bold text-blue-700 mt-1">
              {Number(productInfo.availableQuantity || 0).toFixed(2)}
            </p>
          </div>

          <div className="card p-4 border-l-4 border-emerald-500 bg-white shadow-sm">
            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Status</p>
            <p className="text-xl font-bold text-emerald-700 mt-1">
              {productInfo.availableQuantity > productInfo.minStockLevel ? 'Healthy' : 'Low Stock'}
            </p>
          </div>
        </div>
      )}

      {/* Aggregate Stats Section (Multiple Products) */}
      {!isLoading && !productInfo && data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in mb-6">
          <div className="card p-4 border-l-4 border-green-500 bg-white shadow-sm">
            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
              Total Inward
            </p>
            <p className="text-xl font-bold text-green-700 mt-1">
              {data.reduce((sum, item) => sum + (item.cr || 0), 0)}
            </p>
          </div>
          <div className="card p-4 border-l-4 border-red-500 bg-white shadow-sm">
            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
              Total Outward
            </p>
            <p className="text-xl font-bold text-red-700 mt-1">
              {data.reduce((sum, item) => sum + (item.dr || 0), 0)}
            </p>
          </div>
          <div className="card p-4 border-l-4 border-blue-500 bg-white shadow-sm">
            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Net Flow</p>
            <p
              className={`text-xl font-bold mt-1 ${data.reduce((sum, item) => sum + (item.cr || 0), 0) -
                data.reduce((sum, item) => sum + (item.dr || 0), 0) >=
                0
                ? 'text-blue-700'
                : 'text-red-700'
                }`}
            >
              {data.reduce((sum, item) => sum + (item.cr || 0), 0) -
                data.reduce((sum, item) => sum + (item.dr || 0), 0)}
            </p>
          </div>
          <div className="card p-4 border-l-4 border-purple-500 bg-white shadow-sm">
            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
              Active Products
            </p>
            <p className="text-xl font-bold text-purple-700 mt-1">
              {new Set(data.map(item => item.productName)).size}
            </p>
          </div>
        </div>
      )}

      {/* Chart Visualizations */}
      {!isLoading && data.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-6">
          <div className="h-[400px]">
            {/* Dynamic Bar Chart: Inward vs Outward */}
            <Bar
              key={chartKey}
              ref={chartRef}
              data={{
                labels: (() => {
                  // Strategy 1: Product Specific -> Dates on Axis
                  if (selectedProduct) {
                    return Array.from(new Set(data.map(i => i.date))).sort(
                      (a, b) => new Date(a).getTime() - new Date(b).getTime()
                    );
                  }
                  // Strategy 2: Specific Type -> Top Products on Axis
                  return Array.from(new Set(data.map(i => i.productName))).slice(0, 10);
                })(),
                datasets: [
                  {
                    label: 'Inward',
                    data: (() => {
                      if (selectedProduct) {
                        const dates = Array.from(new Set(data.map(i => i.date))).sort(
                          (a, b) => new Date(a).getTime() - new Date(b).getTime()
                        );
                        return dates.map(d =>
                          data.filter(i => i.date === d).reduce((s, i) => s + (i.cr || 0), 0)
                        );
                      }
                      const prods = Array.from(new Set(data.map(i => i.productName))).slice(0, 10);
                      return prods.map(p =>
                        data.filter(i => i.productName === p).reduce((s, i) => s + (i.cr || 0), 0)
                      );
                    })(),
                    backgroundColor: 'rgba(34, 197, 94, 0.7)',
                    borderColor: 'rgb(34, 197, 94)',
                    borderWidth: 1,
                    barPercentage: 0.4,
                    categoryPercentage: 0.5,
                  },
                  {
                    label: 'Outward',
                    data: (() => {
                      if (selectedProduct) {
                        const dates = Array.from(new Set(data.map(i => i.date))).sort(
                          (a, b) => new Date(a).getTime() - new Date(b).getTime()
                        );
                        return dates.map(d =>
                          data.filter(i => i.date === d).reduce((s, i) => s + (i.dr || 0), 0)
                        );
                      }
                      const prods = Array.from(new Set(data.map(i => i.productName))).slice(0, 10);
                      return prods.map(p =>
                        data.filter(i => i.productName === p).reduce((s, i) => s + (i.dr || 0), 0)
                      );
                    })(),
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 1,
                    barPercentage: 0.4,
                    categoryPercentage: 0.5,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top' },
                  title: {
                    display: true,
                    text: selectedProduct
                      ? 'Daily Transaction Trend'
                      : 'Top Products Inward vs Outward',
                    font: { size: 16 },
                  },
                },
                scales: {
                  y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
                  x: { grid: { display: false } },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* DataTable */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[var(--text-secondary)] font-medium">Loading report data...</div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={isLedgerMode ? (data as any[]) : (summaryData as any[])}
          searchPlaceholder={isLedgerMode ? 'Search transactions...' : 'Search products...'}
          defaultPageSize={15}
          showToolbar={true}
          showPagination={true}
        />
      )}
    </div>
  );
};

export default ProductWiseReport;
