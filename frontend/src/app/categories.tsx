import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';

interface CategoryItem {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgLight: string;
}

const CATEGORIES_DATA: CategoryItem[] = [
  { id: '1', name: 'Food', icon: 'restaurant-outline', color: '#5E548E', bgLight: '#F3F0F7' },
  { id: '2', name: 'Shopping', icon: 'bag-handle-outline', color: '#9F86C0', bgLight: '#F7F3FB' },
  { id: '3', name: 'Transport', icon: 'car-outline', color: '#BE95C4', bgLight: '#FAF5FB' },
  { id: '4', name: 'Entertainment', icon: 'film-outline', color: '#E0B1CB', bgLight: '#FDF6F9' },
  { id: '5', name: 'Household', icon: 'home-outline', color: '#231942', bgLight: '#F1EFF8' },
  { id: '6', name: 'Health', icon: 'fitness-outline', color: '#5E548E', bgLight: '#F3F0F7' },
  { id: '7', name: 'Education', icon: 'school-outline', color: '#9F86C0', bgLight: '#F7F3FB' },
  { id: '8', name: 'Bills', icon: 'receipt-outline', color: '#BE95C4', bgLight: '#FAF5FB' },
  { id: '9', name: 'Travel', icon: 'airplane-outline', color: '#E0B1CB', bgLight: '#FDF6F9' },
  { id: '10', name: 'Other', icon: 'shapes-outline', color: '#231942', bgLight: '#F1EFF8' }
];

export default function CategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { budgets } = useApp();

  const [searchQuery, setSearchQuery] = useState('');

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return CATEGORIES_DATA;
    return CATEGORIES_DATA.filter(c =>
      c.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );
  }, [searchQuery]);

  const handleSelectCategory = (categoryName: string) => {
    router.push({
      pathname: '/category-details',
      params: { category: categoryName }
    });
  };

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 20) }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#231942" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Category</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#9F86C0" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search categories..."
          placeholderTextColor="#AAA"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={16} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Cards Grid */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {filteredCategories.map(cat => {
            const budgetItem = budgets.find(
              b => b.category.toLowerCase() === cat.name.toLowerCase()
            );

            return (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryCard}
                onPress={() => handleSelectCategory(cat.name)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBox, { backgroundColor: cat.bgLight }]}>
                  <Ionicons name={cat.icon} size={26} color={cat.color} />
                </View>
                <Text style={styles.categoryName}>{cat.name}</Text>
                {budgetItem ? (
                  <Text style={styles.categoryMeta}>
                    ₹{budgetItem.spent.toLocaleString()} spent
                  </Text>
                ) : (
                  <Text style={styles.categoryMetaEmpty}>Explore</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {filteredCategories.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={40} color="#C4B7D7" />
            <Text style={styles.emptyTitle}>No categories match &quot;{searchQuery}&quot;</Text>
            <Text style={styles.emptySubtitle}>Try searching for Food, Shopping, or Bills.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F3F0F7', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#231942' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F8FC', borderWidth: 1, borderColor: '#F0EBF5', borderRadius: 16, marginHorizontal: 20, marginBottom: 16, paddingHorizontal: 14, height: 46 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#231942' },
  clearBtn: { padding: 4 },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 60 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  categoryCard: { width: '48%', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F0EBF5', borderRadius: 20, padding: 18, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4 },
  iconBox: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  categoryName: { fontSize: 14, fontWeight: 'bold', color: '#231942', marginBottom: 4 },
  categoryMeta: { fontSize: 11, color: '#5E548E', fontWeight: '600' },
  categoryMetaEmpty: { fontSize: 11, color: '#AAA' },

  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 14, fontWeight: 'bold', color: '#231942' },
  emptySubtitle: { fontSize: 12, color: '#888' }
});
