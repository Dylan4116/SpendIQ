import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useApp } from '../../context/AppContext';

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useApp();

  const handleSignup = async () => {
    if (!name) { setError('Please enter your full name.'); return; }
    if (!email || !email.includes('@')) { setError('Please enter a valid email address.'); return; }
    if (!password || password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setError('');
    try {
      setIsSubmitting(true);
      await register(name.trim(), email.trim(), password);
      router.replace('/(tabs)/home');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="#5E548E" />
          </TouchableOpacity>
          <Text style={styles.logoText}>Create Account</Text>
        </View>

        <Text style={styles.heading}>Join SpendSnap</Text>
        <Text style={styles.subheading}>Start turning your receipts into smarter spending</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color="#9F86C0" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Your full name" placeholderTextColor="#A0A0A0" value={name} onChangeText={setName} />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#9F86C0" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor="#A0A0A0" value={email} onChangeText={setEmail} autoCapitalize="none" />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#9F86C0" style={styles.inputIcon} />
            <TextInput style={[styles.input, { paddingRight: 44 }]} placeholder="••••••••" placeholderTextColor="#A0A0A0" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#9F86C0" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#9F86C0" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor="#A0A0A0" secureTextEntry={!showPassword} value={confirmPassword} onChangeText={setConfirmPassword} />
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleSignup} disabled={isSubmitting}>
          <Text style={styles.primaryButtonText}>{isSubmitting ? 'Creating account…' : 'Create Account'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.switchAuth}>
        <Text style={styles.switchText}>Already have an account? <Text style={styles.switchHighlight}>Log In</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#FFFFFF', padding: 24, justifyContent: 'space-between', paddingTop: 60 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F3F0F7', justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: 18, fontWeight: 'bold', color: '#231942' },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#231942', marginBottom: 4 },
  subheading: { fontSize: 14, color: '#666', marginBottom: 20 },
  errorText: { color: '#D9534F', fontSize: 12, marginBottom: 16, backgroundColor: '#FDF2F2', padding: 10, borderRadius: 8 },
  inputContainer: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: '#5E548E', marginBottom: 6 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F8FC', borderRadius: 12, borderWidth: 1, borderColor: '#EBE7F2' },
  inputIcon: { marginLeft: 14 },
  input: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, fontSize: 14, color: '#231942' },
  eyeIcon: { position: 'absolute', right: 14 },
  primaryButton: { backgroundColor: '#5E548E', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 12 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  switchAuth: { alignItems: 'center', marginVertical: 20 },
  switchText: { fontSize: 13, color: '#666' },
  switchHighlight: { color: '#5E548E', fontWeight: '600' }
});
