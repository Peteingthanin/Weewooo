import React from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { useNotifications } from "@/contexts/NotificationContext";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Header } from "@/components/Header";

export default function NotificationsScreen() {
  const { notifications, markAsRead, unreadCount } = useNotifications();
  const router = useRouter();

  const handleViewItem = (id: number, itemId: string) => {
    // Mark as read
    markAsRead(id);
    // Navigate to item details with itemId
    router.push(`/item-details?id=${itemId}`);
  };

  const handleDismiss = (id: number) => {
    // Mark as read only
    markAsRead(id);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, !item.read && styles.unreadCard]}>
      <View style={styles.cardHeader}>
        <IconSymbol
          name="exclamationmark.circle.fill"
          size={24}
          color={item.read ? "#F59E0B" : "#DC2626"}
        />
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{item.itemName}</Text>
          {!item.read && <View style={styles.redDot} />}
        </View>
      </View>
      
      <View style={styles.cardContent}>
        <Text style={styles.cardText}>Item ID: {item.itemId}</Text>
        <Text style={styles.cardText}>Expiring: {item.expiry}</Text>
        <Text style={styles.cardText}>Location: {item.location}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.viewItemButton}
          onPress={() => handleViewItem(item.id, item.itemId)}
          activeOpacity={0.7}
        >
          <Text style={styles.viewItemText}>View Item</Text>
          <IconSymbol name="chevron.right" size={16} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dismissButton}
          onPress={() => handleDismiss(item.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header />
      
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
              {unreadCount} {unreadCount === 1 ? 'unread notification' : 'unread notifications'}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="bell.fill" size={64} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>No notifications</Text>
            <Text style={styles.emptyStateSubtext}>
              You're all caught up!
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  list: {
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadCard: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FDBA74",
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DC2626",
    marginLeft: 8,
  },
  cardContent: {
    marginLeft: 36,
    marginBottom: 12,
  },
  cardText: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 4,
  },
  cardActions: {
    marginLeft: 36,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    flexDirection: "row",
    gap: 8,
  },
  viewItemButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F7FFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 4,
  },
  viewItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  dismissButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  dismissText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
});