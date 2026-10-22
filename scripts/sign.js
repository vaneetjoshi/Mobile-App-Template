const fs = require('fs');
const { execFileSync } = require('child_process');

const signing = JSON.parse(fs.readFileSync('signing.json', 'utf8'));

if (signing.generated) {
  execFileSync('keytool', [
    '-genkeypair', '-v', '-keystore', 'generated.jks', '-alias', signing.alias,
    '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000',
    '-storepass', signing.password, '-keypass', signing.password,
    '-dname', 'CN=App, O=App, C=IN',
  ], { stdio: 'ignore' });
  fs.copyFileSync('generated.jks', 'android/app/upload.jks');
} else {
  fs.copyFileSync('upload.jks', 'android/app/upload.jks');
}

const props = [
  `UPLOAD_STORE_PASSWORD=${signing.password}`,
  `UPLOAD_KEY_PASSWORD=${signing.password}`,
  `UPLOAD_KEY_ALIAS=${signing.alias}`,
].join('\n');
fs.appendFileSync('android/gradle.properties', `\n${props}\n`);

const file = 'android/app/build.gradle';
let gradle = fs.readFileSync(file, 'utf8');
gradle = gradle.replace(
  /signingConfigs\s*\{/,
  `signingConfigs {
        upload {
            storeFile file('upload.jks')
            storePassword UPLOAD_STORE_PASSWORD
            keyAlias UPLOAD_KEY_ALIAS
            keyPassword UPLOAD_KEY_PASSWORD
        }`,
);
gradle = gradle.replace(/(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.\w+/, '$1signingConfig signingConfigs.upload');
fs.writeFileSync(file, gradle);
