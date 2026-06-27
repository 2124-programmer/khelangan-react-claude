import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import type { Venue } from '../../types';

export type SortOption = 'default' | 'distance' | 'price_asc' | 'price_desc' | 'rating_desc' | 'newest';

export interface VenueFilters {
  maxPrice: number | null;
  minRating: number | null;
  sortBy: SortOption;
}

// Maps the UI filter state to the server query params (/api/v1/venues).
export function filtersToServerParams(f: VenueFilters): {
  sort?: string; maxPrice?: number; minRating?: number;
} {
  const sortMap: Record<SortOption, string> = {
    default: 'DEFAULT',
    distance: 'DISTANCE',
    price_asc: 'PRICE_LOW',
    price_desc: 'PRICE_HIGH',
    rating_desc: 'RATING',
    newest: 'NEWEST',
  };
  return {
    sort: f.sortBy === 'default' ? undefined : sortMap[f.sortBy],
    maxPrice: f.maxPrice ?? undefined,
    minRating: f.minRating ?? undefined,
  };
}

export const DEFAULT_FILTERS: VenueFilters = {
  maxPrice: null,
  minRating: null,
  sortBy: 'default',
};

export function activeFilterCount(f: VenueFilters): number {
  let n = 0;
  if (f.maxPrice !== null) n++;
  if (f.minRating !== null) n++;
  if (f.sortBy !== 'default') n++;
  return n;
}

export function applyFilters(venues: Venue[], f: VenueFilters): Venue[] {
  let list = [...venues];
  if (f.maxPrice !== null) {
    list = list.filter((v) => v.pricePerHour <= f.maxPrice!);
  }
  if (f.minRating !== null) {
    list = list.filter((v) => (v.ratingAverage ?? 0) >= f.minRating!);
  }
  switch (f.sortBy) {
    case 'price_asc':
      list.sort((a, b) => a.pricePerHour - b.pricePerHour);
      break;
    case 'price_desc':
      list.sort((a, b) => b.pricePerHour - a.pricePerHour);
      break;
    case 'rating_desc':
      list.sort((a, b) => (b.ratingAverage ?? 0) - (a.ratingAverage ?? 0));
      break;
  }
  return list;
}

interface FilterModalProps {
  visible: boolean;
  filters: VenueFilters;
  onApply: (f: VenueFilters) => void;
  onClose: () => void;
  /** When false/absent, the "Nearest" (distance) sort is hidden — it needs the user's location. */
  locationAvailable?: boolean;
}

const SORT_OPTIONS: { label: string; value: SortOption; needsLocation?: boolean }[] = [
  { label: 'Default', value: 'default' },
  { label: 'Nearest', value: 'distance', needsLocation: true },
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low → High', value: 'price_asc' },
  { label: 'Price: High → Low', value: 'price_desc' },
  { label: 'Highest Rated', value: 'rating_desc' },
];

const PRICE_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Any', value: null },
  { label: '₹500', value: 500 },
  { label: '₹1,000', value: 1000 },
  { label: '₹1,500', value: 1500 },
];

const RATING_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Any', value: null },
  { label: '3+ ★', value: 3 },
  { label: '4+ ★', value: 4 },
  { label: '4.5+ ★', value: 4.5 },
];

export function FilterModal({ visible, filters, onApply, onClose, locationAvailable }: FilterModalProps) {
  const [local, setLocal] = useState<VenueFilters>(filters);
  const sortOptions = SORT_OPTIONS.filter((o) => !o.needsLocation || locationAvailable);

  useEffect(() => {
    if (visible) setLocal(filters);
  }, [visible]);

  const handleApply = () => {
    onApply(local);
    onClose();
  };

  const handleClear = () => {
    setLocal(DEFAULT_FILTERS);
    onApply(DEFAULT_FILTERS);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.container}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[s.sheet, shadow.modal]}>
          {/* Handle */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Filters</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={s.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={s.scroll}>
            {/* Sort by */}
            <Text style={s.sectionLabel}>Sort by</Text>
            <View style={s.optionRow}>
              {sortOptions.map((o) => {
                const active = local.sortBy === o.value;
                return (
                  <TouchableOpacity
                    key={o.value}
                    style={[s.chip, active && s.chipActive]}
                    onPress={() => setLocal((f) => ({ ...f, sortBy: o.value }))}
                  >
                    <Text style={[s.chipText, active && s.chipTextActive]}>{o.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Max Price */}
            <Text style={s.sectionLabel}>Max Price (per hour)</Text>
            <View style={s.optionRow}>
              {PRICE_OPTIONS.map((o) => {
                const active = local.maxPrice === o.value;
                return (
                  <TouchableOpacity
                    key={String(o.value)}
                    style={[s.chip, active && s.chipActive]}
                    onPress={() => setLocal((f) => ({ ...f, maxPrice: o.value }))}
                  >
                    <Text style={[s.chipText, active && s.chipTextActive]}>{o.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Min Rating */}
            <Text style={s.sectionLabel}>Minimum Rating</Text>
            <View style={s.optionRow}>
              {RATING_OPTIONS.map((o) => {
                const active = local.minRating === o.value;
                return (
                  <TouchableOpacity
                    key={String(o.value)}
                    style={[s.chip, active && s.chipActive]}
                    onPress={() => setLocal((f) => ({ ...f, minRating: o.value }))}
                  >
                    <Text style={[s.chipText, active && s.chipTextActive]}>{o.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={s.actions}>
            <TouchableOpacity style={s.clearBtn} onPress={handleClear}>
              <Text style={s.clearBtnText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.applyBtn} onPress={handleApply}>
              <Text style={s.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.xl,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeBtn: {
    fontSize: fontSize.lg,
    color: colors.textDim,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMid,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMid,
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
  },
  clearBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textMid,
  },
  applyBtn: {
    flex: 2,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
