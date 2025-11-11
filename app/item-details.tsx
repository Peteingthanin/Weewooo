import React from "react";
import { View, Text, StyleSheet, ScrollView, Image } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useInventory } from "@/contexts/InventoryContext";

export default function ItemDetailsScreen() {
  const { id, historyId } = useLocalSearchParams();
  const { items, history } = useInventory();

  // Find the item based on the ID from the URL params
  const item = items.find((i) => i.id === id);

  // Find the specific history record if a historyId is provided
  const historyItem = history.find((h) => h.id === historyId);

  if (!item) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Item Not Found" }} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Item with ID "{id}" not found.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stack.Screen options will configure the header provided by expo-router */}
      {/* headerBackTitleVisible: false hides the previous screen's title next to the back button */}
      <Stack.Screen
        options={{ title: item.name, headerBackTitleVisible: false }}
      />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Item Image Placeholder */}
        <View style={styles.imagePlaceholder}>
          {/* In a real app, you'd use a dynamic Image source from your item data */}
          <Image
            source={{
              uri: "https://via.placeholder.com/200x200.png?text=Item+Image",
            }} // Generic placeholder image
            style={styles.itemImage}
            resizeMode="cover"
          />
        </View>

        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemDescription}>
          {/* Placeholder description, as it's not in mockData */}
          Medical supply for emergency use. Essential for{" "}
          {item.category.toLowerCase()} kits. This item is crucial for various
          emergency scenarios, ensuring paramedics have the necessary tools to
          provide immediate care.
        </Text>

        <View style={styles.detailsGrid}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quantity</Text>
            <Text style={styles.detailValue}>
              {historyItem ? historyItem.quantity : item.quantity}
            </Text>
          </View>
          <View style={[styles.detailRow, styles.detailRowBorder]}>
            <Text style={styles.detailLabel}>Expiry Date</Text>
            <Text style={styles.detailValue}>{item.expiryDate}</Text>
          </View>
          <View style={[styles.detailRow, styles.detailRowBorder]}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{item.location}</Text>
          </View>
          <View style={[styles.detailRow, styles.detailRowBorder]}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>{item.category}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={styles.detailValue}>{item.status}</Text>
          </View>
        </View>
      </ScrollView>
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
    padding: 20,
  },
  imagePlaceholder: {
    width: "100%",
    height: 200,
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    overflow: "hidden",
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  itemName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  itemDescription: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 24,
    lineHeight: 24,
  },
  detailsGrid: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    color: "#9CA3AF",
    textAlign: "center",
  },
});
