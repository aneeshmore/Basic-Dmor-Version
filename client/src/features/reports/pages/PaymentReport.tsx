import React, { useState, useEffect, useMemo } from 'react';
import { IndianRupee, FileDown } from 'lucide-react';
import { customerApi } from '@/features/masters/api/customerApi';
import { Button } from '@/components/ui';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import CustomerTransactionHistory from '../components/CustomerTransactionHistory';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addPdfFooter, addPdfHeader } from '@/utils/pdfUtils';
import { companyApi } from '@/features/company/api/companyApi';
import { CompanyInfo } from '@/features/company/types';
import { showToast } from '@/utils/toast';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    TooltipItem
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

interface CustomerSummary {
    customerId: number;
    companyName: string;
    contactPerson: string;
    mobileNo: string;
    currentBalance: number;
}

export default function PaymentReport() {
    const [customers, setCustomers] = useState<CustomerSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

    useEffect(() => {
        loadCustomers();
        companyApi.get().then(res => setCompanyInfo(res.data.data)).catch(console.error);
    }, []);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const res = await customerApi.getAll();
            if (res.data) {
                const summaryData = res.data.map((c: any) => ({
                    customerId: c.customerId || c.CustomerID,
                    companyName: c.companyName || c.CompanyName,
                    contactPerson: c.contactPerson || c.ContactPerson,
                    mobileNo: c.mobileNo || c.MobileNo,
                    currentBalance: Number(c.currentBalance || c.CurrentBalance || 0),
                }));
                setCustomers(summaryData);
            }
        } catch (error) {
            console.error('Failed to load customers', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportSummaryPdf = () => {
        if (customers.length === 0) {
            showToast.error('No data to export');
            return;
        }

        const doc = new jsPDF();
        const startY = addPdfHeader(doc, companyInfo, 'Customer Balance Summary');
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, startY + 10);

        const tableColumn = ['Company Name', 'Contact Person', 'Mobile', 'Balance (Rs.)'];
        const tableRows = customers.map(c => [
            c.companyName,
            c.contactPerson,
            c.mobileNo,
            c.currentBalance.toFixed(2)
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: startY + 20,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [63, 81, 181] },
        });

        addPdfFooter(doc);

        doc.save(`customer_balances_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast.success('Summary exported successfully');
    };

    const calculateTotalReceivable = () => {
        return customers.reduce((sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0), 0);
    };

    // --- Chart Data Preparation ---

    const top5Receivables = useMemo(() => {
        return [...customers]
            .filter(c => c.currentBalance > 0)
            .sort((a, b) => b.currentBalance - a.currentBalance)
            .slice(0, 5);
    }, [customers]);

    const balanceDistribution = useMemo(() => {
        let debitCount = 0;
        let creditCount = 0;
        let zeroCount = 0;

        customers.forEach(c => {
            if (c.currentBalance > 0) debitCount++;
            else if (c.currentBalance < 0) creditCount++;
            else zeroCount++;
        });

        return { debitCount, creditCount, zeroCount };
    }, [customers]);

    const barChartData = {
        labels: top5Receivables.map(c => c.companyName.length > 15 ? c.companyName.substring(0, 15) + '...' : c.companyName),
        datasets: [
            {
                label: 'Outstanding Balance (Rs.)',
                data: top5Receivables.map(c => c.currentBalance),
                backgroundColor: 'rgba(239, 68, 68, 0.8)', // Red-500
                borderColor: 'rgba(239, 68, 68, 1)',
                borderWidth: 1,
                borderRadius: 4,
            },
        ],
    };

    const doughnutChartData = {
        labels: ['Receivables (Due)', 'Payables (Advance)', 'Settled (Zero)'],
        datasets: [
            {
                data: [balanceDistribution.debitCount, balanceDistribution.creditCount, balanceDistribution.zeroCount],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',   // Red for Due
                    'rgba(34, 197, 94, 0.8)',   // Green for Advance
                    'rgba(156, 163, 175, 0.8)', // Gray for Zero
                ],
                borderColor: [
                    'rgba(239, 68, 68, 1)',
                    'rgba(34, 197, 94, 1)',
                    'rgba(156, 163, 175, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const barOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
            title: {
                display: true,
                text: 'Top 5 Customers by Outstanding Balance',
                font: { size: 14, weight: 'bold' as const },
                color: '#374151'
            },
            tooltip: {
                callbacks: {
                    label: function (context: TooltipItem<'bar'>) {
                        const val = context.parsed.y ?? 0;
                        return `₹${val.toLocaleString('en-IN')}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(0,0,0,0.05)' },
                ticks: {
                    callback: function (value: any) {
                        return '₹' + (value / 1000).toFixed(0) + 'k';
                    },
                    font: { size: 10 }
                }
            },
            x: {
                grid: { display: false },
                ticks: { font: { size: 10 } }
            }
        }
    };

    const doughnutOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: { usePointStyle: true, boxWidth: 8 }
            },
            title: {
                display: true,
                text: 'Customer Account Status',
                font: { size: 14, weight: 'bold' as const },
                color: '#374151'
            }
        }
    };

    // --- End Chart Data ---

    const columns = useMemo<ColumnDef<CustomerSummary>[]>(() => [
        {
            accessorKey: 'companyName',
            header: 'Company Name',
            cell: ({ row }) => (
                <div className="font-medium text-[var(--text-primary)]">
                    {row.original.companyName}
                </div>
            ),
        },
        {
            accessorKey: 'contactPerson',
            header: 'Contact Person',
            cell: ({ row }) => row.original.contactPerson || '-',
        },
        {
            accessorKey: 'mobileNo',
            header: 'Mobile',
            cell: ({ row }) => row.original.mobileNo || '-',
        },
        {
            accessorKey: 'currentBalance',
            header: 'Current Balance',
            cell: ({ row }) => (
                <div className={`font-bold flex items-center ${row.original.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    <IndianRupee size={12} className="mr-0.5" />
                    {row.original.currentBalance.toFixed(2)}
                    {row.original.currentBalance > 0 ? ' (Dr)' : row.original.currentBalance < 0 ? ' (Cr)' : ''}
                </div>
            ),
        },
    ], []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="Payment Report"
                description="View all customer balances and expand to see detailed transaction history."
                actions={
                    <Button
                        variant="primary"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handleExportSummaryPdf}
                        leftIcon={<FileDown size={16} />}
                    >
                        Export Summary
                    </Button>
                }
            />

            {/* Graphs Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg border border-[var(--border)] shadow-sm h-[300px] flex items-center justify-center">
                    {top5Receivables.length > 0 ? (
                        <Bar data={barChartData} options={barOptions} />
                    ) : (
                        <div className="text-gray-400 text-sm">No outstanding balances to display</div>
                    )}
                </div>
                <div className="bg-white p-4 rounded-lg border border-[var(--border)] shadow-sm h-[300px] flex items-center justify-center">
                    <div className="w-[280px]">
                        <Doughnut data={doughnutChartData} options={doughnutOptions} />
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[var(--surface)] p-4 rounded-lg border border-[var(--border)] shadow-sm">
                    <div className="text-sm text-[var(--text-secondary)] mb-1">Total Receivables</div>
                    <div className="text-2xl font-bold text-red-600 flex items-center">
                        <IndianRupee size={24} className="mr-1" />
                        {calculateTotalReceivable().toFixed(2)}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Total amount due from customers</p>
                </div>
                <div className="bg-[var(--surface)] p-4 rounded-lg border border-[var(--border)] shadow-sm">
                    <div className="text-sm text-[var(--text-secondary)] mb-1">Total Customers</div>
                    <div className="text-2xl font-bold text-[var(--text-primary)]">
                        {customers.length}
                    </div>
                </div>
            </div>

            {/* Main Customer Table */}
            <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] shadow-sm overflow-hidden">
                <DataTable
                    data={customers}
                    columns={columns}
                    searchPlaceholder="Search customers..."
                    getRowCanExpand={() => true}
                    initialSorting={[{ id: 'currentBalance', desc: true }]}
                    renderSubComponent={({ row }) => (
                        <CustomerTransactionHistory
                            customerId={row.original.customerId}
                            customerName={row.original.companyName}
                        />
                    )}
                />
            </div>
        </div>
    );
}
