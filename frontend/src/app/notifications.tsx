import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppNotification, NotificationType, useApp } from '../context/AppContext';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useApp();

  const getNotificationIcon = (type: NotificationType): { name: keyof typeof Ionicons.glyphMap; color: string; bg: string } => {
    switch (type) {
      case 'budget_warning':
        return { name: 'warning-outline', color: '#E09F3E', bg: '#FEF7ED' };
      case 'budget_exceeded':
        return { name: 'alert-circle-outline', color: '#D9534F', bg: '#FDE8E8' };
      case 'spending_alert':
        return { name: 'trending-up-outline', color: '#BE95C4', bg: '#FAF5FB' };
      case 'weekly_insight':
        return { name: 'bar-chart-outline', color: '#5E548E', bg: '#F3F0F7' };
      case 'receipt_saved':
        return { name: 'receipt-outline', color: '#4EBA6F', bg: '#EDFDF2' };
      case 'monthly_report':
        return { name: 'document-text-outline', color: '#9F86C0', bg: '#F7F3FB' };
      default:
        return { name: 'notifications-outline', color: '#5E548E', bg: '#F3F0F7' };
    }
  };

  const handleNotificationPress = (item: AppNotification) => {
    markAsRead(item.id);
    if (item.route) {
      try {
        router.push(item.route as any);
      } catch (e) {
        console.warn('Navigation error on notification press:', e);
      }
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 20) }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#231942" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="notifications-off-outline" size={38} color="#C4B7D7" />
            </View>
            <Text style={styles.emptyTitle}>No new notifications</Text>
            <Text style={styles.emptySubtitle}>You&apos;re all caught up with your budgets and spending.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {notifications.map(item => {
              const iconMeta = getNotificationIcon(item.type);
              const isUnread = !item.isRead;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.notificationCard, isUnread && styles.notificationCardUnread]}
                  onPress={() => handleNotificationPress(item)}
                  activeOpacity={0.7}
                >
                  {/* Left Icon Box */}
                  <View style={[styles.iconBox, { backgroundColor: iconMeta.bg }]}>
                    <Ionicons name={iconMeta.name} size={20} color={iconMeta.color} />
                  </View>

                  {/* Body Content */}
                  <View style={styles.cardContent}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.cardTitle, isUnread && styles.cardTitleUnread]}>
                        {item.title}
                      </Text>
                      <View style={styles.timeRow}>
                        <Text style={styles.timestamp}>{item.timestamp}</Text>
                        {isUnread && <View style={styles.unreadDot} />}
                      </View>
                    </View>
                    <Text style={styles.cardMessage}>{item.message}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F3F0F7', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#231942' },
  markAllBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#F3F0F7' },
  markAllText: { fontSize: 11, fontWeight: '600', color: '#5E548E' },

  contentContainer: { paddingHorizontal: 20, paddingBottom: 60, paddingTop: 6 },
  list: { gap: 10 },
  notificationCard: { flexDirection: 'row', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F0EBF5', borderRadius: 18, padding: 14, gap: 12, alignItems: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 3 },
  notificationCardUnread: { backgroundColor: '#FAF8FD', borderColor: '#EBE5F5' },
  iconBox: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#231942', flex: 1, marginRight: 8 },
  cardTitleUnread: { fontWeight: '700' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timestamp: { fontSize: 10, color: '#999' },
  unreadDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#5E548E' },
  cardMessage: { fontSize: 12, color: '#666', lineHeight: 17 },

  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F3F0F7', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#231942' },
  emptySubtitle: { fontSize: 12, color: '#888', textAlign: 'center', maxWidth: 240 }
});
