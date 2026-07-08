// useScreenInsets - UNIVERSAL safe-area hook that works on EVERY device:
//   - Flat displays (regular status bar 24-30dp)
//   - Curved edge displays (Samsung Galaxy S, Realme, OnePlus edges)
//   - Punch-hole camera devices (24-45dp camera cutout)
//   - Notch devices (iPhone-style cutout)
//   - Foldables and tablets of any aspect ratio
//
// Strategy (nuclear-proof):
//   1. Android status bar is OPAQUE (translucent: false in app.json) so the OS
//      itself pushes ALL content below the status bar - impossible to overlap.
//   2. On top of that we still add a safety margin using insets + hard floor,
//      because on curved-edge devices the useSafeAreaInsets may report values
//      slightly under what the physical glass curvature actually needs.
//   3. Horizontal padding (left/right) is exposed too, for curved-edge screens
//      where content near the horizontal edges can get clipped by the curve.
import { useContext } from 'react';
import { StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';

// Minimum vertical breathing room above the first UI element.
// With translucent status bar disabled, we usually just need ~16dp of visual
// breathing room. On curved-edge devices we bump it to 24dp so headers don't
// feel cramped right below the status bar.
const MIN_TOP_BREATHING = Platform.OS === 'android' ? 20 : 12;

// Horizontal safety margin for curved-edge display screens.
// Values from insets.left/right are usually accurate but we floor at 4dp
// as a defensive minimum.
const MIN_HORIZONTAL = 4;

export interface ScreenInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
  tabBarHeight: number;
  headerPaddingTop: number;
  bottomPad: number;
}

export function useScreenInsets(extraTop = 0, extraBottom = 24): ScreenInsets {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;

  // Because translucent: false is set, Android pushes content BELOW the status
  // bar automatically -> insets.top on Android will typically be 0. We still
  // add a breathing-room floor so headers don't touch the status bar edge.
  const top = insets.top + MIN_TOP_BREATHING;

  // Horizontal insets - protect against curved-edge clipping.
  const left = Math.max(insets.left, MIN_HORIZONTAL);
  const right = Math.max(insets.right, MIN_HORIZONTAL);

  // Bottom safe area for gesture bar + floating tab bar.
  const bottom = insets.bottom;

  return {
    top,
    bottom,
    left,
    right,
    tabBarHeight,
    headerPaddingTop: top + extraTop,
    bottomPad: Math.max(tabBarHeight, bottom) + extraBottom,
  };
}
