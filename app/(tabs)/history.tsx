import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Header } from "@/components/Header";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useInventory } from "@/contexts/InventoryContext"; // Import useInventory hook

export default function HistoryScreen() {
  const { history } = useInventory(); // Get history from the context
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("Date"); // 'Date' or 'Quantity'
  const [filterAction, setFilterAction] = useState("All"); // 'All', 'Check In', 'Check Out'
  const [filterCategory, setFilterCategory] = useState("All"); // 'All', 'Medication', 'Equipment', 'Supplies'
  const router = useRouter();

  // Simple filtering and sorting logic for demonstration
  const filteredAndSortedHistory = history // Use history from context
    .filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.caseId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.date.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAction =
        filterAction === "All" || item.action === filterAction;
      const matchesCategory =
        filterCategory === "All" || item.category === filterCategory;
      return matchesSearch && matchesAction && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "Date") {
        return new Date(b.date).getTime() - new Date(a.date).getTime(); // Newest first
      }
      if (sortBy === "Quantity") {
        // Convert quantity to number, making Check Out negative for sorting
        const quantityA = Number(a.quantity);
        const effectiveQuantityA =
          a.action === "Check Out" ? -quantityA : quantityA;

        const quantityB = Number(b.quantity);
        const effectiveQuantityB =
          b.action === "Check Out" ? -quantityB : quantityB;

        // Descending sort based on effective quantity (largest number, or largest Check In, first)
        return effectiveQuantityB - effectiveQuantityA;
      }
      return 0;
    });

  return (
    <View style={styles.container}>
      <Header />
      <View style={styles.content}>
        <Text style={styles.pageTitle}>History & Report</Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <IconSymbol
            name="magnifyingglass"
            size={18}
            color="#9CA3AF"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by date, case, or item..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery !== "" && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery("")}
            >
              <IconSymbol name="xmark.circle.fill" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Sort, Filter */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              const options = ["Date", "Quantity"];
              const i = options.indexOf(sortBy);
              setSortBy(options[(i + 1) % options.length]);
            }}
          >
            <IconSymbol name="arrow.up.arrow.down" size={16} color="#4F7FFF" />
            <Text style={styles.controlButtonText}>Sort by: {sortBy}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              // Cycle through all available action categories
              const actions = ["All", "Check In", "Check Out", "Use", "Transfer", "Remove All"];
              const currentIndex = actions.indexOf(filterAction);
              const nextIndex = (currentIndex + 1) % actions.length;
              setFilterAction(actions[nextIndex]);
            }}
          >
            <IconSymbol
              name="line.horizontal.3.decrease.circle"
              size={16}
              color="#4F7FFF"
            />
            <Text style={styles.controlButtonText}>Action: {filterAction}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              // Cycle through item categories: All -> Medication -> Equipment -> Supplies -> All
              const categories = ["All", "Medication", "Equipment", "Supplies"];
              const currentIndex = categories.indexOf(filterCategory);
              const nextIndex = (currentIndex + 1) % categories.length;
              setFilterCategory(categories[nextIndex]);
            }}
          >
            <IconSymbol name="tag.fill" size={16} color="#4F7FFF" />
            <Text style={styles.controlButtonText}>
              Category: {filterCategory}
            </Text>
          </TouchableOpacity>
          {/* Customize button is removed */}
        </View>

        {/* Record Count */}
        <Text style={styles.recordCount}>
          {filteredAndSortedHistory.length} records found
        </Text>

        {/* History Log */}
        <ScrollView
          style={styles.historyList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.historyListContent}
        >
          {filteredAndSortedHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="clock.fill" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>No activity found</Text>
              <Text style={styles.emptyStateSubtext}>
                Try adjusting your search or filters
              </Text>
            </View>
          ) : (
            filteredAndSortedHistory.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.historyItemCard}
                onPress={() =>
                  router.push(`/item-details?id=${item.itemId}`)
                }
              >
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{item.itemName}</Text>
                  <Text style={styles.itemQuantity}>
                    {item.action === "Check In"
                      ? `+${item.quantity}`
                      : item.action === "Transfer"
                      ? `→${item.quantity}`
                      : item.action === "Use" || item.action === "Check Out" || item.action === "Remove All"
                      ? `-${item.quantity}`
                      : `${item.quantity}`
                    }
                  </Text>
                </View>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemDetailText}>Date: {item.date}</Text>
                  <Text style={styles.itemDetailText}>
                    Case ID: {item.caseId} • Item ID: {item.itemId}
                  </Text><Text style={styles.itemDetailText}>
                    Action: {item.action} by {item.user}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB", // Light background
  },
  content: {
    flex: 1,
    padding: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 20,
    textAlign: "left", // Center the title
  },
  // Search Bar Styles (reused from inventory.tsx)
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1F2937",
  },
  clearButton: {
    padding: 8,
  },
  // Controls Row (Sort, Filter, Customize)
  controlsRow: {
    flexDirection: "row",
    flexWrap: "wrap", // Allows buttons to wrap to next line if space is tight
    justifyContent: "flex-start", // Align buttons to the left
    marginBottom: 16,
    gap: 8, // Space between buttons
  },
  controlButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  controlButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#4F7FFF",
  },
  // Record Count
  recordCount: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
    fontWeight: "500",
  },
  // History List
  historyList: {
    flex: 1,
  },
  historyListContent: {
    paddingBottom: 20, // Ensure last item isn't cut off by tab bar
  },
  historyItemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1, // Allow name to take up space
  },
  itemQuantity: {
    fontSize: 17,
    fontWeight: "700",
    color: "#4F7FFF", // Example color for quantity
  },
  itemDetails: {
    // Style for detail lines
  },
  itemDetailText: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  // Empty State (reused from index.tsx)
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 4,
  },
});
