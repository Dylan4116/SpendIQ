import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';

const MONTH_SHORT_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function InsightsScreen() {
  const { transactions } = useApp();

  // 0 = current week, -1 = previous week, etc.
  const [weekOffset, setWeekOffset] = useState<number>(0);

  const weekStart = useMemo(() => {
    const now = new Date();
    const baseMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    baseMonday.setDate(baseMonday.getDate() - ((baseMonday.getDay() + 6) % 7));
    baseMonday.setDate(baseMonday.getDate() + weekOffset * 7);
    return baseMonday;
  }, [weekOffset]);

  // Compute daily totals for Mon-Sun
  const weekDaysData = useMemo(() => {
    return DAY_NAMES.map((label, idx) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + idx);

      const dayNum = d.getDate();
      const dayStr = dayNum.toString().padStart(2, '0');
      const monthShort = MONTH_SHORT_NAMES[d.getMonth()].toLowerCase();
      const yearStr = `${d.getFullYear()}`;

      // Match transactions from this date
      const dayTxs = transactions.filter(t => {
        const l = t.date.toLowerCase();
        return (
          l.includes(`${dayStr} ${monthShort} ${yearStr}`) ||
          l.includes(`${dayNum} ${monthShort} ${yearStr}`)
        );
      });

      const total = dayTxs.reduce((sum, t) => sum + t.amount, 0);

      return {
        label,
        date: d,
        amount: total,
        count: dayTxs.length
      };
    });
  }, [weekStart, transactions]);

  // Week metrics
  const weekTotal = useMemo(() => {
    return weekDaysData.reduce((sum, d) => sum + d.amount, 0);
  }, [weekDaysData]);

  const weekTxCount = useMemo(() => {
    return weekDaysData.reduce((sum, d) => sum + d.count, 0);
  }, [weekDaysData]);

  const dailyAverage = Math.round(weekTotal / 7);

  const highestDay = useMemo(() => {
    let max = weekDaysData[0];
    weekDaysData.forEach(d => {
      if (d.amount > max.amount) max = d;
    });
    return max;
  }, [weekDaysData]);

  const maxDayAmount = useMemo(() => {
    return Math.max(...weekDaysData.map(d => d.amount), 1);
  }, [weekDaysData]);

  // Previous week comparison (for comparison badge)
  const prevWeekTotal = useMemo(() => {
    const prevMonday = new Date(weekStart);
    prevMonday.setDate(prevMonday.getDate() - 7);

    let total = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(prevMonday);
      d.setDate(d.getDate() + i);
      const dayNum = d.getDate();
      const dayStr = dayNum.toString().padStart(2, '0');
      const monthShort = MONTH_SHORT_NAMES[d.getMonth()].toLowerCase();
      const yearStr = `${d.getFullYear()}`;

      transactions.forEach(t => {
        const l = t.date.toLowerCase();
        if (
          l.includes(`${dayStr} ${monthShort} ${yearStr}`) ||
          l.includes(`${dayNum} ${monthShort} ${yearStr}`)
        ) {
          total += t.amount;
        }
      });
    }
    return total;
  }, [weekStart, transactions]);

  const weekComparisonText = useMemo(() => {
    if (prevWeekTotal === 0) return null;
    const diffPct = Math.round(Math.abs((weekTotal - prevWeekTotal) / prevWeekTotal) * 100);
    if (weekTotal >= prevWeekTotal) {
      return `${diffPct}% more than last week`;
    }
    return `${diffPct}% less than last week`;
  }, [weekTotal, prevWeekTotal]);

  // Week range label
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekRangeLabel = `${weekStart.getDate()} ${MONTH_SHORT_NAMES[weekStart.getMonth()]} – ${weekEnd.getDate()} ${MONTH_SHORT_NAMES[weekEnd.getMonth()]}`;

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Spending Insights</Text>

      {/* 1. WEEKLY SPENDING TREND (Line/Trend Chart) */}
      <View style={styles.trendSectionCard}>
        {/* Navigation & Header */}
        <View style={styles.trendHeader}>
          <View>
            <Text style={styles.trendSectionTitle}>Weekly Spending Trend</Text>
            <Text style={styles.trendRangeText}>{weekRangeLabel}</Text>
          </View>
          <View style={styles.weekNav}>
            <TouchableOpacity
              onPress={() => setWeekOffset(prev => prev - 1)}
              style={styles.weekNavBtn}
            >
              <Ionicons name="chevron-back" size={16} color="#231942" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setWeekOffset(prev => prev + 1)}
              style={styles.weekNavBtn}
            >
              <Ionicons name="chevron-forward" size={16} color="#231942" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Comparison Pill if available */}
        {weekComparisonText && (
          <View style={styles.comparisonBadge}>
            <Ionicons
              name={weekTotal >= prevWeekTotal ? "arrow-up" : "arrow-down"}
              size={12}
              color={weekTotal >= prevWeekTotal ? "#D9534F" : "#2B8A3E"}
            />
            <Text
              style={[
                styles.comparisonText,
                { color: weekTotal >= prevWeekTotal ? "#D9534F" : "#2B8A3E" }
              ]}
            >
              {weekComparisonText}
            </Text>
          </View>
        )}

        {/* LINE / TREND CHART */}
        <View style={styles.lineChartWrapper}>
          <View style={styles.lineChartCanvas}>
            {weekDaysData.map((d, idx) => {
              const nodeHeight = Math.max((d.amount / maxDayAmount) * 110, 8);
              const formattedAmt = d.amount >= 1000 ? `${(d.amount / 1000).toFixed(1)}k` : `${d.amount}`;

              return (
                <View key={idx} style={styles.chartCol}>
                  {/* Amount Value */}
                  <Text style={styles.colAmtText}>
                    {d.amount > 0 ? `₹${formattedAmt}` : '₹0'}
                  </Text>

                  {/* Vertical Guide & Trend Node */}
                  <View style={styles.trackArea}>
                    <View style={[styles.guideStem, { height: nodeHeight }]} />
                    <View
                      style={[
                        styles.trendNode,
                        d.amount > 0 && styles.trendNodeActive,
                        d === highestDay && d.amount > 0 && styles.trendNodeHighest
                      ]}
                    />
                  </View>

                  {/* Day Label */}
                  <Text
                    style={[
                      styles.colDayLabel,
                      d === highestDay && d.amount > 0 && styles.colDayLabelHighlight
                    ]}
                  >
                    {d.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>This Week</Text>
            <Text style={styles.metricValue}>₹{weekTotal.toLocaleString()}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Daily Average</Text>
            <Text style={styles.metricValue}>₹{dailyAverage.toLocaleString()}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Highest Day</Text>
            <Text style={styles.metricValue}>
              {highestDay.amount > 0 ? `${highestDay.label} · ₹${highestDay.amount.toLocaleString()}` : '—'}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Transactions</Text>
            <Text style={styles.metricValue}>{weekTxCount}</Text>
          </View>
        </View>
      </View>

      {/* 2. ALERTS */}
      <View style={styles.card}>
        <View style={styles.cardIconBox}>
          <Ionicons name="trending-up" size={20} color="#FFF" />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Food spending increased</Text>
          <Text style={styles.cardText}>
            Food spending increased by <Text style={styles.bold}>24%</Text> compared to last month.
          </Text>
        </View>
      </View>

      {/* 3. BUDGET WARNINGS */}
      <View style={[styles.card, { backgroundColor: '#FDF6F9', borderColor: '#E0B1CB' }]}>
        <View style={[styles.cardIconBox, { backgroundColor: '#231942' }]}>
          <Ionicons name="alert-circle-outline" size={20} color="#E0B1CB" />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Budget Threshold</Text>
          <Text style={styles.cardText}>
            You&apos;ve spent ₹4,850 on food, which is <Text style={styles.bold}>81%</Text> of your ₹6,000 budget.
          </Text>
        </View>
      </View>

      {/* 4. OTHER INSIGHTS (Monthly Overview) */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Monthly Overview Trend</Text>
        <View style={styles.chartBars}>
          <View style={styles.barWrapper}><View style={[styles.bar, { height: 60, backgroundColor: '#BE95C4' }]} /><Text style={styles.barLabel}>W1</Text></View>
          <View style={styles.barWrapper}><View style={[styles.bar, { height: 90, backgroundColor: '#9F86C0' }]} /><Text style={styles.barLabel}>W2</Text></View>
          <View style={styles.barWrapper}><View style={[styles.bar, { height: 75, backgroundColor: '#5E548E' }]} /><Text style={styles.barLabel}>W3</Text></View>
          <View style={styles.barWrapper}><View style={[styles.bar, { height: 120, backgroundColor: '#231942' }]} /><Text style={[styles.barLabel, { fontWeight: 'bold' }]}>W4</Text></View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60, backgroundColor: '#FFF', paddingBottom: 100 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#231942', marginBottom: 20 },

  // Weekly Trend Section
  trendSectionCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F0EBF5', borderRadius: 20, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4 },
  trendHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  trendSectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#231942' },
  trendRangeText: { fontSize: 11, color: '#888', marginTop: 2 },
  weekNav: { flexDirection: 'row', gap: 6 },
  weekNavBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F3F0F7', justifyContent: 'center', alignItems: 'center' },

  comparisonBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#F9F8FC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 14 },
  comparisonText: { fontSize: 11, fontWeight: '600' },

  lineChartWrapper: { backgroundColor: '#F9F8FC', borderRadius: 16, borderWidth: 1, borderColor: '#F0EBF5', padding: 12, paddingBottom: 14, marginBottom: 16 },
  lineChartCanvas: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 160 },
  chartCol: { alignItems: 'center', flex: 1 },
  colAmtText: { fontSize: 9, color: '#666', fontWeight: '600', marginBottom: 6 },
  trackArea: { height: 110, width: 20, justifyContent: 'flex-end', alignItems: 'center' },
  guideStem: { width: 2, backgroundColor: '#E0B1CB', borderRadius: 1 },
  trendNode: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D4C9E2', borderWidth: 1.5, borderColor: '#FFF', marginTop: -4 },
  trendNodeActive: { backgroundColor: '#5E548E' },
  trendNodeHighest: { backgroundColor: '#231942', width: 10, height: 10, borderRadius: 5 },
  colDayLabel: { fontSize: 10, color: '#888', fontWeight: '500', marginTop: 8 },
  colDayLabelHighlight: { color: '#231942', fontWeight: 'bold' },

  metricsGrid: { flexDirection: 'row', backgroundColor: '#F9F8FC', borderRadius: 14, padding: 12, justifyContent: 'space-between', alignItems: 'center' },
  metricItem: { alignItems: 'center', flex: 1 },
  metricLabel: { fontSize: 9, color: '#888', fontWeight: '500', marginBottom: 2 },
  metricValue: { fontSize: 12, fontWeight: 'bold', color: '#231942', textAlign: 'center' },
  metricDivider: { width: 1, height: 20, backgroundColor: '#EBE7F2' },

  // Alerts & Warnings
  card: { flexDirection: 'row', backgroundColor: '#F9F8FC', borderWidth: 1, borderColor: '#F0EBF5', padding: 16, borderRadius: 20, marginBottom: 14, gap: 14, alignItems: 'flex-start' },
  cardIconBox: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#5E548E', justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 13, fontWeight: 'bold', color: '#231942', marginBottom: 2 },
  cardText: { fontSize: 12, color: '#666', lineHeight: 18 },
  bold: { fontWeight: 'bold', color: '#231942' },

  chartContainer: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F0EBF5', borderRadius: 20, padding: 20, marginTop: 4 },
  chartTitle: { fontSize: 13, fontWeight: 'bold', color: '#231942', marginBottom: 16 },
  chartBars: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 140, paddingTop: 10 },
  barWrapper: { alignItems: 'center', gap: 8 },
  bar: { width: 32, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  barLabel: { fontSize: 10, color: '#888' }
});
