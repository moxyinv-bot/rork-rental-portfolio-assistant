const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const appJsonPath = path.join(root, 'app.json');
const packageJsonPath = path.join(root, 'package.json');
const buildGradlePath = path.join(root, 'android', 'app', 'build.gradle');

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const currentVersion = appJson.expo.version;
const currentVersionCode = Number(appJson.expo.android.versionCode);
const versionParts = currentVersion.split('.').map(Number);

if (versionParts.length !== 3 || versionParts.some(Number.isNaN) || !Number.isInteger(currentVersionCode)) {
  throw new Error('Expected app.json to contain a semantic version and integer Android versionCode.');
}

const nextVersion = `${versionParts[0]}.${versionParts[1]}.${versionParts[2] + 1}`;
const nextVersionCode = currentVersionCode + 1;

appJson.expo.version = nextVersion;
appJson.expo.android.versionCode = nextVersionCode;
fs.writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, 2)}\n`);

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
packageJson.version = nextVersion;
fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
buildGradle = buildGradle.replace(/versionCode\s+\d+/, `versionCode ${nextVersionCode}`);
buildGradle = buildGradle.replace(/versionName\s+"[^"]+"/, `versionName "${nextVersion}"`);
fs.writeFileSync(buildGradlePath, buildGradle);

console.log(`Android version bumped to ${nextVersion} (build ${nextVersionCode}).`);