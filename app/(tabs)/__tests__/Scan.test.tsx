import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import Scan from "../scan";

//  Mock Up Data
// 1. Expo Router
jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

// 2.Camera
jest.mock("expo-camera", () => {
  const React = require("react");
  const { View, Button, TextInput } = require("react-native");

  return {
    CameraView: ({ onBarcodeScanned }: any) => {
      const [mockData, setMockData] = React.useState("");

      return (
        <View>
          {/*QR Code Input*/}
          <TextInput
            testID="mock-camera-input"
            placeholder="Mock QR Data"
            onChangeText={setMockData}
            value={mockData}
          />
          {/*Button to trigger the scan with the input */}
          <Button
            testID="mock-camera-trigger"
            title="Simulate Scan"
            onPress={() => onBarcodeScanned({ data: mockData })}
          />
        </View>
      );
    },
    useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
  };
});

// CodeScanner Component
jest.mock("@/components/CodeScanner", () => ({
  CodeScanner: "CodeScanner",
}));

// Inventory Context All Test Case
const mockLogAction = jest.fn();
jest.mock("@/contexts/InventoryContext", () => ({
  useInventory: () => ({
    items: [
      { id: "MED001", name: "Epinephrine Auto-Injector", quantity: 5 },
      { id: "EQP001", name: "Defibrillator AED", quantity: 0 },
    ],

    logInventoryAction: mockLogAction,
  }),
}));

// Notification Context
jest.mock("@/contexts/NotificationContext", () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    loadNotifications: jest.fn(),
  }),
}));

//Icons
jest.mock("@/components/ui/IconSymbol", () => ({
  IconSymbol: "IconSymbol",
}));

// Alerts
global.alert = jest.fn();

describe("Scan", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test Case 1: Toggle Between Check Out and Check In
   * Test Case ID: SCAN_001
   * Test Description: Verify that the user can toggle between "Check Out" and "Check In" modes and the system logs the correct action type for each state.
   * Pre-conditions: User is in Scan page and in "Check In" mode.
   * Test Steps:
   * 1. Press "Check Out" and
   * 2. Press MED001 Button
   * 3. Press "Check In" to switch back.
   * 4. Press MED001 Button.
   * Expected Result: The system correctly updates the state and logs the actions corresponding to they selected button.
   */
  it("toggles between Check Out and Check In modes correctly", () => {
    const { getByText, getByPlaceholderText } = render(<Scan />);
    const input = getByPlaceholderText("Enter barcode or scan...");
    const submitBtn = getByText("Submit Scan");

    // 1. Press "Check Out" and
    fireEvent.press(getByText("Check Out"));

    // 2. Submit a scan (MED001)
    fireEvent.changeText(input, "MED001");
    fireEvent.press(submitBtn);

    // Assertion 1: Should be Check Out
    expect(mockLogAction).toHaveBeenCalledWith("MED001", "Check Out", 1);

    // 3. Press "Check In" to switch back.
    fireEvent.press(getByText("Check In"));

    // 4. Submit a scan (MED001) again.
    fireEvent.changeText(input, "MED001");
    fireEvent.press(submitBtn);

    // Assertion 2:: Should be Check In
    expect(mockLogAction).toHaveBeenCalledWith("MED001", "Check In", 1);
  });
  /**
   * Test Case 2: Valid Code Scan Handling
   * Test Case ID: SCAN_002
   * Test Description: Verify that the Camera component triggers the inventory logic correctly when a valid barcode is scanned.
   * Test Steps:
   * 1. Scan valid barcode.
   * Pre-conditions: User is in Scan Page and camera permissions are granted.
   * Expected Result: The handleBarcodeScan() function executes and calls logInventoryAction() with 'MED001' and 'Check In'.
   */
  it("logs an action when the camera scans a valid code", () => {
    const { getByTestId } = render(<Scan />);

    // Valid QR Code mock up
    fireEvent.changeText(getByTestId("mock-camera-input"), "MED001");

    // Trigger the scan
    fireEvent.press(getByTestId("mock-camera-trigger"));

    // Assertion: Verify logInventoryAction called with correct params
    expect(mockLogAction).toHaveBeenCalledWith("MED001", "Check In", 1);
  });

  /**
   * Test Case 3: Invalid Code Scan Handling
   * Test Case ID: SCAN_003
   * Test Description: Verify that the Camera component handle invalid barcode correctly when scanned.
   * Test Steps:
   * 1. Scan invalid barcode.
   * Pre-conditions: User is in Scan Page and camera permissions are granted.
   * Expected Result: An error shown saying the code is invalid, and no action is logged.
   */

  it("shows an error and does not log action when an invalid code is scanned", () => {
    const { getByTestId } = render(<Scan />);

    // 1. Mock up INVALID code inside the test case
    fireEvent.changeText(
      getByTestId("mock-camera-input"),
      "WE_LOVE_AJ_CHAIYONG"
    );

    // 2. Trigger the scan
    fireEvent.press(getByTestId("mock-camera-trigger"));

    // 3. Assertion: Verify Error Alert & No Action Logged
    expect(global.alert).toHaveBeenCalledWith(
      'Invalid QR code: "WE_LOVE_AJ_CHAIYONG".'
    );
    expect(mockLogAction).not.toHaveBeenCalled();
  });

  /**
   * Test Case 4: Handling Insufficient Stock on Check Out
   * Test Case ID: SCAN_004
   * Test Description: Verify that checking out an item with insufficient stock triggers an error and prevents logging.
   * Pre-conditions: User is in Scan page and the item user want to check out has Qty 0.
   * Test Steps:
   * 1. Press "Check out".
   * 2. Press "EQP001" (This has 0 according to our mock up data).
   * Expected Result: An error shown and no action is logged.
   */
  it("prevents checking out items that are out of stock or missing", () => {
    const { getByText, getByPlaceholderText } = render(<Scan />);

    // 1. Switch to Check Out
    fireEvent.press(getByText("Check Out"));

    // 2. Enter EQP001 (This has 0 according to our mock up data).
    const input = getByPlaceholderText("Enter barcode or scan...");
    fireEvent.changeText(input, "EQP001");
    fireEvent.press(getByText("Submit Scan"));

    // 3. Verify Error Alert & No Action Logged
    expect(global.alert).toHaveBeenCalledWith(
      expect.stringContaining("out of stock")
    );
    expect(mockLogAction).not.toHaveBeenCalled();
  });
});
