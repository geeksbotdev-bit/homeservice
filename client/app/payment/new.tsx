import { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text, Button, NavBar } from '../../src/components';
import { colors, radius } from '../../src/theme/theme';
import { user as userApi } from '../../src/services/api';

const TYPES = [
  { id: 'bank', label: 'Bank', name: 'Bank Transfer', icon: 'home', desc: 'Transfer from your bank account' },
  { id: 'easypaisa', label: 'Easypaisa', name: 'Easypaisa', icon: 'smartphone', desc: 'Mobile wallet' },
  { id: 'jazzcash', label: 'JazzCash', name: 'JazzCash', icon: 'smartphone', desc: 'Mobile wallet' },
  { id: 'card', label: 'Card', name: 'Debit / Credit Card', icon: 'credit-card', desc: 'Visa / Mastercard' },
];

const last4 = (s: string) => s.replace(/\s+/g, '').slice(-4);

export default function NewPayment() {
  const router = useRouter();
  const [type, setType] = useState('bank');
  const [bankName, setBankName] = useState('');
  const [title, setTitle] = useState('');
  const [number, setNumber] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  const chosen = TYPES.find((t) => t.id === type)!;
  const isBank = type === 'bank';
  const isWallet = type === 'easypaisa' || type === 'jazzcash';
  const digits = number.replace(/\s+/g, '');
  const valid = digits.length >= 4 && (!isBank || (bankName.trim().length > 1 && title.trim().length > 2));

  function buildDetail(): string {
    const l4 = last4(number);
    if (isBank) return `${bankName.trim()} •••• ${l4}`;
    if (isWallet) return `${digits.slice(0, 4)} •••• ${l4}`;
    return `Card •••• ${l4}`;
  }
  // For a bank we store the account holder in the display name so it's clear
  // whose account funds are drawn from at payment confirmation.
  const savedName = isBank && title.trim() ? `Bank · ${title.trim()}` : chosen.name;

  async function save() {
    if (!valid) return;
    setSaving(true);
    await userApi.addPayment({ type, name: savedName, detail: buildDetail(), isDefault });
    setSaving(false);
    (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'));
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <NavBar title="Add Payment Method" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }} keyboardShouldPersistTaps="handled">
        <View>
          <Text variant="bodySm" weight="semibold" color={colors.textSecondary} style={{ marginBottom: 8 }}>Method</Text>
          <View style={{ gap: 10 }}>
            {TYPES.map((t) => {
              const on = type === t.id;
              return (
                <Pressable key={t.id} onPress={() => setType(t.id)} style={[styles.option, on && styles.optionOn]}>
                  <View style={[styles.icon, on && { backgroundColor: colors.primary }]}><Feather name={t.icon as any} size={16} color={on ? colors.white : colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text weight="semibold" style={{ fontSize: 14 }}>{t.name}</Text>
                    <Text variant="bodySm" color={colors.textTertiary}>{t.desc}</Text>
                  </View>
                  <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Bank needs holder + bank name */}
        {isBank && (
          <>
            <View>
              <Text variant="bodySm" weight="semibold" color={colors.textSecondary} style={{ marginBottom: 8 }}>Account holder name</Text>
              <TextInput style={styles.input} placeholder="e.g. Fatima Ahmed" placeholderTextColor={colors.textDisabled} value={title} onChangeText={setTitle} />
            </View>
            <View>
              <Text variant="bodySm" weight="semibold" color={colors.textSecondary} style={{ marginBottom: 8 }}>Bank name</Text>
              <TextInput style={styles.input} placeholder="e.g. Meezan Bank" placeholderTextColor={colors.textDisabled} value={bankName} onChangeText={setBankName} />
            </View>
          </>
        )}

        <View>
          <Text variant="bodySm" weight="semibold" color={colors.textSecondary} style={{ marginBottom: 8 }}>
            {isBank ? 'Account number / IBAN' : isWallet ? 'Mobile number' : 'Card number'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={isBank ? 'PK00 XXXX 0000 0000 0000' : isWallet ? '03XX XXXXXXX' : '0000 0000 0000 0000'}
            placeholderTextColor={colors.textDisabled}
            value={number}
            onChangeText={setNumber}
            keyboardType={isBank ? 'default' : 'number-pad'}
          />
          {digits.length >= 4 && (
            <Text variant="bodySm" color={colors.textDisabled} style={{ marginTop: 6 }}>Will be saved as: {buildDetail()}</Text>
          )}
        </View>

        <Pressable style={styles.checkRow} onPress={() => setIsDefault((v) => !v)}>
          <View style={[styles.checkbox, isDefault && styles.checkboxOn]}>
            {isDefault && <Feather name="check" size={13} color={colors.white} />}
          </View>
          <Text color={colors.textSecondary}>Set as default payment method</Text>
        </Pressable>

        <View style={styles.note}>
          <Feather name="lock" size={14} color={colors.success} />
          <Text variant="bodySm" color={colors.textTertiary} style={{ flex: 1 }}>Only the last 4 digits are stored for display. Full details stay secure.</Text>
        </View>

        <Button label="Save Payment Method" icon="credit-card" onPress={save} disabled={!valid} loading={saving} loadingLabel="Saving..." style={{ marginTop: 4 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: 14 },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  icon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, height: 52, paddingHorizontal: 16, fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium', color: colors.textPrimary },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
