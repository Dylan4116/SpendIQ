import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ExpenseCardProps {
  merchant: string;
  date: string;
  category: string;
  amount: number;
  onPress?: () => void;
}

export const ExpenseCard: React.FC<ExpenseCardProps> = ({
  merchant,
  date,
  category,
  amount,
  onPress
}) => {
  const getCategoryIcon = (cat: string): keyof typeof Ionicons.glyphMap => {
    switch (cat.toLowerCase()) {
      case 'food': return 'restaurant-outline';
      case 'shopping': return 'bag-outline';
      case 'transport': return 'car-outline';
      case 'entertainment': return 'film-outline';
      case 'household': return 'home-outline';
      default: return 'receipt-outline';
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.leftContent}>
        <View style={styles.iconBox}>
          <Ionicons name={getCategoryIcon(category)} size={18} color="#5E548E" />
        </View>
        <View>
          <Text style={styles.merchant}>{merchant}</Text>
          <Text style={styles.meta}>{date} · {category}</Text>
        </View>
      </View>
      <Text style={styles.amount}>₹{amount.toLocaleString()}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAFAFC',
    borderWidth: 1,
    borderColor: '#F0EBF5',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3F0F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  merchant: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#231942',
    marginBottom: 2,
  },
  meta: {
    fontSize: 11,
    color: '#888',
  },
  amount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#231942',
  },
});