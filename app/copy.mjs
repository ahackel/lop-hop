// Copies the game's files into www/ (what the app ships): those the game plays from (tools/files.mjs). Not the service
// worker (the app has its files already) nor the tools. Run before `cap sync ios`.
import fs from 'node:fs';
import path from 'node:path';
import { GAME_FILES, copyGame } from '../tools/files.mjs';

const www = path.resolve(import.meta.dirname, 'www');
copyGame(www);
// the app's version and build (from the Xcode project, which npm run testflight raises) for the credits: 1.0.1 (2)
const proj = fs.readFileSync(path.join(import.meta.dirname, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8');
const app = `${proj.match(/MARKETING_VERSION = ([\d.]+);/)[1]} (${proj.match(/CURRENT_PROJECT_VERSION = (\d+);/)[1]})`;
const version = path.join(www, 'version.js');
fs.writeFileSync(version, fs.readFileSync(version, 'utf8').replace("APP_VERSION = ''", `APP_VERSION = '${app}'`));
console.log(`copied ${GAME_FILES.length} files into www/, the app's version ${app}`);
