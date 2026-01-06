import { useState, useEffect, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table/DataTable';
import { DataTableColumnHeader } from '@/components/ui/data-table/DataTableColumnHeader';
import { Input } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui';
import { ArrowRight, Eye } from 'lucide-react';
import { employeeApi } from '@/features/employees/api';
import { customerApi } from '@/features/masters/api';
import { Employee } from '@/features/employees/types';
import { Customer } from '@/features/masters/types';
import { showToast } from '@/utils/toast';
import { PageHeader } from '@/components/common/PageHeader';

const CustomerTransferPage = () => {
  // State for sales persons
  const [salesPersons, setSalesPersons] = useState<Employee[]>([]);
  const [fromSalesPerson, setFromSalesPerson] = useState<number | null>(null);
  const [toSalesPerson, setToSalesPerson] = useState<number | null>(null);

  // State for customers
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [fromCustomers, setFromCustomers] = useState<Customer[]>([]);
  const [toCustomers, setToCustomers] = useState<Customer[]>([]);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  // Selection state
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]); // Checkbox selections
  const [draggedCustomerIds, setDraggedCustomerIds] = useState<number[]>([]); // Drag & drop staged customers

  // Drag and drop state
  const [draggedCustomerId, setDraggedCustomerId] = useState<number | null>(null); // Currently being dragged
  const [isDropZoneActive, setIsDropZoneActive] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);

  // Search states for dropdowns
  const [fromSearchTerm, setFromSearchTerm] = useState('');
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [toSearchTerm, setToSearchTerm] = useState('');
  const [showToDropdown, setShowToDropdown] = useState(false);

  // Fetch sales persons and customers on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [employeesResponse, customersResponse] = await Promise.all([
          employeeApi.getAll(),
          customerApi.getAll(),
        ]);

        // Filter only active sales persons (IsSalesPerson = true)
        if (employeesResponse.success && employeesResponse.data) {
          const activeSalesPersons = employeesResponse.data.filter(
            (emp: Employee) => emp.IsSalesPerson === true && emp.Status === 'Active'
          );
          setSalesPersons(activeSalesPersons);
        }

        if (customersResponse.success && customersResponse.data) {
          setAllCustomers(customersResponse.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update customers when "From" sales person changes
  useEffect(() => {
    if (fromSalesPerson !== null) {
      const customers = allCustomers.filter(customer => customer.SalesPersonID === fromSalesPerson);
      // Exclude dragged customers from "From" table (they're visually moved to "To")
      const filteredCustomers = customers.filter(
        customer => !draggedCustomerIds.includes(customer.CustomerID)
      );
      setFromCustomers(filteredCustomers);
    } else {
      setFromCustomers([]);
    }
    // Note: Don't clear selection here - it causes checkboxes to reset when dragging
  }, [fromSalesPerson, allCustomers, draggedCustomerIds]);

  // Clear selection only when From sales person actually changes
  useEffect(() => {
    setSelectedCustomerIds([]);
  }, [fromSalesPerson]);

  // Update customers when "To" sales person changes
  useEffect(() => {
    if (toSalesPerson !== null) {
      const customers = allCustomers.filter(customer => customer.SalesPersonID === toSalesPerson);
      // Add dragged customers to "To" table (visual staging) - show at top
      const draggedCustomers = allCustomers.filter(customer =>
        draggedCustomerIds.includes(customer.CustomerID)
      );
      setToCustomers([...draggedCustomers, ...customers]); // Dragged customers first (at top)
    } else {
      setToCustomers([]);
    }
  }, [toSalesPerson, allCustomers, draggedCustomerIds]);

  // Make entire table rows draggable
  useEffect(() => {
    const tableRows = document.querySelectorAll('[data-customer-id]');

    tableRows.forEach(row => {
      const tr = row.closest('tr');
      if (tr) {
        tr.draggable = true;
        tr.style.cursor = 'grab';

        const customerId = parseInt(row.getAttribute('data-customer-id') || '0');

        tr.ondragstart = e => {
          tr.style.cursor = 'grabbing';
          handleDragStart(e as any, customerId);
        };

        tr.ondragend = e => {
          tr.style.cursor = 'grab';
          handleDragEnd();
        };
      }
    });

    return () => {
      tableRows.forEach(row => {
        const tr = row.closest('tr');
        if (tr) {
          tr.draggable = false;
          tr.style.cursor = '';
          tr.ondragstart = null;
          tr.ondragend = null;
        }
      });
    };
  }, [fromCustomers, draggedCustomerId]);

  // Make highlighted rows in "To" table draggable (for reverting)
  useEffect(() => {
    const toTableRows = document.querySelectorAll('[data-to-customer-id]');

    toTableRows.forEach(row => {
      const tr = row.closest('tr');
      const customerId = parseInt(row.getAttribute('data-to-customer-id') || '0');
      const isDragged = draggedCustomerIds.includes(customerId);

      if (tr && isDragged) {
        tr.draggable = true;
        tr.style.cursor = 'grab';

        tr.ondragstart = e => {
          tr.style.cursor = 'grabbing';
          handleDragStart(e as any, customerId);
        };

        tr.ondragend = e => {
          tr.style.cursor = 'grab';
          handleDragEnd();
        };
      } else if (tr) {
        tr.draggable = false;
        tr.style.cursor = '';
        tr.ondragstart = null;
        tr.ondragend = null;
      }
    });

    return () => {
      toTableRows.forEach(row => {
        const tr = row.closest('tr');
        if (tr) {
          tr.draggable = false;
          tr.style.cursor = '';
          tr.ondragstart = null;
          tr.ondragend = null;
        }
      });
    };
  }, [toCustomers, draggedCustomerIds, draggedCustomerId]);

  // Handle transfer customers (both checkbox and dragged)
  const handleTransfer = async () => {
    // Validation: Check if both sales persons are selected
    if (!fromSalesPerson) {
      showToast.error('Please select a "From" sales person');
      return;
    }

    if (!toSalesPerson) {
      showToast.error('Please select a "To" sales person');
      return;
    }

    // Combine checkbox selections and dragged customers
    const allCustomersToTransfer = Array.from(
      new Set([...selectedCustomerIds, ...draggedCustomerIds])
    );

    // Validation: Check if at least one customer is selected
    if (allCustomersToTransfer.length === 0) {
      showToast.error('Please select at least one customer to transfer');
      return;
    }

    // Validation: Prevent transferring to the same sales person
    if (fromSalesPerson === toSalesPerson) {
      showToast.error('Cannot transfer customers to the same sales person');
      return;
    }

    try {
      setIsTransferring(true);

      // Update each selected customer's SalesPersonID
      const updatePromises = allCustomersToTransfer.map(async customerId => {
        const customer = allCustomers.find(c => c.CustomerID === customerId);
        if (customer) {
          // Validate customer has required fields
          if (!customer.CompanyName || !customer.ContactPerson) {
            throw new Error(`Customer ${customerId} is missing required fields`);
          }

          // Send only the SalesPersonID to update - prevents accidental modification of other fields
          // The backend should handle partial updates and preserve all other customer data
          return customerApi.update(customerId, {
            ...customer, // Include all fields to ensure backend compatibility
            SalesPersonID: toSalesPerson, // Only this field should be updated
          });
        }
        return null;
      });

      const results = await Promise.all(updatePromises);

      // Check if all updates were successful
      const allSuccessful = results.every(result => result && result.success);

      if (!allSuccessful) {
        const failedCount = results.filter(result => !result || !result.success).length;
        throw new Error(`Failed to transfer ${failedCount} customer(s)`);
      }

      // Refresh data only if all updates succeeded
      const customersResponse = await customerApi.getAll();
      if (customersResponse.success && customersResponse.data) {
        setAllCustomers(customersResponse.data);
      }

      // Clear selections and staged customers
      setSelectedCustomerIds([]);
      setDraggedCustomerIds([]);

      // Show success message only after server confirms
      showToast.success(`Successfully transferred ${allCustomersToTransfer.length} customer(s)!`);
    } catch (error) {
      console.error('Error transferring customers:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to transfer customers. Please try again.';
      showToast.error(errorMessage);
    } finally {
      setIsTransferring(false);
    }
  };

  // Toggle customer selection
  const toggleCustomerSelection = (customerId: number) => {
    setSelectedCustomerIds(prev =>
      prev.includes(customerId) ? prev.filter(id => id !== customerId) : [...prev, customerId]
    );
  };

  // Toggle all customers selection
  const toggleAllCustomers = () => {
    if (selectedCustomerIds.length === fromCustomers.length) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(fromCustomers.map(c => c.CustomerID));
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, customerId: number) => {
    setDraggedCustomerId(customerId);

    // Create a custom drag image from the entire row
    const target = e.currentTarget as HTMLElement;
    const row = target.closest('tr');

    if (row) {
      // Clone the row for the drag image
      const dragImage = row.cloneNode(true) as HTMLElement;

      // Style the drag image
      dragImage.style.position = 'absolute';
      dragImage.style.top = '-9999px';
      dragImage.style.left = '-9999px';
      dragImage.style.width = row.offsetWidth + 'px';
      dragImage.style.opacity = '0.6';
      dragImage.style.backgroundColor = 'var(--surface)';
      dragImage.style.border = '2px solid var(--primary)';
      dragImage.style.borderRadius = 'var(--radius-md)';
      dragImage.style.pointerEvents = 'none';

      // Add to document temporarily
      document.body.appendChild(dragImage);

      // Set as drag image
      e.dataTransfer.setDragImage(
        dragImage,
        e.clientX - row.getBoundingClientRect().left,
        e.clientY - row.getBoundingClientRect().top
      );

      // Remove after a short delay
      setTimeout(() => {
        document.body.removeChild(dragImage);
      }, 0);
    }
  };

  const handleDragEnd = () => {
    setDraggedCustomerId(null);
    setIsDropZoneActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
    setIsDropZoneActive(true);
  };

  const handleDragLeave = () => {
    setIsDropZoneActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropZoneActive(false);

    if (!draggedCustomerId || !toSalesPerson) return;

    // Stage the customer for transfer (visual only)
    if (!draggedCustomerIds.includes(draggedCustomerId)) {
      setDraggedCustomerIds(prev => [...prev, draggedCustomerId]);
    }

    setDraggedCustomerId(null);
  };

  // Handle reverting a dragged customer (drag back from To table to From table)
  const handleRevertDrop = (e: React.DragEvent) => {
    e.preventDefault();

    if (!draggedCustomerId) return;

    // Only allow reverting if the customer is in the draggedCustomerIds list
    if (draggedCustomerIds.includes(draggedCustomerId)) {
      setDraggedCustomerIds(prev => prev.filter(id => id !== draggedCustomerId));
    }

    setDraggedCustomerId(null);
  };

  const handleViewCustomer = (customer: Customer) => {
    setViewingCustomer(customer);
  };

  // Define columns for customer table (From - with selection)
  const fromCustomerColumns: ColumnDef<Customer>[] = [
    {
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          checked={selectedCustomerIds.length === fromCustomers.length && fromCustomers.length > 0}
          onChange={toggleAllCustomers}
          className="cursor-pointer"
        />
      ),
      cell: ({ row }) => (
        <div data-customer-id={row.original.CustomerID}>
          <input
            type="checkbox"
            checked={selectedCustomerIds.includes(row.original.CustomerID)}
            onChange={() => toggleCustomerSelection(row.original.CustomerID)}
            className="cursor-pointer"
            onClick={e => e.stopPropagation()}
          />
        </div>
      ),
    },
    {
      id: 'view',
      header: 'Customer Details',
      cell: ({ row }) => (
        <button
          onClick={() => handleViewCustomer(row.original)}
          className="p-1.5 rounded-lg hover:bg-[var(--surface-highlight)] text-[var(--text-secondary)] hover:text-blue-600 transition-colors"
          title="View Details"
        >
          <Eye size={16} />
        </button>
      ),
    },
    {
      accessorKey: 'CompanyName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Company Name" />,
      cell: ({ row }) => <div className="font-medium">{row.getValue('CompanyName')}</div>,
    },
    {
      accessorKey: 'ContactPerson',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Contact Person" />,
      cell: ({ row }) => <div>{row.getValue('ContactPerson')}</div>,
    },
    {
      accessorKey: 'Location',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
      cell: ({ row }) => <div>{row.getValue('Location')}</div>,
    },
  ];

  // Define columns for customer table (To - without selection)
  const toCustomerColumns: ColumnDef<Customer>[] = [
    {
      id: 'view',
      header: 'Customer Details',
      cell: ({ row }) => (
        <button
          onClick={() => handleViewCustomer(row.original)}
          className="p-1.5 rounded-lg hover:bg-[var(--surface-highlight)] text-[var(--text-secondary)] hover:text-blue-600 transition-colors"
          title="View Details"
        >
          <Eye size={16} />
        </button>
      ),
    },
    {
      accessorKey: 'CompanyName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Company Name" />,
      cell: ({ row }) => {
        const isDragged = draggedCustomerIds.includes(row.original.CustomerID);
        return (
          <div
            data-to-customer-id={row.original.CustomerID}
            className={`font-medium px-2 py-1 rounded transition-colors ${
              isDragged
                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-l-2 border-green-500'
                : ''
            }`}
          >
            {row.getValue('CompanyName')}
            {isDragged && <span className="ml-2 text-xs opacity-70">● Pending</span>}
          </div>
        );
      },
    },
    {
      accessorKey: 'ContactPerson',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Contact Person" />,
    },
    {
      accessorKey: 'Location',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Customer Transfer"
        description="Transfer customers from one sales person to another"
        actions={
          fromSalesPerson && toSalesPerson ? (
            <Button
              variant="primary"
              size="lg"
              onClick={handleTransfer}
              disabled={
                (selectedCustomerIds.length === 0 && draggedCustomerIds.length === 0) ||
                isTransferring
              }
              isLoading={isTransferring}
              rightIcon={<ArrowRight size={20} />}
            >
              Transfer ({selectedCustomerIds.length + draggedCustomerIds.length}) Customer
              {selectedCustomerIds.length + draggedCustomerIds.length !== 1 ? 's' : ''}
            </Button>
          ) : undefined
        }
      />

      {/* View Customer Details Modal */}
      <Modal
        isOpen={!!viewingCustomer}
        onClose={() => setViewingCustomer(null)}
        title="Customer Details"
        size="lg"
      >
        {viewingCustomer && (
          <div className="space-y-5">
            {/* Customer Name - Prominent */}
            <div className="bg-[var(--surface-highlight)]/40 p-4 rounded-lg border border-[var(--border)]/50">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-2xl">
                  {viewingCustomer.CompanyName?.[0] || 'C'}
                </div>
                <div>
                  <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Company Name
                  </span>
                  <p className="text-xl font-bold text-[var(--text-primary)] mt-1">
                    {viewingCustomer.CompanyName}
                  </p>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div>
              <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Basic Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    Customer ID
                  </span>
                  <p className="text-[var(--text-primary)] font-medium">
                    #{viewingCustomer.CustomerID}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    Contact Person
                  </span>
                  <p className="text-[var(--text-primary)] font-medium">
                    {viewingCustomer.ContactPerson || '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    Customer Type
                  </span>
                  <p className="text-[var(--text-primary)] font-medium">
                    {viewingCustomer.CustomerTypeName || '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">Status</span>
                  <p className="text-[var(--text-primary)] font-medium">
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        viewingCustomer.IsActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {viewingCustomer.IsActive ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Contact Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">Email</span>
                  <p className="text-[var(--text-primary)] font-medium break-all">
                    {viewingCustomer.EmailID || '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    Mobile Numbers
                  </span>
                  <div className="flex flex-col gap-1">
                    {viewingCustomer.MobileNo && (
                      <span className="px-3 py-1.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded-md font-medium text-sm w-fit">
                        {viewingCustomer.CountryCode || ''} {viewingCustomer.MobileNo}
                      </span>
                    )}
                    {viewingCustomer.MobileNo2 && (
                      <span className="px-3 py-1.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded-md font-medium text-sm w-fit">
                        {viewingCustomer.CountryCode2 || ''} {viewingCustomer.MobileNo2}
                      </span>
                    )}
                    {viewingCustomer.MobileNo3 && (
                      <span className="px-3 py-1.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded-md font-medium text-sm w-fit">
                        {viewingCustomer.CountryCode3 || ''} {viewingCustomer.MobileNo3}
                      </span>
                    )}
                    {!viewingCustomer.MobileNo &&
                      !viewingCustomer.MobileNo2 &&
                      !viewingCustomer.MobileNo3 && <span>-</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Address Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1 sm:col-span-2">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">Address</span>
                  <p className="text-[var(--text-primary)] font-medium">
                    {viewingCustomer.Address || '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">Location</span>
                  <p className="text-[var(--text-primary)] font-medium">
                    {viewingCustomer.Location || '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">Pincode</span>
                  <p className="text-[var(--text-primary)] font-medium">
                    {viewingCustomer.Pincode || '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Business Information */}
            <div>
              <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Business Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">GSTIN</span>
                  <p className="text-[var(--text-primary)] font-medium font-mono">
                    {viewingCustomer.GSTNumber || '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    Sales Person
                  </span>
                  <p className="text-[var(--text-primary)] font-medium">
                    {viewingCustomer.SalesPersonName || '-'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-5 border-t border-[var(--border)]">
              <Button variant="ghost" onClick={() => setViewingCustomer(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Sales Person Selection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* From Sales Person */}
        <div
          className="card p-6 space-y-4"
          onDragOver={e => {
            // Only allow drop if dragging a highlighted customer
            if (draggedCustomerId && draggedCustomerIds.includes(draggedCustomerId)) {
              e.preventDefault();
            }
          }}
          onDrop={handleRevertDrop}
        >
          <div className="relative">
            <Input
              label="From Sales Person"
              value={fromSearchTerm}
              onChange={e => {
                setFromSearchTerm(e.target.value);
                if (fromSalesPerson) {
                  setFromSalesPerson(null);
                  setToSalesPerson(null); // Reset "To" when "From" changes
                }
              }}
              onFocus={() => setShowFromDropdown(true)}
              placeholder="Search or click to select..."
              autoComplete="off"
              required
            />
            {showFromDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-lg max-h-60 overflow-auto">
                {loading ? (
                  <div className="px-4 py-2 text-sm text-[var(--text-secondary)]">
                    Loading sales persons...
                  </div>
                ) : salesPersons.filter(sp =>
                    `${sp.FirstName} ${sp.LastName || ''}`
                      .toLowerCase()
                      .includes(fromSearchTerm.toLowerCase())
                  ).length > 0 ? (
                  salesPersons
                    .filter(sp =>
                      `${sp.FirstName} ${sp.LastName || ''}`
                        .toLowerCase()
                        .includes(fromSearchTerm.toLowerCase())
                    )
                    .map(sp => (
                      <div
                        key={sp.EmployeeID}
                        className="px-4 py-2 hover:bg-[var(--surface-hover)] cursor-pointer text-sm text-[var(--text-primary)]"
                        onClick={() => {
                          setFromSalesPerson(sp.EmployeeID);
                          setFromSearchTerm(`${sp.FirstName} ${sp.LastName || ''}`.trim());
                          setShowFromDropdown(false);
                          setToSalesPerson(null); // Reset "To" when "From" changes
                          setToSearchTerm('');
                        }}
                      >
                        {sp.FirstName} {sp.LastName || ''}
                      </div>
                    ))
                ) : (
                  <div className="px-4 py-2 text-sm text-[var(--text-secondary)]">
                    No matching sales persons
                  </div>
                )}
              </div>
            )}
            {showFromDropdown && (
              <div className="fixed inset-0 z-0" onClick={() => setShowFromDropdown(false)} />
            )}
          </div>

          {/* From Customers Table */}
          {fromSalesPerson && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Customers ({fromCustomers.length})
                </h3>
                {selectedCustomerIds.length > 0 && (
                  <span className="text-xs text-[var(--text-secondary)]">
                    {selectedCustomerIds.length} selected
                  </span>
                )}
              </div>
              <DataTable
                columns={fromCustomerColumns}
                data={fromCustomers}
                searchPlaceholder="Search customers..."
                defaultPageSize={10}
                showToolbar={true}
                showPagination={true}
              />
            </div>
          )}
        </div>

        {/* To Sales Person - Drop Zone */}
        <div
          className={`card p-6 space-y-4 relative transition-all duration-200 ${
            isDropZoneActive && toSalesPerson
              ? 'ring-2 ring-[var(--primary)] bg-[var(--primary)]/5'
              : ''
          }`}
          onDragOver={toSalesPerson ? handleDragOver : undefined}
          onDragLeave={toSalesPerson ? handleDragLeave : undefined}
          onDrop={toSalesPerson ? handleDrop : undefined}
        >
          <div className="relative">
            <Input
              label="To Sales Person"
              value={toSearchTerm}
              onChange={e => {
                setToSearchTerm(e.target.value);
                if (toSalesPerson) {
                  setToSalesPerson(null);
                }
              }}
              onFocus={() => setShowToDropdown(true)}
              placeholder="Search or click to select..."
              autoComplete="off"
              disabled={fromSalesPerson === null}
              required
            />
            {showToDropdown && fromSalesPerson !== null && (
              <div className="absolute z-10 w-full mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-lg max-h-60 overflow-auto">
                {loading ? (
                  <div className="px-4 py-2 text-sm text-[var(--text-secondary)]">
                    Loading sales persons...
                  </div>
                ) : salesPersons
                    .filter(sp => sp.EmployeeID !== fromSalesPerson)
                    .filter(sp =>
                      `${sp.FirstName} ${sp.LastName || ''}`
                        .toLowerCase()
                        .includes(toSearchTerm.toLowerCase())
                    ).length > 0 ? (
                  salesPersons
                    .filter(sp => sp.EmployeeID !== fromSalesPerson)
                    .filter(sp =>
                      `${sp.FirstName} ${sp.LastName || ''}`
                        .toLowerCase()
                        .includes(toSearchTerm.toLowerCase())
                    )
                    .map(sp => (
                      <div
                        key={sp.EmployeeID}
                        className="px-4 py-2 hover:bg-[var(--surface-hover)] cursor-pointer text-sm text-[var(--text-primary)]"
                        onClick={() => {
                          setToSalesPerson(sp.EmployeeID);
                          setToSearchTerm(`${sp.FirstName} ${sp.LastName || ''}`.trim());
                          setShowToDropdown(false);
                        }}
                      >
                        {sp.FirstName} {sp.LastName || ''}
                      </div>
                    ))
                ) : (
                  <div className="px-4 py-2 text-sm text-[var(--text-secondary)]">
                    No matching sales persons
                  </div>
                )}
              </div>
            )}
            {showToDropdown && (
              <div className="fixed inset-0 z-0" onClick={() => setShowToDropdown(false)} />
            )}
          </div>

          {/* Drop Zone Indicator */}
          {isDropZoneActive && toSalesPerson && draggedCustomerId && (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--primary)]/10 backdrop-blur-sm rounded-[var(--radius-lg)] pointer-events-none">
              <div className="text-center p-4 bg-[var(--surface)] rounded-lg shadow-lg border-2 border-dashed border-[var(--primary)]">
                <p className="text-[var(--primary)] font-semibold">Drop here to transfer</p>
              </div>
            </div>
          )}

          {/* To Customers Table */}
          {toSalesPerson && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                Customers ({toCustomers.length})
              </h3>
              <DataTable
                columns={toCustomerColumns}
                data={toCustomers}
                searchPlaceholder="Search customers..."
                defaultPageSize={10}
                showToolbar={true}
                showPagination={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerTransferPage;