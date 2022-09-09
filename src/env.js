import { existsSync, readFileSync } from 'fs';

export default function(logger) {
  const envFile = `${process.cwd()}/.env`;
  const env = existsSync(envFile) && readFileSync(envFile, 'utf-8');

  if (!env) return;

  env.replace(/^([^#=\n]+)=([^#\n\r]+)(?:#.+)?$/gm, (_, key, val) => {
      if (val.trim()) {
          process.env[key] = val;
          logger(key);
      }
  });

  process.stdout.write('\n');
}