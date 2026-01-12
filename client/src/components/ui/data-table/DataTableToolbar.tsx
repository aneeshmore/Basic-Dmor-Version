import { useState, useEffect, ChangeEvent } from 'react';
import { Table } from '@tanstack/react-table';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { DataTableViewOptions } from './DataTableViewOptions';
import { Input } from '../Input';
import { Button } from '../Button';

interface DataTableToolbarProps<TData> {
    table: Table<TData>;
    globalFilter?: string;
    setGlobalFilter?: (value: string) => void;
    searchPlaceholder?: string;
    toolbarActions?: React.ReactNode;
}

export function DataTableToolbar<TData>({
    table,
    globalFilter,
    setGlobalFilter,
    searchPlaceholder = 'Filter...',
    toolbarActions,
}: DataTableToolbarProps<TData>) {
    const isFiltered = table.getState().columnFilters.length > 0 || !!globalFilter;
    const canExpand = table.getCanSomeRowsExpand();
    const isAllExpanded = table.getIsAllRowsExpanded();

    // Use local state for input to prevent focus loss during parent re-renders
    const [value, setValue] = useState(globalFilter ?? '');

    // Sync local state with globalFilter prop
    useEffect(() => {
        setValue(globalFilter ?? '');
    }, [globalFilter]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setValue(newValue);
        if (setGlobalFilter) {
            setGlobalFilter(newValue);
        }
    };

    return (
        <div className="flex items-center justify-between p-4">
            <div className="flex flex-1 items-center space-x-2">
                {setGlobalFilter && (
                    <Input
                        placeholder={searchPlaceholder}
                        value={value}
                        onChange={handleInputChange}
                        className="h-8 w-[150px] lg:w-[250px]"
                        fullWidth={false}
                    />
                )}

                {toolbarActions && (
                    <div className="flex items-center space-x-2">
                        {toolbarActions}
                    </div>
                )}

                {isFiltered && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            table.resetColumnFilters();
                            if (setGlobalFilter) setGlobalFilter('');
                        }}
                        leftIcon={<X className="h-4 w-4" />}
                    >
                        Reset
                    </Button>
                )}
            </div>

            <div className="flex items-center space-x-2 ml-2">
                {canExpand && (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => table.toggleAllRowsExpanded()}
                        title={isAllExpanded ? 'Collapse All' : 'Expand All'}
                        leftIcon={
                            isAllExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )
                        }
                    >
                        {isAllExpanded ? 'Collapse All' : 'Expand All'}
                    </Button>
                )}
                <DataTableViewOptions table={table} />
            </div>
        </div>
    );
}
