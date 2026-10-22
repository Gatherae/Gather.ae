// Saves snack/App.js as a Snack on Expo's servers and prints an Expo Go link.
// The Snack runtime is published by Expo, so Expo Go opens it without signing in.
const fs = require('fs');
const path = require('path');

const RUNTIME = 'u.expo.dev/933fd9c0-1666-11e7-afca-d980795c5824';
const sdkVersion = process.argv[2] || '57.0.0';
const root = path.join(__dirname, '..');
const bundled = require(path.join(root, 'node_modules/expo/bundledNativeModules.json'));
const deps = ['react-native-webview', 'react-native-safe-area-context', 'expo-haptics', 'expo-system-ui', 'expo-status-bar'];

async function main() {
  for (const platform of ['ios', 'android']) {
    const r = await fetch(`https://${RUNTIME}?runtime-version=exposdk:${sdkVersion}&channel-name=production`, {
      headers: { 'expo-platform': platform, 'expo-runtime-version': `exposdk:${sdkVersion}`, 'expo-channel-name': 'production', accept: 'multipart/mixed,application/expo+json,application/json' },
    });
    console.log(`Snack runtime ${platform} SDK ${sdkVersion}: HTTP ${r.status}`);
  }

  const dependencies = Object.fromEntries(deps.map((d) => [d, { version: bundled[d] }]));
  const payload = {
    manifest: {
      sdkVersion,
      name: 'Homebz',
      description: 'Homebz',
      dependencies: Object.fromEntries(deps.map((d) => [d, bundled[d]])),
    },
    code: { 'App.js': { type: 'CODE', contents: fs.readFileSync(path.join(root, 'snack/App.js'), 'utf8') } },
    dependencies,
    isDraft: false,
  };
  const res = await fetch('https://exp.host/--/api/v2/snack/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  console.log('save response:', JSON.stringify(data).slice(0, 500));
  if (!data.id) throw new Error('Snack save failed');
  const params = new URLSearchParams({ 'runtime-version': `exposdk:${sdkVersion}`, 'channel-name': 'production', snack: data.id });
  const link = `exp://${RUNTIME}?${params}`;
  console.log(`LINK: ${link}`);
  console.log(`WEB: https://snack.expo.dev/${data.hashId || data.id}`);
  fs.writeFileSync(path.join(root, 'snack-link.txt'), `${link}\nhttps://snack.expo.dev/${data.hashId || data.id}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
