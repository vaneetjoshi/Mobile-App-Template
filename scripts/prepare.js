const fs = require('fs');
const crypto = require('crypto');

const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const { config } = payload;

fs.mkdirSync('assets', { recursive: true });
fs.writeFileSync('assets/icon.png', Buffer.from(payload.icon, 'base64'));
fs.writeFileSync('assets/adaptive-icon.png', Buffer.from(payload.adaptive_icon || payload.icon, 'base64'));
fs.writeFileSync('assets/splash.png', Buffer.from(payload.splash, 'base64'));
fs.writeFileSync('app-config.json', JSON.stringify(config));

const base = JSON.parse(fs.readFileSync('app.base.json', 'utf8'));
base.expo.name = config.app.name;
base.expo.slug = config.app.package_id.replace(/\./g, '-');
base.expo.icon = './assets/icon.png';
base.expo.plugins = [['expo-splash-screen', { backgroundColor: config.splash.background }]];
base.expo.android = {
  package: config.app.package_id,
  adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: payload.adaptive_background || config.theme.background },
};
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
