import React from "react";
import {
  render,
  fireEvent,
  waitFor,
  RenderAPI,
  act,
} from "@testing-library/react-native";
import { CameraView } from "expo-camera";
import ScanScreen from "../scan";
import {
  useInventory,
  InventoryItem,
  HistoryAction,
} from "@/contexts/InventoryContext";

const expect = (global as any).expect as jest.Expect;

// MOCK SETUP

// InventoryContext
jest.mock("@/contexts/InventoryContext", () => ({
  useInventory: jest.fn(),
  InventoryItem: {},
  HistoryAction: { "Check In": "Check In", "Check Out": "Check Out" },
}));

// NotificationContext
jest.mock("@/contexts/NotificationContext", () => ({
  useNotifications: jest.fn(() => ({
    notifications: [],
    loadNotifications: jest.fn(),
    addNotification: jest.fn(),
  })),
}));

// Components
jest.mock("@/components/Header", () => ({
  Header: () => <></>,
}));
jest.mock("@/components/CodeScanner", () => ({
  CodeScanner: "CodeScanner",
}));

// Alert
global.alert = jest.fn();

// CameraView Permission
jest.mock("expo-camera", () => {
  const React = require("react");
  const { View } = require("react-native");
  const MockCameraView = jest.fn((props) => {
    (MockCameraView as any).triggerScan = (data: string) => {
      if (props.onBarcodeScanned) {
        props.onBarcodeScanned({ data });
      }
    };
    return <View testID="camera-view-mock" />;
  });

  return {
    useCameraPermissions: () => [{ granted: true }, jest.fn()],
    CameraView: MockCameraView,
  };
});

jest.useFakeTimers();

// MOCKK TEST DATA

const VALID_CODE_IN_STOCK = "MED001";
const VALID_CODE_OUT_OF_STOCK = "SUP001";
const INVALID_CODE = "WeLoveAjChaiyong";

const mockInventoryItems: InventoryItem[] = [
  {
    id: VALID_CODE_IN_STOCK,
    name: "Epinephrine",
    quantity: 5,
    dbId: 1,
    category: "Medication",
    lastScanned: "",
    status: "In Stock",
    expiryDate: "2025-12-31",
    location: "Ambulance 1",
  },
  {
    id: VALID_CODE_OUT_OF_STOCK,
    name: "Medical Gloves",
    quantity: 0,
    dbId: 2,
    category: "Supplies",
    lastScanned: "",
    status: "Out of Stock",
    expiryDate: "2024-06-01",
    location: "Storage A",
  },
];

// TEST SUITE 1: processScannedCode()

describe("ScanScreen - Core Logic (processScannedCode) using ISP", () => {
  let mockLogInventoryAction: jest.Mock;
  let getByText: RenderAPI["getByText"];
  let getByPlaceholderText: RenderAPI["getByPlaceholderText"];

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogInventoryAction = jest.fn(async () => true);
    (useInventory as jest.Mock).mockReturnValue({
      items: mockInventoryItems,
      logInventoryAction: mockLogInventoryAction,
      history: [],
      exportHistory: [],
      checkedIn: 0,
      checkedOut: 0,
      lowStockCount: 0,
      recentSearches: [],
      currentUser: "TestUser",
      loadInitialData: jest.fn(),
      addRecentSearch: jest.fn(),
      setCurrentUser: jest.fn(),
    });

    const renderResult = render(<ScanScreen />);
    getByText = renderResult.getByText;
    getByPlaceholderText = renderResult.getByPlaceholderText;
  });

  const fireManualSubmit = (
    queries: { getByText: any; getByPlaceholderText: any },
    code: string,
    isQuickScan: boolean = false
  ) => {
    if (!isQuickScan) {
      const input = queries.getByPlaceholderText("Enter barcode or scan...");
      fireEvent.changeText(input, code);
      const submitButton = queries.getByText("Submit Scan");
      fireEvent.press(submitButton);
    } else {
      const quickButton = queries.getByText(code);
      fireEvent.press(quickButton);
    }
  };

  const switchActionType = (query: any, type: HistoryAction) => {
    fireEvent.press(query(type));
  };

  // T1: Check In & Valid Code & In Stock -> Success
  it("T1: Check In / Valid / In Stock -> SUCCESS (Logs Action)", async () => {
    switchActionType(getByText, "Check In");
    fireManualSubmit({ getByText, getByPlaceholderText }, VALID_CODE_IN_STOCK);

    await waitFor(() => {
      expect(mockLogInventoryAction).toHaveBeenCalled();
    });
    expect(global.alert).toHaveBeenCalledWith(
      expect.stringContaining("Logged action for item")
    );
  });

  // T2: Check In & Valid Code & Out of Stock -> Success
  it("T2: Check In / Valid / Out of Stock -> SUCCESS (Check In ignores C3, Logs Action)", async () => {
    switchActionType(getByText, "Check In");
    fireManualSubmit(
      { getByText, getByPlaceholderText },
      VALID_CODE_OUT_OF_STOCK
    );

    await waitFor(() => {
      expect(mockLogInventoryAction).toHaveBeenCalled();
    });
    expect(global.alert).toHaveBeenCalledWith(
      expect.stringContaining("Logged action for item")
    );
  });

  // T3: Check In & Invalid Code & In Stock -> Fail (Validation)
  it("T3: Check In / Invalid / In Stock -> FAIL (Invalid QR Code)", async () => {
    switchActionType(getByText, "Check In");
    fireManualSubmit({ getByText, getByPlaceholderText }, INVALID_CODE);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining("Invalid QR code")
      );
    });
    expect(mockLogInventoryAction).not.toHaveBeenCalled();
  });

  // T4: Check In & Invalid Code & Out of Stock -> Fail (Validation)
  it("T4: Check In / Invalid / Out of Stock -> FAIL (Invalid QR Code)", async () => {
    switchActionType(getByText, "Check In");
    fireManualSubmit({ getByText, getByPlaceholderText }, INVALID_CODE);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining("Invalid QR code")
      );
    });
    expect(mockLogInventoryAction).not.toHaveBeenCalled();
  });

  // T5: Check Out & Valid Code & In Stock -> Success
  it("T5: Check Out / Valid / In Stock -> SUCCESS (Logs Action)", async () => {
    switchActionType(getByText, "Check Out");
    fireManualSubmit({ getByText, getByPlaceholderText }, VALID_CODE_IN_STOCK);

    await waitFor(() => {
      expect(mockLogInventoryAction).toHaveBeenCalled();
    });
    expect(global.alert).toHaveBeenCalledWith(
      expect.stringContaining("Logged action for item")
    );
  });

  // T6: Check Out & Valid Code & Out of Stock -> Fail (Stock Check)
  it("T6: Check Out / Valid / Out of Stock -> FAIL (Alerts Out of Stock)", async () => {
    switchActionType(getByText, "Check Out");
    fireManualSubmit(
      { getByText, getByPlaceholderText },
      VALID_CODE_OUT_OF_STOCK
    );

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining("is out of stock")
      );
    });
    expect(mockLogInventoryAction).not.toHaveBeenCalled();
  });

  // T7: Check Out & Invalid Code & In Stock -> Fail (Validation)
  it("T7: Check Out / Invalid / In Stock -> FAIL (Invalid QR Code)", async () => {
    switchActionType(getByText, "Check Out");
    fireManualSubmit({ getByText, getByPlaceholderText }, INVALID_CODE);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining("Invalid QR code")
      );
    });
    expect(mockLogInventoryAction).not.toHaveBeenCalled();
  });

  // T8: Check Out & Invalid Code & Out of Stock -> Fail (Validation)
  it("T8: Check Out / Invalid / Out of Stock -> FAIL (Invalid QR Code)", async () => {
    switchActionType(getByText, "Check Out");
    fireManualSubmit({ getByText, getByPlaceholderText }, INVALID_CODE);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining("Invalid QR code")
      );
    });
    expect(mockLogInventoryAction).not.toHaveBeenCalled();
  });
});

