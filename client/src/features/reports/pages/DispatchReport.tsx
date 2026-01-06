import React, { useState, useEffect, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Calendar, Download, Search, Truck, Package, DollarSign, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import { reportsApi } from '../api/reportsApi';
import { DispatchReportItem } from '../types';
import { formatCurrency, formatNumber } from '@/utils/formatters';

const DispatchReport = () => {
  const [data, setData] = useState<DispatchReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const result = await reportsApi.getDispatchReport(startDate, endDate);
      setData(result);
    } catch (error) {
      console.error('Error fetching dispatch report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;

    return data.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.dispatchId.toString().includes(searchLower) ||
        item.vehicleNo.toLowerCase().includes(searchLower) ||
        (item.driverName && item.driverName.toLowerCase().includes(searchLower)) ||
        item.orders.some(order =>
          order.orderNumber.toLowerCase().includes(searchLower) ||
          order.customerName.toLowerCase().includes(searchLower)
        )
      );
    });
  }, [data, searchTerm]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof DispatchReportItem];
      let bValue: any = b[sortConfig.key as keyof DispatchReportItem];

      if (sortConfig.key === 'dispatchDate') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      } else if (typeof aValue === 'number') {
        // Keep as is for numeric comparison
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);

  // Handle sorting
  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Toggle expanded row
  const toggleExpanded = (dispatchId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(dispatchId)) {
      newExpanded.delete(dispatchId);
    } else {
      newExpanded.add(dispatchId);
    }
    setExpandedRows(newExpanded);
  };

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalDispatches = sortedData.length;
    const totalOrders = sortedData.reduce((sum, item) => sum + item.totalOrders, 0);
    const totalQuantity = sortedData.reduce((sum, item) => sum + item.totalQuantity, 0);
    const totalValue = sortedData.reduce((sum, item) => sum + item.totalValue, 0);

    const statusBreakdown = sortedData.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalDispatches,
      totalOrders,
      totalQuantity,
      totalValue,
      statusBreakdown,
    };
  }, [sortedData]);

  // Export to PDF
  const handleExportPDF = async () => {
    if (exportLoading) return;
    try {
      setExportLoading(true);
      setShowExportOptions(false);

      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF('l', 'mm', 'a4');

      // Title
      doc.setFontSize(20);
      doc.text('Dispatch Report', 14, 22);

      // Date range
      doc.setFontSize(12);
      const dateRange = startDate && endDate
        ? `From ${format(new Date(startDate), 'dd/MM/yyyy')} to ${format(new Date(endDate), 'dd/MM/yyyy')}`
        : 'All Dates';
      doc.text(`Date Range: ${dateRange}`, 14, 32);

      // Statistics
      doc.text(`Total Dispatches: ${statistics.totalDispatches}`, 14, 42);
      doc.text(`Total Orders: ${statistics.totalOrders}`, 80, 42);
      doc.text(`Total Quantity: ${formatNumber(statistics.totalQuantity)}`, 140, 42);
      doc.text(`Total Value: ${formatCurrency(statistics.totalValue)}`, 200, 42);

      // Table
      const tableColumns = [
        'Dispatch ID',
        'Date',
        'Vehicle',
        'Driver',
        'Orders',
        'Quantity',
        'Value',
        'Status'
      ];

      const tableRows = sortedData.map(item => [
        item.dispatchId.toString(),
        format(new Date(item.dispatchDate), 'dd/MM/yyyy'),
        item.vehicleNo,
        item.driverName || 'N/A',
        item.totalOrders.toString(),
        formatNumber(item.totalQuantity),
        formatCurrency(item.totalValue),
        item.status
      ]);

      // Add autoTable
      const { default: autoTable } = await import('jspdf-autotable');
      autoTable(doc, {
        head: [tableColumns],
        body: tableRows,
        startY: 52,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      // Save the PDF
      doc.save(`dispatch-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setExportLoading(false);
    }
  };

  // Define Columns for DataTable
  const columns = useMemo<ColumnDef<DispatchReportItem>[]>(
    () => [
      {
        id: 'expand',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleExpanded(row.original.dispatchId)}
            className="p-1 h-6 w-6"
          >
            {expandedRows.has(row.original.dispatchId) ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        ),
        size: 40,
      },
      {
        accessorKey: 'dispatchId',
        header: 'Dispatch ID',
        cell: ({ getValue }) => (
          <div className="font-medium">#{getValue() as string}</div>
        ),
        size: 120,
      },
      {
        accessorKey: 'dispatchDate',
        header: 'Date',
        cell: ({ getValue }) => format(new Date(getValue() as string), 'dd/MM/yyyy'),
        size: 100,
      },
      {
        accessorKey: 'vehicleNo',
        header: 'Vehicle',
        cell: ({ getValue }) => (
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-gray-500" />
            {getValue() as string}
          </div>
        ),
        size: 120,
      },
      {
        accessorKey: 'driverName',
        header: 'Driver',
        cell: ({ getValue }) => getValue() || 'N/A',
        size: 120,
      },
      {
        accessorKey: 'totalOrders',
        header: 'Orders',
        cell: ({ getValue }) => (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-500" />
            {getValue() as number}
          </div>
        ),
        size: 80,
      },
      {
        accessorKey: 'totalQuantity',
        header: 'Quantity',
        cell: ({ getValue }) => formatNumber(getValue() as number),
        size: 100,
      },
      {
        accessorKey: 'totalValue',
        header: 'Value',
        cell: ({ getValue }) => formatCurrency(getValue() as number),
        size: 120,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getValue() as string;
          const statusColors = {
            'Delivered': 'bg-green-100 text-green-800',
            'In Transit': 'bg-blue-100 text-blue-800',
            'Pending': 'bg-yellow-100 text-yellow-800',
          };
          return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
            }`}>
              {status}
            </span>
          );
        },
        size: 100,
      },
    ],
    [expandedRows]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispatch Report"
        description="View and analyze dispatch activities and performance"
        icon={Truck}
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dispatches</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalDispatches}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(statistics.totalQuantity)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(statistics.totalValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Export</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
            {/* Date Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by ID, vehicle, driver, or order..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Export Button */}
            <div className="relative">
              <Button
                onClick={() => setShowExportOptions(!showExportOptions)}
                disabled={exportLoading}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {exportLoading ? 'Exporting...' : 'Export'}
              </Button>

              {showExportOptions && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                  <button
                    onClick={handleExportPDF}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Export as PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Dispatches ({sortedData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={paginatedData}
            isLoading={isLoading}
            onSort={handleSort}
            sortConfig={sortConfig}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            renderExpandedRow={(row) => (
              <div className="px-4 py-3 bg-gray-50 border-t">
                <h4 className="font-medium mb-2">Order Details</h4>
                <div className="space-y-2">
                  {row.orders.map((order, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <div>
                        <span className="font-medium">{order.orderNumber}</span>
                        <span className="text-gray-500 ml-2">• {order.customerName}</span>
                      </div>
                      <div className="text-right">
                        <div>{formatNumber(order.quantity)} units</div>
                        <div className="text-gray-600">{formatCurrency(order.value)}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {row.remarks && (
                  <div className="mt-3 pt-2 border-t">
                    <span className="text-sm text-gray-600">Remarks: {row.remarks}</span>
                  </div>
                )}
              </div>
            )}
            expandedRows={expandedRows}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default DispatchReport;