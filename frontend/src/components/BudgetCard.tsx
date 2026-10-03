import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BudgetCardProps {
  category: string;
  limit: number;
  spent: number;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const BudgetCard: React.FC<BudgetCardProps> = ({
  category,
  limit,
  spent,
  icon = 'wallet-outline'
}) => {
  const percentage = Math.round((spent / (limit || 1)) * 100);
  const isOver = spent > limit;
  const remaining = Math.max(limit - spent, 0);

  return (
    <View style={[styles.card, isOver && styles.overCard]}>
      <View style={styles.topRow}>
        <View style={styles.leftInfo}>
          <View style={styles.iconBox}>
            <Ionicons name={icon} size={16} color="#5E548E" />
          </View>
          <View>
            <Text style={styles.categoryName}>{category}</Text>
            <Text style={styles.limitText}>Limit: ₹{limit.toLocaleString()}</Text>
          </View>
        </View>
        <Text style={[styles.pctText, isOver && styles.overText]}>{percentage}%</Text>
      </View>

      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${Math.min(percentage, 100)}%` },
            isOver && styles.overFill
          ]}
        />
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Spent: ₹{spent.toLocaleString()}</Text>
        <Text style={styles.footerText}>Remaining: ₹{remaining.toLocaleString()}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0EBF5',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  overCard: {
    backgroundColor: '#FDF6F9',
    borderColor: '#E0B1CB',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F3F0F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#231942',
  },
  limitText: {
    fontSize: 10,
    color: '#888',
  },
  pctText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#5E548E',
  },
  overText: {
    color: '#D9534F',
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#F3F0F7',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#5E548E',
    borderRadius: 4,
  },
  overFill: {
    backgroundColor: '#D9534F',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 11,
    color: '#666',
  },
});