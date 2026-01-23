import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from './api';
import type { NotificationFilters } from './types';
import { showToast } from '@/utils/toast';

export const useNotifications = (filters?: NotificationFilters) => {
  return useQuery({
    queryKey: ['notifications', filters],
    queryFn: () =>
      notificationsApi.getNotifications(filters).then(res => {
        // Deduplicate Logic
        const uniqueMap = new Map();
        res.data.data.forEach((item: any) => {
          if (!uniqueMap.has(item.notificationId)) {
            uniqueMap.set(item.notificationId, item);
          }
        });
        return Array.from(uniqueMap.values());
      }),
    refetchInterval: 60000, // Refetch every 60 seconds
    refetchOnWindowFocus: true,
  });
};

export const useAllNotifications = (enabled: boolean = false) => {
  return useQuery({
    queryKey: ['notifications', 'all'],
    queryFn: () =>
      notificationsApi.getAllNotifications().then(res => {
        // Deduplicate Logic
        const uniqueMap = new Map();
        res.data.data.forEach((item: any) => {
          if (!uniqueMap.has(item.notificationId)) {
            uniqueMap.set(item.notificationId, item);
          }
        });
        return Array.from(uniqueMap.values());
      }),
    enabled: enabled, // Only fetch if toggled on
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
};

export const useUnreadCount = () => {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount().then(res => res.data.data.unreadCount),
    refetchInterval: 20000, // Refetch every 20 seconds
    refetchOnWindowFocus: true,
  });
};

export const useCriticalAlerts = () => {
  return useQuery({
    queryKey: ['notifications', 'critical-alerts'],
    queryFn: () => notificationsApi.getCriticalAlerts().then(res => res.data.data),
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: number) => notificationsApi.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      showToast.error('Failed to mark notification as read');
    },
  });
};

export const useAcknowledgeNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: number) => notificationsApi.acknowledge(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      // Toast removed - let components handle success feedback
    },
    onError: () => {
      showToast.error('Failed to acknowledge notification');
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: number) => notificationsApi.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      // Toast removed - let components handle success feedback
    },
    onError: () => {
      showToast.error('Failed to delete notification');
    },
  });
};
