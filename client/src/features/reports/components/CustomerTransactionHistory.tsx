
import React, { useEffect, useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table';
import { Button, Input } from '@/components/ui';
import { FileDown, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { paymentApi } from '@/features/operations/api/paymentApi';
import { showToast } from '@/utils/toast';
import { format } from 'date-fns';

interface CustomerTransactionHistoryProps {
    customerId: number;
    customerName: string;
}

interface LedgerItem {
    transactionId: number;
    transactionDate: string;
    type: string;
    description: string;
    debit: string;
    credit: string;
    balance: string;
    referenceNo?: string;
    paymentMode?: string;
}

const CustomerTransactionHistory: React.FC<CustomerTransactionHistoryProps> = ({
    customerId,
    customerName,
}) => {
    const [data, setData] = useState<LedgerItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setIsLoading(true);
                const res = await paymentApi.getLedger(customerId);
                // Axios returns data in res.data. If backend sends { success: true, data: [...] }, we need res.data.data
                let ledgerData: LedgerItem[] = Array.isArray(res.data) ? res.data : (res.data?.data || []);

                // Client-side date filtering (since getLedger API currently returns all or we might update it later)
                // If API supports filtering, pass params there. For now assuming client-side or all data.
                if (fromDate) {
                    ledgerData = ledgerData.filter(item => new Date(item.transactionDate) >= new Date(fromDate));
                }
                if (toDate) {
                    ledgerData = ledgerData.filter(item => new Date(item.transactionDate) <= new Date(toDate));
                }

                setData(ledgerData);
            } catch (error) {
                console.error('Error fetching customer ledger:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (customerId) {
            fetchHistory();
        }
    }, [customerId, fromDate, toDate]);

    const handleExportPdf = () => {
        if (data.length === 0) {
            showToast.error('No data to export');
            return;
        }

        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(`Transaction History: ${customerName}`, 14, 20);

        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
        if (fromDate) doc.text(`From: ${fromDate}`, 14, 36);
        if (toDate) doc.text(`To: ${toDate}`, 14, 42);

        const tableColumn = ['Date', 'Type', 'Description', 'Debit (Bill)', 'Credit (Pay)', 'Balance'];
        const tableRows = data.map(item => [
            format(new Date(item.transactionDate), 'dd/MM/yyyy'),
            item.type,
            item.description,
            item.debit ? Number(item.debit).toFixed(2) : '-',
            item.credit ? Number(item.credit).toFixed(2) : '-',
            Number(item.balance).toFixed(2)
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 50,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [71, 85, 105] },
            alternateRowStyles: { fillColor: [245, 247, 250] },
        });

        doc.save(`ledger_${customerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast.success('Ledger exported successfully');
    };

    const columns = useMemo<ColumnDef<LedgerItem>[]>(
        () => [
            {
                accessorKey: 'transactionDate',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
                cell: ({ row }) => format(new Date(row.original.transactionDate), 'dd/MM/yyyy'),
            },
            {
                accessorKey: 'type',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
                cell: ({ row }) => (
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${row.original.type === 'INVOICE' || row.original.type === 'OPENING'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-green-100 text-green-700'
                        }`}>
                        {row.original.type}
                    </span>
                ),
            },
            {
                accessorKey: 'description',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
                cell: ({ row }) => (
                    <div>
                        <div className="text-sm text-[var(--text-primary)]">{row.original.description}</div>
                        {row.original.referenceNo && (
                            <div className="text-xs text-[var(--text-secondary)]">Ref: {row.original.referenceNo}</div>
                        )}
                    </div>
                ),
            },
            {
                accessorKey: 'debit',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Debit" />,
                cell: ({ row }) => (
                    <div className="font-medium text-orange-600">
                        {Number(row.original.debit) > 0 ? Number(row.original.debit).toFixed(2) : '-'}
                    </div>
                ),
            },
            {
                accessorKey: 'credit',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Credit" />,
                cell: ({ row }) => (
                    <div className="font-medium text-green-600">
                        {Number(row.original.credit) > 0 ? Number(row.original.credit).toFixed(2) : '-'}
                    </div>
                ),
            },
            {
                accessorKey: 'balance',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Balance" />,
                cell: ({ row }) => (
                    <div className="font-bold text-blue-700">
                        {Number(row.original.balance).toFixed(2)}
                    </div>
                ),
            },
        ],
        []
    );

    if (isLoading) {
        return <div className="p-4 text-center text-sm text-gray-500">Loading ledger...</div>;
    }

    if (data.length === 0) {
        return <div className="p-4 text-center text-sm text-gray-500">No transactions found.</div>;
    }

    return (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-4 m-2 shadow-inner animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    Transaction History - {customerName}
                </h4>
            </div>

            <div className="rounded-md border border-gray-200 bg-white">
                <DataTable
                    columns={columns}
                    data={data}
                    showToolbar={true}
                    showPagination={true}
                    defaultPageSize={10}
                    searchPlaceholder="Search ledger..."
                    initialSorting={[{ id: 'transactionDate', desc: true }]}
                    toolbarActions={
                        <div className="flex items-center gap-2">
                            <Input
                                type="date"
                                value={fromDate}
                                onChange={e => setFromDate(e.target.value)}
                                inputSize="sm"
                                className="w-[130px]"
                                placeholder="From Date"
                            />
                            <Input
                                type="date"
                                value={toDate}
                                onChange={e => setToDate(e.target.value)}
                                inputSize="sm"
                                className="w-[130px]"
                                placeholder="To Date"
                            />
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={handleExportPdf}
                                leftIcon={<FileDown size={14} />}
                                title="Download Ledger PDF"
                            >
                                Export
                            </Button>
                        </div>
                    }
                />
            </div>
        </div>
    );
};

export default CustomerTransactionHistory;
