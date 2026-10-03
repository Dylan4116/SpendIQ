import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';

export default function CategoryDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const { transactions, budgets } = useApp();

  const selectedCategory = category || 'Food';

  // Filter transactions belonging to this category
  const categoryTransactions = useMemo(() => {
    return transactions.filter(
      t => t.category.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [transactions, selectedCategory]);

  const categorySpent = useMemo(() => {
    return categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [categoryTransactions]);

  // Budget info
  const budgetItem = useMemo(() => {
    return budgets.find(
      b => b.category.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [budgets, selectedCategory]);

  const limit = budgetItem?.limit || 0;
  const remaining = Math.max(limit - categorySpent, 0);
  const percentage = Math.round((categorySpent / (limit || 1)) * 100);

  const isExceeded = percentage >= 100;
  const isWarning = percentage >= 80 && percentage < 100;
  const statusColor = isExceeded ? '#D9534F' : isWarning ? '#E09F3E' : '#5E548E';

  // Subcategory breakdown
  const subcategoryTotals = useMemo(() => {
    const map = new Map<string, number>();

    categoryTransactions.forEach(t => {
      const sub = t.subcategory || 'Other';
      const current = map.get(sub) || 0;
      map.set(sub, current + t.amount);
    });

    const list: { name: string; amount: number; percentage: number }[] = [];
    map.forEach((amount, name) => {
      const pct = categorySpent > 0 ? Math.round((amount / categorySpent) * 100) : 0;
      list.push({ name, amount, percentage: pct });
    });

    return list.sort((a, b) => b.amount - a.amount);
  }, [categoryTransactions, categorySpent]);

  const maxSubcategorySpent = useMemo(() => {
    return Math.max(...subcategoryTotals.map(s => s.amount), 1);
  }, [subcategoryTotals]);

  const barPalette = ['#5E548E', '#9F86C0', '#BE95C4', '#E0B1CB', '#231942'];

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 20) }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#231942" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{selectedCategory}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Category Hero Summary */}
        <View style={styles.heroCard}>
          <Text style={styles.heroCategoryTag}>CATEGORY OVERVIEW</Text>
          <Text style={styles.heroSpent}>₹{categorySpent.toLocaleString()}</Text>
          <Text style={styles.heroSub}>spent this month in {selectedCategory}</Text>
        </View>

        {/* A. BAR GRAPH: Spending by Subcategory */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>SPENDING BY SUBCATEGORY</Text>
          {subcategoryTotals.length === 0 ? (
            <Text style={styles.emptyNote}>No subcategory spending recorded yet.</Text>
          ) : (
            <View style={styles.barChartContainer}>
              {subcategoryTotals.map((sub, idx) => {
                const barHeight = Math.max((sub.amount / maxSubcategorySpent) * 110, 8);
                const color = barPalette[idx % barPalette.length];
                const formattedAmt = sub.amount >= 1000 ? `${(sub.amount / 1000).toFixed(1)}k` : `${sub.amount}`;

                return (
                  <View key={idx} style={styles.barCol}>
                    <Text style={styles.barAmountText}>₹{formattedAmt}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: barHeight, backgroundColor: color }]} />
                    </View>
                    <Text style={styles.barLabel} numberOfLines={1}>{sub.name}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* B. BUDGET SUMMARY */}
        <View style={[styles.sectionCard, isExceeded && styles.overBudgetBorder]}>
          <View style={styles.budgetHeader}>
            <Text style={styles.sectionTitle}>BUDGET SUMMARY</Text>
            <Text style={[styles.budgetUsedPct, { color: statusColor }]}>{percentage}% used</Text>
          </View>

          <View style={styles.budgetGrid}>
            <View style={styles.budgetBox}>
              <Text style={styles.budgetBoxLabel}>Budget</Text>
              <Text style={styles.budgetBoxVal}>₹{limit.toLocaleString()}</Text>
            </View>
            <View style={styles.budgetBox}>
              <Text style={styles.budgetBoxLabel}>Spent</Text>
              <Text style={styles.budgetBoxVal}>₹{categorySpent.toLocaleString()}</Text>
            </View>
            <View style={styles.budgetBox}>
              <Text style={styles.budgetBoxLabel}>Remaining</Text>
              <Text style={[styles.budgetBoxVal, isExceeded && { color: '#D9534F' }]}>
                {isExceeded ? `Over ₹${(categorySpent - limit).toLocaleString()}` : `₹${remaining.toLocaleString()}`}
              </Text>
            </View>
          </View>

          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(percentage, 100)}%`, backgroundColor: statusColor }
              ]}
            />
          </View>
        </View>

        {/* C. SUBCATEGORY BREAKDOWN */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>SUBCATEGORY BREAKDOWN</Text>
          {subcategoryTotals.length === 0 ? (
            <Text style={styles.emptyNote}>No subcategories found.</Text>
          ) : (
            subcategoryTotals.map((sub, idx) => (
              <View key={idx} style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.bullet, { backgroundColor: barPalette[idx % barPalette.length] }]} />
                  <Text style={styles.breakdownName}>{sub.name}</Text>
                </View>
                <View style={styles.breakdownRight}>
                  <Text style={styles.breakdownAmount}>₹{sub.amount.toLocaleString()}</Text>
                  <Text style={styles.breakdownPct}>{sub.percentage}%</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* D. RECENT TRANSACTIONS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>RECENT TRANSACTIONS</Text>
          {categoryTransactions.length === 0 ? (
            <Text style={styles.emptyNote}>No transactions recorded for this category.</Text>
          ) : (
            categoryTransactions.map(tx => (
              <View key={tx.id} style={styles.txRow}>
                <View style={styles.txLeft}>
                  <View style={styles.txIconBox}>
                    <Ionicons name="receipt-outline" size={16} color="#5E548E" />
                  </View>
                  <View>
                    <Text style={styles.txMerchant}>{tx.merchant}</Text>
                    <Text style={styles.txMeta}>
                      {tx.date}{tx.subcategory ? ` · ${tx.subcategory}` : ''}
                    </Text>
                  </View>
                </View>
                <Text style={styles.txAmount}>₹{tx.amount.toLocaleString()}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F3F0F7', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#231942' },
  contentContainer: { paddingHorizontal: 20, paddingBottom: 60 },

  heroCard: { backgroundColor: '#231942', borderRadius: 24, padding: 22, marginBottom: 16, alignItems: 'center' },
  heroCategoryTag: { fontSize: 10, fontWeight: '700', color: '#E0B1CB', letterSpacing: 0.8, marginBottom: 6 },
  heroSpent: { fontSize: 32, fontWeight: 'bold', color: '#FFF' },
  heroSub: { fontSize: 12, color: '#BE95C4', marginTop: 4 },

  sectionCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F0EBF5', borderRadius: 20, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4 },
  overBudgetBorder: { borderColor: '#E0B1CB', backgroundColor: '#FDF6F9' },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#9F86C0', letterSpacing: 0.5, marginBottom: 12 },
  emptyNote: { fontSize: 12, color: '#999', fontStyle: 'italic', paddingVertical: 8 },

  // Bar Graph
  barChartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 160, paddingTop: 12 },
  barCol: { alignItems: 'center', flex: 1 },
  barAmountText: { fontSize: 10, color: '#666', fontWeight: '600', marginBottom: 6 },
  barTrack: { height: 110, width: 28, justifyContent: 'flex-end', alignItems: 'center' },
  barFill: { width: 20, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  barLabel: { fontSize: 10, color: '#231942', fontWeight: '600', marginTop: 8 },

  // Budget Summary
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  budgetUsedPct: { fontSize: 12, fontWeight: 'bold' },
  budgetGrid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F9F8FC', borderRadius: 14, padding: 12, marginBottom: 12 },
  budgetBox: { alignItems: 'center', flex: 1 },
  budgetBoxLabel: { fontSize: 10, color: '#888', fontWeight: '500', marginBottom: 2 },
  budgetBoxVal: { fontSize: 13, fontWeight: 'bold', color: '#231942' },
  progressBarBg: { width: '100%', height: 8, backgroundColor: '#F3F0F7', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },

  // Breakdown Rows
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F2FA' },
  breakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bullet: { width: 8, height: 8, borderRadius: 4 },
  breakdownName: { fontSize: 13, fontWeight: '500', color: '#231942' },
  breakdownRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  breakdownAmount: { fontSize: 13, fontWeight: 'bold', color: '#231942' },
  breakdownPct: { fontSize: 11, color: '#888', minWidth: 32, textAlign: 'right' },

  // Transactions
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F2FA' },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  txIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F3F0F7', justifyContent: 'center', alignItems: 'center' },
  txMerchant: { fontSize: 13, fontWeight: 'bold', color: '#231942' },
  txMeta: { fontSize: 11, color: '#888', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: 'bold', color: '#231942' }
});
