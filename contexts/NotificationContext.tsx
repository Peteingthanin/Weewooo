import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { API_BASE_URL } from "./api"; // Import the centralized API URL

// API configuration is now managed in api.ts

export type Notification = {
  id: number; // Notification log ID
  itemId: string; // item_id_at_alert
  itemName: string;
  expiry: string; // expiry_date_at_alert (YYYY-MM-DD)
  location: string;
  read: boolean;
};

type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: number) => Promise<void>; // Now async
  loadNotifications: () => Promise<void>; // Now async
  // addNotification is typically managed by the backend, but we'll keep the signature async for future use
  addNotification: (notification: Omit<Notification, 'id' | 'read'>) => Promise<void>; 
};

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const NotificationProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  /**
   * Loads notifications from the backend API.
   * This replaces mock data and AsyncStorage loading.
   */
  const loadNotifications = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications`);
      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.statusText}`);
      }
      
      const data: Notification[] = await response.json();
      setNotifications(data);
      console.log('Live notifications loaded.');
      
    } catch (e) {
      console.error("Failed to load live notifications", e);
      // In a real app, you might set a state to show a connection error in the UI
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  /**
   * Marks a notification as read via API call.
   * This replaces local state manipulation.
   */
  const markAsRead = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/read/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to mark notification ${id} as read.`);
      }

      // After successful API call, update the local state to reflect the change
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      
    } catch (e) {
      console.error("Error updating read status:", e);
      alert("Failed to update notification status on server.");
    }
  };

  /**
   * Placeholder for adding a notification (should generally be triggered by the backend)
   */
  const addNotification = async (notification: Omit<Notification, 'id' | 'read'>) => {
      console.warn("Attempted to add notification from client. This should typically be done by the server.");
      // In a full implementation, this would POST to a server endpoint to create a new alert.
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{ 
        notifications, 
        unreadCount, 
        markAsRead, 
        loadNotifications,
        addNotification 
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
      throw new Error("useNotifications must be used within an NotificationProvider");
    }
    return context;
};