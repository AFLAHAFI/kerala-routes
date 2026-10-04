import {spawn} from 'node:child_process';
const built=process.argv.includes('--built');
const env={...process.env,LOCAL_ONLY:'true',LOCAL_SAVE_DIR:'.local-saves',PORT:'5173',NODE_ENV:built?'production':'development',CLIENT_ORIGINS:'http://localhost:5173,http://127.0.0.1:5173'};
for(const key of Object.keys(env))if(key.startsWith('SUPABASE_')||key==='REQUIRE_PERSISTENCE'||key==='VITE_SERVER_URL')delete env[key];
console.log('LOCAL V2 RC2: http://localhost:5173 — laptop saves in .local-saves; production disabled');
const child=spawn(process.execPath,built?['dist-server/index.js']:['--import','tsx','server/src/index.ts'],{stdio:'inherit',env});
child.on('exit',code=>process.exit(code??0));
