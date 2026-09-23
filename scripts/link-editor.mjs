import { existsSync, lstatSync, mkdirSync, symlinkSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const editor = resolve(root, '../editor');
const packages = [
  ['@jolly-pixel/engine', 'packages/engine'],
  ['@jolly-pixel/runtime', 'packages/runtime'],
  ['@jolly-pixel/ui', 'packages/ui'],
  ['@jolly-pixel/voxel.renderer', 'packages/voxel-renderer'],
  ['@jolly-pixel/pixel-draw.renderer', 'packages/pixel-draw-renderer'],
  ['fflate', 'packages/asset-server/node_modules/fflate'],
  ['@openally/config.typescript', 'node_modules/@openally/config.typescript'],
  ['@openally/config.oxlint', 'node_modules/@openally/config.oxlint'],
  ['@types/three', 'node_modules/@types/three'],
  ['vite', 'node_modules/vite'],
  ['typescript', 'node_modules/typescript'],
  ['oxlint', 'node_modules/oxlint'],
  ['three', 'packages/voxel-renderer/node_modules/three']
];

for (const [name, source] of packages) {
  const target = resolve(root, 'node_modules', name);
  const sourcePath = resolve(editor, source);
  if (!existsSync(sourcePath)) throw new Error(`Build the editor workspace first: ${sourcePath}`);
  if (!target.startsWith(resolve(root, 'node_modules') + '\\') &&
      !target.startsWith(resolve(root, 'node_modules') + '/')) throw new Error(`Unsafe link target ${target}`);
  mkdirSync(dirname(target), { recursive: true });
  if (existsSync(target)) {
    if (!lstatSync(target).isSymbolicLink()) {
      throw new Error(`Cannot replace a regular installed package: ${target}`);
    }
    unlinkSync(target);
  }
  symlinkSync(sourcePath, target, process.platform === 'win32' ? 'junction' : 'dir');
}
console.log('Linked editor workspace packages and tools.');
