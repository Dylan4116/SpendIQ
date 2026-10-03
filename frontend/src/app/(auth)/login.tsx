import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useApp } from '../../context/AppContext';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useApp();

  const handleLogin = async () => {
    if (!email) { setError('Please enter your email address.'); return; }
    if (!password) { setError('Please enter your password.'); return; }
    setError('');
    try {
      setIsSubmitting(true);
      await login(email.trim(), password);
      router.replace('/(tabs)/home');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to log in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View>
        <View style={styles.headerRow}>
          <View style={styles.logoBox}>
            <Ionicons name="receipt" size={20} color="#E0B1CB" />
          </View>
          <Text style={styles.logoText}>SpendSnap</Text>
        </View>

        <Text style={styles.heading}>Welcome back!</Text>
        <Text style={styles.subheading}>Sign in to continue tracking your expenses</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email address</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#9F86C0" style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="you@example.com" 
              placeholderTextColor="#A0A0A0" 
              value={email} 
              onChangeText={setEmail} 
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#9F86C0" style={styles.inputIcon} />
            <TextInput 
              style={[styles.input, { paddingRight: 44 }]} 
              placeholder="••••••••" 
              placeholderTextColor="#A0A0A0" 
              secureTextEntry={!showPassword} 
              value={password} 
              onChangeText={setPassword} 
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#9F86C0" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={isSubmitting}>
          <Text style={styles.loginButtonText}>{isSubmitting ? 'Logging in…' : 'Log In'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.push('/(auth)/signup')} style={styles.switchAuth}>
        <Text style={styles.switchText}>Do not have an account? <Text style={styles.switchHighlight}>Sign Up</Text></Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 24, justifyContent: 'space-between', paddingTop: 60 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  logoBox: { width: 40, height: 40, backgroundColor: '#231942', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  logoText: { fontSize: 20, fontWeight: 'bold', color: '#231942' },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#231942', marginBottom: 4 },
  subheading: { fontSize: 14, color: '#666', marginBottom: 24 },
  errorText: { color: '#D9534F', fontSize: 12, marginBottom: 16, backgroundColor: '#FDF2F2', padding: 10, borderRadius: 8 },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#5E548E', marginBottom: 6 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F8FC', borderRadius: 12, borderWidth: 1, borderColor: '#EBE7F2' },
  inputIcon: { marginLeft: 14 },
  input: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, fontSize: 14, color: '#231942' },
  eyeIcon: { position: 'absolute', right: 14 },
  loginButton: { backgroundColor: '#5E548E', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 12 },
  loginButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  switchAuth: { alignItems: 'center', marginBottom: 20 },
  switchText: { fontSize: 13, color: '#666' },
  switchHighlight: { color: '#5E548E', fontWeight: '600' }
});
