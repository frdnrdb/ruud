import { readdirSync } from 'fs';
import path from 'path';

const root = process.cwd();

export default async (folder, object = {}) => {
  const relativeFolder = folder.split('/').filter(str => /^[a-zA-Z0-9-]+$/.test(str));
  const folderPath = path.resolve(root, ...relativeFolder);

  for (const file of readdirSync(folderPath)) {
    const [name, ext] = file.split('.');
    if (!name) continue; // skip dotfiles like .DS_Store
    object[`/${name}`] = await import(`${folderPath}/${name}.${ext}`).then(r => r.default);
  }

  return object;
};
