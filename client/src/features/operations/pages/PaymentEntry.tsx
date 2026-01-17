
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, SearchableSelect } from '@/components/ui';
import { customerApi } from '@/features/masters/api/customerApi';
import { paymentApi, PaymentInput } from '@/features/operations/api/paymentApi';
import { ArrowLeft, Save, IndianRupee } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const schema = z.object({
    customerId: z.number().min(1, 'Customer is required'),
    amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Amount must be positive'),
    paymentMode: z.string().min(1, 'Payment mode is required'),
    referenceNo: z.string().optional(),
    notes: z.string().optional(),
    paymentDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function PaymentEntry() {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState<{ id: number; label: string; value: number }[]>([]);
    const [currentBalance, setCurrentBalance] = useState<number | null>(null);
    const [recentPayments, setRecentPayments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            paymentMode: 'Cash',
            paymentDate: new Date().toISOString().split('T')[0],
        },
    });

    const selectedCustomerId = watch('customerId');

    useEffect(() => {
        loadCustomers();
    }, []);

    useEffect(() => {
        if (selectedCustomerId) {
            fetchBalance(selectedCustomerId);
            fetchRecentPayments(selectedCustomerId);
        } else {
            setCurrentBalance(null);
            setRecentPayments([]);
        }
    }, [selectedCustomerId]);

    const loadCustomers = async () => {
        try {
            const res = await customerApi.getAll();
            const options = (res.data || []).map((c: any) => ({
                id: c.customerId || c.CustomerID,
                label: c.companyName || c.CompanyName,
                value: c.customerId || c.CustomerID,
            }));
            setCustomers(options);
        } catch (error) {
            console.error('Failed to load customers', error);
        }
    };

    const fetchBalance = async (id: number) => {
        try {
            const res = await paymentApi.getBalance(id);
            setCurrentBalance(Number(res.data.balance));
        } catch (error) {
            console.error('Failed to load balance', error);
        }
    };

    const fetchRecentPayments = async (id: number) => {
        try {
            const res = await paymentApi.getLedger(id);
            if (res.data && res.data.data) {
                // Filter for PAYMENTS and take top 5
                const payments = res.data.data
                    .filter((t: any) => t.type === 'PAYMENT')
                    .slice(0, 5);
                setRecentPayments(payments);
            }
        } catch (error) {
            console.error('Failed to load recent payments', error);
        }
    };

    const onSubmit = async (data: FormData) => {
        setIsLoading(true);
        try {
            await paymentApi.createPayment({
                ...data,
                amount: Number(data.amount),
                customerId: Number(data.customerId), // Note: backend expects camelCase 'customerId'
                paymentDate: new Date(data.paymentDate || new Date()).toISOString(), // Convert YYYY-MM-DD to ISO
            });
            alert('Payment recorded successfully!');
            reset({
                paymentMode: 'Cash',
                paymentDate: new Date().toISOString().split('T')[0],
            });
            // Refresh balance and history
            if (data.customerId) {
                fetchBalance(Number(data.customerId));
                fetchRecentPayments(Number(data.customerId));
            } else {
                setCurrentBalance(null);
            }
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to record payment');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                </Button>
                <h1 className="text-2xl font-bold text-[var(--primary)]">Payment Entry</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form onSubmit={handleSubmit(onSubmit)} className="bg-[var(--surface)] p-6 rounded-lg shadow-md border border-[var(--border)] space-y-4">

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--text-primary)]">Customer</label>
                        <SearchableSelect
                            options={customers}
                            value={selectedCustomerId}
                            onChange={(val: string | number | undefined) => setValue('customerId', Number(val), { shouldValidate: true })}
                            placeholder="Select Customer"
                            error={errors.customerId?.message}
                        />
                    </div>

                    {currentBalance !== null && (
                        <div className={`p-4 rounded-md flex justify-between items-center ${currentBalance > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                            <span className="font-medium">Current Balance:</span>
                            <span className="text-xl font-bold flex items-center">
                                <IndianRupee size={18} /> {Math.abs(currentBalance).toFixed(2)} {currentBalance > 0 ? ' (Due)' : ' (Advance)'}
                            </span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--text-primary)]">Payment Date</label>
                        <Input type="date" {...register('paymentDate')} error={errors.paymentDate?.message} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--text-primary)]">Amount</label>
                        <Input type="number" step="0.01" {...register('amount')} error={errors.amount?.message} placeholder="0.00" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--text-primary)]">Payment Mode</label>
                        <select
                            {...register('paymentMode')}
                            className="w-full px-3 py-2 border border-[var(--border)] rounded focus:ring-1 focus:ring-[var(--primary)] outline-none bg-[var(--surface)] text-[var(--text-primary)]"
                        >
                            <option value="Cash">Cash</option>
                            <option value="Cheque">Cheque</option>
                            <option value="UPI">UPI</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                        </select>
                        {errors.paymentMode && <p className="text-xs text-red-500">{errors.paymentMode.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--text-primary)]">Reference No.</label>
                        <Input {...register('referenceNo')} placeholder="Cheque No / Transaction ID" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--text-primary)]">Notes</label>
                        <Input {...register('notes')} placeholder="Remarks..." />
                    </div>

                    <div className="pt-4">
                        <Button type="submit" isLoading={isLoading} className="w-full">
                            <Save size={18} className="mr-2" /> Record Payment
                        </Button>
                    </div>

                </form>

                <div className="bg-[var(--surface)] rounded-lg shadow-md border border-[var(--border)] overflow-hidden">
                    <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-highlight)]/30">
                        <h3 className="font-semibold text-[var(--text-primary)]">Recent Payments</h3>
                    </div>

                    {selectedCustomerId ? (
                        <div className="divide-y divide-[var(--border)]">
                            {recentPayments.length === 0 ? (
                                <div className="p-8 text-center text-[var(--text-secondary)]">
                                    <IndianRupee size={48} className="mx-auto mb-3 opacity-20" />
                                    <p>No payment history found</p>
                                </div>
                            ) : (
                                recentPayments.map((payment, index) => (
                                    <div key={index} className="p-4 hover:bg-[var(--surface-highlight)]/20 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-medium text-[var(--text-primary)]">
                                                Rs. {Number(payment.credit).toFixed(2)}
                                            </span>
                                            <span className="text-xs text-[var(--text-secondary)]">
                                                {new Date(payment.transactionDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)]">
                                            {payment.description}
                                        </p>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                                {payment.type}
                                            </span>
                                            <span className="text-xs text-[var(--text-secondary)]">
                                                Bal: {Number(payment.balance).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-[var(--text-secondary)]">
                            <IndianRupee size={64} className="mx-auto mb-4 opacity-20" />
                            <p>Select a customer to view recent payment history</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
