import { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text, Button, NavBar, PhoneField } from '../../src/components';
import { colors, radius } from '../../src/theme/theme';
import { user as userApi } from '../../src/services/api';
import { ph, alertT } from '../../src/i18n';

/**
 * Where a cleaner's earnings are sent.
 *
 * Customers do not save anything here: Bank Alfalah has not enabled
 * tokenisation on this merchant account, so a card cannot be stored and every
 * payment goes through the bank's own page at checkout. This screen is the
 * payout side only — a bank account, Easypaisa or JazzCash number.
 */
const TYPES = [
  { id: 'bank', name: 'Bank account', icon: 'home', desc: 'IBAN or account number' },
  { id: 'easypaisa', name: 'Easypaisa', icon: 'smartphone', desc: 'Mobile wallet' },
  { id: 'jazzcash', name: 'JazzCash', icon: 'smartphone', desc: 'Mobile wallet' },
];

/** PK IBANs are 24 characters: PK + 2 check digits + 4 bank code + 16 digits. */
const IBAN_RE = /^PK\d{2}[A-Z]{4}\d{16}$/i;
const clean = (s: string) => s.replace(/[\s-]/g, '');

export default function NewPayout() {
  const router = useRouter();
  const [type, setType] = useState('bank');
  const [holder, setHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [number, setNumber] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  const isBank = type === 'bank';
  const digits = clean(number);

  // An IBAN is accepted in either form; a plain account number must still look
  // like one, so a typo is caught here rather than when a transfer fails.
  const looksIban = /^PK/i.test(digits);
  const numberError = !digits
    ? 'Required'
    : isBank
      ? (looksIban
          ? (IBAN_RE.test(digits) ? null : 'That IBAN does not look right — it should be PK + 22 characters.')
          : (digits.length >= 8 && /^\d+$/.test(digits) ? null : 'Enter the full account number, digits only.'))
      : (/^3\d{9}$/.test(digits) ? null : 'Enter the 10-digit mobile number, starting 3.');

  const holderError = holder.trim().length >= 3 ? null : 'Enter the name exactly as the account holds it';
  const bankError = !isBank || bankName.trim().length >= 2 ? null : 'Required';
  const valid = !numberError && !holderError && !bankError;

  function detail(): string {
    const last4 = digits.slice(-4);
    if (isBank) return `${bankName.trim()} •••• ${last4}`;
    return `${digits.slice(0, 4)} •••• ${last4}`;
  }

  async function save() {
    setTouched(true);
    if (!valid || saving) return;
    setSaving(true);
    try {
      await userApi.addPayment({
        type,
        // The holder's name travels with the account, so a failed transfer can
        // be traced without opening the record.
        name: isBank ? `${bankName.trim()} · ${holder.trim()}` : `${TYPES.find((t) => t.id === type)!.name} · ${holder.trim()}`,
        detail: detail(),
        isDefault,
      });
      router.canGoBack() ? router.back() : router.replace('/(pro)/payout');
    } catch (e: any) {
      alertT('Could not save', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <NavBar title="Add payout account" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }} keyboardShouldPersistTaps="handled">

        <View style={styles.note}>
          <Feather name="shield" size={15} color={colors.primary} />
          <Text variant="bodySm" color={colors.textSecondary} style={{ flex: 1 }}>
            Your earnings are transferred here after each completed job. Only the last 4 digits are shown back to you.
          </Text>
        </View>

        <View>
          <Text variant="bodySm" weight="semibold" color={colors.textSecondary} style={{ marginBottom: 8 }}>Account type</Text>
          <View style={{ gap: 10 }}>
            {TYPES.map((t) => {
              const on = type === t.id;
              return (
                <Pressable key={t.id} onPress={() => { setType(t.id); setNumber(''); }} style={[styles.option, on && styles.optionOn]}>
                  <View style={[styles.icon, on && { backgroundColor: colors.primary }]}>
                    <Feather name={t.icon as any} size={16} color={on ? colors.white : colors.primary} />
                  </View>
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

        <Field label="Account holder name" error={touched ? holderError : null}>
          <TextInput
            style={[styles.input, touched && holderError && styles.inputBad]}
            placeholder={ph('As printed on your CNIC')}
            placeholderTextColor={colors.textDisabled}
            value={holder}
            onChangeText={setHolder}
            autoCapitalize="words"
          />
        </Field>

        {isBank && (
          <Field label="Bank name" error={touched ? bankError : null}>
            <TextInput
              style={[styles.input, touched && bankError && styles.inputBad]}
              placeholder={ph('e.g. Meezan Bank')}
              placeholderTextColor={colors.textDisabled}
              value={bankName}
              onChangeText={setBankName}
            />
          </Field>
        )}

        <Field
          label={isBank ? 'IBAN or account number' : 'Mobile number'}
          error={touched ? numberError : null}
          hint={isBank ? 'IBAN looks like PK36SCBL0000001123456702' : undefined}
        >
          {isBank ? (
            <TextInput
              style={[styles.input, touched && numberError && styles.inputBad]}
              placeholder={ph('PK00 0000 0000 0000 0000 0000')}
              placeholderTextColor={colors.textDisabled}
              value={number}
              onChangeText={setNumber}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          ) : (
            <PhoneField value={number} onChangeText={setNumber} placeholder={ph('3XX XXXXXXX')} />
          )}
        </Field>

        {digits.length >= 4 && !numberError && (
          <View style={styles.preview}>
            <Feather name="check-circle" size={14} color={colors.success} />
            <Text variant="bodySm" color={colors.textSecondary} style={{ flex: 1 }}>Will be saved as {detail()}</Text>
          </View>
        )}

        <Pressable style={styles.checkRow} onPress={() => setIsDefault((v) => !v)}>
          <View style={[styles.checkbox, isDefault && styles.checkboxOn]}>
            {isDefault && <Feather name="check" size={13} color={colors.white} />}
          </View>
          <Text color={colors.textSecondary}>Use this as my default payout account</Text>
        </Pressable>

        <Button label="Save payout account" icon="check" onPress={save} disabled={touched && !valid} loading={saving} loadingLabel="Saving..." />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string | null; hint?: string; children: React.ReactNode }) {
  return (
    <View>
      <Text variant="bodySm" weight="semibold" color={colors.textSecondary} style={{ marginBottom: 8 }}>{label}</Text>
      {children}
      {error ? (
        <Text variant="bodySm" color={colors.error} style={{ marginTop: 6 }}>{error}</Text>
      ) : hint ? (
        <Text variant="bodySm" color={colors.textDisabled} style={{ marginTop: 6 }}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.primary50, borderRadius: radius.lg, padding: 14 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: 14 },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  icon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, height: 52, paddingHorizontal: 16, fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium', color: colors.textPrimary },
  inputBad: { borderColor: colors.error },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.successBg, borderRadius: radius.md, padding: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});
