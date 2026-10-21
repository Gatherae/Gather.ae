import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Linking, Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import appHtml from './src/appHtml';

SplashScreen.preventAutoHideAsync().catch(() => {});

const BASE_URL = 'https://homebz.app/';
const SPLASH_COLOR = '#3B0A5C';

function isDark(color) {
  const m = String(color).match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  let r, g, b;
  if (m) {
    [r, g, b] = [m[1], m[2], m[3]].map(Number);
  } else {
    let hex = String(color).replace('#', '');
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    if (!/^[0-9a-f]{6}/i.test(hex)) return false;
    [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  }
  return 0.299 * r + 0.587 * g + 0.114 * b < 150;
}

function openExternal(url) {
  Linking.openURL(url).catch(() => {});
}

function Shell() {
  const insets = useSafeAreaInsets();
  const webRef = useRef(null);
  const [theme, setTheme] = useState({ top: SPLASH_COLOR, bottom: SPLASH_COLOR });

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(SPLASH_COLOR).catch(() => {});
  }, []);

  // Android hardware back: let the page close its top-most sheet first.
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      webRef.current?.injectJavaScript(
        `(function(){var h=window.__hbBack&&window.__hbBack();window.ReactNativeWebView.postMessage(JSON.stringify({type:'back',handled:!!h}));})();true;`
      );
      return true;
    });
    return () => sub.remove();
  }, []);

  const onMessage = useCallback((event) => {
    let msg;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    switch (msg.type) {
      case 'ready':
        SplashScreen.hideAsync().catch(() => {});
        break;
      case 'theme':
        setTheme((t) => (t.top === msg.top && t.bottom === msg.bottom ? t : { top: msg.top, bottom: msg.bottom }));
        break;
      case 'open':
        openExternal(msg.url);
        break;
      case 'haptic':
        if (msg.kind === 'toast') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        else Haptics.selectionAsync().catch(() => {});
        break;
      case 'back':
        if (!msg.handled) BackHandler.exitApp();
        break;
      default:
        break;
    }
  }, []);

  // Keep the page inside the app; hand real links (wa.me, maps, tel:, mailto:) to the OS.
  const onShouldStartLoadWithRequest = useCallback((req) => {
    const { url } = req;
    if (req.isTopFrame === false) return true;
    if (url.startsWith(BASE_URL) || url.startsWith('about:') || url.startsWith('data:') || url.startsWith('blob:')) return true;
    openExternal(url);
    return false;
  }, []);

  const onContentProcessDidTerminate = useCallback(() => webRef.current?.reload(), []);

  return (
    <View style={[styles.root, { backgroundColor: theme.top }]}>
      <StatusBar style={isDark(theme.top) ? 'light' : 'dark'} />
      <View style={{ height: insets.top, backgroundColor: theme.top }} />
      <View style={[styles.page, { paddingLeft: insets.left, paddingRight: insets.right, backgroundColor: theme.bottom }]}>
        <WebView
          ref={webRef}
          style={styles.web}
          containerStyle={styles.web}
          source={{ html: appHtml, baseUrl: BASE_URL }}
          originWhitelist={['*']}
          onMessage={onMessage}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          onContentProcessDidTerminate={onContentProcessDidTerminate}
          onRenderProcessGone={onContentProcessDidTerminate}
          onLoadEnd={() => SplashScreen.hideAsync().catch(() => {})}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          setSupportMultipleWindows={false}
          bounces={false}
          overScrollMode="never"
          scrollEnabled={false}
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
          keyboardDisplayRequiresUserAction={false}
          hideKeyboardAccessoryView
          allowsBackForwardNavigationGestures={false}
          textZoom={100}
          setBuiltInZoomControls={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          webviewDebuggingEnabled={__DEV__}
        />
      </View>
      <View style={{ height: insets.bottom, backgroundColor: theme.bottom }} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider style={{ backgroundColor: SPLASH_COLOR }}>
      <Shell />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { flex: 1 },
  web: { flex: 1, backgroundColor: 'transparent' },
});
