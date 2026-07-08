// useScreenInsets - universal safe-area hook that works on:
//   - Flat displays (regular status bar 24-30dp)
//   - Curved edge displays (S-series, OnePlus etc - status bar can be 30-40dp)
//   - Punch-hole camera devices (24-45dp depending on OEM)
//   - Notch devices (iPhone-style cutout)
//   - Foldables
//
// Strategy:
//   1. Take the MAX of (insets.top, StatusBar.currentHeight, hard floor)
//   2. Hard floor is generous 48dp on Android - safely clears any camera cutout
//   3. Add extra 12dp buffer on top so text/icons aren't glued to the cutout
//   4. Return tabBarHeight from context (auto-detects if in tab navigator)
import { useContext } from 'react';
import { StatusBar, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';

// Hard floor - covers ALL Android devices including curved-edge punch-hole
// (e.g. Realme, OnePlus, Samsung Galaxy S with camera hole up to 44dp)
const MIN_TOP_FLOOR = Platform.OS === 'android' ? 48 : 20;

// Extra breathing room so header text/icons aren't touching the cutout edge
const TOP_BREATHING_ROOM = 12;

export interface ScreenInsets {
  top: number;
  bottom: number;
  tabBarHeight: number;
  headerPaddingTop: number;
  bottomPad: number;
}

export function useScreenInsets(extraTop = 0, extraBottom = 24): ScreenInsets {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const statusBarH = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

  // Take the largest value of all signals + hard floor + breathing room
  const top = Math.max(insets.top, statusBarH, MIN_TOP_FLOOR) + TOP_BREATHING_ROOM;

  return {
    top,
    bottom: insets.bottom,
    tabBarHeight,
    headerPaddingTop: top + extraTop,
    bottomPad: Math.max(tabBarHeight, insets.bottom) + extraBottom,
  };
}
