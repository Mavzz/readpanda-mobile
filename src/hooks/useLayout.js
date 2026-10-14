import { useCallback, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { DS } from '../styles/global';

// Which layout a screen should render: 'compact' (the phone layout, also iPad
// Slide Over and narrow Split View), 'regular' (the handoff's iPad "portrait"
// layout) or 'wide' (its "landscape" layout). Width only — never
// Platform.isPad, which is wrong in multitasking — so it updates on rotation
// and Split View resizes like any other dimension change.
export const sizeClassFor = (width) => {
  if (width >= DS.layout.wideMin) {
    return 'wide';
  }
  return width >= DS.layout.regularMin ? 'regular' : 'compact';
};

const useLayout = () => {
  const { width, height } = useWindowDimensions();
  const sizeClass = sizeClassFor(width);

  // The handoff names exact column counts per layout (5/6 covers, 3/4
  // buckets…) rather than a minimum width, so screens pass all three.
  const columns = useCallback(
    (compact, regular, wide) => ({ compact, regular, wide })[sizeClass],
    [sizeClass],
  );

  return useMemo(() => ({
    width,
    height,
    sizeClass,
    isLarge: sizeClass !== 'compact',
    // The real orientation, for the one thing that follows it rather than
    // width: the reader's Scroll / Spread default.
    isLandscape: width > height,
    pagePad: DS.layout.pagePad[sizeClass],
    columns,
  }), [width, height, sizeClass, columns]);
};

export default useLayout;
