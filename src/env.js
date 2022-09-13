import { existsSync, readFileSync } from 'fs';

export default function() {
  const envFile = `${process.cwd()}/.env`;
  const env = existsSync(envFile) && readFileSync(envFile, 'utf-8');

  const log = [];
  
  env && env.replace(/^([^#=\n]+)=([^#\n\r]+)(?:#.+)?$/gm, (_, key, val) => {
      if (val.trim()) {
          process.env[key] = val;
          log.push(key);
      }
  });

  return log;
}