import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, ScrollView, Image, Text, TouchableOpacity, FlatList,
  StyleSheet, Platform, useWindowDimensions, Modal, SafeAreaView,
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
  const [fullscreen, setFullscreen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const fullRef = useRef<FlatList<VenueImage>>(null);
  const isMulti = images.length > 1;
  const isWeb = Platform.OS === 'web';

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

  const openFullscreen = useCallback(() => {
    setFullscreen(true);
  }, []);

  const onFullscreenScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
      setActiveIdx(Math.max(0, Math.min(idx, images.length - 1)));
    },
    [screenWidth, images.length],
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
      {/* Slide track */}
      <View style={styles.track}>
        <TouchableOpacity activeOpacity={0.95} onPress={openFullscreen}>
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
        </TouchableOpacity>

        {/* Image counter badge */}
        {isMulti && (
          <View style={styles.counter}>
            <Text style={styles.counterText}>{activeIdx + 1}/{images.length}</Text>
          </View>
        )}

        {/* Desktop arrow controls */}
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

      {/* Pagination dots */}
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

      {/* Fullscreen modal */}
      <Modal
        visible={fullscreen}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setFullscreen(false)}
      >
        <SafeAreaView style={styles.fsContainer}>
          <TouchableOpacity style={styles.fsClose} onPress={() => setFullscreen(false)}>
            <Text style={styles.fsCloseText}>✕</Text>
          </TouchableOpacity>
          {isMulti && (
            <Text style={styles.fsCounter}>{activeIdx + 1}/{images.length}</Text>
          )}
          <FlatList
            ref={fullRef}
            data={images}
            keyExtractor={(_, i) => String(i)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={onFullscreenScroll}
            onMomentumScrollEnd={onFullscreenScroll}
            getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
            initialScrollIndex={activeIdx}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item.url || undefined }}
                style={{ width: screenWidth, height: '100%' }}
                resizeMode="contain"
              />
            )}
          />
        </SafeAreaView>
      </Modal>
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
  placeholderText: { fontSize: 13, color: colors.textDim },

  counter: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  counterText: { color: '#fff', fontSize: 11, fontWeight: '600' },

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
  arrowText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26, textAlign: 'center' },

  // Fullscreen
  fsContainer: { flex: 1, backgroundColor: '#000' },
  fsClose: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.xl,
    zIndex: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fsCloseText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  fsCounter: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.xl,
    zIndex: 20,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
});
