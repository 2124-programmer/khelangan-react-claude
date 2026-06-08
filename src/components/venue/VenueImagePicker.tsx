/**
 * VenueImagePicker
 *
 * Lets the owner select up to 3 venue photos (1 recommended, 3 max).
 * Each photo goes through the OS native crop UI locked to 16:9, then is
 * resized to 1200×675 and JPEG-compressed to ≈200–300 KB via
 * expo-image-manipulator before being handed to the caller.
 *
 * Props:
 *   images       – current list of { uri, isPrimary }
 *   onChange     – called whenever the list changes
 *   uploading    – pass true while uploads are in flight to disable interactions
 */
import React from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { LoadingOverlay } from '../common';

const TARGET_W = 1200;
const TARGET_H = 675;
const MAX_IMAGES = 3;

export interface PickedImage {
  uri: string;       // local file URI (before upload) or server URL (after upload)
  isPrimary: boolean;
}

interface Props {
  images: PickedImage[];
  onChange: (imgs: PickedImage[]) => void;
  uploading?: boolean;
}

export function VenueImagePicker({ images, onChange, uploading = false }: Props) {

  // ── Pick + crop + compress one image ──────────────────────────────────────

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Please allow photo library access in Settings.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,       // opens native crop UI
      aspect: [16, 9],           // locked 16:9 frame
      quality: 1,                // pick at full quality; we compress below
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];

    // Reject tiny images that would be upscaled (require at least 600 px wide)
    if (asset.width && asset.width < 600) {
      Alert.alert('Image too small', 'Please pick a photo that is at least 600 px wide.');
      return;
    }

    // Resize to 1200×675 and compress to target ≈200-300 KB
    const processed = await processImage(asset.uri);
    if (!processed) return;

    const newImages: PickedImage[] = [
      ...images,
      { uri: processed, isPrimary: images.length === 0 },
    ];
    onChange(newImages);
  }

  // ── Compress / resize via expo-image-manipulator ──────────────────────────

  async function processImage(uri: string): Promise<string | null> {
    try {
      // Step 1: resize to target resolution
      const resized = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: TARGET_W, height: TARGET_H } }],
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
      );
      return resized.uri;
    } catch {
      Alert.alert('Processing failed', 'Could not process the image. Please try another.');
      return null;
    }
  }

  // ── Set primary ───────────────────────────────────────────────────────────

  function setPrimary(idx: number) {
    onChange(images.map((img, i) => ({ ...img, isPrimary: i === idx })));
  }

  // ── Remove ────────────────────────────────────────────────────────────────

  function remove(idx: number) {
    const next = images.filter((_, i) => i !== idx);
    // If we removed the primary, promote the first remaining
    if (next.length && !next.some((i) => i.isPrimary)) {
      next[0].isPrimary = true;
    }
    onChange(next);
  }

  // ── Move left / right (reorder) ───────────────────────────────────────────

  function move(idx: number, dir: -1 | 1) {
    const next = [...images];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View>
      <Text style={styles.label}>Venue Photos</Text>
      <Text style={styles.hint}>
        Min 1 recommended · Max 3 · 16:9 banner (1200×675) · ≈200–300 KB each
      </Text>

      {/* Image thumbnails */}
      {images.map((img, idx) => (
        <View key={idx} style={styles.thumbRow}>
          <Image source={{ uri: img.uri }} style={styles.thumb} resizeMode="cover" />

          <View style={styles.thumbActions}>
            {/* Primary star */}
            <TouchableOpacity
              onPress={() => setPrimary(idx)}
              style={[styles.actionBtn, img.isPrimary && styles.actionBtnActive]}
              disabled={uploading}
            >
              <Text style={[styles.actionIcon, img.isPrimary && { color: colors.white }]}>★</Text>
            </TouchableOpacity>

            {/* Move up */}
            <TouchableOpacity
              onPress={() => move(idx, -1)}
              style={styles.actionBtn}
              disabled={uploading || idx === 0}
            >
              <Text style={[styles.actionIcon, idx === 0 && { opacity: 0.3 }]}>↑</Text>
            </TouchableOpacity>

            {/* Move down */}
            <TouchableOpacity
              onPress={() => move(idx, 1)}
              style={styles.actionBtn}
              disabled={uploading || idx === images.length - 1}
            >
              <Text style={[styles.actionIcon, idx === images.length - 1 && { opacity: 0.3 }]}>↓</Text>
            </TouchableOpacity>

            {/* Remove */}
            <TouchableOpacity
              onPress={() => remove(idx)}
              style={[styles.actionBtn, styles.removeBtn]}
              disabled={uploading}
            >
              <Text style={[styles.actionIcon, { color: colors.white }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {img.isPrimary && (
            <View style={styles.primaryBadge}>
              <Text style={styles.primaryBadgeText}>Cover</Text>
            </View>
          )}
        </View>
      ))}

      {/* Add Photo button */}
      {images.length < MAX_IMAGES && (
        <TouchableOpacity
          onPress={pickImage}
          style={[styles.addBtn, uploading && { opacity: 0.5 }]}
          disabled={uploading}
          activeOpacity={0.8}
        >
          {uploading ? (
            <LoadingOverlay visible={uploading} />
          ) : (
            <>
              <Text style={styles.addIcon}>＋</Text>
              <Text style={styles.addLabel}>
                {images.length === 0 ? 'Add Photo' : `Add Photo (${images.length}/${MAX_IMAGES})`}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {images.length === MAX_IMAGES && (
        <Text style={styles.maxNote}>Maximum 3 photos reached.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMid,
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textDim,
    marginBottom: spacing.md,
    lineHeight: 16,
  },

  thumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  thumb: {
    width: 120,
    aspectRatio: 16 / 9,
    backgroundColor: colors.surfaceAlt,
  },
  thumbActions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  removeBtn: {
    backgroundColor: '#e53935',
    borderColor: '#e53935',
  },
  actionIcon: {
    fontSize: 14,
    color: colors.textMid,
    fontWeight: fontWeight.bold,
  },
  primaryBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  primaryBadgeText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: fontWeight.bold,
  },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.primaryLight,
  },
  addIcon: { fontSize: 22, color: colors.primary, fontWeight: fontWeight.bold },
  addLabel: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },

  maxNote: {
    fontSize: fontSize.xs,
    color: colors.textDim,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
