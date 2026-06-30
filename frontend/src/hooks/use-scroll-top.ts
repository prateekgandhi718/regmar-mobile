import { useCallback, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

export function useScrollTop(threshold = 10) {
  const [scrolled, setScrolled] = useState(false);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const isScrolled = event.nativeEvent.contentOffset.y > threshold;
      setScrolled((prev) => (prev === isScrolled ? prev : isScrolled));
    },
    [threshold],
  );

  return { scrolled, onScroll };
}
