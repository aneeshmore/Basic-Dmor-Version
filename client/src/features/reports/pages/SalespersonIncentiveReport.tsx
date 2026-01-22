import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import {
    Loader2,
    Calendar,
    AlertCircle,
    ChevronDown,
    RefreshCw,
    Download,
    DollarSign,
    ShoppingBag,
    Award
} from 'lucide-react';
import { reportsApi } from '@/features/reports/api/reportsApi';
import { companyApi } from '@/features/company/api/companyApi';
import { CompanyInfo } from '@/features/company/types';
import { formatDate } from '@/utils/dateUtils';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { formatCurrency } from '@/utils/formatters';
import {
    format,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfYear,
    subYears,
} from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addPdfFooter, addPdfHeader } from '@/utils/pdfUtils';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);


// --- Types ---
interface IncentiveOrderDetail {
    orderNumber: string;
    date: string;
    quantity: number;
    incentive: number;
}

interface ProductIncentiveDetail {
    productId: number;
    productName: string;
    totalQuantity: number;
    incentiveRate: number;
    totalIncentive: number;
    orders: IncentiveOrderDetail[];
}

interface SalespersonIncentiveItem {
    salespersonId: number;
    salespersonName: string;
    totalIncentive: number;
    details: ProductIncentiveDetail[];
}

type DateRangePreset =
    | 'this_month'
    | 'last_month'
    | 'last_3_months'
    | 'last_6_months'
    | 'this_year'
    | 'last_year'
    | 'custom';

const getDateRange = (preset: DateRangePreset): { start: Date; end: Date } => {
    const now = new Date();
    switch (preset) {
        case 'this_month':
            return { start: startOfMonth(now), end: now };
        case 'last_month':
            return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
        case 'last_3_months':
            return { start: subMonths(now, 3), end: now };
        case 'last_6_months':
            return { start: subMonths(now, 6), end: now };
        case 'this_year':
            return { start: startOfYear(now), end: now };
        case 'last_year':
            return {
                start: startOfYear(subYears(now, 1)),
                end: endOfMonth(subMonths(startOfYear(now), 1)),
            };
        default:
            return { start: subMonths(now, 1), end: now };
    }
};

