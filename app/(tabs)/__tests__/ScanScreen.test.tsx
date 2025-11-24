import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
// Use the alias '@' to avoid relative path errors like "../../../"
import ScanScreen from '../scan';

// --- MOCKS ---

// 1. Mock Expo Router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

// 2. Mock Camera (prevents native code crashes)
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: jest.fn(() => [
    { granted: true }, // Fake "Permission Granted"
    jest.fn()
  ]),
}));

// 3. Mock CodeScanner Component
jest.mock('@/components/CodeScanner', () => ({
  CodeScanner: 'CodeScanner'
}));

// 4. Mock Inventory Context (Provides fake data)
const mockLogAction = jest.fn();
jest.mock('@/contexts/InventoryContext', () => ({
  useInventory: () => ({
    items: [{ id: 'MED001', name: 'EpiPen', quantity: 5 }],
    logInventoryAction: mockLogAction,
  }),
}));

// 5. Mock Notification Context (FIXES YOUR CURRENT ERROR)
jest.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    loadNotifications: jest.fn(),
  }),
}));

// 6. Mock Icons (Header uses IconSymbol)
jest.mock('@/components/ui/IconSymbol', () => ({
  IconSymbol: 'IconSymbol',
}));

// Mock Alerts so they don't block the test runner
global.alert = jest.fn();

describe('ScanScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TEST 1: Rendering
  it('renders the manual entry and action buttons', () => {
    const { getByText, getByPlaceholderText } = render(<ScanScreen />);
    
    expect(getByText('Check In')).toBeTruthy();
    expect(getByText('Check Out')).toBeTruthy();
    expect(getByPlaceholderText('Enter barcode or scan...')).toBeTruthy();
  });

  // TEST 2: Manual Entry Logic
  it('logs an action when a valid code is manually entered', () => {
    const { getByText, getByPlaceholderText } = render(<ScanScreen />);

    // Type "MED001" into the input
    const input = getByPlaceholderText('Enter barcode or scan...');
    fireEvent.changeText(input, 'MED001');

    // Press Submit
    const submitBtn = getByText('Submit Scan');
    fireEvent.press(submitBtn);

    // Verify the action was logged
    expect(mockLogAction).toHaveBeenCalledWith('MED001', 'Check In', 1);
  });

/**
 * Test Case ID: FUNC_SCAN_TOGGLE_001
 * Test Description: Verify that the user can toggle between "Check Out" and "Check In" modes and that the system logs the correct action type for each state.
 * Pre-conditions: The screen is initially in "Check In" mode.
 * Test Steps:
 * 1. Press "Check Out" and submit a scan (MED001).
 * 2. Verify the action is logged as "Check Out".
 * 3. Press "Check In" to switch back.
 * 4. Submit a scan (MED001) again.
 * 5. Verify the action is logged as "Check In".
 * Expected Result: The system correctly updates the internal state and logs the transaction corresponding to the currently selected button.
 */
it('toggles between Check Out and Check In modes correctly', () => {
  const { getByText, getByPlaceholderText } = render(<ScanScreen />);
  const input = getByPlaceholderText('Enter barcode or scan...');
  const submitBtn = getByText('Submit Scan');

  // STEP 1: Switch to Check Out
  fireEvent.press(getByText('Check Out'));

  // Submit a code
  fireEvent.changeText(input, 'MED001');
  fireEvent.press(submitBtn);

  // Assertion 1: Should be Check Out
  expect(mockLogAction).toHaveBeenCalledWith('MED001', 'Check Out', 1);

  // STEP 2: Switch BACK to Check In
  fireEvent.press(getByText('Check In'));

  // Submit the code again
  fireEvent.changeText(input, 'MED001');
  fireEvent.press(submitBtn);

  // Assertion 2: Should be Check In
  expect(mockLogAction).toHaveBeenCalledWith('MED001', 'Check In', 1);
});
});