import { existsSync, readFileSync } from 'fs';

export const DEV = process.env.NODE_ENV !== 'production';
export const vars = [];

if (DEV) {
  const envFile = `${process.cwd()}/.env`;
  const env = existsSync(envFile) && readFileSync(envFile, 'utf-8');

  env && env.replace(/^([^#=\n]+)=([^#\n\r]+)(?:#.+)?$/gm, (_, key, val) => {
    if (val.trim()) {
      process.env[key] = val;
      vars.push(key);
    }
  });
}