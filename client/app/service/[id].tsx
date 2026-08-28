import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Share } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, Button, Stars } from '../../src/components';
import { colors, radius, shadow } from '../../src/theme/theme';
import { services as servicesApi, type Review } from '../../src/services/api';
import { formatPKR } from '../../src/utils';
import { useBooking } from '../../src/store/booking';
import type { Service } from '../../src/data/types';

export default function ServiceDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { draft, startBooking, setQuantity, toggleAddOn, total } = useBooking();
  const [service, setService] = useState<Service | null>(draft.service ?? null);
  const [fav, setFav] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (!id) return;
    servicesApi.get(id).then((s) => {
      setService(s);
      if (draft.service?.id !== s.id) startBooking(s, draft.mode);
    });
    servicesApi.reviews(id).then(setReviews).catch(() => {});
  }, [id]);

  if (!service) return null;

  function next() {
    if (draft.mode === 'later') router.push('/booking/schedule');
    else router.push('/booking/confirm');
  }

  return (
    <View style={styles.root}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* ── Hero illustration ── */}
        <LinearGradient colors={service.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <SafeAreaView edges={['top']}>
            <View style={styles.heroBar}>
              <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} style={styles.heroBtn}>
                <Feather name="chevron-left" size={20} color={colors.white} />
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={() => setFav((f) => !f)} style={styles.heroBtn}>
                  <FontAwesome name={fav ? 'heart' : 'heart-o'} size={15} color={colors.white} />
                </Pressable>
                <Pressable style={styles.heroBtn} onPress={() => Share.share({ message: `Check out ${service.name} on HomeService — from ${formatPKR(service.basePrice)}. Book in 60 seconds!` }).catch(() => {})}>
                  <Feather name="share-2" size={16} color={colors.white} />
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
          <View style={styles.heroIllustration}>
            <MaterialCommunityIcons name={service.icon as any} size={88} color="rgba(255,255,255,0.95)" />
          </View>
          <View style={styles.heroChip}>
            <Text weight="bold" color={colors.white} style={{ fontSize: 11, letterSpacing: 0.5 }}>{service.name.toUpperCase()}</Text>
          </View>
        </LinearGradient>

        {/* ── White content sheet ── */}
        <View style={styles.sheet}>
          {/* Title + meta */}
          <Text variant="h1" style={{ fontSize: 24 }}>{service.name}</Text>
          <View style={styles.metaRow}>
            {service.reviews ? (
              <>
                <Stars value={Math.round(service.rating)} size={13} />
                <Text weight="bold" color={colors.textSecondary} style={{ fontSize: 13 }}>{service.rating}</Text>
                <Text variant="bodySm" color={colors.textDisabled}>({service.reviews} reviews)</Text>
              </>
            ) : (
              <Text weight="bold" color={colors.primary} style={{ fontSize: 13 }}>New service</Text>
            )}
            <View style={styles.metaDot} />
            <View style={styles.durationPill}>
              <Feather name="clock" size={12} color={colors.textTertiary} />
              <Text variant="bodySm" weight="semibold" color={colors.textSecondary}>{service.duration}</Text>
            </View>
            <View style={styles.metaDot} />
            <Text variant="bodySm" weight="semibold" color={colors.success}>Available today</Text>
          </View>

          {/* Price card */}
          <LinearGradient colors={[colors.primary50, '#F0FAFA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.priceCard}>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color={colors.textTertiary} style={{ fontSize: 11, letterSpacing: 0.5 }}>BASE PRICE</Text>
              <Text weight="extrabold" color={colors.primary} style={{ fontSize: 30, letterSpacing: -1, marginTop: 2 }}>{formatPKR(service.basePrice)}</Text>
              <Text variant="bodySm" color={colors.textTertiary} style={{ marginTop: 4 }}>{service.unitLabel} · supplies included</Text>
            </View>
            <View style={styles.quickBadge}>
              <Text weight="bold" color={colors.primary} style={{ fontSize: 10, letterSpacing: 0.5 }}>{service.category}</Text>
              <Text color={colors.primary700} style={{ fontSize: 11, marginTop: 1 }}>Book in 60 sec</Text>
            </View>
          </LinearGradient>

          {/* Description */}
          <Text variant="bodyLg" color={colors.textSecondary} style={{ fontSize: 14, lineHeight: 24, marginTop: 18 }}>{service.description}</Text>

          {/* What's included */}
          <Text variant="h3" style={{ fontSize: 15, marginTop: 22, marginBottom: 14 }}>What's included</Text>
          <View style={{ gap: 11 }}>
            {service.included.map((item, i) => {
              const isLast = i === service.included.length - 1;
              return (
                <View key={item} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[styles.check, isLast && styles.checkLight]}>
                    <Feather name="check" size={12} color={isLast ? colors.primary : colors.white} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14 }} color={colors.textSecondary}>{item}</Text>
                  {isLast && <View style={styles.freeBadge}><Text weight="bold" color={colors.accent600} style={{ fontSize: 10 }}>FREE</Text></View>}
                </View>
              );
            })}
          </View>

          {/* Quantity */}
          <View style={styles.divider} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text variant="h3" style={{ fontSize: 15 }}>Number of {service.unitNoun}s</Text>
              <Text variant="bodySm" color={colors.textTertiary} style={{ marginTop: 3 }}>{formatPKR(service.basePrice)} per {service.unitNoun}</Text>
            </View>
            <View style={styles.stepper}>
              <Pressable onPress={() => setQuantity(draft.quantity - 1)} style={[styles.stepBtn, draft.quantity <= 1 && styles.stepBtnOff]}>
                <Feather name="minus" size={16} color={draft.quantity <= 1 ? colors.textDisabled : colors.white} />
              </Pressable>
              <Text weight="extrabold" style={{ fontSize: 22, minWidth: 26, textAlign: 'center' }}>{draft.quantity}</Text>
              <Pressable onPress={() => setQuantity(draft.quantity + 1)} style={styles.stepBtn}>
                <Feather name="plus" size={16} color={colors.white} />
              </Pressable>
            </View>
          </View>

          {/* Add-ons */}
          <View style={styles.divider} />
          <Text variant="h3" style={{ fontSize: 15 }}>Add-ons <Text variant="bodySm" color={colors.textDisabled}>(optional)</Text></Text>
          <Text variant="bodySm" color={colors.textTertiary} style={{ marginTop: 4, marginBottom: 14 }}>Enhance your clean — tap to select</Text>
          <View style={{ gap: 10 }}>
            {service.addOns.map((a) => {
              const on = draft.addOnIds.includes(a.id);
              return (
                <Pressable key={a.id} onPress={() => toggleAddOn(a.id)} style={[styles.addon, on && styles.addonOn]}>
                  <View style={[styles.checkbox, on && styles.checkboxOn]}>
                    {on && <Feather name="check" size={13} color={colors.white} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text weight="semibold" style={{ fontSize: 14 }}>{a.name}</Text>
                    <Text variant="bodySm" color={colors.textTertiary}>{a.desc}</Text>
                  </View>
                  <Text weight="bold" color={colors.success}>+{formatPKR(a.price)}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Reviews */}
          {reviews.length > 0 && (
            <>
              <View style={styles.divider} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text variant="h3" style={{ fontSize: 15 }}>Reviews</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <FontAwesome name="star" size={12} color={colors.accent} />
                  <Text weight="bold">{service.rating}</Text>
                  <Text variant="bodySm" color={colors.textDisabled}>({service.reviews})</Text>
                </View>
              </View>
              <View style={{ gap: 10 }}>
                {reviews.slice(0, 5).map((r) => (
                  <View key={r.id} style={styles.review}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <View style={styles.reviewAvatar}>
                        <Text weight="bold" color={colors.primary700} style={{ fontSize: 12 }}>{r.author.split(' ').map((x) => x[0]).slice(0, 2).join('')}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text weight="semibold" style={{ fontSize: 13 }}>{r.author}</Text>
                        <Text variant="bodySm" color={colors.textDisabled} style={{ fontSize: 11 }}>{r.time}{r.cleaner ? ` · ${r.cleaner}` : ''}</Text>
                      </View>
                      <Stars value={r.rating} size={12} />
                    </View>
                    {!!r.review && <Text variant="bodySm" color={colors.textSecondary} style={{ lineHeight: 19 }}>{r.review}</Text>}
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color={colors.textDisabled} style={{ fontSize: 11 }}>TOTAL</Text>
          <Text weight="extrabold" style={{ fontSize: 24, letterSpacing: -0.5 }}>{formatPKR(total)}</Text>
        </View>
        <Button label="Continue" iconRight="arrow-right" onPress={next} fullWidth={false} style={{ paddingHorizontal: 30, height: 52 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  review: { backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: 12 },
  reviewAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary200, alignItems: 'center', justifyContent: 'center' },
  hero: { paddingHorizontal: 20, paddingBottom: 56, minHeight: 210 },
  heroBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  heroBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.22)', alignItems: 'center', justifyContent: 'center' },
  heroIllustration: { alignItems: 'center', marginTop: 6 },
  heroChip: { position: 'absolute', bottom: 40, left: 20, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 12 },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, marginTop: -34, paddingHorizontal: 20, paddingTop: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 10 },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.border },
  durationPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surface, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.md },
  priceCard: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.xl, padding: 16, marginTop: 18 },
  quickBadge: { backgroundColor: colors.primary50, borderRadius: radius.md, paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center' },
  check: { width: 22, height: 22, borderRadius: 6, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  checkLight: { backgroundColor: colors.primary50 },
  freeBadge: { backgroundColor: colors.accent50, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 },
  divider: { height: 1, backgroundColor: colors.surface, marginVertical: 18 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.soft },
  stepBtnOff: { backgroundColor: colors.surface },
  addon: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: 14 },
  addonOn: { borderColor: colors.primary, backgroundColor: '#F0FAFA' },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, paddingTop: 12, paddingBottom: 28, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.surface },
});
