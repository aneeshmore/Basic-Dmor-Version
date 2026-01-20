import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { PageHeader } from '@/components/common';
import { Button, Input } from '@/components/ui';
import { companyApi } from '../api/companyApi';
import { CompanyInfo } from '../types';
import { showToast } from '@/utils/toast';
import { Save, Building, Phone, CreditCard, FileText } from 'lucide-react';

const CompanySettingsPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { register, handleSubmit, reset } = useForm<CompanyInfo>();

    useEffect(() => {
        fetchCompanyInfo();
    }, []);

    const fetchCompanyInfo = async () => {
        try {
            setLoading(true);
            const res = await companyApi.get();
            if (res.data && (res.data as any).data) { // Handle nested data structure
                reset((res.data as any).data);
            } else if (res.data) {
                // Fallback if data is direct
                reset(res.data as unknown as CompanyInfo);
            }
        } catch (error) {
            console.error('Failed to fetch company info:', error);
            showToast.error('Failed to load company information');
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: CompanyInfo) => {
        try {
            setSubmitting(true);
            await companyApi.update(data);
            showToast.success('Company information updated successfully');
        } catch (error) {
            console.error('Failed to update company info:', error);
            showToast.error('Failed to update company information');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto pb-10 max-w-5xl">
            <PageHeader
                title="Company Settings"
                description="Manage your company details for Quotations and Invoices"
            />

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
                {/* General Info */}
                <div className="bg-[var(--surface)] p-6 rounded-xl border border-[var(--border)] shadow-sm">
                    <div className="flex items-center gap-2 mb-4 border-b border-[var(--border)] pb-2">
                        <Building className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">General Information</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Company Name</label>
                            <Input {...register('companyName', { required: true })} placeholder="e.g. Morex Technologies" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Email Address</label>
                            <Input {...register('email')} placeholder="office@morex.com" />
                        </div>


                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Address</label>
                            <textarea
                                {...register('address')}
                                rows={3}
                                className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--surface-secondary)] rounded-lg focus:outline-none focus:border-blue-500 resize-none text-[var(--text-primary)]"
                                placeholder="Full Company Address"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Pincode</label>
                            <Input {...register('pincode')} placeholder="Pincode" />
                        </div>
                    </div>
                </div>

                {/* Tax & Registration */}
                <div className="bg-[var(--surface)] p-6 rounded-xl border border-[var(--border)] shadow-sm">
                    <div className="flex items-center gap-2 mb-4 border-b border-[var(--border)] pb-2">
                        <Phone className="w-5 h-5 text-green-600" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Tax & Contact Details</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Udyam Registration</label>
                            <Input {...register('udyamRegistrationNumber')} placeholder="Udyam Registration No." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">GSTIN</label>
                            <Input {...register('gstNumber')} placeholder="GST Number" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">PAN Number</label>
                            <Input {...register('panNumber')} placeholder="PAN Number" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Contact Number</label>
                            <Input {...register('contactNumber')} placeholder="Phone Number" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">CGST Label/Rate</label>
                            <Input {...register('cgst')} placeholder="CGST" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">SGST Label/Rate</label>
                            <Input {...register('sgst')} placeholder="SGST" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">IGST Label/Rate</label>
                            <Input {...register('igst')} placeholder="IGST" />
                        </div>
                        {/* Logo URL Placeholder */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Logo URL (Optional)</label>
                            <Input {...register('logoUrl')} placeholder="https://..." />
                        </div>
                    </div>
                </div>

                {/* Bank Details */}
                <div className="bg-[var(--surface)] p-6 rounded-xl border border-[var(--border)] shadow-sm">
                    <div className="flex items-center gap-2 mb-4 border-b border-[var(--border)] pb-2">
                        <CreditCard className="w-5 h-5 text-purple-600" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Bank Details (For Invoices)</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Bank Name</label>
                            <Input {...register('bankName')} placeholder="e.g. HDFC Bank" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Account Number</label>
                            <Input {...register('accountNumber')} placeholder="Account Number" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">IFSC Code</label>
                            <Input {...register('ifscCode')} placeholder="IFSC Code" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Branch</label>
                            <Input {...register('branch')} placeholder="Branch Name" />
                        </div>
                    </div>
                </div>

                {/* Terms and Conditions */}
                <div className="bg-[var(--surface)] p-6 rounded-xl border border-[var(--border)] shadow-sm">
                    <div className="flex items-center gap-2 mb-4 border-b border-[var(--border)] pb-2">
                        <FileText className="w-5 h-5 text-amber-600" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Terms & Conditions (Default)</h3>
                    </div>

                    <div className="space-y-2">
                        <textarea
                            {...register('termsAndConditions')}
                            rows={5}
                            className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--surface-secondary)] rounded-lg focus:outline-none focus:border-blue-500 resize-none text-[var(--text-primary)]"
                            placeholder="Default Terms and Conditions for Quotations/Invoices..."
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <Save size={18} />
                        {submitting ? 'Saving...' : 'Save Settings'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default CompanySettingsPage;
