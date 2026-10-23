const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const apple = payload.apple;
const bundle = payload.config.app.package_id;
const run = (command, args, options = {}) => execFileSync(command, args, { stdio: 'inherit', ...options });
const read = (command, args) => execFileSync(command, args, { encoding: 'utf8' });

const workspace = fs.readdirSync('ios').find((name) => name.endsWith('.xcworkspace'));
if (!workspace) throw new Error('No Xcode workspace found. The iOS project was not generated.');
const scheme = workspace.replace('.xcworkspace', '');
const base = ['-workspace', path.join('ios', workspace), '-scheme', scheme, '-configuration', 'Release'];

fs.mkdirSync('build', { recursive: true });

if (!apple) {
  run('xcodebuild', [...base, '-sdk', 'iphoneos', '-derivedDataPath', 'build/derived', 'CODE_SIGNING_ALLOWED=NO', 'CODE_SIGNING_REQUIRED=NO', 'CODE_SIGN_IDENTITY=', 'build']);

  const products = path.join('build', 'derived', 'Build', 'Products');
  const folder = fs.readdirSync(products).find((name) => name.endsWith('-iphoneos'));
  const app = fs.readdirSync(path.join(products, folder)).find((name) => name.endsWith('.app'));

  fs.rmSync('Payload', { recursive: true, force: true });
  fs.mkdirSync('Payload');
  run('cp', ['-R', path.join(products, folder, app), 'Payload/']);
  run('zip', ['-qry', 'app.ipa', 'Payload']);
  process.exit(0);
}

const temp = process.env.RUNNER_TEMP || os.tmpdir();
const keychain = path.join(temp, 'build.keychain-db');
const keychainPassword = require('crypto').randomBytes(16).toString('hex');
const p12 = path.join(temp, 'certificate.p12');
const profilePath = path.join(temp, 'profile.mobileprovision');

console.log(`::add-mask::${apple.password}`);
fs.writeFileSync(p12, Buffer.from(apple.p12, 'base64'));
fs.writeFileSync(profilePath, Buffer.from(apple.profile, 'base64'));

const profile = fs.readFileSync(profilePath, 'latin1');
const pick = (pattern, label) => {
  const match = profile.match(pattern);
  if (!match) throw new Error(`The provisioning profile has no ${label}.`);
  return match[1];
};
const uuid = pick(/<key>UUID<\/key>\s*<string>([^<]+)<\/string>/, 'UUID');
const name = pick(/<key>Name<\/key>\s*<string>([^<]+)<\/string>/, 'name');
const team = pick(/<key>TeamIdentifier<\/key>\s*<array>\s*<string>([^<]+)<\/string>/, 'team');
const devices = /<key>ProvisionedDevices<\/key>/.test(profile);
const debuggable = /<key>get-task-allow<\/key>\s*<true\/>/.test(profile);
const enterprise = /<key>ProvisionsAllDevices<\/key>\s*<true\/>/.test(profile);
const method = enterprise ? 'enterprise' : devices ? (debuggable ? 'development' : 'ad-hoc') : 'app-store';

const profiles = path.join(os.homedir(), 'Library', 'MobileDevice', 'Provisioning Profiles');
fs.mkdirSync(profiles, { recursive: true });
fs.copyFileSync(profilePath, path.join(profiles, `${uuid}.mobileprovision`));

run('security', ['create-keychain', '-p', keychainPassword, keychain]);
run('security', ['set-keychain-settings', '-lut', '21600', keychain]);
run('security', ['unlock-keychain', '-p', keychainPassword, keychain]);
run('security', ['import', p12, '-k', keychain, '-P', apple.password, '-A', '-t', 'cert', '-f', 'pkcs12']);
run('security', ['set-key-partition-list', '-S', 'apple-tool:,apple:', '-k', keychainPassword, keychain], { stdio: 'ignore' });
run('security', ['list-keychains', '-d', 'user', '-s', keychain, path.join(os.homedir(), 'Library', 'Keychains', 'login.keychain-db')]);

const identities = read('security', ['find-identity', '-v', '-p', 'codesigning', keychain]);
const identity = (identities.match(/"([^"]+)"/) || [])[1];
if (!identity) throw new Error('No signing certificate was found in the .p12 file. Check the file and its password.');

const options = path.join('build', 'ExportOptions.plist');
fs.writeFileSync(options, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>method</key><string>${method}</string>
<key>teamID</key><string>${team}</string>
<key>signingStyle</key><string>manual</string>
<key>signingCertificate</key><string>${identity}</string>
<key>provisioningProfiles</key><dict><key>${bundle}</key><string>${name}</string></dict>
</dict></plist>
`);

run('xcodebuild', [
  ...base, '-sdk', 'iphoneos', '-archivePath', 'build/app.xcarchive', 'archive',
  'CODE_SIGN_STYLE=Manual', `DEVELOPMENT_TEAM=${team}`, `CODE_SIGN_IDENTITY=${identity}`, `PROVISIONING_PROFILE_SPECIFIER=${name}`,
  `OTHER_CODE_SIGN_FLAGS=--keychain ${keychain}`,
]);
run('xcodebuild', ['-exportArchive', '-archivePath', 'build/app.xcarchive', '-exportOptionsPlist', options, '-exportPath', 'build/out']);

const ipa = fs.readdirSync('build/out').find((file) => file.endsWith('.ipa'));
if (!ipa) throw new Error('Xcode did not produce an IPA file.');
fs.copyFileSync(path.join('build', 'out', ipa), 'app.ipa');
