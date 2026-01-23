import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Check,
  AlertTriangle,
  FileText,
  Truck,
  Package,
  PauseCircle,
  CheckCircle,
  X,
} from 'lucide-react';
import { useNotifications, useUnreadCount, useMarkAsRead } from '../hooks';
import type { Notification } from '../types';
import { cn } from '@/utils/cn';
import { formatDistanceToNow } from 'date-fns';
import { showToast } from '@/utils/toast';
import { decodeHtml } from '@/utils/stringUtils';

interface NotificationDropdownProps {
  className?: string;
}

// Icon and color config for each notification type
const getNotificationConfig = (type: string, priority: string) => {
  const configs: Record<string, { icon: React.ReactNode; bgColor: string; iconColor: string }> = {
    MaterialShortage: {
      icon: <AlertTriangle size={16} />,
      bgColor:
        priority === 'critical'
          ? 'bg-red-50 dark:bg-red-900/20'
          : 'bg-orange-50 dark:bg-orange-900/20',
      iconColor: priority === 'critical' ? 'text-red-500' : 'text-orange-500',
    },
    NewOrder: {
      icon: <FileText size={16} />,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-500',
    },
    OrderUpdate: {
      icon: <PauseCircle size={16} />,
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      iconColor: 'text-orange-500',
    },
    Dispatch: {
      icon: <Truck size={16} />,
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-500',
    },
    Delivery: {
      icon: <CheckCircle size={16} />,
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      iconColor: 'text-emerald-500',
    },
    ProductionComplete: {
      icon: <Package size={16} />,
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-500',
    },
  };

  return (
    configs[type] || {
      icon: <Bell size={16} />,
      bgColor: 'bg-gray-50 dark:bg-gray-900/20',
      iconColor: 'text-gray-500',
    }
  );
};

const getPriorityBadge = (priority: string) => {
  if (priority === 'critical') {
    return (
      <span className="px-1.5 py-0.5 text-[10px] bg-red-100 text-red-700 rounded font-medium">
        Critical
      </span>
    );
  }
  if (priority === 'high') {
    return (
      <span className="px-1.5 py-0.5 text-[10px] bg-orange-100 text-orange-700 rounded font-medium">
        High
      </span>
    );
  }
  return null;
};

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch ALL notifications (no type filter)
  const { data: notifications = [], isLoading } = useNotifications({ limit: 50 });
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAsRead = useMarkAsRead();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter unread notifications
  const unreadNotifications = (notifications as Notification[]).filter(n => !n.isRead);

  const handleMarkAsRead = (notificationId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    markAsRead.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    unreadNotifications.forEach(n => markAsRead.mutate(n.notificationId));
    showToast.success('All notifications marked as read');
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--surface-highlight)] rounded transition-colors cursor-pointer"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed sm:absolute inset-x-2 sm:inset-x-auto top-14 sm:top-auto sm:right-0 sm:mt-2 w-auto sm:w-96 bg-[var(--surface)] rounded-lg border border-[var(--border)] shadow-lg z-50 max-h-[80vh] sm:max-h-[500px] overflow-hidden">
          {/* Header */}
          <div className="p-3 sm:p-4 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="font-semibold text-[var(--text-primary)]">Notifications</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-secondary)]">{unreadCount} unread</span>
              {unreadNotifications.length > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-[var(--primary)] hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-[var(--text-secondary)]">
                Loading notifications...
              </div>
            ) : unreadNotifications.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-secondary)]">
                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                <p>No new notifications</p>
              </div>
            ) : (
              unreadNotifications.slice(0, 10).map(notification => {
                const config = getNotificationConfig(notification.type, notification.priority);

                return (
                  <div
                    key={notification.notificationId}
                    className={cn(
                      'p-3 border-b border-[var(--border)] hover:bg-[var(--surface-highlight)] transition-colors',
                      config.bgColor
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={cn('flex-shrink-0 mt-0.5', config.iconColor)}>
                        {config.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-sm text-[var(--text-primary)] truncate">
                            {decodeHtml(notification.title)}
                          </h4>
                          {getPriorityBadge(notification.priority)}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                          {decodeHtml(notification.message)}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1 opacity-70">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={e => handleMarkAsRead(notification.notificationId, e)}
                          className="p-1.5 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-colors"
                          title="Mark as read"
                        >
                          <Check size={14} className="text-green-600" />
                        </button>
                        <button
                          onClick={e => handleMarkAsRead(notification.notificationId, e)}
                          className="p-1.5 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-colors"
                          title="Dismiss"
                        >
                          <X size={14} className="text-gray-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-[var(--border)] bg-[var(--surface-highlight)]">
            <button
              onClick={() => {
                window.location.href = '/dashboard/notifications';
                setIsOpen(false);
              }}
              className="w-full text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium"
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