const SalespersonIncentiveReport: React.FC = () => {
    // --- State for Date Filter ---
    const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('this_month');
    const [customStart, setCustomStart] = useState<string>('');
    const [customEnd, setCustomEnd] = useState<string>('');
    const [showPresetDropdown, setShowPresetDropdown] = useState(false);
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

    useEffect(() => {
        companyApi.get()
            .then(res => {
                const info = (res.data as any).data || res.data;
                setCompanyInfo(info);
            })
            .catch(console.error);
    }, []);

    // Calculate actual start/end dates based on preset
    const dateRange = useMemo(() => {
        if (dateRangePreset === 'custom') {
            return {
                start: customStart ? new Date(customStart) : undefined,
                end: customEnd ? new Date(customEnd) : undefined,
            };
        }
        return getDateRange(dateRangePreset);
    }, [dateRangePreset, customStart, customEnd]);

    // Format for API (YYYY-MM-DD)
    const apiStartDate = dateRange.start ? format(dateRange.start, 'yyyy-MM-dd') : '';
    const apiEndDate = dateRange.end ? format(dateRange.end, 'yyyy-MM-dd') : '';

    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: ['salespersonIncentiveReport', apiStartDate, apiEndDate],
        queryFn: () => reportsApi.getSalespersonIncentiveReport(apiStartDate, apiEndDate),
        enabled: !!apiStartDate && !!apiEndDate
    });

    const getPresetLabel = (preset: DateRangePreset): string => {
        const labels: Record<DateRangePreset, string> = {
            this_month: 'This Month',
            last_month: 'Last Month',
            last_3_months: 'Last 3 Months',
            last_6_months: 'Last 6 Months',
            this_year: 'This Year',
            last_year: 'Last Year',
            custom: 'Custom Range',
        };
        return labels[preset];
    };

    // --- Statistics ---
    const stats = useMemo(() => {
        if (!data) return { totalIncentive: 0, topEarner: '-', totalProductsSold: 0 };
        const totalIncentive = data.reduce((sum: number, item: SalespersonIncentiveItem) => sum + Number(item.totalIncentive), 0);
        // data matches data sorted by totalIncentive DESC from backend
        const topEarner = data.length > 0 ? data[0].salespersonName : '-';

        let totalProductsSold = 0;
        data.forEach((item: SalespersonIncentiveItem) => {
            item.details.forEach(d => totalProductsSold += d.totalQuantity);
        });

        return { totalIncentive, topEarner, totalProductsSold };
        return { totalIncentive, topEarner, totalProductsSold };
    }, [data]);

    // --- Chart Data ---
    const barChartData = useMemo(() => {
        if (!data) return null;
        return {
            labels: data.map((item: SalespersonIncentiveItem) => item.salespersonName),
            datasets: [
                {
                    label: 'Incentive Earned',
                    data: data.map((item: SalespersonIncentiveItem) => item.totalIncentive),
                    backgroundColor: 'rgba(147, 51, 234, 0.6)', // Purple-600
                    borderColor: 'rgb(147, 51, 234)',
                    borderWidth: 1,
                },
            ],
        };
    }, [data]);

    const pieChartData = useMemo(() => {
        if (!data) return null;
        return {
            labels: data.map((item: SalespersonIncentiveItem) => item.salespersonName),
            datasets: [
                {
                    label: 'Incentive Share',
                    data: data.map((item: SalespersonIncentiveItem) => item.totalIncentive),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)',
                        'rgba(255, 159, 64, 0.6)',
                    ],
                    borderWidth: 1,
                },
            ],
        };
    }, [data]);

    const lineChartData = useMemo(() => {
        if (!data) return null;

        // Flatten all incentive orders
        const allOrders: IncentiveOrderDetail[] = data.flatMap((item: SalespersonIncentiveItem) =>
            item.details.flatMap(d => d.orders)
        );

        // Group by date
        const incentivesByDate: Record<string, number> = {};
        allOrders.forEach(order => {
            const dateKey = new Date(order.date).toLocaleDateString('en-CA'); // YYYY-MM-DD
            incentivesByDate[dateKey] = (incentivesByDate[dateKey] || 0) + Number(order.incentive);
        });

        // Sort dates
        const sortedDates = Object.keys(incentivesByDate).sort();

        return {
            labels: sortedDates.map(date => formatDate(date)),
            datasets: [
                {
                    label: 'Daily Incentive Distributed',
                    data: sortedDates.map(date => incentivesByDate[date]),
                    borderColor: 'rgb(236, 72, 153)', // Pink-500
                    backgroundColor: 'rgba(236, 72, 153, 0.5)',
                    tension: 0.3,
                    fill: true,
                },
            ],
        };
    }, [data]);


    const downloadPDF = async (salesperson: SalespersonIncentiveItem) => {
        let currentCompanyInfo = companyInfo;

        // If not in state, try fetching fresh
        if (!currentCompanyInfo) {
            try {
                const res = await companyApi.get();
                currentCompanyInfo = res.data.data || (res.data as any);
            } catch (error) {
                console.error("Failed to fetch company info for PDF", error);
            }
        }

        const doc = new jsPDF();

        // Title
        const startY = addPdfHeader(doc, currentCompanyInfo, 'Incentive Report');

        // Metadata
        doc.setFontSize(10);
        doc.text(`Salesperson: ${salesperson.salespersonName}`, 14, startY + 10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, startY + 15);

        const periodText = dateRange.start && dateRange.end
            ? `Period: ${format(dateRange.start, 'dd MMM yyyy')} - ${format(dateRange.end, 'dd MMM yyyy')}`
            : 'Period: All Time';
        doc.text(periodText, 14, startY + 20);

        const tableColumn = ['Product', 'Incentive Rate', 'Qty Sold', 'Total Incentive'];
        const tableRows = salesperson.details.map(detail => [
            detail.productName,
            formatCurrency(detail.incentiveRate),
            detail.totalQuantity.toString(),
            formatCurrency(detail.totalIncentive)
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: startY + 25,
            theme: 'grid',
            headStyles: { fillColor: [66, 66, 66] },
            foot: [['', '', 'Total', formatCurrency(salesperson.totalIncentive)]],
            footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
        });

        addPdfFooter(doc);
        doc.save(`${salesperson.salespersonName}_Incentives.pdf`);
    };


    // --- Table Columns ---
    const columns = useMemo<ColumnDef<SalespersonIncentiveItem>[]>(
        () => [
            {
                accessorKey: 'salespersonName',
                header: 'Salesperson Name',
                cell: ({ row }) => (
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-xs">
                            {row.original.salespersonName.charAt(0).toUpperCase()}
                        </div>
                        <div className="font-medium text-[var(--text-primary)]">{row.getValue('salespersonName')}</div>
                    </div>
                ),
            },
            {
                id: 'productsCount',
                header: ({ column }) => <div className="text-right">Product Types Sold</div>,
                cell: ({ row }) => <div className="text-right text-[var(--text-secondary)]">{row.original.details.length}</div>
            },
            {
                accessorKey: 'totalIncentive',
                header: ({ column }) => <div className="text-right">Total Incentive</div>,
                cell: ({ row }) => (
                    <div className="text-right font-bold text-green-600">
                        {formatCurrency(Number(row.getValue('totalIncentive')))}
                    </div>
                ),
            },
            {
                id: 'actions',
                cell: ({ row }) => {
                    return (
                        <div className="flex justify-end">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    downloadPDF(row.original);
                                }}
                                title="Download PDF"
                            >
                                <Download className="h-4 w-4 text-gray-500 hover:text-primary" />
                            </Button>
                        </div>
                    );
                }
            }
        ],
        []
    );

    // --- Sub Component (Product Details) ---
    const renderProductDetails = ({ row }: { row: any }) => {
        const details = row.original.details as ProductIncentiveDetail[];
        if (!details || details.length === 0) return <div className="p-4 text-center text-muted-foreground">No incentives found.</div>;

        return (
            <div className="p-4 bg-[var(--background)]/50">
                <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-[var(--surface-secondary)]">
                            <tr className="border-b border-[var(--border)]">
                                <th className="h-10 px-4 text-left font-medium text-[var(--text-secondary)]">Product</th>
                                <th className="h-10 px-4 text-right font-medium text-[var(--text-secondary)]">Rate / Unit</th>
                                <th className="h-10 px-4 text-right font-medium text-[var(--text-secondary)]">Total Qty</th>
                                <th className="h-10 px-4 text-right font-medium text-[var(--text-primary)]">Incentive</th>
                            </tr>
                        </thead>
                        <tbody>
                            {details.map((detail) => (
                                <tr key={detail.productId} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-highlight)]">
                                    <td className="p-3 px-4 font-medium text-[var(--text-primary)]">{detail.productName}</td>
                                    <td className="p-3 px-4 text-right text-[var(--text-secondary)]">{formatCurrency(detail.incentiveRate)}</td>
                                    <td className="p-3 px-4 text-right text-[var(--text-secondary)]">{new Intl.NumberFormat('en-IN').format(detail.totalQuantity)}</td>
                                    <td className="p-3 px-4 text-right font-medium text-green-600">
                                        {formatCurrency(detail.totalIncentive)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 container mx-auto pb-10">
            <PageHeader
                title="Salesperson Incentive Report"
                description="Track incentives earned by salespersons based on product sales."
            />

            {/* Filter Section */}
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <Calendar size={18} />
                        <span className="font-medium">Date Range:</span>
                    </div>

                    {/* Preset Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-highlight)] transition-colors"
                        >
                            <span className="font-medium text-[var(--text-primary)]">
                                {getPresetLabel(dateRangePreset)}
                            </span>
                            <ChevronDown
                                size={16}
                                className={`transition-transform ${showPresetDropdown ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {showPresetDropdown && (
                            <div className="absolute top-full left-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-50 min-w-[180px] overflow-hidden">
                                {(
                                    [
                                        'this_month',
                                        'last_month',
                                        'last_3_months',
                                        'last_6_months',
                                        'this_year',
                                        'last_year',
                                        'custom',
                                    ] as DateRangePreset[]
                                ).map(preset => (
                                    <button
                                        key={preset}
                                        onClick={() => {
                                            setDateRangePreset(preset);
                                            setShowPresetDropdown(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 hover:bg-[var(--surface-highlight)] transition-colors ${dateRangePreset === preset
                                            ? 'bg-purple-50 text-purple-600 font-medium'
                                            : 'text-[var(--text-primary)]'
                                            }`}
                                    >
                                        {getPresetLabel(preset)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Custom Date Inputs */}
                    {dateRangePreset === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={customStart}
                                onChange={e => setCustomStart(e.target.value)}
                                className="px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <span className="text-[var(--text-secondary)]">to</span>
                            <input
                                type="date"
                                value={customEnd}
                                onChange={e => setCustomEnd(e.target.value)}
                                className="px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    )}

                    {/* Date Range Display */}
                    <div className="flex-1 text-right text-sm text-[var(--text-secondary)]">
                        {dateRange.start && dateRange.end
                            ? `${format(dateRange.start, 'dd MMM yyyy')} - ${format(dateRange.end, 'dd MMM yyyy')}`
                            : 'Select a Date Range'}
                    </div>

                    {/* Refresh Button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isRefetching}
                        leftIcon={<RefreshCw size={16} className={isRefetching ? 'animate-spin' : ''} />}
                    >
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-5 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <DollarSign size={24} />
                        </div>
                        <DollarSign size={32} className="opacity-20" />
                    </div>
                    <div className="text-3xl font-bold mb-1">{formatCurrency(stats.totalIncentive)}</div>
                    <div className="text-sm text-white/80">Total Incentives Distributed</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-5 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Award size={24} />
                        </div>
                        <Award size={32} className="opacity-20" />
                    </div>
                    <div className="text-xl font-bold mb-1 truncate" title={stats.topEarner}>
                        {stats.topEarner}
                    </div>
                    <div className="text-sm text-white/80">Top Earner</div>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-5 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <ShoppingBag size={24} />
                        </div>
                        <ShoppingBag size={32} className="opacity-20" />
                    </div>
                    <div className="text-3xl font-bold mb-1">{stats.totalProductsSold}</div>
                    <div className="text-sm text-white/80">Incentivized Units Sold</div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : isError ? (
                <div className="flex flex-col justify-center items-center h-64 text-red-500 gap-2">
                    <AlertCircle className="h-8 w-8" />
                    <p>Failed to load incentive report</p>
                </div>
            ) : (
                <>
                    {/* Charts Section */}
                    {data && data.length > 0 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card className="border-[var(--border)] bg-[var(--surface)] shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="text-[var(--text-primary)]">Incentive Trend (Daily)</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="h-[300px]">
                                            {lineChartData && <Line data={lineChartData} options={{ maintainAspectRatio: false, responsive: true }} />}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="border-[var(--border)] bg-[var(--surface)] shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="text-[var(--text-primary)]">Incentive Share</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="h-[300px] flex justify-center">
                                            {pieChartData && <Pie data={pieChartData} options={{ maintainAspectRatio: false, responsive: true }} />}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card className="border-[var(--border)] bg-[var(--surface)] shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-[var(--text-primary)]">Incentive by Salesperson</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px]">
                                        {barChartData && <Bar data={barChartData} options={{ maintainAspectRatio: false, responsive: true }} />}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}


                    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-[var(--border)] bg-gradient-to-r from-purple-50 to-pink-50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                                        Incentive Breakdown
                                    </h2>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        Salespersons earning incentives
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4">
                            <DataTable
                                columns={columns}
                                data={data || []}
                                searchPlaceholder="Search salesperson..."
                                getRowCanExpand={() => true}
                                renderSubComponent={renderProductDetails}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SalespersonIncentiveReport;