// --- TEST SUITE 2: handleBarcodeScan()

describe("ScanScreen - handleBarcodeScan Logic (Debounce ISP)", () => {
  let mockLogInventoryAction: jest.Mock;
  let queries: RenderAPI;

  // Helper function camera scan
  const fireCameraScanTest = (data: string) => {
    const trigger = (CameraView as any).triggerScan;
    if (trigger) {
      trigger(data);
    } else {
      throw new Error(
        "CameraView mock trigger not found. Is CameraView mounted?"
      );
    }
  };

  // Helper to Trigger debounce state (scanned: true)
  const simulateDebounceState = async (q: RenderAPI) => {
    const input = q.getByPlaceholderText("Enter barcode or scan...");
    const submitButton = q.getByText("Submit Scan");

    fireEvent.changeText(input, VALID_CODE_IN_STOCK);
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalled();
    });
    (global.alert as jest.Mock).mockClear();
    (mockLogInventoryAction as jest.Mock).mockClear();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogInventoryAction = jest.fn(async () => true);
    (useInventory as jest.Mock).mockReturnValue({
      items: mockInventoryItems,
      logInventoryAction: mockLogInventoryAction,
      history: [],
      exportHistory: [],
      checkedIn: 0,
      checkedOut: 0,
      lowStockCount: 0,
      recentSearches: [],
      currentUser: "TestUser",
      loadInitialData: jest.fn(),
      addRecentSearch: jest.fn(),
      setCurrentUser: jest.fn(),
    });

    queries = render(<ScanScreen />);
  });

  // T11: Debounced & Valid Code -> Skip (Silent Exit)
  it("T11: Debounced, Valid code -> Should be skipped (silent exit)", async () => {
    await simulateDebounceState(queries); // Sets scanned = true

    act(() => fireCameraScanTest(VALID_CODE_IN_STOCK)); // Trigger again immediately

    jest.advanceTimersByTime(100);

    expect(mockLogInventoryAction).not.toHaveBeenCalled();
    expect(global.alert).not.toHaveBeenCalled();
  });
  // T13: Debounced & Invalid Code -> Skip (Silent Exit)
  it("T13: Debounced, Invalid code -> Should be skipped (silent exit)", async () => {
    await simulateDebounceState(queries); // Sets scanned = true

    act(() => fireCameraScanTest(INVALID_CODE));

    jest.advanceTimersByTime(100);

    expect(global.alert).not.toHaveBeenCalled();
  });

  // T10: Not Debounced & Valid Code -> Success (Process)
  it("T10: Not debounced, Valid code -> Should process code (T1 logic)", async () => {
    act(() => fireCameraScanTest(VALID_CODE_IN_STOCK));

    await waitFor(() => {
      expect(mockLogInventoryAction).toHaveBeenCalled();
    });
    expect(global.alert).toHaveBeenCalledWith(
      expect.stringContaining("Logged action")
    );
  });

  // T12: Not Debounced & Invalid Code -> Fail (Alert & Debounce)
  it("T12: Not debounced, Invalid code -> Should alert and temporarily debounce", async () => {
    act(() => fireCameraScanTest(INVALID_CODE));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining("Invalid QR code")
      );
    });

    (global.alert as jest.Mock).mockClear();
    act(() => fireCameraScanTest(VALID_CODE_IN_STOCK));

    expect(mockLogInventoryAction).not.toHaveBeenCalled(); // Should be skipped
  });
});
