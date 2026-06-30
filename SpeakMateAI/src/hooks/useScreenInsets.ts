// useScreenInsets — single source of truth for safe-area padding across the app.
//
// Why this hook exists (regression context):
//   On Android the app uses `androidStatusBar.translucent: true` so the gradient
//   shows behind the status bar. On punch-hole / notch devices the value
//   returned by `useSafeAreaInsets().top` is sometimes 0 (or under-reports)
//   before the native event fires, which causes the first paint to clip the
//   header behind the camera cut-out. Equally, the bottom tab bar is
//   `position: 'absolute'` so any tab-screen ScrollView that doesn't pad its
//   contentContainer bottom hides its last items behind the tab bar.
//
// This hook returns the SAFE values that every screen should use:
//   • headerPaddingTop — guaranteed >= StatusBar.currentHeight, never clips
//   • tabBarHeight    — auto-detects whether the screen is inside a bottom-tab
//                       navigator (returns 0 for stack-only screens)
//   • bottomPad       — drop-in `paddingBottom` for ScrollView content so
//                       nothing is hidden behind the floating tab bar
import { useContext } from 'react';
import { StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';

/**
 * Minimum top inset (in px) we always reserve for the status bar / notch area
 * even when the runtime under-reports it. 28dp covers every Android device
 * including punch-hole displays with status bar height 24-28dp.
 */
const MIN_TOP_FLOOR = Platform.OS === 'android' ? 28 : 20;

export interface ScreenInsets {
  /** Safe top inset for headers/titles — never less than status bar height. */
  top: number;
  /** Native bottom safe area (gesture bar / home indicator). */
  bottom: number;
  /** Height of the floating bottom tab bar — 0 if not inside a tab navigator. */
  tabBarHeight: number;
  /** Drop-in `paddingTop` value for the top-most container of a screen. */
  headerPaddingTop: number;
  /** Drop-in `paddingBottom` value for ScrollView contentContainerStyle. */
  bottomPad: number;
}

export function useScreenInsets(extraTop = 0, extraBottom = 24): ScreenInsets {
  const insets = useSafeAreaInsets();
  // Reading BottomTabBarHeightContext directly (instead of useBottomTabBarHeight)
  // is safe outside a tab navigator — it simply returns undefined.
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;

  const statusBarH = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const top = Math.max(insets.top, statusBarH, MIN_TOP_FLOOR);

  return {
    top,
    bottom: insets.bottom,
    tabBarHeight,
    headerPaddingTop: top + extraTop,
    bottomPad: Math.max(tabBarHeight, insets.bottom) + extraBottom,
  };
}
