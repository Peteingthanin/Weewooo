import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Platform, // --- NEW: Import Platform
} from "react-native";
import { Header } from "@/components/Header";
import { useInventory, ItemCategory } from "@/contexts/InventoryContext";

// --- NEW --- Imports for file system and sharing
import { documentDirectory, downloadAsync } from "expo-file-system/legacy"; // For native
import * as Sharing from "expo-sharing"; // For native
import { API_BASE_URL } from "../../contexts/api";

const CATEGORIES: Array<"All Categories" | ItemCategory> = [
  "All Categories",
  "Medication",
  "Equipment",
  "Supplies",
];

const LOCATIONS: Array<"Locations" | string> = [
  "Locations",
  "Ambulance 1",
  "Ambulance 2",
  "Storage Room A",
  "Cabinet 3",
];

const EXPIRING_SOON_OPTIONS: Array<
  "Expiry Status" | "Expiring Soon" | "Expired"
> = [
  "Expiry Status",
  "Expiring Soon", // e.g., within 30 days
  "Expired",
];

export default function InventoryScreen() {
  const {
    items,
    logInventoryAction,
    recentSearches,
    addRecentSearch,
    loadInitialData,
    currentUser,
  } = useInventory();
  const [selectedCategory, setSelectedCategory] = useState<
    "All Categories" | ItemCategory
  >("All Categories");
  const [quantitiesToUse, setQuantitiesToUse] = useState<{
    [itemId: string]: string;
  }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<
    "Locations" | string
  >("Locations");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [selectedExpiringSoon, setSelectedExpiringSoon] = useState<
    "Expiry Status" | "Expiring Soon" | "Expired"
  >("Expiry Status");
  const [showExpiringSoonDropdown, setShowExpiringSoonDropdown] =
    useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    await loadInitialData();
    setIsRefreshing(false);
  }, []);

  // --- MODIFIED --- Export Function with Platform Check
  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    console.log(`--- TAPPED EXPORT: ${format} ---`);

    const fileExt = format === "excel" ? "xlsx" : format;
    const fileName = `inventory.${fileExt}`;
    // Include current user as query parameter
    const downloadUrl = `${API_BASE_URL}/export/${format}?user=${encodeURIComponent(currentUser)}`;

    if (Platform.OS === "web") {
      // --- WEB-SPECIFIC LOGIC ---
      // On web, we create a temporary link and "click" it
      try {
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await loadInitialData();
      } catch (error) {
        console.error("Web Export Error:", error);
        Alert.alert("Export Failed", "Could not download the file.");
      }
    } else {
      // --- NATIVE (iOS / Android) LOGIC ---
      const fileUri = documentDirectory + fileName;
      try {
        const { uri } = await downloadAsync(downloadUrl, fileUri);
        console.log("File downloaded to:", uri);

        if (!(await Sharing.isAvailableAsync())) {
          Alert.alert("Error", "Sharing is not available on this platform.");
          return;
        }

        await Sharing.shareAsync(uri, {
          dialogTitle: "Share Inventory Report",
          mimeType:
            fileExt === "csv"
              ? "text/csv"
              : fileExt === "xlsx"
              ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              : "application/pdf",
        });
      } catch (error) {
        console.error("Native Export Error:", error);
        Alert.alert("Export Failed", "Could not generate or share the file.");
      }
    }
  };
  // --- END MODIFIED ---

  const filteredItems = items
    .filter(
      (item) =>
        selectedCategory === "All Categories" ||
        item.category === selectedCategory
    )
    .filter(
      (item) =>
        searchQuery === "" ||
        (item.name?.toLowerCase() ?? "").includes(searchQuery.toLowerCase()) ||
        (item.id?.toLowerCase() ?? "").includes(searchQuery.toLowerCase()) ||
        (item.location?.toLowerCase() ?? "").includes(searchQuery.toLowerCase())
    )
    .filter(
      (item) =>
        selectedLocation === "Locations" || item.location === selectedLocation
    )
    .filter((item) => {
      if (selectedExpiringSoon === "Expiry Status") {
        return true;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiryDate = new Date(item.expiryDate);
      expiryDate.setHours(0, 0, 0, 0);
      if (selectedExpiringSoon === "Expired") {
        return expiryDate < today;
      }
      if (selectedExpiringSoon === "Expiring Soon") {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        thirtyDaysFromNow.setHours(0, 0, 0, 0);
        return expiryDate >= today && expiryDate <= thirtyDaysFromNow;
      }
      return true;
    });

  const getQuantityForUse = (itemId: string): number => {
    const q = parseInt(quantitiesToUse[itemId] || "1", 10);
    return isNaN(q) || q < 1 ? 1 : q;
  };

  const handleQuantityChange = (itemId: string, value: string) => {
    setQuantitiesToUse((prev) => ({
      ...prev,
      [itemId]: value.replace(/[^1-9]/g, ""),
    }));
  };

  const handleCategorySelect = (category: "All Categories" | ItemCategory) => {
    setSelectedCategory(category);
    setShowCategoryDropdown(false);
  };

  const handleLocationSelect = (location: "Locations" | string) => {
    setSelectedLocation(location);
    setShowLocationDropdown(false);
  };

  const handleExpiringSoonSelect = (
    option: "Expiry Status" | "Expiring Soon" | "Expired"
  ) => {
    setSelectedExpiringSoon(option);
    setShowExpiringSoonDropdown(false);
  };

  return (
    <View style={styles.container}>
      <Header />
      <View style={styles.content}>
        <Text style={styles.title}>Inventory</Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or code..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => {
              if (searchQuery.trim()) {
                addRecentSearch(searchQuery.trim());
                setIsSearchFocused(false);
              }
            }}
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          {searchQuery !== "" && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSearchQuery("");
              }}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recent Searches Dropdown */}
        {isSearchFocused && searchQuery === "" && recentSearches.length > 0 && (
          <View style={styles.recentSearchesContainer}>
            <Text style={styles.recentSearchesTitle}>Recent Searches</Text>
            {recentSearches.map((search, index) => (
              <TouchableOpacity
                key={index}
                style={styles.recentSearchItem}
                onPress={() => {
                  setSearchQuery(search);
                  setIsSearchFocused(false);
                }}
              >
                <Text style={styles.recentSearchText}>🕒 {search}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Filters Toggle */}
        <TouchableOpacity
          style={styles.filtersToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filtersIcon}>⚙</Text>
          <Text style={styles.filtersText}>Filters</Text>
          <Text style={styles.chevron}>{showFilters ? "▲" : "▼"}</Text>
        </TouchableOpacity>

        {/* Filter Dropdowns */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            {/* Category Dropdown */}
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
              >
                <Text style={styles.dropdownText}>{selectedCategory}</Text>
                <Text style={styles.dropdownChevron}>▼</Text>
              </TouchableOpacity>

              {showCategoryDropdown && (
                <View style={styles.dropdownMenu}>
                  {CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.dropdownItem,
                        selectedCategory === category &&
                          styles.dropdownItemSelected,
                      ]}
                      onPress={() => handleCategorySelect(category)}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          selectedCategory === category &&
                            styles.dropdownItemTextSelected,
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Location Dropdown */}
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowLocationDropdown(!showLocationDropdown)}
              >
                <Text style={styles.dropdownText}>{selectedLocation}</Text>
                <Text style={styles.dropdownChevron}>▼</Text>
              </TouchableOpacity>

              {showLocationDropdown && (
                <View style={styles.dropdownMenu}>
                  {LOCATIONS.map((location) => (
                    <TouchableOpacity
                      key={location}
                      style={[
                        styles.dropdownItem,
                        selectedLocation === location &&
                          styles.dropdownItemSelected,
                      ]}
                      onPress={() => handleLocationSelect(location)}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          selectedLocation === location &&
                            styles.dropdownItemTextSelected,
                        ]}
                      >
                        {location}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Expiring Soon Dropdown */}
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() =>
                  setShowExpiringSoonDropdown(!showExpiringSoonDropdown)
                }
              >
                <Text style={styles.dropdownText}>{selectedExpiringSoon}</Text>
                <Text style={styles.dropdownChevron}>▼</Text>
              </TouchableOpacity>

              {showExpiringSoonDropdown && (
                <View style={styles.dropdownMenu}>
                  {EXPIRING_SOON_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.dropdownItem,
                        selectedExpiringSoon === option &&
                          styles.dropdownItemSelected,
                      ]}
                      onPress={() => handleExpiringSoonSelect(option)}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          selectedExpiringSoon === option &&
                            styles.dropdownItemTextSelected,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* --- NEW --- Export Buttons */}
        <View style={styles.exportContainer}>
          <TouchableOpacity
            style={[styles.exportButton, styles.exportButtonCsv]}
            onPress={() => handleExport("csv")}
          >
            <Text style={styles.exportButtonText}>Export CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportButton, styles.exportButtonExcel]}
            onPress={() => handleExport("excel")}
          >
            <Text style={styles.exportButtonText}>Export Excel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportButton, styles.exportButtonPdf]}
            onPress={() => handleExport("pdf")}
          >
            <Text style={styles.exportButtonText}>Export PDF</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.itemList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.itemListContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        >
          {filteredItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No items found</Text>
              <Text style={styles.emptyStateSubtext}>
                Try adjusting your search or filters
              </Text>
            </View>
          ) : (
            filteredItems.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemTitleContainer}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemMeta}>
                      {item.id} • {item.category}
                    </Text>
                  </View>
                  <View style={styles.statusAndQuantityContainer}>
                    <View
                      style={[
                        styles.statusBadge,
                        item.status === "In Stock" && styles.statusInStock,
                        item.status === "Low Stock" && styles.statusLowStock,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          item.status === "Low Stock" && { color: "#991B1B" },
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                    <TextInput
                      style={styles.quantityInput}
                      onChangeText={(value) =>
                        handleQuantityChange(item.id, value)
                      }
                      value={quantitiesToUse[item.id]}
                      keyboardType="numeric"
                      placeholder="1"
                      maxLength={3}
                    />
                  </View>
                </View>

                <View style={styles.itemDetails}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Quantity</Text>
                    <Text style={styles.detailValue}>
                      {item.quantity} units
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Last Scanned</Text>
                    <Text style={styles.detailValue}>{item.lastScanned}</Text>
                  </View>
                </View>
                <View style={styles.itemDetails}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>{item.location}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Expires</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        isExpired(item.expiryDate) && styles.expiredText,
                      ]}
                    >
                      {item.expiryDate}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.itemActions}>
                  <View style={{ flex: 1 }} />
                  <View style={styles.buttonGroup}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.useButton,
                        (item.quantity < getQuantityForUse(item.id) ||
                          item.quantity <= 0) &&
                          styles.disabledButton,
                      ]}
                      onPress={() =>
                        logInventoryAction(
                          item.id,
                          "Use",
                          getQuantityForUse(item.id)
                        )
                      }
                      disabled={
                        item.quantity < getQuantityForUse(item.id) ||
                        item.quantity <= 0
                      }
                    >
                      <Text style={styles.actionButtonText}>Use</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.transferButton,
                        (item.quantity < getQuantityForUse(item.id) ||
                          item.quantity <= 0) &&
                          styles.disabledButton,
                      ]}
                      onPress={() =>
                        logInventoryAction(
                          item.id,
                          "Transfer",
                          getQuantityForUse(item.id)
                        )
                      }
                      disabled={
                        item.quantity < getQuantityForUse(item.id) ||
                        item.quantity <= 0
                      }
                    >
                      <Text style={styles.actionButtonText}>Transfer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.removeButton,
                        item.quantity <= 0 && styles.disabledButton,
                      ]}
                      onPress={() =>
                        logInventoryAction(item.id, "Remove All", item.quantity)
                      }
                      disabled={item.quantity <= 0}
                    >
                      <Text style={styles.actionButtonText}>Remove All</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {item.quantity < getQuantityForUse(item.id) &&
                  item.quantity > 0 && (
                    <Text style={styles.notEnoughItemsText}>
                      Not enough items. Available: {item.quantity}
                    </Text>
                  )}
                {item.quantity <= 0 && (
                  <Text style={styles.notEnoughItemsText}>Out of Stock</Text>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// Helper function to check if an item is expired
const isExpired = (expiryDateString: string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDate = new Date(expiryDateString);
  expiryDate.setHours(0, 0, 0, 0);
  return expiryDate < today;
};

// Helper function to check if an item is expiring soon (within 30 days)
const isExpiringSoon = (expiryDateString: string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDate = new Date(expiryDateString);
  expiryDate.setHours(0, 0, 0, 0);
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);
  thirtyDaysFromNow.setHours(0, 0, 0, 0);
  return expiryDate >= today && expiryDate <= thirtyDaysFromNow;
};

// --- Styles (Unchanged) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000000",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
    color: "#9CA3AF",
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
  clearButtonText: {
    fontSize: 18,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  filtersToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 12,
  },
  filtersIcon: {
    fontSize: 16,
    color: "#4F7FFF",
    marginRight: 8,
  },
  filtersText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F7FFF",
    flex: 1,
  },
  chevron: {
    fontSize: 12,
    color: "#4F7FFF",
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  dropdownContainer: {
    marginBottom: 12,
  },
  dropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 15,
    color: "#1F2937",
    fontWeight: "500",
  },
  dropdownChevron: {
    fontSize: 12,
    color: "#6B7280",
  },
  dropdownMenu: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 4,
    overflow: "hidden",
  },
  itemList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  itemListContent: {
    paddingBottom: 100,
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemSelected: {
    backgroundColor: "#6B7280",
  },
  dropdownItemText: {
    fontSize: 15,
    color: "#1F2937",
  },
  dropdownItemTextSelected: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  itemTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 14,
    color: "#6B7280",
  },
  statusBadge: {
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  statusInStock: {
    backgroundColor: "#D1FAE5",
  },
  statusLowStock: {
    backgroundColor: "#FEE2E2",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#065F46",
  },
  itemDetails: {
    flexDirection: "row",
    gap: 40,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  itemActions: {
    flexDirection: "row",
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 16,
    alignItems: "center",
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 16,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statusAndQuantityContainer: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 8,
  },
  quantityInput: {
    width: 60,
    height: 36,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  transferButton: {
    backgroundColor: "#4F7FFF",
  },
  useButton: {
    backgroundColor: "#FB923C",
  },
  removeButton: {
    backgroundColor: "#EF4444",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: "#D1D5DB",
  },
  notEnoughItemsText: {
    color: "#EF4444",
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
  expiredText: {
    color: "#EF4444",
    fontWeight: "700",
  },
  recentSearchesContainer: {
    position: "absolute",
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    zIndex: 1000,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  recentSearchesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  recentSearchItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  recentSearchText: {
    fontSize: 15,
    color: "#1F2937",
  },
  exportContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  exportButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  exportButtonCsv: {
    backgroundColor: "#059669",
  },
  exportButtonExcel: {
    backgroundColor: "#047857",
  },
  exportButtonPdf: {
    backgroundColor: "#EF4444",
  },
  exportButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
