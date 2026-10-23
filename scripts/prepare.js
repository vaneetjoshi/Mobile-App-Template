const fs = require('fs');
const crypto = require('crypto');

const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const platform = process.argv[3] || 'android';
const { config } = payload;

fs.mkdirSync('assets', { recursive: true });
fs.writeFileSync('assets/icon.png', Buffer.from(payload.icon, 'base64'));
fs.writeFileSync('assets/adaptive-icon.png', Buffer.from(payload.adaptive_icon || payload.icon, 'base64'));
if (payload.adaptive_background_image) {
  fs.writeFileSync('assets/adaptive-background.png', Buffer.from(payload.adaptive_background_image, 'base64'));
}
fs.writeFileSync('assets/splash.png', Buffer.from(payload.splash, 'base64'));
fs.writeFileSync('app-config.json', JSON.stringify(config));

const base = JSON.parse(fs.readFileSync('app.base.json', 'utf8'));
base.expo.name = config.app.name;
base.expo.version = `1.0.${config.app.build_number}`;
base.expo.slug = config.app.package_id.replace(/\./g, '-');
base.expo.icon = './assets/icon.png';
base.expo.plugins = [['expo-splash-screen', { backgroundColor: config.splash.background }]];
base.expo.ios = {
  bundleIdentifier: config.app.package_id,
  buildNumber: String(config.app.build_number),
  supportsTablet: true,
  infoPlist: { ITSAppUsesNonExemptEncryption: false },
};
base.expo.android = {
  package: config.app.package_id,
  versionCode: config.app.build_number,
  adaptiveIcon: payload.adaptive_background_image
    ? { foregroundImage: './assets/adaptive-icon.png', backgroundImage: './assets/adaptive-background.png' }
    : { foregroundImage: './assets/adaptive-icon.png', backgroundColor: payload.adaptive_background || config.theme.background },
};
if (platform === 'android' && payload.google_services) {
  fs.writeFileSync('google-services.json', Buffer.from(payload.google_services, 'base64'));
  base.expo.android.googleServicesFile = './google-services.json';
  base.expo.plugins.push(['expo-notifications', { color: config.theme.primary }]);
}
base.expo.plugins.push(['expo-local-authentication', { faceIDPermission: `Allow ${config.app.name} to use Face ID to sign in and unlock the app.` }]);
fs.writeFileSync('app.json', JSON.stringify(base, null, 2));

const signing = {
  password: payload.keystore_password || crypto.randomBytes(16).toString('hex'),
  alias: payload.key_alias || 'upload',
  generated: !payload.keystore,
};

if (payload.keystore) {
  fs.writeFileSync('upload.jks', Buffer.from(payload.keystore, 'base64'));
}

fs.writeFileSync('signing.json', JSON.stringify(signing));
