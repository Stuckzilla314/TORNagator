import fs from 'fs';
import cp from 'child_process';

if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  const lines = envContent.split(/\r?\n/);
  let inKey = false;
  let jsonLines = [];
  let currentKey = '';

  for (const line of lines) {
    if (inKey) {
      jsonLines.push(line);
      if (line.trim() === '}') {
        process.env[currentKey] = jsonLines.join('\n').trim();
        inKey = false;
        jsonLines = [];
      }
      continue;
    }
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.substring(0, idx).trim();
    const val = line.substring(idx + 1).trim();

    if (val.startsWith('{')) {
      inKey = true;
      currentKey = key;
      jsonLines.push(val);
    } else {
      process.env[key] = val;
    }
  }
}

console.log("Building React app...");
cp.execSync('npm run build', { stdio: 'inherit' });

console.log("Launching Capacitor on Android...");
const child = cp.spawn('npx', ['cap', 'run', 'android'], { stdio: 'inherit', shell: true });
child.on('exit', (code) => {
  process.exit(code);
});

