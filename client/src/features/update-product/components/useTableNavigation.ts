import { useCallback } from 'react';

export const useTableNavigation = () => {
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;

    event.preventDefault(); // Prevent any default Enter behavior

    const input = event.currentTarget;
    const td = input.closest('td');
    if (!td) return;

    const colIndex = parseInt(td.getAttribute('data-col-index') || '0', 10);
    const tr = td.closest('tr');
    if (!tr) return;

    // Find next row's same column input
    const tbody = tr.closest('tbody');
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr'));
    const currentRowIndex = rows.indexOf(tr);
    if (currentRowIndex === -1) return;

    const nextRowIndex = currentRowIndex + 1;
    if (nextRowIndex >= rows.length) return; // Stay on page if no more rows

    const nextRow = rows[nextRowIndex];
    const nextTd = nextRow.querySelector(`td[data-col-index="${colIndex}"]`) as HTMLElement;
    if (nextTd) {
      const nextInput = nextTd.querySelector('input[type="number"]') as HTMLInputElement;
      nextInput?.focus();
      nextInput?.select();
    }
  }, []);

  return { handleKeyDown };
};
