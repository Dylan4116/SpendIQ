import React, { useMemo, useState } from 'react';
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
import { useApp } from '../context/AppContext';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTH_SHORT_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SpendingCalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { transactions } = useApp();

  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());

  const year = currentDate.getFullYear();
  const monthIndex = currentDate.getMonth();
  const monthName = MONTH_NAMES[monthIndex];
  const monthShort = MONTH_SHORT_NAMES[monthIndex];

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, monthIndex - 1, 1));
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, monthIndex + 1, 1));
    setSelectedDay(1);
  };

  // Calendar calculations
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay();

  // Map transactions to days of this month
  const transactionsByDay = useMemo(() => {
    const map = new Map<number, typeof transactions>();
    const curYear = currentDate.getFullYear();
    const curMonthShort = MONTH_SHORT_NAMES[currentDate.getMonth()].toLowerCase();

    transactions.forEach(tx => {
      // Transaction dates are formatted from the server receipt date.
      const lowerDate = tx.date.toLowerCase();
      const monthMatches = lowerDate.includes(curMonthShort) && lowerDate.includes(`${curYear}`);
      if (monthMatches) {
        const parts = tx.date.trim().split(' ');
        const dayNum = parseInt(parts[0], 10);
        if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
          const currentList = map.get(dayNum) || [];
          map.set(dayNum, [...currentList, tx]);
        }
      }
    });

    return map;
  }, [transactions, currentDate]);

  // Selected day transactions
  const selectedDayTransactions = useMemo(() => {
    return transactionsByDay.get(selectedDay) || [];
  }, [transactionsByDay, selectedDay]);

  const selectedDayTotal = useMemo(() => {
    return selectedDayTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [selectedDayTransactions]);

  // Selected date formatted label
  const selectedDateLabel = `${selectedDay.toString().padStart(2, '0')} ${monthShort} ${year}`;

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 20) }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#231942" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Spending Calendar</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Month Navigator */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.navArrowBtn}>
            <Ionicons name="chevron-back" size={18} color="#231942" />
          </TouchableOpacity>
          <View style={styles.monthLabelContainer}>
            <Ionicons name="calendar-outline" size={16} color="#5E548E" />
            <Text style={styles.monthLabelText}>{monthName} {year}</Text>
          </View>
          <TouchableOpacity onPress={handleNextMonth} style={styles.navArrowBtn}>
            <Ionicons name="chevron-forward" size={18} color="#231942" />
          </TouchableOpacity>
        </View>

        {/* Calendar Grid Card */}
        <View style={styles.calendarCard}>
          {/* Day of Week Row */}
          <View style={styles.weekDaysRow}>
            {DAY_LABELS.map((day, idx) => (
              <Text key={idx} style={styles.weekDayText}>{day}</Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.grid}>
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <View key={`empty-${idx}`} style={styles.dayCellEmpty} />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const hasTxs = transactionsByDay.has(day);
              const isSelected = selectedDay === day;

              return (
                <TouchableOpacity
                  key={`day-${day}`}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    hasTxs && !isSelected && styles.dayCellWithTx
                  ]}
                  onPress={() => setSelectedDay(day)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      hasTxs && !isSelected && styles.dayTextWithTx
                    ]}
                  >
                    {day}
                  </Text>
                  {hasTxs && (
                    <View
                      style={[
                        styles.txIndicatorDot,
                        isSelected && styles.txIndicatorDotSelected
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Date Details Section */}
        <View style={styles.detailsCard}>
          <View style={styles.detailsHeader}>
            <View>
              <Text style={styles.detailsDate}>{selectedDateLabel}</Text>
              <Text style={styles.detailsCount}>
                {selectedDayTransactions.length} {selectedDayTransactions.length === 1 ? 'transaction' : 'transactions'}
              </Text>
            </View>
            <View style={styles.dailyTotalBox}>
              <Text style={styles.dailyTotalLabel}>Daily Total</Text>
              <Text style={styles.dailyTotalAmount}>₹{selectedDayTotal.toLocaleString()}</Text>
            </View>
          </View>

          {/* Transactions List */}
          {selectedDayTransactions.length === 0 ? (
            <View style={styles.emptyStateBox}>
              <Ionicons name="receipt-outline" size={36} color="#C4B7D7" />
              <Text style={styles.emptyStateTitle}>No expenses on this date</Text>
              <Text style={styles.emptyStateSub}>Tap a marked date to inspect your spending.</Text>
            </View>
          ) : (
            <View style={styles.txList}>
              {selectedDayTransactions.map(tx => (
                <View key={tx.id} style={styles.txItem}>
                  <View style={styles.txItemLeft}>
                    <View style={styles.txIconBox}>
                      <Ionicons name="pricetag-outline" size={16} color="#5E548E" />
                    </View>
                    <View>
                      <Text style={styles.txMerchant}>{tx.merchant}</Text>
                      <Text style={styles.txMeta}>
                        {tx.category}{tx.subcategory ? ` · ${tx.subcategory}` : ''}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.txAmount}>₹{tx.amount.toLocaleString()}</Text>
                </View>
              ))}
            </View>
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

  // Month Navigator
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9F8FC', borderRadius: 16, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: '#F0EBF5' },
  navArrowBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  monthLabelContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  monthLabelText: { fontSize: 15, fontWeight: 'bold', color: '#231942' },

  // Calendar Card
  calendarCard: { backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#F0EBF5', padding: 14, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4 },
  weekDaysRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F5F2FA', paddingBottom: 8 },
  weekDayText: { width: 40, textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#9F86C0' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCellEmpty: { width: '14.28%', height: 44 },
  dayCell: { width: '14.28%', height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 12, marginVertical: 2 },
  dayCellWithTx: { backgroundColor: '#F9F8FC' },
  dayCellSelected: { backgroundColor: '#231942' },
  dayText: { fontSize: 13, color: '#666', fontWeight: '500' },
  dayTextWithTx: { color: '#231942', fontWeight: '700' },
  dayTextSelected: { color: '#FFF', fontWeight: 'bold' },
  txIndicatorDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#5E548E', marginTop: 2 },
  txIndicatorDotSelected: { backgroundColor: '#E0B1CB' },

  // Details Card
  detailsCard: { backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#F0EBF5', padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4 },
  detailsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#F5F2FA', paddingBottom: 14, marginBottom: 14 },
  detailsDate: { fontSize: 16, fontWeight: 'bold', color: '#231942' },
  detailsCount: { fontSize: 12, color: '#888', marginTop: 2 },
  dailyTotalBox: { alignItems: 'flex-end' },
  dailyTotalLabel: { fontSize: 10, color: '#888', fontWeight: '600', textTransform: 'uppercase' },
  dailyTotalAmount: { fontSize: 18, fontWeight: 'bold', color: '#5E548E', marginTop: 2 },

  emptyStateBox: { alignItems: 'center', paddingVertical: 30, gap: 6 },
  emptyStateTitle: { fontSize: 14, fontWeight: '600', color: '#5E548E', marginTop: 6 },
  emptyStateSub: { fontSize: 11, color: '#999', textAlign: 'center' },

  txList: { gap: 10 },
  txItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAFAFC', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#F0EBF5' },
  txItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  txIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F3F0F7', justifyContent: 'center', alignItems: 'center' },
  txMerchant: { fontSize: 13, fontWeight: 'bold', color: '#231942' },
  txMeta: { fontSize: 11, color: '#888', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: 'bold', color: '#231942' }
});
