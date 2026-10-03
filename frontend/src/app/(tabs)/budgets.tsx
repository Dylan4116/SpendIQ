import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';

export default function BudgetsScreen() {
  const { budgets, addBudget } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newLimit, setNewLimit] = useState('');

  const getCategoryIcon = (cat: string): keyof typeof Ionicons.glyphMap => {
    switch (cat.toLowerCase()) {
      case 'food': return 'restaurant-outline';
      case 'shopping': return 'bag-outline';
      case 'transport': return 'car-outline';
      case 'entertainment': return 'film-outline';
      case 'household': return 'home-outline';
      default: return 'wallet-outline';
    }
  };

  const handleSaveBudget = () => {
    if (!newCategory || !newLimit) return;
    addBudget({
      category: newCategory,
      limit: parseFloat(newLimit) || 0,
      spent: 0,
      icon: 'wallet-outline',
      color: '#5E548E'
    });
    setNewCategory('');
    setNewLimit('');
    setModalVisible(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Monthly Budget</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {budgets.map((b, idx) => {
        const pct = Math.round((b.spent / (b.limit || 1)) * 100);
        const isExceeded = pct >= 100;
        const isWarning = pct >= 80 && pct < 100;

        const statusColor = isExceeded ? '#D9534F' : isWarning ? '#E09F3E' : '#5E548E';
        const remainingAmount = Math.max(b.limit - b.spent, 0);

        return (
          <View
            key={idx}
            style={[
              styles.budgetCard,
              isExceeded && styles.overBudgetCard,
              isWarning && styles.warningBudgetCard,
            ]}
          >
            <View style={styles.cardTop}>
              <View style={styles.catInfo}>
                <View style={[styles.iconBox, { backgroundColor: isExceeded ? '#FBEBEB' : isWarning ? '#FEF7ED' : '#F3F0F7' }]}>
                  <Ionicons name={getCategoryIcon(b.category)} size={16} color={statusColor} />
                </View>
                <View>
                  <View style={styles.nameRow}>
                    <Text style={styles.catName}>{b.category}</Text>
                    {isExceeded && (
                      <View style={styles.statusPillExceeded}>
                        <Text style={styles.statusPillTextExceeded}>Exceeded</Text>
                      </View>
                    )}
                    {isWarning && (
                      <View style={styles.statusPillWarning}>
                        <Text style={styles.statusPillTextWarning}>Warning</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.limitText}>Limit: ₹{b.limit.toLocaleString()}</Text>
                </View>
              </View>
              <Text style={[styles.pctText, { color: statusColor }]}>{pct}%</Text>
            </View>

            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(pct, 100)}%`, backgroundColor: statusColor }
                ]}
              />
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.footerText}>Spent: ₹{b.spent.toLocaleString()}</Text>
              <Text style={styles.footerText}>
                {isExceeded ? `Over by ₹${(b.spent - b.limit).toLocaleString()}` : `Remaining: ₹${remainingAmount.toLocaleString()}`}
              </Text>
            </View>
          </View>
        );
      })}

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Budget</Text>
            <Text style={styles.inputLabel}>Category Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Utilities"
              placeholderTextColor="#AAA"
              value={newCategory}
              onChangeText={setNewCategory}
            />
            <Text style={styles.inputLabel}>Monthly Limit (₹)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="5000"
              placeholderTextColor="#AAA"
              value={newLimit}
              onChangeText={setNewLimit}
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBudget}>
                <Text style={styles.saveText}>Save Budget</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60, backgroundColor: '#FFF', paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#231942' },
  addButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#5E548E', justifyContent: 'center', alignItems: 'center' },
  budgetCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F0EBF5', borderRadius: 20, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4 },
  overBudgetCard: { backgroundColor: '#FDF6F9', borderColor: '#E0B1CB' },
  warningBudgetCard: { backgroundColor: '#FFFDF7', borderColor: '#F3D8A2' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  catInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F3F0F7', justifyContent: 'center', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catName: { fontSize: 13, fontWeight: 'bold', color: '#231942' },
  statusPillExceeded: { backgroundColor: '#FDE8E8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusPillTextExceeded: { fontSize: 9, fontWeight: '700', color: '#D9534F' },
  statusPillWarning: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusPillTextWarning: { fontSize: 9, fontWeight: '700', color: '#D97706' },
  limitText: { fontSize: 10, color: '#888' },
  pctText: { fontSize: 12, fontWeight: 'bold', color: '#5E548E' },
  progressBarBg: { width: '100%', height: 8, backgroundColor: '#F3F0F7', borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  progressBarFill: { height: '100%', backgroundColor: '#5E548E', borderRadius: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 11, color: '#666' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, width: '100%', maxWidth: 340 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#231942', marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#5E548E', marginBottom: 6 },
  textInput: { backgroundColor: '#F9F8FC', borderWidth: 1, borderColor: '#EBE7F2', borderRadius: 12, padding: 12, fontSize: 13, color: '#231942', marginBottom: 14 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn: { flex: 1, backgroundColor: '#F3F0F7', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelText: { color: '#666', fontSize: 13, fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#5E548E', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#FFF', fontSize: 13, fontWeight: '600' }
});