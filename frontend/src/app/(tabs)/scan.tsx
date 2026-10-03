import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

const { width: SW, height: SH } = Dimensions.get('window');
const BOX_W = SW * 0.8;
const BOX_H = SH * 0.45;

/* ─── Animated corner bracket component ─── */
function Corner({ top, left, right, bottom }: { top?: boolean; left?: boolean; right?: boolean; bottom?: boolean }) {
  const size = 22;
  const thickness = 3;
  const color = '#BE95C4';
  const style: any = { position: 'absolute', width: size, height: size };
  if (top) style.top = -thickness;
  if (bottom) style.bottom = -thickness;
  if (left) style.left = -thickness;
  if (right) style.right = -thickness;
  return (
    <View style={style}>
      {top && left && <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: thickness, backgroundColor: color, borderRadius: 2 }} />}
      {top && left && <View style={{ position: 'absolute', top: 0, left: 0, width: thickness, height: size, backgroundColor: color, borderRadius: 2 }} />}
      {top && right && <View style={{ position: 'absolute', top: 0, right: 0, width: size, height: thickness, backgroundColor: color, borderRadius: 2 }} />}
      {top && right && <View style={{ position: 'absolute', top: 0, right: 0, width: thickness, height: size, backgroundColor: color, borderRadius: 2 }} />}
      {bottom && left && <View style={{ position: 'absolute', bottom: 0, left: 0, width: size, height: thickness, backgroundColor: color, borderRadius: 2 }} />}
      {bottom && left && <View style={{ position: 'absolute', bottom: 0, left: 0, width: thickness, height: size, backgroundColor: color, borderRadius: 2 }} />}
      {bottom && right && <View style={{ position: 'absolute', bottom: 0, right: 0, width: size, height: thickness, backgroundColor: color, borderRadius: 2 }} />}
      {bottom && right && <View style={{ position: 'absolute', bottom: 0, right: 0, width: thickness, height: size, backgroundColor: color, borderRadius: 2 }} />}
    </View>
  );
}

/* ─── Step indicator ─── */
function StepDots({ current }: { current: number }) {
  const steps = ['Camera', 'Preview', 'Review'];
  return (
    <View style={styles.stepRow}>
      {steps.map((label, i) => (
        <React.Fragment key={label}>
          <View style={styles.stepItem}>
            <View style={[styles.stepDot, i < current ? styles.stepDotDone : i === current ? styles.stepDotActive : styles.stepDotIdle]}>
              {i < current
                ? <Ionicons name="checkmark" size={10} color="#FFF" />
                : <Text style={[styles.stepNum, i === current && { color: '#FFF' }]}>{i + 1}</Text>
              }
            </View>
            <Text style={[styles.stepLabel, i === current && { color: '#E0B1CB' }]}>{label}</Text>
          </View>
          {i < 2 && <View style={[styles.stepLine, i < current && styles.stepLineDone]} />}
        </React.Fragment>
      ))}
    </View>
  );
}

