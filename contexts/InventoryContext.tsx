import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { useNotifications } from "./NotificationContext"; // Dependency to refresh notifications
import { API_BASE_URL } from "./api"; // Import the centralized API URL

export type ItemCategory = "Medication" | "Equipment" | "Supplies";
export type HistoryAction =
  | "Check In"
  | "Use"
  | "Transfer"
  | "Remove All"
  | "Check Out";

// Interface matches the data structure returned by the API's history endpoint
export interface HistoryItem {
  id: string; // The history record ID
  itemId: string;
  itemName: string;
  date: string; // Formatted date string
  caseId: string;
  user: string;
  quantity: number;
  action: HistoryAction;
  category: ItemCategory;
}

// --- NEW ---
// Interface matches the data structure returned by the API's export history endpoint
export interface ExportHistoryItem {
  id: number;
  format: "CSV" | "Excel" | "PDF";
  status: "Success" | "Failed";
  details: string;
  user: string;
  date: string; // Already formatted by the server
}
// --- END NEW ---

// Interface matches the data structure returned by the API's inventory endpoint
export interface InventoryItem {
  dbId: number; // DB primary key (id)
  id: string; // barcode (item_id)
  name: string;
  category: ItemCategory;
  quantity: number;
  lastScanned: string;
  status: "In Stock" | "Low Stock" | "Out of Stock";
  expiryDate: string;
  location: string;
}

interface InventoryContextType {
  items: InventoryItem[];
  history: HistoryItem[];
  exportHistory: ExportHistoryItem[]; // --- NEW ---
  checkedIn: number;
  checkedOut: number;
  lowStockCount: number;
  recentSearches: string[];
  currentUser: string;

  loadInitialData: () => Promise<void>;
  logInventoryAction: (
    itemId: string,
    action: HistoryAction,
    quantity: number
  ) => Promise<boolean>;

  addRecentSearch: (search: string) => void;
  setCurrentUser: (user: string) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(
  undefined
);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]); // --- NEW ---
  const [checkedIn, setCheckedIn] = useState(0);
  const [checkedOut, setCheckedOut] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<string>("Paramedic Sam");

  const { loadNotifications } = useNotifications();

  const loadInitialData = async () => {
    try {
      console.log("📥 Loading data from API...");

      // --- MODIFIED: Fetch export history alongside other data ---
      const [inventoryResponse, historyResponse, exportHistoryResponse] =
        await Promise.all([
          fetch(`${API_BASE_URL}/inventory`),
          fetch(`${API_BASE_URL}/history`),
          fetch(`${API_BASE_URL}/export/history`), // --- NEW ---
        ]);

      if (!inventoryResponse.ok) throw new Error("Failed loading inventory");
      if (!historyResponse.ok) throw new Error("Failed loading history");
      if (!exportHistoryResponse.ok)
        throw new Error("Failed loading export history"); // --- NEW ---

      const inventoryData = await inventoryResponse.json();
      const historyData = await historyResponse.json();
      const exportHistoryData = await exportHistoryResponse.json(); // --- NEW ---

      // Map backend inventory
      const mappedItems: InventoryItem[] = inventoryData.items.map(
        (item: any) => ({
          dbId: item.dbId,
          id: item.id,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          lastScanned: item.lastScanned,
          status: item.status,
          expiryDate: item.expiryDate,
          location: item.location,
        })
      );

      setItems(mappedItems);
      setHistory(historyData);
      setExportHistory(exportHistoryData); // --- NEW ---

      setCheckedIn(inventoryData.summary?.checkedIn ?? 0);
      setCheckedOut(inventoryData.summary?.checkedOut ?? 0);
      setLowStockCount(inventoryData.summary?.lowStockCount ?? 0);

      console.log("✅ Inventory loaded:", mappedItems.length);
      console.log("✅ History loaded:", historyData.length);
      console.log("✅ Export History loaded:", exportHistoryData.length); // --- NEW ---

      loadNotifications();
    } catch (e: any) {
      console.error("❌ Error loading initial data: ", e);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const addRecentSearch = (search: string) => {
    if (!search.trim()) return;

    setRecentSearches((prevSearches) => {
      const filteredSearches = prevSearches.filter((s) => s !== search);
      return [search, ...filteredSearches].slice(0, 5);
    });
  };

  const logInventoryAction = async (
    itemId: string,
    action: HistoryAction,
    quantity: number
  ): Promise<boolean> => {
    try {
      const payload = {
        itemId,
        action,
        quantity,
        caseId: `C${Math.floor(Math.random() * 90000) + 10000}`,
        user: currentUser,
      };

      const response = await fetch(`${API_BASE_URL}/action/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: response.statusText }));
        console.error("Server error logging action:", errorData.error);
        alert(
          `Failed to log action: ${errorData.error || response.statusText}`
        );
        return false;
      }

      await loadInitialData();
      return true;
    } catch (e) {
      console.error("Network or API call failed:", e);
      alert(
        "Failed to connect to the server. Please check your network configuration."
      );
      return false;
    }
  };

  return (
    <InventoryContext.Provider
      value={{
        items,
        history,
        exportHistory, // --- NEW ---
        checkedIn,
        checkedOut,
        lowStockCount,
        recentSearches,
        currentUser,
        loadInitialData,
        addRecentSearch,
        logInventoryAction,
        setCurrentUser,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return context;
}
