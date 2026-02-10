import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Save, X, Loader2, FileText, CreditCard, Truck, Tag, Sparkles } from 'lucide-react';
import { Tnc, CreateTncInput } from '../types';
import { Button, Input } from '@/components/ui';
import SearchableSelect from '@/components/ui/SearchableSelect';

interface TncFormProps {
  editingTnc: Tnc | null;
  existingTypes: string[];
  onSubmit: (data: CreateTncInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

// Type icons mapping
const typeIcons: Record<string, React.ReactNode> = {
  Payment: <CreditCard size={18} className="text-emerald-500" />,
  Delivery: <Truck size={18} className="text-blue-500" />,
  General: <FileText size={18} className="text-gray-500" />,
};

export const TncForm: React.FC<TncFormProps> = ({
  editingTnc,
  existingTypes,
  onSubmit,
  onCancel,
  isLoading,
}) => {
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Payment');

  useEffect(() => {
    if (editingTnc) {
      setDescription(editingTnc.description);
      setType(editingTnc.type);
    } else {
      setDescription('');
      setType('Payment');
    }
  }, [editingTnc]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ type, description });
    if (!editingTnc) {
      setDescription('');
      setType('Payment');
    }
  };

  const typeOptions = useMemo(() => {
    const allTypes = Array.from(new Set([...existingTypes, type].filter(Boolean)));
    return allTypes.map(t => ({
      id: t,
      label: t,
      value: t,
      icon: typeIcons[t] || <Tag size={18} className="text-purple-500" />,
    }));
  }, [existingTypes, type]);

  const selectedTypeIcon = typeIcons[type] || <Tag size={18} className="text-purple-500" />;

  return (
    <div className="bg-[var(--surface)] rounded-xl shadow-lg border border-[var(--border)] overflow-hidden">
      {/* Header with gradient */}
      <div
        className={`px-6 py-4 border-b border-[var(--border)] ${editingTnc
          ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
          : 'bg-gradient-to-r from-emerald-500 to-teal-500'
          }`}
      >
        <p className="text-white/80 text-sm mt-1">
          {editingTnc
            ? 'Update the existing term or condition'
            : 'Create a new payment or delivery term'}
        </p>
      </div>

      {/* Form Content */}
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Type Selection */}
            <div className="lg:col-span-1">
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Category Type <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <SearchableSelect
                  options={typeOptions}
                  value={type}
                  onChange={val => setType(val as string)}
                  creatable
                  onCreateNew={val => setType(val)}
                  placeholder="Select or create type"
                  className="w-full"
                  disabled={true}
                />
              </div>

              {/* Quick type buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setType('Payment')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${type === 'Payment'
                    ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500'
                    : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-emerald-300'
                    }`}
                >
                  <CreditCard size={12} />
                  Payment
                </button>
                <button
                  type="button"
                  onClick={() => setType('Delivery')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${type === 'Delivery'
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                    : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-blue-300'
                    }`}
                >
                  <Truck size={12} />
                  Delivery
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="lg:col-span-3">
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Term Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                className="w-full px-4 py-3 border border-[var(--border)] rounded-xl bg-[var(--surface-secondary)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all resize-none outline-none placeholder:text-[var(--text-secondary)]"
                placeholder="Enter the term or condition details..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
              />
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {description.length}/500 characters
              </p>
            </div>
          </div>

          {/* Preview Card */}
          {(type || description) && (
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl">
              <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">
                Preview
              </h4>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">{selectedTypeIcon}</div>
                <div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold mb-1 ${type === 'Payment'
                      ? 'bg-emerald-100 text-emerald-700'
                      : type === 'Delivery'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                      }`}
                  >
                    {type || 'No type selected'}
                  </span>
                  <p className="text-sm text-[var(--text-primary)]">
                    {description || 'No description yet...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-[var(--border)]">
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || !description.trim() || !type.trim()}
              className={`min-w-[140px] ${editingTnc
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600'
                }`}
              leftIcon={
                isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingTnc ? (
                  <Save size={18} />
                ) : (
                  <Plus size={18} />
                )
              }
            >
              {isLoading ? 'Saving...' : editingTnc ? 'Update Term' : 'Add Term'}
            </Button>

            {editingTnc && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                leftIcon={<X size={18} />}
                className="text-[var(--text-secondary)] hover:text-[var(--danger)]"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
