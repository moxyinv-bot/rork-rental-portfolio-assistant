const { execSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const androidDir = path.join(root, 'android');

const isBundle = process.argv.includes('--bundle') || process.argv.includes('--aab');

function run(command, cwd) {
  console.log(`\n> ${command}`);
  execSync(command, { cwd, stdio: 'inherit' });
}

run('node scripts/bump-android-version.js', root);

const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';

if (isBundle) {
  run(`${gradlew} bundleRelease`, androidDir);
  console.log('\nPlay Store App Bundle (.aab) ready at android\\app\\build\\outputs\\bundle\\release\\app-release.aab');
} else {
  run(`${gradlew} assembleRelease`, androidDir);
  console.log('\nStandalone APK ready at android\\app\\build\\outputs\\apk\\release\\padcommand.apk');
}
