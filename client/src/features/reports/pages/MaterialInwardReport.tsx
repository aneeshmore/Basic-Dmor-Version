import React, { useEffect, useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/common';
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table';
import { Button, Badge, Input, SearchableSelect } from '@/components/ui';
import { reportsApi } from '../api/reportsApi';
import { MaterialInwardReportItem } from '../types';
import { FileDown } from 'lucide-react';
import { showToast } from '@/utils/toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const MaterialInwardReport = () => {
  const [data, setData] = useState<MaterialInwardReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [productTypeFilter, setProductTypeFilter] = useState<'FG' | 'RM' | 'PM' | 'All'>('All');
  const [productFilter, setProductFilter] = useState<string>('');
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [productList, setProductList] = useState<{ id: string; label: string; value: string }[]>(
    []
  );

  useEffect(() => {
    fetchData(productTypeFilter === 'All' ? undefined : productTypeFilter, startDate, endDate);
    // Reset product filter when type changes
    setProductFilter('');
  }, [productTypeFilter, startDate, endDate]);

  const fetchData = async (type?: 'FG' | 'RM' | 'PM', start?: string, end?: string) => {
    try {
      setIsLoading(true);
      const result = await reportsApi.getMaterialInwardReport(type, start, end);
      setData(result);
    } catch (error) {
      console.error('Failed to fetch material inward report:', error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch full product list for the dropdown
  useEffect(() => {
    const fetchProductList = async () => {
      try {
        const type =
          productTypeFilter === 'All' ? undefined : (productTypeFilter as 'FG' | 'RM' | 'PM');
        const result = await reportsApi.getProductsList(type);

        const formatted = result.map((p: any) => ({
          id: String(p.productId || p.ProductID),
          label: p.productName || p.ProductName || p.masterProductName,
          value: p.productName || p.ProductName || p.masterProductName, // Use name for filtering compatibility with existing logic
        }));

        setProductList(formatted);
      } catch (error) {
        console.error('Failed to fetch product list:', error);
      }
    };
    fetchProductList();
  }, [productTypeFilter]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const handleExport = () => {
    if (filteredData.length === 0) {
      showToast.error('No data to export');
      return;
    }

    const doc = new jsPDF('landscape');

    doc.setFontSize(18);
    doc.text('Material Inward Report', 14, 20);

    doc.setFontSize(10);
    let subtitle = `Generated on: ${new Date().toLocaleString()}`;
    if (productTypeFilter !== 'All') subtitle += ` | Type: ${productTypeFilter}`;
    if (startDate) subtitle += ` | From: ${startDate}`;
    if (endDate) subtitle += ` | To: ${endDate}`;
    doc.text(subtitle, 14, 28);

    const tableColumn = [
      'Inward Date',
      'Product Name',
      'Type',
      'Supplier',
      'Bill No',
      'Quantity',
      'Unit Price',
      'Total Cost',
    ];

    const tableRows = filteredData.map(item => [
      formatDate(item.inwardDate),
      item.productName,
      item.productType || '-',
      item.supplierName || '-',
      item.billNo || '-',
      item.quantity,
      item.unitPrice ? `Rs. ${Number(item.unitPrice).toFixed(2)}` : '-',
      item.totalCost ? `Rs. ${Number(item.totalCost).toFixed(2)}` : '-',
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 34,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`material_inward_report_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast.success('Report exported successfully');
  };

  const handleExportCsv = () => {
    if (filteredData.length === 0) {
      showToast.error('No data to export');
      return;
    }

    const csvHeaders = [
      'Inward Date',
      'Product Name',
      'Type',
      'Supplier',
      'Bill No',
      'Quantity',
      'Unit Price',
      'Total Cost',
      'Notes',
    ];

    const csvRows = filteredData.map(item => [
      formatDate(item.inwardDate),
      item.productName,
      item.productType || '-',
      item.supplierName || '-',
      item.billNo || '-',
      item.quantity,
      item.unitPrice ? Number(item.unitPrice).toFixed(2) : '-',
      item.totalCost ? Number(item.totalCost).toFixed(2) : '-',
      item.notes || '-',
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `material_inward_report_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast.success('CSV exported successfully');
  };

  // Get unique products for filter
  const productOptions = useMemo(() => {
    const products = new Set<string>();
    data.forEach(item => products.add(item.productName));
    const sortedProducts = Array.from(products).sort();

    return [
      { id: 'All Products', label: 'All Products', value: 'All Products' },
      ...sortedProducts.map(p => ({
        id: p,
        label: p,
        value: p,
      })),
    ];
  }, [data]);

  // Filter data by product
  const filteredData = useMemo(() => {
    let result = data;
    if (productFilter) {
      result = data.filter(item => item.productName === productFilter);
    }
    // 1. Sort oldest to newest to calculate running totals
    const sortedAsc = [...result].sort(
      (a, b) => new Date(a.inwardDate).getTime() - new Date(b.inwardDate).getTime()
    );

    // 2. Calculate running totals
    let runningTotal = 0;
    const withTotals = sortedAsc.map(item => {
      runningTotal += Number(item.quantity || 0);
      return { ...item, totalQty: runningTotal };
    });

    // 3. Sort newest to oldest for display
    return withTotals.sort(
      (a, b) => new Date(b.inwardDate).getTime() - new Date(a.inwardDate).getTime()
    );
  }, [data, productFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalInwards = filteredData.length;
    const totalQuantity = filteredData.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const totalCost = filteredData.reduce((sum, item) => sum + Number(item.totalCost || 0), 0);
    const uniqueSuppliers = new Set(filteredData.map(item => item.supplierName).filter(Boolean))
      .size;

    return { totalInwards, totalQuantity, totalCost, uniqueSuppliers };
  }, [filteredData]);

  // Generate colors for charts
  const generateColors = (count: number) => {
    const colors = [
      { bg: 'rgba(74, 222, 128, 0.8)', border: 'rgb(34, 197, 94)' }, // Green
      { bg: 'rgba(96, 165, 250, 0.8)', border: 'rgb(59, 130, 246)' }, // Blue
      { bg: 'rgba(251, 146, 60, 0.8)', border: 'rgb(249, 115, 22)' }, // Orange
      { bg: 'rgba(196, 181, 253, 0.8)', border: 'rgb(168, 85, 247)' }, // Purple
      { bg: 'rgba(248, 113, 113, 0.8)', border: 'rgb(239, 68, 68)' }, // Red
      { bg: 'rgba(251, 191, 36, 0.8)', border: 'rgb(234, 179, 8)' }, // Yellow
      { bg: 'rgba(103, 232, 249, 0.8)', border: 'rgb(6, 182, 212)' }, // Cyan
      { bg: 'rgba(251, 113, 133, 0.8)', border: 'rgb(236, 72, 153)' }, // Pink
    ];
    return colors.slice(0, Math.min(count, colors.length));
  };

  // Process data for charts
  const chartData = useMemo(() => {
    if (filteredData.length === 0) return null;

    // Helper to process Top N and Others
    const processTopN = (map: Map<string, number>, topN: number = 10) => {
      const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);

      if (sorted.length <= topN) return sorted;

      const top = sorted.slice(0, topN);
      const others = sorted.slice(topN).reduce((sum, item) => sum + item[1], 0);

      return [...top, ['Others', others] as [string, number]];
    };

    // Quantity Distribution by Product
    const quantityMap = new Map<string, number>();
    filteredData.forEach(item => {
      const qty = Number(item.quantity || 0);
      quantityMap.set(item.productName, (quantityMap.get(item.productName) || 0) + qty);
    });

    const topQuantityProducts = processTopN(quantityMap);
    const quantityColors = generateColors(topQuantityProducts.length);

    // Cost Distribution by Product
    const costMap = new Map<string, number>();
    filteredData.forEach(item => {
      const cost = Number(item.totalCost || 0);
      costMap.set(item.productName, (costMap.get(item.productName) || 0) + cost);
    });

    const topCostProducts = processTopN(costMap);
    const costColors = generateColors(topCostProducts.length);

    // Inward Transactions Timeline - Dual Axis with detailed data
    const dateMap = new Map<
      string,
      { quantity: number; cost: number; items: MaterialInwardReportItem[] }
    >();
    filteredData.forEach(item => {
      // Use YYYY-MM-DD for reliable sorting and grouping
      const date = new Date(item.inwardDate).toISOString().split('T')[0];
      const existing = dateMap.get(date) || { quantity: 0, cost: 0, items: [] };
      dateMap.set(date, {
        quantity: existing.quantity + Number(item.quantity || 0),
        cost: existing.cost + Number(item.totalCost || 0),
        items: [...existing.items, item],
      });
    });

    const sortedDates = Array.from(dateMap.keys()).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    return {
      quantityDistribution: {
        labels: topQuantityProducts.map(p => p[0]),
        datasets: [
          {
            label: 'Quantity',
            data: topQuantityProducts.map(p => p[1]),
            backgroundColor: quantityColors.map(c => c.bg),
            borderColor: quantityColors.map(c => c.border),
            borderWidth: 1,
          },
        ],
      },
      costDistribution: {
        labels: topCostProducts.map(p => p[0]),
        datasets: [
          {
            label: 'Cost (₹)',
            data: topCostProducts.map(p => p[1]),
            backgroundColor: costColors.map(c => c.bg),
            borderColor: costColors.map(c => c.border),
            borderWidth: 1,
          },
        ],
      },
      timeline: {
        labels: sortedDates,
        datasets: [
          {
            label: 'Quantity',
            data: sortedDates.map(date => dateMap.get(date)!.quantity),
            borderColor: 'rgb(74, 222, 128)',
            backgroundColor: 'rgba(74, 222, 128, 0.5)',
            tension: 0.4,
            yAxisID: 'y',
            fill: false,
          },
          {
            label: 'Total Cost (₹)',
            data: sortedDates.map(date => dateMap.get(date)!.cost),
            borderColor: 'rgb(96, 165, 250)',
            backgroundColor: 'rgba(96, 165, 250, 0.5)',
            tension: 0.4,
            yAxisID: 'y1',
            fill: false,
          },
        ],
      },
      timelineDetails: dateMap, // Store for tooltip access
    };
  }, [filteredData]);

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
    },
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          title: (context: any) => {
            // context[0].label is the ISO Date string (e.g. 2026-01-17)
            return new Date(context[0].label).toLocaleDateString();
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          afterBody: (context: any) => {
            if (!chartData?.timelineDetails) return [];

            const dateKey = context[0].label; // ISO Key
            const details = chartData.timelineDetails.get(dateKey);

            if (!details || !details.items.length) return [];

            const lines = ['\n📦 All Items for this date:'];
            details.items.forEach((item, index) => {
              lines.push(
                `\n${index + 1}. ${item.productName}`,
                `   Qty: ${item.quantity} | Cost: ₹${Number(item.totalCost || 0).toFixed(2)}`,
                `   Supplier: ${item.supplierName || 'N/A'}`,
                `   Bill: ${item.billNo || 'N/A'}`
              );
            });

            return lines;
          },
        },
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 12,
        },
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
      },
    },
    scales: {
      x: {
        ticks: {
          // Format X-axis labels to be readable
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callback: function (this: any, value: any) {
            const label = this.getLabelForValue(value);
            return new Date(label).toLocaleDateString();
          }
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Quantity',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Total Cost (₹)',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  // Define columns for DataTable
  const columns = useMemo<ColumnDef<MaterialInwardReportItem>[]>(
    () => [
      {
        accessorKey: 'inwardDate',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Inward Date" />,
        cell: ({ row }) => (
          <div className="whitespace-nowrap text-[var(--text-secondary)]">
            {formatDate(row.original.inwardDate)}
          </div>
        ),
      },
      {
        accessorKey: 'productName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Product Name" />,
        cell: ({ row }) => (
          <div className="font-medium text-[var(--text-primary)]">{row.original.productName}</div>
        ),
      },
      {
        accessorKey: 'productType',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ row }) => (
          <Badge
            className={`${row.original.productType === 'FG'
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : row.original.productType === 'RM'
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-yellow-500 hover:bg-yellow-600 text-white'
              }`}
          >
            {row.original.productType || '-'}
          </Badge>
        ),
      },
      {
        accessorKey: 'supplierName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Supplier" />,
        cell: ({ row }) => (
          <div className="text-[var(--text-secondary)]">{row.original.supplierName || '-'}</div>
        ),
      },
      {
        accessorKey: 'billNo',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Bill No" />,
        cell: ({ row }) => (
          <div className="font-mono text-sm text-[var(--text-secondary)]">
            {row.original.billNo || '-'}
          </div>
        ),
      },
      {
        accessorKey: 'quantity',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Quantity" />,
        cell: ({ row }) => (
          <div className="text-right font-semibold text-[var(--text-primary)]">
            {row.original.quantity}
          </div>
        ),
      },
      {
        id: 'totalQty',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Total Qty" />,
        cell: ({ row }) => (
          <div className="text-right font-semibold text-[var(--color-primary-600)]">
            {row.original.totalQty !== undefined ? row.original.totalQty.toFixed(2) : '-'}
          </div>
        ),
      },
      {
        accessorKey: 'unitPrice',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Unit Price" />,
        cell: ({ row }) => (
          <div className="text-right text-[var(--text-secondary)]">
            {row.original.unitPrice ? `₹${Number(row.original.unitPrice).toFixed(2)}` : '-'}
          </div>
        ),
      },
      {
        accessorKey: 'totalCost',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Total Cost" />,
        cell: ({ row }) => (
          <div className="text-right font-semibold text-[var(--color-success)]">
            {row.original.totalCost ? `₹${Number(row.original.totalCost).toFixed(2)}` : '-'}
          </div>
        ),
      },
      {
        accessorKey: 'notes',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Notes" />,
        cell: ({ row }) => (
          <div
            className="text-sm text-[var(--text-secondary)] max-w-xs truncate"
            title={row.original.notes || ''}
          >
            {row.original.notes || '-'}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Material Inward Report"
        description="Track all incoming materials and products"
        actions={
          <div className="flex gap-2">
            <Button
              variant="primary"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleExportCsv}
              leftIcon={<FileDown size={20} />}
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleExport}
              leftIcon={<FileDown size={20} />}
            >
              Export PDF
            </Button>
          </div>
        }
      />

      {/* Filters Container */}
      <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
        <div className="flex items-end gap-4 flex-wrap">
          {/* Product Type Tabs */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 ml-1">Type</label>
            <div className="flex items-center gap-2">
              {(['All', 'FG', 'RM', 'PM'] as const).map(type => (
                <Button
                  key={type}
                  size="sm"
                  variant={productTypeFilter === type ? 'primary' : 'secondary'}
                  onClick={() => setProductTypeFilter(type)}
                  className={`min-w-[4rem] px-4 transition-all duration-200 ${productTypeFilter === type
                    ? 'bg-slate-800 text-white hover:bg-slate-900 border-none shadow-md'
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
              value={productFilter}
              onChange={val => setProductFilter(val || '')}
              options={productList}
              placeholder="Search any product"
            />
          </div>

          <div className="h-10 w-px bg-gray-300 mx-1 hidden lg:block" />

          {/* Date Filters */}
          <Input
            type="date"
            label="From"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            fullWidth={false}
            className="w-[150px] shadow-sm border-gray-200"
          />

          <Input
            type="date"
            label="To"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            fullWidth={false}
            className="w-[150px] shadow-sm border-gray-200"
          />
        </div>
      </div>

      {/* Statistics Cards */}
      {!isLoading && filteredData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <p className="text-sm text-[var(--text-secondary)] font-medium">Total Inwards</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
              {stats.totalInwards}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-[var(--text-secondary)] font-medium">Total Quantity</p>
            <p className="text-2xl font-bold text-[var(--color-primary-600)] mt-1">
              {stats.totalQuantity}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-[var(--text-secondary)] font-medium">Total Cost</p>
            <p className="text-2xl font-bold text-[var(--color-success)] mt-1">
              ₹{stats.totalCost.toFixed(2)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-[var(--text-secondary)] font-medium">Unique Suppliers</p>
            <p className="text-2xl font-bold text-[var(--color-info)] mt-1">
              {stats.uniqueSuppliers}
            </p>
          </div>
        </div>
      )}

      {/* Data Visualization */}
      {!isLoading && chartData && filteredData.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Visualization of quantity and price
            </h2>
          </div>

          {/* Pie Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-center font-semibold text-[var(--text-primary)] mb-4">
                Quantity Distribution
              </h3>
              <div className="h-[300px]">
                <Pie data={chartData.quantityDistribution} options={pieChartOptions} />
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-center font-semibold text-[var(--text-primary)] mb-4">
                Cost Distribution
              </h3>
              <div className="h-[300px]">
                <Pie data={chartData.costDistribution} options={pieChartOptions} />
              </div>
            </div>
          </div>

          {/* Timeline Chart */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Inward Transactions Timeline
            </h3>
            <div className="h-[400px]">
              <Line data={chartData.timeline} options={lineChartOptions} />
            </div>
          </div>
        </div>
      )}

      {/* DataTable */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[var(--text-secondary)]">Loading material inward data...</div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          searchPlaceholder="Search materials, suppliers, bills..."
          defaultPageSize={10}
          showToolbar={true}
          showPagination={true}
        />
      )}
    </div>
  );
};

export default MaterialInwardReport;
