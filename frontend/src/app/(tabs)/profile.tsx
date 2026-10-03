import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { exportReportToExcel } from '../../utils/exportExcel';

const MONTH_SHORT_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ProfileScreen() {
  const { user, transactions, budgets, monthlyBudgetLimit, logout } = useApp();
  const router = useRouter();

  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Filter transactions based on selected report period
  const filteredTransactions = useMemo(() => {
    if (reportType === 'monthly') {
      const now = new Date();
      return transactions.filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      });
    }
    const now = new Date();
    return transactions.filter(t => new Date(t.date).getFullYear() === now.getFullYear());
  }, [transactions, reportType]);

  const totalSpent = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  // Category breakdown for the active report period
  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    // Pre-populate known categories
    budgets.forEach(b => map.set(b.category, 0));

    filteredTransactions.forEach(t => {
      const current = map.get(t.category) || 0;
      map.set(t.category, current + t.amount);
    });

    const list: { category: string; amount: number; percentage: number }[] = [];
    map.forEach((amount, category) => {
      const percentage = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
      list.push({ category, amount, percentage });
    });

    return list.sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, budgets, totalSpent]);

  // Month-wise breakdown for Yearly report
  const monthWiseTotals = useMemo(() => {
    if (reportType !== 'yearly') return [];
    const now = new Date();
    const months = [0, 1].map((offset) => new Date(now.getFullYear(), now.getMonth() - offset, 1));
    return months.map(m => {
      const total = filteredTransactions
        .filter(t => { const date = new Date(t.date); return date.getMonth() === m.getMonth() && date.getFullYear() === m.getFullYear(); })
        .reduce((sum, t) => sum + t.amount, 0);
      return { month: `${MONTH_SHORT_NAMES[m.getMonth()]} ${m.getFullYear()}`, total };
    });
  }, [filteredTransactions, reportType]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportMessage(null);

      const now = new Date();
      const periodLabel = reportType === 'monthly' ? now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : `Full Year ${now.getFullYear()}`;
      const remaining = Math.max(monthlyBudgetLimit - totalSpent, 0);

      const success = await exportReportToExcel({
        reportType,
        periodLabel,
        totalSpent,
        monthlyBudgetLimit: reportType === 'monthly' ? monthlyBudgetLimit : undefined,
        remainingBudget: reportType === 'monthly' ? remaining : undefined,
        categories: categoryTotals,
        transactions: filteredTransactions,
        monthlyBreakdown: monthWiseTotals,
      });

      if (success) {
        setExportMessage('Excel report created and ready to share!');
      } else {
        setExportMessage('Failed to create report.');
      }
    } catch (err) {
      console.warn('Export error:', err);
      Alert.alert('Export Failed', 'An error occurred while generating the Excel report.');
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportMessage(null), 4000);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Profile</Text>

      {/* User Card */}
      <View style={styles.userCard}>
        {user?.avatar ? <Image source={{ uri: user.avatar }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarFallbackText}>{user?.name?.[0] || '?'}</Text></View>}
        <View>
          <Text style={styles.userName}>{user?.name || 'Account'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Pro Member</Text>
          </View>
        </View>
      </View>

      {/* Spending Reports Section */}
      <View style={styles.reportsCard}>
        <View style={styles.reportsHeader}>
          <View>
            <Text style={styles.reportsTitle}>Spending Reports</Text>
            <Text style={styles.reportsSubtitle}>
              {reportType === 'monthly' ? `${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} Overview` : `Year ${new Date().getFullYear()} Overview`}
            </Text>
          </View>

          {/* Monthly / Yearly Segmented Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleBtn, reportType === 'monthly' && styles.toggleBtnActive]}
              onPress={() => setReportType('monthly')}
            >
              <Text style={[styles.toggleText, reportType === 'monthly' && styles.toggleTextActive]}>
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, reportType === 'yearly' && styles.toggleBtnActive]}
              onPress={() => setReportType('yearly')}
            >
              <Text style={[styles.toggleText, reportType === 'yearly' && styles.toggleTextActive]}>
                Yearly
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Metric Highlights */}
        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Total Spent</Text>
            <Text style={styles.metricValue}>₹{totalSpent.toLocaleString()}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Transactions</Text>
            <Text style={styles.metricValue}>{filteredTransactions.length}</Text>
          </View>
          {reportType === 'monthly' && (
            <>
              <View style={styles.metricDivider} />
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Budget Left</Text>
                <Text style={styles.metricValue}>
                  ₹{Math.max(monthlyBudgetLimit - totalSpent, 0).toLocaleString()}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Month-wise breakdown for Yearly report */}
        {reportType === 'yearly' && monthWiseTotals.length > 0 && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>MONTH-WISE TOTALS</Text>
            <View style={styles.monthPills}>
              {monthWiseTotals.map((m, idx) => (
                <View key={idx} style={styles.monthPill}>
                  <Text style={styles.monthName}>{m.month}</Text>
                  <Text style={styles.monthAmount}>₹{m.total.toLocaleString()}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Category Breakdown */}
        <View style={styles.subSection}>
          <Text style={styles.subSectionTitle}>CATEGORY BREAKDOWN</Text>
          {categoryTotals.map((cat, idx) => (
            <View key={idx} style={styles.categoryItemRow}>
              <View style={styles.categoryNameCol}>
                <View style={styles.categoryDot} />
                <Text style={styles.categoryItemName}>{cat.category}</Text>
              </View>
              <View style={styles.categoryStatCol}>
                <Text style={styles.categoryItemAmount}>₹{cat.amount.toLocaleString()}</Text>
                <Text style={styles.categoryItemPct}>{cat.percentage}%</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Individual Transactions List Preview */}
        <View style={styles.subSection}>
          <Text style={styles.subSectionTitle}>INDIVIDUAL TRANSACTIONS</Text>
          {filteredTransactions.slice(0, 5).map(tx => (
            <View key={tx.id} style={styles.txRow}>
              <View style={styles.txLeft}>
                <Text style={styles.txMerchant}>{tx.merchant}</Text>
                <Text style={styles.txMeta}>{tx.date} · {tx.category}</Text>
              </View>
              <Text style={styles.txAmount}>₹{tx.amount.toLocaleString()}</Text>
            </View>
          ))}
          {filteredTransactions.length > 5 && (
            <Text style={styles.moreTxText}>+ {filteredTransactions.length - 5} more transactions in Excel export</Text>
          )}
        </View>

        {/* Export Status Message */}
        {exportMessage && (
          <View style={styles.exportMessageBanner}>
            <Ionicons name="checkmark-circle" size={16} color="#4EBA6F" />
            <Text style={styles.exportMessageText}>{exportMessage}</Text>
          </View>
        )}

        {/* Export to Excel Button */}
        <TouchableOpacity
          style={styles.exportBtn}
          onPress={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={18} color="#FFF" />
              <Text style={styles.exportBtnText}>
                Export to Excel (.xlsx)
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Menu List */}
      <View style={styles.menuList}>
        {[
          { title: 'My Budgets', icon: 'wallet-outline', route: '/(tabs)/budgets' },
          { title: 'Spending Insights', icon: 'bar-chart-outline', route: '/(tabs)/insights' },
          { title: 'Notifications', icon: 'notifications-outline', route: '/(tabs)/insights' },
          { title: 'Help & Support', icon: 'help-circle-outline', route: '/(tabs)/home' }
        ].map((item, idx) => (
          <TouchableOpacity key={idx} style={styles.menuItem} onPress={() => router.push(item.route as any)}>
            <View style={styles.menuLeft}>
              <Ionicons name={item.icon as any} size={18} color="#5E548E" />
              <Text style={styles.menuText}>{item.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#CCC" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Log Out Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={async () => { await logout(); router.replace('/(auth)/login'); }}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60, backgroundColor: '#FFF', paddingBottom: 100 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#231942', marginBottom: 20 },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F0EBF5', borderRadius: 20, padding: 16, marginBottom: 20, gap: 16 },
  avatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#5E548E' },
  avatarFallback: { backgroundColor: '#F3F0F7', justifyContent: 'center', alignItems: 'center' },
  avatarFallbackText: { color: '#5E548E', fontSize: 24, fontWeight: 'bold' },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#231942', marginBottom: 2 },
  userEmail: { fontSize: 12, color: '#888', marginBottom: 8 },
  badge: { backgroundColor: '#F3F0F7', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#5E548E' },

  // Spending Reports Section
  reportsCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F0EBF5', borderRadius: 20, padding: 18, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4 },
  reportsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  reportsTitle: { fontSize: 15, fontWeight: 'bold', color: '#231942' },
  reportsSubtitle: { fontSize: 11, color: '#888', marginTop: 2 },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#F3F0F7', borderRadius: 10, padding: 3 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: '#5E548E' },
  toggleText: { fontSize: 11, fontWeight: '600', color: '#666' },
  toggleTextActive: { color: '#FFF' },

  metricsRow: { flexDirection: 'row', backgroundColor: '#F9F8FC', borderRadius: 14, padding: 12, marginBottom: 16, justifyContent: 'space-around', alignItems: 'center' },
  metricBox: { alignItems: 'center' },
  metricLabel: { fontSize: 10, color: '#888', fontWeight: '500', marginBottom: 2 },
  metricValue: { fontSize: 14, fontWeight: 'bold', color: '#231942' },
  metricDivider: { width: 1, height: 24, backgroundColor: '#EBE7F2' },

  subSection: { marginBottom: 14 },
  subSectionTitle: { fontSize: 10, fontWeight: '700', color: '#9F86C0', letterSpacing: 0.5, marginBottom: 8 },
  monthPills: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  monthPill: { flex: 1, backgroundColor: '#F9F8FC', borderWidth: 1, borderColor: '#F0EBF5', borderRadius: 10, padding: 10, alignItems: 'center' },
  monthName: { fontSize: 11, color: '#666', fontWeight: '500' },
  monthAmount: { fontSize: 13, fontWeight: 'bold', color: '#231942', marginTop: 2 },

  categoryItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#FAF8FC' },
  categoryNameCol: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#5E548E' },
  categoryItemName: { fontSize: 12, color: '#231942', fontWeight: '500' },
  categoryStatCol: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryItemAmount: { fontSize: 12, fontWeight: 'bold', color: '#231942' },
  categoryItemPct: { fontSize: 11, color: '#888', minWidth: 32, textAlign: 'right' },

  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F2FA' },
  txLeft: { flex: 1 },
  txMerchant: { fontSize: 12, fontWeight: '600', color: '#231942' },
  txMeta: { fontSize: 10, color: '#999', marginTop: 1 },
  txAmount: { fontSize: 12, fontWeight: 'bold', color: '#231942' },
  moreTxText: { fontSize: 10, color: '#888', fontStyle: 'italic', textAlign: 'center', marginTop: 6 },

  exportMessageBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EDFDF2', padding: 10, borderRadius: 10, marginBottom: 12 },
  exportMessageText: { fontSize: 11, color: '#2B8A3E', fontWeight: '500' },

  exportBtn: { backgroundColor: '#5E548E', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 4 },
  exportBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },

  menuList: { gap: 10, marginBottom: 24 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F0EBF5', padding: 16, borderRadius: 16 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuText: { fontSize: 13, fontWeight: '600', color: '#231942' },
  logoutButton: { backgroundColor: '#FDF2F2', borderWidth: 1, borderColor: '#FADBD8', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  logoutText: { color: '#D9534F', fontSize: 14, fontWeight: '600' }
});
