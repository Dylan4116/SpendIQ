import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';

export default function HomeScreen() {
  const { user, transactions, budgets, monthlyBudgetLimit, unreadCount } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Dynamic calculations from all transactions
  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
  const remaining = Math.max(monthlyBudgetLimit - totalSpent, 0);
  const percentage = monthlyBudgetLimit ? Math.round((totalSpent / monthlyBudgetLimit) * 100) : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: Math.max(insets.top, 20) + 12 }
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header with SpendSnap Logo & Greeting */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Official SpendSnap Logo branding */}
          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <Ionicons name="receipt" size={16} color="#E0B1CB" />
            </View>
            <Text style={styles.logoText}>SpendSnap</Text>
          </View>

          {/* User greeting */}
          <View style={styles.greetingBox}>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.userName}>{user?.name || 'Welcome'} 👋</Text>
          </View>
        </View>

        {/* Right Action Icons: Notification & Profile */}
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.bellButton} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={20} color="#5E548E" />
            {unreadCount > 0 && <View style={styles.badge} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
            {user?.avatar ? <Image source={{ uri: user.avatar }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarFallbackText}>{user?.name?.[0] || '?'}</Text></View>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Monthly Spending Card -> Tappable -> Opens /spending-calendar */}
      <TouchableOpacity
        style={styles.spendingCard}
        onPress={() => router.push('/spending-calendar')}
        activeOpacity={0.88}
      >
        <View style={styles.spendingHeader}>
          <Text style={styles.cardTitle}>OCTOBER SPENDING</Text>
          <View style={styles.dropdownBadge}>
            <Ionicons name="calendar-outline" size={12} color="#FFFFFF" />
            <Text style={styles.dropdownText}>Calendar</Text>
            <Ionicons name="chevron-forward" size={12} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.amountRow}>
          <Text style={styles.totalAmount}>₹{totalSpent.toLocaleString()}</Text>
          <Text style={styles.budgetLimit}>of ₹{monthlyBudgetLimit.toLocaleString()}</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.min(percentage, 100)}%` }]} />
        </View>
        <View style={styles.spendingFooter}>
          <Text style={styles.footerInfo}>{percentage}% spent</Text>
          <Text style={styles.footerRemaining}>₹{remaining.toLocaleString()} remaining</Text>
        </View>
      </TouchableOpacity>

      {/* Category Breakdown Preview */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.titleWithIcon}>
            <Ionicons name="pie-chart-outline" size={16} color="#5E548E" />
            <Text style={styles.sectionTitle}>CATEGORY SPENDING</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/categories')}>
            <Text style={styles.viewAll}>View details</Text>
          </TouchableOpacity>
        </View>

        {budgets.map((b, idx) => {
          const pct = Math.round((b.spent / (b.limit || 1)) * 100);
          return (
            <TouchableOpacity
              key={idx}
              style={styles.categoryRow}
              onPress={() => router.push({ pathname: '/category-details', params: { category: b.category } })}
              activeOpacity={0.7}
            >
              <View style={styles.categoryLeft}>
                <View style={[styles.colorDot, { backgroundColor: b.color }]} />
                <Text style={styles.categoryName}>{b.category}</Text>
              </View>
              <View style={styles.categoryRight}>
                <Text style={styles.categoryPct}>{pct}%</Text>
                <Text style={styles.categoryAmount}>₹{b.spent.toLocaleString()}</Text>
                <Ionicons name="chevron-forward" size={12} color="#CCC" />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Recent Expenses */}
      <View style={styles.recentSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Expenses</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/budgets')}>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>
        {transactions.slice(0, 3).map(t => (
          <View key={t.id} style={styles.expenseCard}>
            <View style={styles.expenseLeft}>
              <View style={styles.expenseIconBox}>
                <Ionicons name="receipt-outline" size={18} color="#5E548E" />
              </View>
              <View>
                <Text style={styles.merchantName}>{t.merchant}</Text>
                <Text style={styles.expenseMeta}>{t.date} · {t.category}</Text>
              </View>
            </View>
            <Text style={styles.expenseAmount}>₹{t.amount.toLocaleString()}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  contentContainer: { paddingHorizontal: 20, paddingBottom: 100 },

  // Header with Logo
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLeft: { gap: 6 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoBox: { width: 28, height: 28, backgroundColor: '#231942', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: 15, fontWeight: 'bold', color: '#231942', letterSpacing: 0.5 },
  greetingBox: { marginTop: 2 },
  greeting: { fontSize: 12, color: '#888', fontWeight: '500' },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#231942' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bellButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F3F0F7', justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#D9534F' },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#5E548E' },
  avatarFallback: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#5E548E', backgroundColor: '#F3F0F7', alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { color: '#5E548E', fontWeight: 'bold' },

  // Spending Card
  spendingCard: { backgroundColor: '#231942', borderRadius: 24, padding: 20, marginBottom: 20 },
  spendingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 11, fontWeight: '600', color: '#E0B1CB', letterSpacing: 0.5 },
  dropdownBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  dropdownText: { fontSize: 11, color: '#FFF', fontWeight: '500' },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 16 },
  totalAmount: { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
  budgetLimit: { fontSize: 12, color: '#BE95C4' },
  progressBarBg: { width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
  progressBarFill: { height: '100%', backgroundColor: '#E0B1CB', borderRadius: 4 },
  spendingFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerInfo: { fontSize: 11, color: '#E0B1CB' },
  footerRemaining: { fontSize: 11, color: '#FFF', fontWeight: '600' },

  // Category Breakdown Preview
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#F0EBF5', padding: 16, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#231942' },
  viewAll: { fontSize: 12, fontWeight: '600', color: '#5E548E' },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  categoryName: { fontSize: 13, color: '#231942', fontWeight: '500' },
  categoryRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryPct: { fontSize: 12, color: '#999' },
  categoryAmount: { fontSize: 13, fontWeight: 'bold', color: '#231942' },

  // Recent Expenses
  recentSection: { marginBottom: 20 },
  expenseCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAFAFC', borderWidth: 1, borderColor: '#F0EBF5', padding: 14, borderRadius: 16, marginBottom: 10 },
  expenseLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  expenseIconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F3F0F7', justifyContent: 'center', alignItems: 'center' },
  merchantName: { fontSize: 13, fontWeight: 'bold', color: '#231942', marginBottom: 2 },
  expenseMeta: { fontSize: 11, color: '#999' },
  expenseAmount: { fontSize: 14, fontWeight: 'bold', color: '#231942' }
});
