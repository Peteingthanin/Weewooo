import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import {
  useInventory,
  HistoryItem,
  ExportHistoryItem,
} from "@/contexts/InventoryContext"; // Import new types
import { Header } from "@/components/Header";
import { useRouter } from "expo-router";

// --- NEW: Define which view is active ---
type HistoryView = "actions" | "exports";

export default function HistoryScreen() {
  const { history, exportHistory, loadInitialData } = useInventory(); // Get new exportHistory
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [view, setView] = useState<HistoryView>("actions"); // State for view
  const router = useRouter();

  // Note: The original file's filtering/sorting logic is preserved for the 'actions' view.
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("Date");
  const [filterAction, setFilterAction] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadInitialData();
    setIsRefreshing(false);
  }, []);

  // Filtering logic from original file, now only for 'actions' view
  const filteredAndSortedActionHistory = history
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
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === "Quantity") {
        const quantityA = Number(a.quantity);
        const effectiveQuantityA =
          a.action === "Check Out" ? -quantityA : quantityA;
        const quantityB = Number(b.quantity);
        const effectiveQuantityB =
          b.action === "Check Out" ? -quantityB : quantityB;
        return effectiveQuantityB - effectiveQuantityA;
      }
      return 0;
    });

  // --- NEW: Component to render export history ---
  const renderExportHistory = (item: ExportHistoryItem) => (
    <View key={item.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.itemName}>{item.format} Export</Text>
        <Text
          style={[
            styles.actionBadge,
            item.status === "Success"
              ? styles.statusSuccess
              : styles.statusFailed,
          ]}
        >
          {item.status}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.detailText}>Details: {item.details}</Text>
        <Text style={styles.detailText}>User: {item.user}</Text>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>{item.date}</Text>
      </View>
    </View>
  );

  // --- NEW: Component to render item action history (from original file) ---
  const renderActionHistory = (item: HistoryItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.card}
      onPress={() => router.push(`/item-details?id=${item.itemId}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.itemName}>{item.itemName}</Text>
        <Text
          style={[
            styles.actionBadge,
            (styles as any)[item.action.replace(" ", "")],
          ]}
        >
          {item.action}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.detailText}>Quantity: {item.quantity}</Text>
        <Text style={styles.detailText}>Case ID: {item.caseId}</Text>
        <Text style={styles.detailText}>User: {item.user}</Text>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>{item.date}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header />
      <View style={styles.content}>
        <Text style={styles.title}>History & Report</Text>

        {/* --- NEW: Segmented Control --- */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              view === "actions" && styles.segmentButtonActive,
            ]}
            onPress={() => setView("actions")}
          >
            <Text
              style={[
                styles.segmentText,
                view === "actions" && styles.segmentTextActive,
              ]}
            >
              Item Actions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              view === "exports" && styles.segmentButtonActive,
            ]}
            onPress={() => setView("exports")}
          >
            <Text
              style={[
                styles.segmentText,
                view === "exports" && styles.segmentTextActive,
              ]}
            >
              Export History
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* --- NEW: Conditional Rendering --- */}

          {view === "actions" && (
            <>
              {/* --- Re-using filter controls from original file --- */}
              <View style={styles.controlsRow}>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={() => {
                    const options = ["Date", "Quantity"];
                    const i = options.indexOf(sortBy);
                    setSortBy(options[(i + 1) % options.length]);
                  }}
                >
                  <Text style={styles.controlButtonText}>
                    Sort by: {sortBy}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={() => {
                    const actions = [
                      "All",
                      "Check In",
                      "Check Out",
                      "Use",
                      "Transfer",
                      "Remove All",
                    ];
                    const currentIndex = actions.indexOf(filterAction);
                    const nextIndex = (currentIndex + 1) % actions.length;
                    setFilterAction(actions[nextIndex]);
                  }}
                >
                  <Text style={styles.controlButtonText}>
                    Action: {filterAction}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={() => {
                    const categories = [
                      "All",
                      "Medication",
                      "Equipment",
                      "Supplies",
                    ];
                    const currentIndex = categories.indexOf(filterCategory);
                    const nextIndex = (currentIndex + 1) % categories.length;
                    setFilterCategory(categories[nextIndex]);
                  }}
                >
                  <Text style={styles.controlButtonText}>
                    Category: {filterCategory}
                  </Text>
                </TouchableOpacity>
              </View>

              {filteredAndSortedActionHistory.length > 0 ? (
                filteredAndSortedActionHistory.map(renderActionHistory)
              ) : (
                <Text style={styles.emptyText}>
                  No item action history found.
                </Text>
              )}
            </>
          )}

          {view === "exports" && (
            <>
              {exportHistory.length > 0 ? (
                exportHistory.map(renderExportHistory)
              ) : (
                <Text style={styles.emptyText}>No export history found.</Text>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// --- Styles (Many are new or modified) ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { flex: 1, paddingTop: 20 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  // --- NEW: Segmented Control Styles ---
  segmentContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  segmentTextActive: {
    color: "#4F7FFF",
  },
  // --- End New ---
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    marginRight: 8, // Ensure badge doesn't overlap
  },
  actionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden", // for borderRadius
    color: "#FFFFFF",
    textAlign: "center",
  },
  cardBody: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  dateText: {
    fontSize: 12,
    color: "#6B7280",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
    color: "#6B7280",
  },
  // Original filter controls
  controlsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    marginBottom: 16,
    gap: 8,
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
  // Action/Status colors
  CheckIn: { backgroundColor: "#10B981" },
  CheckOut: { backgroundColor: "#EF4444" },
  Use: { backgroundColor: "#F59E0B" },
  Transfer: { backgroundColor: "#6366F1" },
  RemoveAll: { backgroundColor: "#374151" },
  statusSuccess: { backgroundColor: "#10B981" }, // Green
  statusFailed: { backgroundColor: "#EF4444" }, // Red
});
