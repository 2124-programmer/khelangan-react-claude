import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, ScrollView, Image, Text, TouchableOpacity,
  StyleSheet, Platform, useWindowDimensions,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { colors, spacing, radius } from '../../theme';
import type { VenueImage } from '../../types';

const COVER_HEIGHT = 240;
const H_PADDING = spacing.lg;
const ARROW_SIZE = 36;
const ARROW_TOP = (COVER_HEIGHT - ARROW_SIZE) / 2;

interface Props {
  images: VenueImage[];
}

export function VenueImageCarousel({ images }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const slideWidth = screenWidth - H_PADDING * 2;

  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isMulti = images.length > 1;
  const isWeb = Platform.OS === 'web';

  // Reset to first slide when the container width changes (e.g. browser resize)
  const prevWidth = useRef(slideWidth);
  useEffect(() => {
    if (prevWidth.current !== slideWidth) {
      prevWidth.current = slideWidth;
      setActiveIdx(0);
      scrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [slideWidth]);

  const resolveIndex = useCallback(
    (offsetX: number) =>
      Math.max(0, Math.min(Math.round(offsetX / slideWidth), images.length - 1)),
    [slideWidth, images.length],
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      setActiveIdx(resolveIndex(e.nativeEvent.contentOffset.x));
    },
    [resolveIndex],
  );

  const scrollTo = useCallback(
    (idx: number) => {
      scrollRef.current?.scrollTo({ x: idx * slideWidth, animated: true });
      setActiveIdx(idx);
    },
    [slideWidth],
  );

  if (!images.length) {
    return (
      <View style={[styles.slide, styles.placeholder, { marginHorizontal: H_PADDING, borderRadius: radius.lg }]}>
        <Text style={styles.placeholderText}>No photos available</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Slide track — clipped to border radius */}
      <View style={styles.track}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleScroll}
          style={{ width: slideWidth }}
        >
          {images.map((img, idx) => (
            <Image
              key={idx}
              source={{ uri: img.url || undefined }}
              style={[styles.slide, { width: slideWidth }]}
              resizeMode="cover"
            />
          ))}
        </ScrollView>

        {/* Desktop arrow controls — only rendered on web with multiple images */}
        {isMulti && isWeb && (
          <>
            <TouchableOpacity
              style={[styles.arrow, styles.arrowLeft, activeIdx === 0 && styles.arrowDisabled]}
              onPress={() => scrollTo(activeIdx - 1)}
              disabled={activeIdx === 0}
            >
              <Text style={styles.arrowText}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.arrow, styles.arrowRight, activeIdx === images.length - 1 && styles.arrowDisabled]}
              onPress={() => scrollTo(activeIdx + 1)}
              disabled={activeIdx === images.length - 1}
            >
              <Text style={styles.arrowText}>›</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Pagination dots — only shown with multiple images */}
      {isMulti && (
        <View style={styles.dotsRow}>
          {images.map((_, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => scrollTo(idx)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={[styles.dot, idx === activeIdx && styles.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    marginHorizontal: H_PADDING,
    height: COVER_HEIGHT,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  slide: {
    height: COVER_HEIGHT,
    backgroundColor: colors.surfaceAlt,
  },
  placeholder: {
    height: COVER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 13,
    color: colors.textDim,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 20,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  arrow: {
    position: 'absolute',
    top: ARROW_TOP,
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    borderRadius: ARROW_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  arrowLeft: { left: 10 },
  arrowRight: { right: 10 },
  arrowDisabled: { opacity: 0 },
  arrowText: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
    textAlign: 'center',
  },
});
