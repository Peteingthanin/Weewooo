import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { useNotifications } from "./NotificationContext"; // Dependency to refresh notifications
import { API_BASE_URL } from "./api"; // Import the centralized API URL

// API configuration is now managed in api.ts

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

// Interface matches the data structure returned by the API's inventory endpoint
export interface InventoryItem {
  dbId: number;          // DB primary key (id)
  id: string;            // barcode (item_id)
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
  checkedIn: number;
  checkedOut: number;
  lowStockCount: number;
  recentSearches: string[];
  currentUser: string; // Add current user to the context
  
  // New API-based functions
  loadInitialData: () => Promise<void>; 
  logInventoryAction: (
    itemId: string,
    action: HistoryAction,
    quantity: number
  ) => Promise<boolean>; 
  
  addRecentSearch: (search: string) => void;
  setCurrentUser: (user: string) => void; // Function to change the user
}

const InventoryContext = createContext<InventoryContextType | undefined>(
  undefined
);

// --- State and Data Loading ---

export function InventoryProvider({ children }: { children: ReactNode }) {
  // 2. Initialize state with empty values (data will come from API)
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [checkedIn, setCheckedIn] = useState(0);
  const [checkedOut, setCheckedOut] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<string>("Paramedic Sam"); // Default user
  
  // Get notification context to ensure alerts refresh after inventory changes
  const { loadNotifications } = useNotifications(); 

  /**
   * 3. Fetches all inventory items and history from the backend API.
   * This replaces mock data initialization and useMemo calculations.
   */
  const loadInitialData = async () => {
    try {
      console.log("📥 Loading data from API...");

      const [inventoryResponse, historyResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/inventory`),
        fetch(`${API_BASE_URL}/history`)
      ]);

      if (!inventoryResponse.ok) throw new Error("Failed loading inventory");
      if (!historyResponse.ok) throw new Error("Failed loading history");

      const inventoryData = await inventoryResponse.json();
      const historyData = await historyResponse.json();

      // ✅ Map backend inventory into React Native structure
      const mappedItems: InventoryItem[] = inventoryData.items.map((item: any) => ({
        dbId: item.dbId, // Correctly map dbId from server
        id: item.id,     // Correctly map id (barcode) from server
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        lastScanned: item.lastScanned,
        status: item.status,
        expiryDate: item.expiryDate,
        location: item.location,
      }));

      setItems(mappedItems);
      setHistory(historyData);

      setCheckedIn(inventoryData.summary?.checkedIn ?? 0);
      setCheckedOut(inventoryData.summary?.checkedOut ?? 0);
      setLowStockCount(inventoryData.summary?.lowStockCount ?? 0);

      console.log("✅ Inventory loaded:", mappedItems.length);
      console.log("✅ History loaded:", historyData.length);

      loadNotifications();

    } catch (e: any) {
      console.error("❌ Error loading initial data: ", e);
    }
  };


  // Run on component mount to load data
  useEffect(() => {
    loadInitialData();
  }, []); 

  // --- Utility Function (Client-side logic remains) ---

  const addRecentSearch = (search: string) => {
    if (!search.trim()) return;

    setRecentSearches((prevSearches) => {
      const filteredSearches = prevSearches.filter((s) => s !== search);
      return [search, ...filteredSearches].slice(0, 5);
    });
  };

  // --- 4. API Action Functions (Replaces local logic) ---

  /**
   * Logs an inventory action to the backend API via a POST request.
   * The API handles all quantity updates, history recording, and status determination.
   */
  const logInventoryAction = async (
    itemId: string,
    action: HistoryAction,
    quantity: number
  ): Promise<boolean> => {
    try {
      // The user is now taken from the context state instead of being passed as an argument.
      const payload = {
          itemId,
          action,
          quantity,
          caseId: `C${Math.floor(Math.random() * 90000) + 10000}`,
          user: currentUser, // Use the user from the context state
      };
      
      const response = await fetch(`${API_BASE_URL}/action/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        console.error("Server error logging action:", errorData.error);
        alert(`Failed to log action: ${errorData.error || response.statusText}`);
        return false;
      }

      // Action succeeded: Refresh all data from the database
      await loadInitialData(); 
      return true;

    } catch (e) {
      console.error("Network or API call failed:", e);
      alert("Failed to connect to the server. Please check your network configuration.");
      return false;
    }
  };
  
  // 5. Context Value Update: Removed addItem and updateItem
  return (
    <InventoryContext.Provider
      value={{
        items,
        history, 
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