import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconSymbol } from './ui/IconSymbol';
import { useNotifications } from '@/contexts/NotificationContext';
import { useRouter } from 'expo-router';

export function Header() {
  const { unreadCount } = useNotifications();
  const router = useRouter();

  return (
    <View style={styles.header}>
      <View style={styles.leftSection}>
        <View style={styles.logoContainer}>
          <IconSymbol name="cube.fill" size={20} color="#FFFFFF" />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Q-Medic</Text>
        </View>
      </View>
      
      {/* Notification Button */}
      <TouchableOpacity 
        style={styles.notificationButton}
        onPress={() => {
          console.log('Navigating to notifications, unread:', unreadCount);
          router.push('/notifications');
        }}>
        <IconSymbol name="bell.fill" size={32} color="#4F7FFF" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 15,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB', 
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    marginRight: 12,
    backgroundColor: '#4F7FFF', 
    borderRadius: 8, 
    padding: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    justifyContent: 'center',
  },
  title: {
    color: '#000000',
    fontSize: 26,
    fontWeight: '700',
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444', // สีแดงแจ้งเตือน
    borderRadius: 9999, // ให้เป็นวงกลมเสมอ
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF', 
    paddingHorizontal: 4, 
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  
});