/* ─── Main screen ─── */
export default function ScanScreen() {
  const { token, refreshData } = useApp();
  const router = useRouter();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const [step, setStep] = useState<'camera' | 'preview' | 'review'>('camera');
  const [pendingAsset, setPendingAsset] = useState<any>(null);
  const [torch, setTorch] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');

  /* scanner line animation */
  const [scanAnim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanAnim]);
  const scanLineY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, BOX_H - 2] });

  const processReceipt = async (asset: { uri: string; mimeType?: string; fileName?: string | null } | null) => {
    if (!asset?.uri || !token) {
      setError(asset?.uri ? 'Session expired. Please log in again.' : 'No image was captured.');
      return;
    }
    setImageUri(asset.uri);
    setIsScanning(true);
    setError('');
    try {
      const response = await api.uploadReceipt(token, asset);
      const receipt = response.receipt;
      setMerchant(receipt.storeName || 'Unknown store');
      setAmount((receipt.total / 100).toFixed(2));
      setCategory(receipt.items?.[0]?.category || 'OTHER');
      setStep('review');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Receipt processing failed.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleCapture = async () => {
    if (isScanning) return;
    try {
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.85, skipProcessing: false });
        if (photo?.uri) {
          setPendingAsset(photo);
          setStep('preview');
        }
      }
    } catch {
      setError('Unable to capture. Please try again.');
    }
  };

  const handlePickImage = async () => {
    if (isScanning) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.length > 0) {
        setPendingAsset(result.assets[0]);
        setStep('preview');
      }
    } catch {
      setError('Unable to open gallery.');
    }
  };

  const handleSave = async () => {
    await refreshData();
    router.replace('/(tabs)/home');
  };

  /* ══════════ STEP 1: CAMERA ══════════ */
  if (step === 'camera') {
    return (
      <View style={styles.cameraContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />

        {permission?.granted && (
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} enableTorch={torch} facing="back" />
        )}

        {/* Dark vignette overlay outside the scan box */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.vignetteTop} />
          <View style={styles.vignetteRow}>
            <View style={styles.vignetteSide} />
            <View style={{ width: BOX_W, height: BOX_H }} />
            <View style={styles.vignetteSide} />
          </View>
          <View style={styles.vignetteBottom} />
        </View>

        {/* Top header */}
        <View style={styles.camHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.camTitle}>Scan Receipt</Text>
          <TouchableOpacity onPress={() => setTorch(p => !p)} style={[styles.iconBtn, torch && styles.iconBtnActive]}>
            <Ionicons name={torch ? 'flash' : 'flash-outline'} size={20} color={torch ? '#FFD166' : '#FFF'} />
          </TouchableOpacity>
        </View>

        {/* Step dots */}
        <View style={styles.stepContainer}>
          <StepDots current={0} />
        </View>

        {/* Scan box with animated line */}
        <View style={styles.boxWrap}>
          {permission && !permission.granted ? (
            <View style={styles.permissionCard}>
              <Ionicons name="camera-outline" size={40} color="#BE95C4" />
              <Text style={styles.permTitle}>Camera Access Needed</Text>
              <Text style={styles.permDesc}>Grant camera access to auto-scan your receipts with AI.</Text>
              <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                <Text style={styles.permBtnText}>Enable Camera</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: BOX_W, height: BOX_H }}>
              {/* Corner brackets */}
              <Corner top left />
              <Corner top right />
              <Corner bottom left />
              <Corner bottom right />
              {/* Animated scanner line */}
              <Animated.View
                style={[styles.scanLine, { transform: [{ translateY: scanLineY }] }]}
                pointerEvents="none"
              />
              {/* Center hint */}
              <View style={styles.boxHint}>
                <Ionicons name="receipt-outline" size={28} color="rgba(224,177,203,0.5)" />
                <Text style={styles.boxHintText}>Position receipt within frame</Text>
              </View>
            </View>
          )}
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={14} color="#FF6B6B" />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {/* Bottom controls */}
        <View style={styles.shutterBar}>
          <TouchableOpacity onPress={handlePickImage} style={styles.sideAction} activeOpacity={0.7}>
            <View style={styles.sideActionInner}>
              <Ionicons name="images-outline" size={22} color="#FFF" />
            </View>
            <Text style={styles.sideActionText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleCapture} style={styles.shutterOuter} disabled={isScanning} activeOpacity={0.85}>
            <View style={styles.shutterMiddle}>
              <View style={styles.shutterInner} />
            </View>
          </TouchableOpacity>

          <View style={styles.sideAction}>
            <View style={[styles.sideActionInner, { opacity: 0 }]} />
            <Text style={[styles.sideActionText, { opacity: 0 }]}>-</Text>
          </View>
        </View>
      </View>
    );
  }

  /* ══════════ STEP 2: PREVIEW ══════════ */
  if (step === 'preview') {
    return (
      <View style={styles.cameraContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />

        {pendingAsset?.uri && (
          <Image source={{ uri: pendingAsset.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
        )}

        {/* Gradient overlay top */}
        <View style={styles.previewTopGrad}>
          <TouchableOpacity onPress={() => setStep('camera')} style={styles.iconBtn}>
            <Ionicons name="close" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.camTitle}>Confirm Photo</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Step dots */}
        <View style={[styles.stepContainer, { top: 80 }]}>
          <StepDots current={1} />
        </View>

        {/* Bottom action area */}
        <View style={styles.previewBottom}>
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={14} color="#FF6B6B" />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : (
            <Text style={styles.previewHint}>
              Make sure the receipt text is clear and well-lit
            </Text>
          )}

          <View style={styles.previewActions}>
            <TouchableOpacity
              onPress={() => { setStep('camera'); setError(''); }}
              style={styles.retakeBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="camera-reverse-outline" size={20} color="#E0B1CB" />
              <Text style={styles.retakeBtnText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => processReceipt(pendingAsset)}
              style={[styles.sendBtn, isScanning && styles.sendBtnLoading]}
              disabled={isScanning}
              activeOpacity={0.85}
            >
              {isScanning ? (
                <>
                  <ActivityIndicator color="#FFF" size="small" />
                  <Text style={styles.sendBtnText}>Analyzing…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles-outline" size={18} color="#FFF" />
                  <Text style={styles.sendBtnText}>Scan with AI</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  /* ══════════ STEP 3: REVIEW ══════════ */
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.reviewBg} contentContainerStyle={styles.reviewContainer} showsVerticalScrollIndicator={false}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F3FA" />

        {/* Header */}
        <View style={styles.reviewHeader}>
          <TouchableOpacity onPress={() => setStep('camera')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={18} color="#5E548E" />
          </TouchableOpacity>
          <View>
            <Text style={styles.reviewTitle}>Review & Save</Text>
            <Text style={styles.reviewSub}>AI extracted these details — edit if needed</Text>
          </View>
        </View>

        {/* Step dots */}
        <StepDots current={2} />

        {/* Receipt image */}
        {imageUri && (
          <View style={styles.thumbCard}>
            <Image source={{ uri: imageUri }} style={styles.thumbImg} resizeMode="cover" />
            <View style={styles.thumbBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
              <Text style={styles.thumbBadgeText}>Receipt scanned successfully</Text>
            </View>
          </View>
        )}

        {/* AI confidence badge */}
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={13} color="#9D72FF" />
          <Text style={styles.aiBadgeText}>AI-extracted — verify before saving</Text>
        </View>

        {/* Form fields */}
        <View style={styles.formCard}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>🏪  Merchant Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={merchant}
              onChangeText={setMerchant}
              placeholder="e.g. Starbucks, Walmart…"
              placeholderTextColor="#BDB5CC"
              returnKeyType="next"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>🏷️  Category</Text>
            <TextInput
              style={styles.fieldInput}
              value={category}
              onChangeText={setCategory}
              placeholder="e.g. FOOD, TRANSPORT, SHOPPING"
              placeholderTextColor="#BDB5CC"
              autoCapitalize="characters"
              returnKeyType="next"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>💰  Total Amount (₹)</Text>
            <TextInput
              style={[styles.fieldInput, styles.amountInput]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#BDB5CC"
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Ionicons name="checkmark-circle" size={20} color="#FFF" />
          <Text style={styles.saveBtnText}>Save Expense</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.discardBtn} onPress={() => setStep('camera')}>
          <Text style={styles.discardBtnText}>Scan Another Receipt</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  /* ── Camera ── */
  cameraContainer: {
    flex: 1, backgroundColor: '#0A0A0F',
  },
  vignetteTop: {
    height: (SH - BOX_H) / 2,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  vignetteRow: { flexDirection: 'row' },
  vignetteSide: {
    flex: 1, height: BOX_H,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  vignetteBottom: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.62)',
  },
  camHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 54,
    paddingBottom: 12,
  },
  camTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  iconBtnActive: {
    backgroundColor: 'rgba(255,209,102,0.3)', borderWidth: 1, borderColor: '#FFD166',
  },
  stepContainer: {
    position: 'absolute', top: 110, left: 0, right: 0, zIndex: 20,
    alignItems: 'center',
  },
  boxWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  scanLine: {
    position: 'absolute', left: 0, right: 0, height: 2,
    backgroundColor: '#BE95C4',
    shadowColor: '#BE95C4', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6,
    elevation: 5,
  },
  boxHint: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  boxHintText: { color: 'rgba(224,177,203,0.6)', fontSize: 12, marginTop: 6 },
  permissionCard: {
    width: BOX_W, padding: 28,
    backgroundColor: 'rgba(35,25,66,0.88)',
    borderRadius: 24, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(190,149,196,0.4)',
    gap: 8,
  },
  permTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  permDesc: { color: '#BE95C4', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  permBtn: { backgroundColor: '#5E548E', paddingHorizontal: 24, paddingVertical: 11, borderRadius: 14, marginTop: 8 },
  permBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,107,107,0.18)',
    marginHorizontal: 24, marginBottom: 8,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,107,107,0.35)',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  errorBannerText: { color: '#FF6B6B', fontSize: 12, flex: 1 },
  shutterBar: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    paddingBottom: 36, paddingTop: 16, zIndex: 20,
  },
  sideAction: { alignItems: 'center', gap: 5, minWidth: 64 },
  sideActionInner: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  sideActionText: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '500' },
  shutterOuter: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  shutterMiddle: {
    width: 68, height: 68, borderRadius: 34,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF' },

  /* ── Step dots ── */
  stepRow: {
    flexDirection: 'row', alignItems: 'center', gap: 0,
    paddingHorizontal: 24,
  },
  stepItem: { alignItems: 'center', gap: 4 },
  stepDot: {
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },
  stepDotIdle: { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  stepDotActive: { backgroundColor: '#7B2D8B' },
  stepDotDone: { backgroundColor: '#22C55E' },
  stepNum: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600' },
  stepLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: '500' },
  stepLine: {
    flex: 1, height: 1.5, backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 4, marginBottom: 14,
  },
  stepLineDone: { backgroundColor: '#22C55E' },

  /* ── Preview ── */
  previewTopGrad: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 54,
    paddingBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  previewBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 20, paddingTop: 16,
    paddingBottom: 40,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    gap: 14,
  },
  previewHint: {
    color: 'rgba(255,255,255,0.55)', fontSize: 13, textAlign: 'center',
  },
  previewActions: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
  },
  retakeBtn: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 7, paddingVertical: 14, borderRadius: 16,
    borderWidth: 1.5, borderColor: 'rgba(224,177,203,0.5)',
  },
  retakeBtnText: { color: '#E0B1CB', fontSize: 15, fontWeight: '600' },
  sendBtn: {
    flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 16,
    backgroundColor: '#7B2D8B',
    shadowColor: '#9D4EDD', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 12,
    elevation: 6,
  },
  sendBtnLoading: { backgroundColor: '#5E548E' },
  sendBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  /* ── Review ── */
  reviewBg: { flex: 1, backgroundColor: '#F5F3FA' },
  reviewContainer: { padding: 20, paddingTop: 56, paddingBottom: 48, gap: 16 },
  reviewHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 4,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#EDE9F5',
    justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  reviewTitle: { fontSize: 20, fontWeight: '800', color: '#231942', letterSpacing: -0.3 },
  reviewSub: { fontSize: 12, color: '#8B7AAA', marginTop: 2 },
  thumbCard: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E5DFF5',
    backgroundColor: '#FFF',
    shadowColor: '#5E548E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12,
    elevation: 3,
  },
  thumbImg: { width: '100%', height: 180, backgroundColor: '#EDE9F5' },
  thumbBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#FFF',
  },
  thumbBadgeText: { fontSize: 12, color: '#22C55E', fontWeight: '600' },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: '#F0EBFF',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#DDD6FE',
  },
  aiBadgeText: { fontSize: 11, color: '#7C3AED', fontWeight: '600' },
  formCard: {
    backgroundColor: '#FFF', borderRadius: 20,
    borderWidth: 1, borderColor: '#EDE9F5',
    paddingHorizontal: 18, paddingVertical: 8,
    shadowColor: '#5E548E', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10,
    elevation: 2,
  },
  fieldGroup: { paddingVertical: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#8B7AAA', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: {
    fontSize: 16, color: '#231942', fontWeight: '500',
    paddingVertical: 2,
  },
  amountInput: { fontSize: 22, fontWeight: '700', color: '#5E548E' },
  divider: { height: 1, backgroundColor: '#F0EBF5', marginHorizontal: -18 },
  saveBtn: {
    backgroundColor: '#5E548E',
    paddingVertical: 17, borderRadius: 18,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9,
    shadowColor: '#5E548E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14,
    elevation: 6,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  discardBtn: { alignItems: 'center', paddingVertical: 12 },
  discardBtnText: { color: '#8B7AAA', fontSize: 13, fontWeight: '500' },
});
