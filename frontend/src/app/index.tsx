import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

export default function SplashScreen() {
  const router = useRouter();
  const { user, isLoading } = useApp();

  React.useEffect(() => {
    if (!isLoading && user) router.replace('/(tabs)/home');
  }, [isLoading, user, router]);

  if (isLoading || user) return null;

  return (
    <View style={styles.container}>
      <View style={styles.centerBox}>
        <View style={styles.iconContainer}>
          <Ionicons name="receipt-outline" size={48} color="#E0B1CB" />
        </View>
        <Text style={styles.title}>SpendSnap</Text>
        <Text style={styles.tagline}>&quot;Turn receipts into smarter spending.&quot;</Text>
      </View>

      <View style={styles.bottomBox}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.footerText}>
            Already have an account? <Text style={styles.linkText}>Log In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#231942', justifyContent: 'space-between', padding: 24, paddingTop: 80, paddingBottom: 48 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconContainer: { width: 96, height: 96, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  tagline: { fontSize: 16, color: '#E0B1CB', fontStyle: 'italic', textAlign: 'center' },
  bottomBox: { width: '100%', gap: 16 },
  primaryButton: { backgroundColor: '#FFFFFF', paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  primaryButtonText: { color: '#231942', fontSize: 16, fontWeight: '600' },
  footerText: { textAlign: 'center', color: '#BE95C4', fontSize: 14 },
  linkText: { color: '#FFFFFF', fontWeight: '600', textDecorationLine: 'underline' }
});
