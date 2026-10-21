// Builds expo-go/<platform>/{manifest.json,index.js}: a static Expo Go update
// served from GitHub, so the app opens in Expo Go without a dev server.
// Usage: npx expo export --platform ios --platform android --no-bytecode --output-dir <dist> && node scripts/build-expo-go.js <dist>
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const dist = path.resolve(process.argv[2] || path.join(root, 'dist'));
const BASE = 'https://raw.githubusercontent.com/Gatherae/Gather.ae/homebz-expo-app/homebz-app/expo-go';

const meta = JSON.parse(fs.readFileSync(path.join(dist, 'metadata.json'), 'utf8'));
const { expo } = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const sdkVersion = require('expo/package.json').version.split('.')[0] + '.0.0';

for (const platform of ['ios', 'android']) {
  const outDir = path.join(root, 'expo-go', platform);
  fs.mkdirSync(outDir, { recursive: true });
  const bundle = fs.readFileSync(path.join(dist, meta.fileMetadata[platform].bundle));
  const hash = crypto.createHash('sha256').update(bundle).digest('hex').slice(0, 12);
  const bundleName = `index-${hash}.js`;
  for (const f of fs.readdirSync(outDir)) if (/^index-.*\.js$/.test(f)) fs.unlinkSync(path.join(outDir, f));
  fs.writeFileSync(path.join(outDir, bundleName), bundle);

  const manifest = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    runtimeVersion: `exposdk:${sdkVersion}`,
    launchAsset: { key: `bundle-${hash}`, contentType: 'application/javascript', url: `${BASE}/${platform}/${bundleName}` },
    assets: [],
    metadata: {},
    extra: {
      eas: expo.extra?.eas,
      expoClient: { ...expo, sdkVersion, platforms: ['ios', 'android'] },
      scopeKey: `@sztech/${expo.slug}`,
    },
  };
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest));
  console.log(`${platform}: exps://raw.githubusercontent.com/Gatherae/Gather.ae/homebz-expo-app/homebz-app/expo-go/${platform}/manifest.json`);
}
