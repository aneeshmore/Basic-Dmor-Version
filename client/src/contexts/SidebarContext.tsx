/**
 * Sidebar Context
 * Global state management for sidebar collapse/expand
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidebarContextType {
  isOpen: boolean;
  isCollapsed: boolean;
  toggle: () => void;
  collapse: () => void;
  expand: () => void;
  setOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const SIDEBAR_STORAGE_KEY = 'morex-sidebar-collapsed';

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Mobile: closed by default, Desktop: open by default
  const [isOpen, setIsOpen] = useState(false);

  // Collapsed state (for desktop mini sidebar)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored === 'true';
  });

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  // Check if desktop on mount (1280px+ = laptops/desktops)
  useEffect(() => {
    const isDesktop = window.innerWidth >= 1280;
    setIsOpen(isDesktop);
  }, []);

  const toggle = () => {
    const isDesktop = window.innerWidth >= 1280;
    if (isDesktop) {
      setIsCollapsed(!isCollapsed);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const collapse = () => setIsCollapsed(true);
  const expand = () => setIsCollapsed(false);
  const setOpen = (open: boolean) => setIsOpen(open);

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        isCollapsed,
        toggle,
        collapse,
        expand,
        setOpen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
}
