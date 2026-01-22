import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common';
import { Button, Input } from '@/components/ui';
import { Modal } from '@/components/ui';
import {
  Plus,
  CheckCircle,
  Clock,
  User,
  Search,
  Calendar,
  AlertCircle,
  Phone,
  Star,
  XCircle,
  FileText,
  Users,
  Eye,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { crmApi } from '../api/crmApi';
import { customerApi } from '@/features/masters/api/customerApi';
import { quotationApi, QuotationRecord } from '@/features/quotations/api/quotationApi';
import { Visit } from '../types';
import { showToast } from '@/utils/toast';
import { decodeHtml } from '@/utils/stringUtils';

const LEAD_STATUSES = [
  {
    value: 'Contacted',
    label: 'Contacted',
    icon: Phone,
    color: 'bg-red-100 text-red-700 border-red-200',
  },
  {
    value: 'Follow Up',
    label: 'Follow Up',
    icon: Clock,
    color: 'bg-red-100 text-red-700 border-red-200',
  },
  {
    value: 'Important',
    label: 'Important',
    icon: Star,
    color: 'bg-red-100 text-red-700 border-red-200',
  },
  {
    value: 'Irrelevant',
    label: 'Irrelevant',
    icon: XCircle,
    color: 'bg-red-100 text-red-700 border-red-200',
  },
  {
    value: 'Quotation Status',
    label: 'Quotation Status',
    icon: FileText,
    color: 'bg-red-100 text-red-700 border-red-200',
  },
  {
    value: 'Deal Done',
    label: 'Deal Done',
    icon: CheckCircle,
    color: 'bg-red-100 text-red-700 border-red-200',
  },
  {
    value: 'Negotiation',
    label: 'Negotiation',
    icon: Users,
    color: 'bg-red-100 text-red-700 border-red-200',
  },
];

export const CrmDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'customers'>('upcoming');
  const [visits, setVisits] = useState<Visit[]>([]);
  const [todayVisits, setTodayVisits] = useState<Visit[]>([]);
  const [upcomingVisits, setUpcomingVisits] = useState<Visit[]>([]);

  const [originalCustomers, setOriginalCustomers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [upcomingSearchTerm, setUpcomingSearchTerm] = useState('');

  // History / Details
  const [historyVisits, setHistoryVisits] = useState<Visit[]>([]);
  const [customerQuotations, setCustomerQuotations] = useState<QuotationRecord[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const historyBottomRef = React.useRef<HTMLDivElement>(null);

  // Quotation Preview Modal
  const [previewQuotation, setPreviewQuotation] = useState<QuotationRecord | null>(null);
  const [showQuotationPreview, setShowQuotationPreview] = useState(false);
  const [isQuotationsExpanded, setIsQuotationsExpanded] = useState(false);
  const [isVisitHistoryExpanded, setIsVisitHistoryExpanded] = useState(false);
  const [quotationVisibleCount, setQuotationVisibleCount] = useState(1);
  const [visitVisibleCount, setVisitVisibleCount] = useState(1);

  useEffect(() => {
    if (isHistoryOpen && historyBottomRef.current) {
      historyBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isHistoryOpen, historyVisits]);

  // Quick Add Visit / Schedule
  const [isAddVisitOpen, setIsAddVisitOpen] = useState(false);
  const [newVisitData, setNewVisitData] = useState({
    customerId: 0,
    date: '',
    leadStatus: 'Contacted',
    notes: '',
    isNextVisitRequired: false,
    nextVisitDate: '',
  });

  // Complete Visit
  const [completingVisit, setCompletingVisit] = useState<Visit | null>(null);
  const [completionData, setCompletionData] = useState({
    date: new Date().toISOString().split('T')[0],
    leadStatus: 'Contacted',
    notes: '',
    isNextVisitRequired: false,
    nextVisitDate: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!originalCustomers) return;
    if (!searchTerm.trim()) {
      setCustomers(originalCustomers);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = originalCustomers.filter(
        c =>
          (c.CompanyName && decodeHtml(c.CompanyName).toLowerCase().includes(term)) ||
          (c.ContactPerson && decodeHtml(c.ContactPerson).toLowerCase().includes(term)) ||
          (c.Location && decodeHtml(c.Location).toLowerCase().includes(term))
      );
      setCustomers(filtered);
    }
  }, [searchTerm, originalCustomers]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadVisits(), loadCustomers()]);
    setLoading(false);
  };

  const loadVisits = async () => {
    try {
      const response = await crmApi.getVisits();
      const allVisits = (response as any).data || response;

      // Filter where Next Visit is Required
      const activeVisits = allVisits.filter((v: Visit) => v.nextVisitDate && v.isNextVisitRequired);

      // Normalize today to 00:00:00 for comparison
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayList: Visit[] = [];
      const upcomingList: Visit[] = [];

      activeVisits.forEach((v: Visit) => {
        if (!v.nextVisitDate) return;

        // Convert visit date to Date object (handles UTC -> Local conversion correctly)
        const vDate = new Date(v.nextVisitDate);
        vDate.setHours(0, 0, 0, 0); // Ensure Time part is ignored for pure date compare

        if (vDate.getTime() <= today.getTime()) {
          todayList.push(v);
        } else {
          upcomingList.push(v);
        }
      });

      // Sort each
      todayList.sort(
        (a, b) => new Date(a.nextVisitDate!).getTime() - new Date(b.nextVisitDate!).getTime()
      );
      upcomingList.sort(
        (a, b) => new Date(a.nextVisitDate!).getTime() - new Date(b.nextVisitDate!).getTime()
      );

      setTodayVisits(todayList);
      setUpcomingVisits(upcomingList);
      setVisits(activeVisits);
    } catch (error) {
      console.error('Failed to load visits', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await customerApi.getAll();
      if (response.success) {
        const data = response.data || [];
        setOriginalCustomers(data);
        setCustomers(data);
      }
    } catch (error) {
      console.error('Failed to load customers', error);
    }
  };

  // Helper to check if customer has active scheduled visit
  const hasActiveVisit = (customerId: number) => {
    return visits.some(v => v.customerId === customerId);
  };

  // Open Complete Modal
  const initiateComplete = (visit: Visit) => {
    setCompletingVisit(visit);
    setCompletionData({
      date: new Date().toISOString().split('T')[0],
      leadStatus: 'Contacted',
      notes: '',
      isNextVisitRequired: false,
      nextVisitDate: '',
    });
  };

  // Save Completion
  const handleSaveCompletion = async () => {
    if (!completingVisit) return;
    if (!completionData.notes) {
      showToast.error('Please enter notes for the completed visit');
      return;
    }
    if (completionData.isNextVisitRequired && !completionData.nextVisitDate) {
      showToast.error('Please select next follow-up date');
      return;
    }

    try {
      // 1. Mark old visit as done
      await crmApi.updateVisit(completingVisit.visitId, {
        isNextVisitRequired: false,
      });

      // 2. Create NEW visit record for today's interaction AND optionally schedule next
      await crmApi.createVisit({
        customerId: completingVisit.customerId,
        visitDate: new Date(completionData.date).toISOString(),
        notes: completionData.notes,
        leadStatus: completionData.leadStatus,
        visitType: 'Follow-up Visit',
        isNextVisitRequired: completionData.isNextVisitRequired,
        nextVisitDate: completionData.isNextVisitRequired
          ? new Date(completionData.nextVisitDate).toISOString()
          : undefined,
      });

      showToast.success('Visit Completed & Recorded');
      setCompletingVisit(null);
      loadVisits();
    } catch (error) {
      console.error(error);
      showToast.error('Failed to complete visit');
    }
  };

  const handleViewHistory = async (customerId: number, customerName: string) => {
    setSelectedCustomerName(customerName);
    setSelectedCustomerId(customerId);
    setIsHistoryOpen(true);
    setHistoryVisits([]);
    setIsHistoryOpen(true);
    setHistoryVisits([]);
    setCustomerQuotations([]);
    // Reset View State
    setIsQuotationsExpanded(false);
    setIsVisitHistoryExpanded(false);
    setQuotationVisibleCount(1);
    setVisitVisibleCount(1);

    try {
      // Fetch visits and quotations in parallel
      const [visitsResponse, quotationsResponse] = await Promise.all([
        crmApi.getVisits({ customerId }),
        quotationApi.getByCustomer(customerId).catch(() => ({ data: { data: [] } })),
      ]);

      const rawData = (visitsResponse as any).data || visitsResponse;
      // Backend returns DESC (newest first). We want ASC (oldest first) so last item is newest.
      setHistoryVisits([...rawData].reverse());

      // Set quotations
      const quotations = quotationsResponse?.data?.data || [];
      // Sort by date (oldest first) so last one is newest, matching logic
      quotations.sort(
        (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setCustomerQuotations(quotations);
    } catch (error) {
      showToast.error('Failed to load history');
    }
  };

  const openAddVisit = (customer: any) => {
    setNewVisitData({
      customerId: customer.CustomerID,
      date: new Date().toISOString().split('T')[0],
      leadStatus: 'Contacted',
      notes: '',
      isNextVisitRequired: false,
      nextVisitDate: '',
    });
    setIsAddVisitOpen(true);
  };

  const handleSaveNewVisit = async () => {
    if (!newVisitData.notes) {
      showToast.error('Notes are compulsory');
      return;
    }
    try {
      if (newVisitData.isNextVisitRequired && !newVisitData.nextVisitDate) {
        showToast.error('Please select next follow-up date');
        return;
      }

      await crmApi.createVisit({
        customerId: newVisitData.customerId,
        visitDate: new Date(newVisitData.date).toISOString(),
        notes: newVisitData.notes,
        leadStatus: newVisitData.leadStatus,
        visitType: 'Visit',
        purpose: 'Regular',
        isNextVisitRequired: newVisitData.isNextVisitRequired,
        nextVisitDate:
          newVisitData.isNextVisitRequired && newVisitData.nextVisitDate
            ? new Date(newVisitData.nextVisitDate).toISOString()
            : undefined,
      });
      showToast.success('Visit/Schedule Recorded');
      setIsAddVisitOpen(false);
      loadVisits();
    } catch (error) {
      showToast.error('Failed to save visit');
    }
  };

  const renderVisitTable = (list: Visit[], emptyMessage: string, isToday = false) => {
    // Filter list by search term if provided
    const filteredList = upcomingSearchTerm.trim()
      ? list.filter(
        v =>
          v.customer?.companyName?.toLowerCase().includes(upcomingSearchTerm.toLowerCase()) ||
          v.notes?.toLowerCase().includes(upcomingSearchTerm.toLowerCase())
      )
      : list;

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface-highlight)] text-[var(--text-secondary)]">
            <tr>
              <th className="p-4">Due Date</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Lead Status</th>
              <th className="p-4">Note</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading && (
              <tr>
                <td colSpan={5} className="p-6 text-center">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && filteredList.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-[var(--text-secondary)]">
                  {upcomingSearchTerm ? 'No matching visits found.' : emptyMessage}
                </td>
              </tr>
            )}
            {filteredList.map(visit => (
              <tr
                key={visit.visitId}
                className={`hover:bg-[var(--surface-hover)] ${isToday ? 'bg-red-50' : ''}`}
              >
                <td className={`p-4 font-medium ${isToday ? 'text-red-600' : 'text-orange-600'}`}>
                  {visit.nextVisitDate && new Date(visit.nextVisitDate).toLocaleDateString()}
                  {isToday && (
                    <span className="ml-2 text-xs font-bold text-red-500 animate-pulse">DUE</span>
                  )}
                </td>
                <td className="p-4 font-medium text-[var(--text-primary)]">
                  {decodeHtml(visit.customer?.companyName)}
                </td>
                <td className="p-4">
                  {(() => {
                    const statuses = (visit.leadStatus || '').split(', ').filter(Boolean);
                    if (statuses.length === 0) return <span className="text-gray-400">-</span>;

                    return (
                      <div className="flex flex-wrap gap-1">
                        {statuses.map((statusVal, idx) => {
                          const statusConfig = LEAD_STATUSES.find(s => s.value === statusVal);
                          return statusConfig ? (
                            <span
                              key={idx}
                              className={`px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}
                            >
                              {statusConfig.label}
                            </span>
                          ) : (
                            <span
                              key={idx}
                              className="px-2 py-1 rounded-full text-xs font-medium border bg-gray-100 text-gray-700"
                            >
                              {statusVal}
                            </span>
                          );
                        })}
                      </div>
                    );
                  })()}
                </td>
                <td className="p-4 text-[var(--text-secondary)]">
                  <div className="font-medium text-[var(--text-primary)]">{visit.notes || '-'}</div>
                  <div className="text-xs mt-1 text-gray-500">Last Note</div>
                </td>
                <td className="p-4 text-right flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-blue-600 bg-blue-50 hover:bg-blue-100"
                    onClick={() =>
                      handleViewHistory(visit.customerId, visit.customer?.companyName || '')
                    }
                  >
                    History
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-green-600 bg-green-50 hover:bg-green-100"
                    onClick={() => initiateComplete(visit)}
                  >
                    <CheckCircle size={14} className="mr-1" /> Update
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="CRM Dashboard" description="Manage Client Visits & Follow-ups" />

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] gap-4">
        <button
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'upcoming'
            ? 'border-[var(--primary)] text-[var(--primary)]'
            : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming Follow-ups
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'customers'
            ? 'border-[var(--primary)] text-[var(--primary)]'
            : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          onClick={() => setActiveTab('customers')}
        >
          All Customers
        </button>
      </div>

      {/* Content */}
      {activeTab === 'upcoming' ? (
        <div className="space-y-6">
          {/* Search Bar for Upcoming */}
          <div className="relative max-w-sm">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
              size={16}
            />
            <input
              type="text"
              className="input !pl-12 h-10 w-full"
              placeholder="Search in follow-ups..."
              value={upcomingSearchTerm}
              onChange={e => setUpcomingSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-8">
            {/* Today's Section */}
            <div className="card border-l-4 border-l-red-500">
              <div className="p-4 border-b border-[var(--border)] bg-red-50/50">
                <h3 className="text-sm font-bold text-red-800 flex items-center gap-2">
                  <AlertCircle size={16} /> Due Today & Overdue
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">
                    {todayVisits.length}
                  </span>
                </h3>
              </div>
              {renderVisitTable(todayVisits, 'No visits due today.', true)}
            </div>

            {/* Future Section */}
            <div className="card">
              <div className="p-4 border-b border-[var(--border)] bg-orange-50">
                <h3 className="text-sm font-bold text-orange-800 flex items-center gap-2">
                  <Clock size={16} /> Upcoming Visits
                  <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs">
                    {upcomingVisits.length}
                  </span>
                </h3>
              </div>
              {renderVisitTable(upcomingVisits, 'No upcoming visits scheduled.')}
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="p-4 border-b border-[var(--border)] flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-blue-50">
            <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2">
              <User size={16} /> Client Directory
            </h3>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={16}
                />
                <input
                  type="text"
                  className="input !pl-12 h-9 w-full"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="primary" size="sm" onClick={() => navigate('/masters/customers')}>
                <Plus size={14} className="mr-1" /> New
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--surface-highlight)] text-[var(--text-secondary)]">
                <tr>
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {loading && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center">
                      Loading...
                    </td>
                  </tr>
                )}
                {customers.map(cust => {
                  const isScheduled = hasActiveVisit(cust.CustomerID);
                  return (
                    <tr key={cust.CustomerID} className="hover:bg-[var(--surface-hover)]">
                      <td className="p-4 font-medium text-[var(--text-primary)]">
                        {decodeHtml(cust.CompanyName)}
                      </td>
                      <td className="p-4 text-[var(--text-secondary)]">{decodeHtml(cust.Location) || '-'}</td>
                      <td className="p-4 text-[var(--text-secondary)]">
                        {decodeHtml(cust.ContactPerson)} <br />
                        <span className="text-xs">{cust.MobileNo && cust.MobileNo[0]}</span>
                      </td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 bg-blue-50 hover:bg-blue-100"
                          onClick={() => handleViewHistory(cust.CustomerID, cust.CompanyName)}
                        >
                          History
                        </Button>
                        {isScheduled ? (
                          <div className="flex items-center justify-center h-8 px-2">
                            <span className="text-sm font-bold text-red-600">
                              Already Scheduled
                            </span>
                          </div>
                        ) : (
                          <Button size="sm" variant="primary" onClick={() => openAddVisit(cust)}>
                            <Plus size={14} className="mr-1" /> Visit/Schedule
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Add Visit / Schedule Modal */}
      <Modal
        isOpen={isAddVisitOpen}
        onClose={() => setIsAddVisitOpen(false)}
        title="Add Visit / Schedule Follow-up"
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 rounded text-sm text-blue-800 mb-2">
            Record a new visit or call. You can also schedule the next follow-up.
          </div>

          <div className="flex justify-end">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
              <Calendar size={14} className="text-gray-500" />
              <span>
                {new Date().toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Lead Status</label>
            <div className="flex flex-wrap gap-2">
              {LEAD_STATUSES.map(status => {
                const Icon = status.icon;
                const currentStatuses = newVisitData.leadStatus
                  ? newVisitData.leadStatus.split(', ').filter(Boolean)
                  : [];
                const isSelected = currentStatuses.includes(status.value);

                return (
                  <button
                    type="button"
                    key={status.value}
                    onClick={() => {
                      let nextStatuses;
                      if (isSelected) {
                        nextStatuses = currentStatuses.filter(s => s !== status.value);
                      } else {
                        nextStatuses = [...currentStatuses, status.value];
                      }
                      setNewVisitData({ ...newVisitData, leadStatus: nextStatuses.join(', ') });
                    }}
                    className={`
                      flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all
                      ${isSelected ? status.color + ' border-current' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}
                    `}
                  >
                    <Icon size={14} />
                    {status.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              className="input w-full min-h-[80px] p-2 resize-y"
              placeholder="Compulsory visit notes..."
              value={newVisitData.notes}
              onChange={e => setNewVisitData({ ...newVisitData, notes: e.target.value })}
            />
          </div>

          <div className="border-t pt-4 mt-4">
            <label className="flex items-center gap-2 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={newVisitData.isNextVisitRequired}
                onChange={e =>
                  setNewVisitData({ ...newVisitData, isNextVisitRequired: e.target.checked })
                }
                className="w-4 h-4 accent-[var(--primary)]"
              />
              <span className="font-semibold text-sm">Schedule Next Follow-up?</span>
            </label>

            {newVisitData.isNextVisitRequired && (
              <div className="space-y-4 pl-4 border-l-2 border-[var(--primary)] animate-in fade-in slide-in-from-top-1">
                <Input
                  label="Next Follow-up Date"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={newVisitData.nextVisitDate}
                  onChange={e =>
                    setNewVisitData({ ...newVisitData, nextVisitDate: e.target.value })
                  }
                  required
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsAddVisitOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveNewVisit}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Complete Visit Modal */}
      <Modal
        isOpen={!!completingVisit}
        onClose={() => setCompletingVisit(null)}
        title="Complete Follow-up"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Marking follow-up for <strong>{decodeHtml(completingVisit?.customer?.companyName)}</strong> as done.
          </p>

          <div className="flex justify-end">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
              <Calendar size={14} className="text-gray-500" />
              <span>
                {new Date().toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Lead Status</label>
            <div className="flex flex-wrap gap-2">
              {LEAD_STATUSES.map(status => {
                const Icon = status.icon;
                const currentStatuses = completionData.leadStatus
                  ? completionData.leadStatus.split(', ').filter(Boolean)
                  : [];
                const isSelected = currentStatuses.includes(status.value);

                return (
                  <button
                    type="button"
                    key={status.value}
                    onClick={() => {
                      let nextStatuses;
                      if (isSelected) {
                        nextStatuses = currentStatuses.filter(s => s !== status.value);
                      } else {
                        nextStatuses = [...currentStatuses, status.value];
                      }
                      setCompletionData({ ...completionData, leadStatus: nextStatuses.join(', ') });
                    }}
                    className={`
                      flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all
                      ${isSelected ? status.color + ' border-current' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}
                    `}
                  >
                    <Icon size={14} />
                    {status.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Completion Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              className="input w-full min-h-[100px] p-2 resize-y"
              placeholder="What happened? (Record needed for history)"
              value={completionData.notes}
              onChange={e => setCompletionData({ ...completionData, notes: e.target.value })}
            />
          </div>

          <div className="border-t pt-4 mt-4">
            <label className="flex items-center gap-2 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={completionData.isNextVisitRequired}
                onChange={e =>
                  setCompletionData({ ...completionData, isNextVisitRequired: e.target.checked })
                }
                className="w-4 h-4 accent-[var(--primary)]"
              />
              <span className="font-semibold text-sm">Schedule Next Follow-up?</span>
            </label>

            {completionData.isNextVisitRequired && (
              <div className="space-y-4 pl-4 border-l-2 border-[var(--primary)] animate-in fade-in slide-in-from-top-1">
                <Input
                  label="Next Follow-up Date"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={completionData.nextVisitDate}
                  onChange={e =>
                    setCompletionData({ ...completionData, nextVisitDate: e.target.value })
                  }
                  required
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setCompletingVisit(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-green-600 hover:bg-green-700"
              onClick={handleSaveCompletion}
            >
              Complete & Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title={`Interaction History - ${selectedCustomerName}`}
        size="lg"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* Quotations Section */}
          {customerQuotations.length > 0 && (
            <div className="mb-6">
              <div
                className="flex items-center justify-between mb-3 cursor-pointer select-none group bg-gray-50/50 p-2 rounded-md hover:bg-gray-100 transition-colors"
                onClick={() => setIsQuotationsExpanded(!isQuotationsExpanded)}
              >
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-purple-600" />
                  <h4 className="font-semibold text-gray-800">Quotations Given</h4>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    {customerQuotations.length}
                  </span>
                </div>
                <div className="p-1 rounded text-purple-600 transition-colors">
                  {isQuotationsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              </div>

              {isQuotationsExpanded && (
                <div className="relative border-l-2 border-gray-200 ml-3 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  {/* View Previous Button */}
                  {customerQuotations.length > quotationVisibleCount && (
                    <div className="flex justify-center pb-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-100"
                        onClick={() =>
                          setQuotationVisibleCount(prev =>
                            Math.min(prev + 10, customerQuotations.length)
                          )
                        }
                      >
                        View Previous 10
                      </Button>
                    </div>
                  )}

                  {customerQuotations.slice(-quotationVisibleCount).map((quotation, index, arr) => {
                    const isLatest = index === arr.length - 1;

                    let statusColor = 'bg-gray-100 text-gray-700 border-gray-200';
                    if (quotation.status === 'Approved')
                      statusColor = 'bg-green-100 text-green-700 border-green-200';
                    if (quotation.status === 'Pending')
                      statusColor = 'bg-orange-100 text-orange-700 border-orange-200';
                    if (quotation.status === 'Rejected')
                      statusColor = 'bg-red-100 text-red-700 border-red-200';
                    if (quotation.status === 'Converted')
                      statusColor = 'bg-purple-100 text-purple-700 border-purple-200';

                    const items = quotation.content?.items || [];
                    const total = items.reduce((sum: number, item: any) => {
                      return sum + item.quantity * item.rate * (1 - (item.discount || 0) / 100);
                    }, 0);

                    return (
                      <div key={quotation.quotationId} className="relative pl-6">
                        {/* Timeline Dot */}
                        <div
                          className={`
                            absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 
                            ${isLatest
                              ? 'bg-purple-600 border-white ring-2 ring-purple-100 z-10 scale-110'
                              : 'bg-gray-300 border-white ring-2 ring-gray-50'
                            }
                          `}
                        />

                        <div className={`space-y-2 ${!isLatest ? 'opacity-80' : ''}`}>
                          {/* Header */}
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                            <div>
                              <span
                                className={`text-sm font-bold ${isLatest ? 'text-gray-900' : 'text-gray-500'}`}
                              >
                                {new Date(quotation.createdAt).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                              <div className="text-xs text-gray-500 flex items-center gap-2">
                                <span className="font-mono">{quotation.quotationNo}</span>
                                {isLatest && (
                                  <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 rounded">
                                    LATEST
                                  </span>
                                )}
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}
                            >
                              {quotation.status}
                            </span>
                          </div>

                          {/* Content Card */}
                          <div
                            className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors
                              ${isLatest ? 'bg-purple-50/50 border-purple-100 shadow-sm' : 'bg-transparent border-transparent pl-0 pt-0 hover:bg-gray-50 hover:pl-3 hover:border-gray-100'}
                            `}
                          >
                            <div className="flex-1">
                              <div className="text-xs text-gray-500">
                                {items.length} item{items.length !== 1 ? 's' : ''}
                                {' • '}
                                <span
                                  className={`font-medium ${isLatest ? 'text-purple-700' : 'text-gray-700'}`}
                                >
                                  ₹{total.toFixed(0)}
                                </span>{' '}
                                (+GST)
                              </div>
                              {quotation.status === 'Rejected' && quotation.rejectionRemark && (
                                <div className="text-xs text-red-600 mt-1">
                                  ⚠ {quotation.rejectionRemark}
                                </div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-purple-600 hover:bg-purple-100 h-7 text-xs"
                              onClick={() => {
                                setPreviewQuotation(quotation);
                                setShowQuotationPreview(true);
                              }}
                            >
                              <Eye size={12} className="mr-1" />
                              Preview
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Visit History Section */}
          <div>
            <div
              className="flex items-center justify-between mb-3 cursor-pointer select-none group bg-gray-50/50 p-2 rounded-md hover:bg-gray-100 transition-colors"
              onClick={() => setIsVisitHistoryExpanded(!isVisitHistoryExpanded)}
            >
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-blue-600" />
                <h4 className="font-semibold text-gray-800">Visit History</h4>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {historyVisits.length}
                </span>
              </div>
              <div className="p-1 rounded text-blue-600 transition-colors">
                {isVisitHistoryExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
            </div>

            {isVisitHistoryExpanded &&
              (historyVisits.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No visit history found.</p>
              ) : (
                <div className="relative border-l-2 border-gray-200 ml-3 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  {/* View Previous Button */}
                  {historyVisits.length > visitVisibleCount && (
                    <div className="flex justify-center pb-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100"
                        onClick={() =>
                          setVisitVisibleCount(prev => Math.min(prev + 10, historyVisits.length))
                        }
                      >
                        View Previous 10
                      </Button>
                    </div>
                  )}

                  {historyVisits.slice(-visitVisibleCount).map((visit, index, arr) => (
                    <div key={visit.visitId} className="relative pl-6">
                      {/* Timeline Dot */}
                      <div
                        className={`
                          absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 
                          ${index === arr.length - 1
                            ? 'bg-[var(--primary)] border-white ring-2 ring-blue-100 z-10 scale-110'
                            : 'bg-gray-300 border-white ring-2 ring-gray-50'
                          }
                        `}
                      />

                      <div className={`space-y-2 ${index !== arr.length - 1 ? 'opacity-80' : ''}`}>
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                          <div>
                            <span
                              className={`text-sm font-bold ${index === arr.length - 1 ? 'text-gray-900' : 'text-gray-500'}`}
                            >
                              {new Date(visit.visitDate).toLocaleDateString(undefined, {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            <div className="text-xs text-gray-500">
                              {visit.visitType} • By {visit.salesExecutive?.firstName}
                            </div>
                          </div>
                          {visit.leadStatus && (
                            <div className="flex flex-wrap gap-1">
                              {visit.leadStatus
                                .split(', ')
                                .filter(Boolean)
                                .map((status, i) => (
                                  <span
                                    key={i}
                                    className={`px-2 py-1 rounded-full text-xs font-medium border ${index === arr.length - 1
                                      ? 'bg-blue-50 text-blue-700 border-blue-100'
                                      : 'bg-gray-100 text-gray-600 border-gray-200'
                                      }`}
                                  >
                                    {status}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div
                          className={`p-3 rounded-lg border ${index === arr.length - 1 ? 'bg-white border-gray-200 shadow-sm' : 'bg-transparent border-transparent pl-0 pt-0'}`}
                        >
                          <p
                            className={`text-sm whitespace-pre-wrap ${index === arr.length - 1 ? 'text-gray-800' : 'text-gray-500'}`}
                          >
                            {visit.notes}
                          </p>
                        </div>

                        {/* Next Action */}
                        {visit.nextVisitDate && (
                          <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-100 w-fit">
                            <Clock size={12} />
                            Next: {new Date(visit.nextVisitDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={historyBottomRef} />
                </div>
              ))}
          </div>
        </div>
        <div className="flex justify-end pt-4 border-t mt-4">
          <Button variant="ghost" onClick={() => setIsHistoryOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>

      {/* Quotation Preview Modal */}
      {showQuotationPreview && previewQuotation && (
        <Modal
          isOpen={showQuotationPreview}
          onClose={() => {
            setShowQuotationPreview(false);
            setPreviewQuotation(null);
          }}
          title={`Quotation: ${previewQuotation.quotationNo}`}
        >
          <div className="space-y-4">
            {/* Header Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Customer:</span>
                <span className="ml-2 font-medium">{previewQuotation.buyerName}</span>
              </div>
              <div>
                <span className="text-gray-500">Date:</span>
                <span className="ml-2 font-medium">{previewQuotation.quotationDate}</span>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${previewQuotation.status === 'Approved'
                    ? 'bg-green-100 text-green-700'
                    : previewQuotation.status === 'Pending'
                      ? 'bg-orange-100 text-orange-700'
                      : previewQuotation.status === 'Rejected'
                        ? 'bg-red-100 text-red-700'
                        : previewQuotation.status === 'Converted'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                >
                  {previewQuotation.status}
                </span>
              </div>
            </div>

            {previewQuotation.status === 'Rejected' && previewQuotation.rejectionRemark && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-sm font-medium text-red-800">Rejection Reason:</span>
                <p className="text-sm text-red-700 mt-1">{previewQuotation.rejectionRemark}</p>
              </div>
            )}

            {/* Items Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-2 font-medium">Product</th>
                    <th className="text-right p-2 font-medium w-20">Qty</th>
                    <th className="text-right p-2 font-medium w-24">Rate</th>
                    <th className="text-right p-2 font-medium w-16">Disc%</th>
                    <th className="text-right p-2 font-medium w-28">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(previewQuotation.content?.items || []).map((item: any, idx: number) => {
                    const amount = item.quantity * item.rate * (1 - (item.discount || 0) / 100);
                    return (
                      <tr key={idx}>
                        <td className="p-2">{item.description || '-'}</td>
                        <td className="p-2 text-right">{item.quantity}</td>
                        <td className="p-2 text-right">₹{item.rate?.toFixed(2)}</td>
                        <td className="p-2 text-right">{item.discount || 0}%</td>
                        <td className="p-2 text-right font-medium">₹{amount.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t">
                  <tr>
                    <td colSpan={4} className="p-2 text-right font-medium">
                      Total:
                    </td>
                    <td className="p-2 text-right font-bold">
                      ₹
                      {(previewQuotation.content?.items || [])
                        .reduce((sum: number, item: any) => {
                          return sum + item.quantity * item.rate * (1 - (item.discount || 0) / 100);
                        }, 0)
                        .toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="p-2 text-right text-xs text-gray-500 italic">
                      (Incl. 18% GST)
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowQuotationPreview(false);
                  setPreviewQuotation(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
