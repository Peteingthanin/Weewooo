import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Header } from '@/components/Header';
import { useInventory } from '@/contexts/InventoryContext';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const {
    checkedIn,
    checkedOut,
    lowStockCount,
    currentUser,
    setCurrentUser,
  } = useInventory();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.currentUserText}>
          Current User: <Text style={{ fontWeight: '700' }}>{currentUser}</Text>
        </Text>
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.checkedInCard]}>
            <Text style={styles.statNumber}>{checkedIn}</Text>
            <Text style={styles.statLabel}>Items Checked In</Text>
          </View>
          <View style={[styles.statCard, styles.checkedOutCard]}>
            <Text style={styles.statNumber}>{checkedOut}</Text>
            <Text style={styles.statLabel}>Items Checked Out</Text>
          </View>
        </View>

        {lowStockCount > 0 && (
          <View style={styles.alertContainer}>
            <View style={styles.alertContent}>
              <IconSymbol name="exclamationmark.circle.fill" size={24} color="#DC2626" />
              <View style={styles.alertText}>
                <Text style={styles.alertTitle}>Low Stock Alert</Text>
                <Text style={styles.alertDescription}>
                  {lowStockCount} items below minimum quantity
                </Text>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push('/scan')}>
          <View style={styles.quickActionLeft}>
            <IconSymbol name="viewfinder" size={28} color="#FFFFFF" />
            <View style={styles.quickActionText}>
              <Text style={styles.quickActionTitle}>Start Scanning</Text>
              <Text style={styles.quickActionSubtitle}>Check items in/out</Text>
            </View>
          </View>
          <IconSymbol name="chevron.right" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Switch User (Demo)</Text>
        <View style={styles.userSwitcher}>
          <TouchableOpacity
            style={styles.userButton}
            onPress={() => setCurrentUser('Paramedic Sam')}>
            <Text style={styles.userButtonText}>Login as Sam</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.userButton}
            onPress={() => setCurrentUser('Nurse Jackie')}>
            <Text style={styles.userButtonText}>Login as Jackie</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.userButton}
            onPress={() => setCurrentUser('Dr. Hart')}>
            <Text style={styles.userButtonText}>Login as Dr. Hart</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.emptyState}>
          <IconSymbol name="clock" size={64} color="#D1D5DB" />
          <Text style={styles.emptyStateText}>No recent activity</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  currentUserText: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 24,
    minHeight: 120,
    justifyContent: 'center',
  },
  checkedInCard: {
    backgroundColor: '#E8F6FB',  
  },
  checkedOutCard: {
    backgroundColor: '#E6F0FB',
  },
  statNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#20293A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 16,
    color: '#20293A',
    opacity: 0.95,
  },
  alertContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alertText: {
    marginLeft: 12,
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 2,
  },
  alertDescription: {
    fontSize: 14,
    color: '#991B1B',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  quickActionButton: {
    backgroundColor: '#3D99E3',
    borderRadius: 50,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  quickActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickActionText: {
    marginLeft: 16,
  },
  quickActionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
  },
  userSwitcher: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  userButton: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  userButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
});
