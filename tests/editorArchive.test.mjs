import assert from 'node:assert/strict';
import { test } from 'node:test';
import { strFromU8, unzipSync } from 'fflate';
import { parsePixelArtDocument } from '@jolly-pixel/pixel-draw.renderer';
import {
  DEFAULT_CHUNK_SIZE,
  decodeVoxelWorld,
  deserializeVoxelWorld,
  BlocksetDocument,
  BlocksetList,
  BlocksetSlot,
  VoxelDocument,
  VoxelWorld
} from '@jolly-pixel/voxel.renderer';
import { createEditorArchive, EditorArchiveError } from '../src/core/export/editorArchive.ts';

const kAtlas = { width: 64, height: 32, data: new Uint8ClampedArray(64 * 32 * 4).fill(200) };
const kBlockset = {
  id: 'tomb',
  tileSize: 32,
  atlas: kAtlas,
  blocks: [{
    id: 1,
    name: 'Sandstone',
    shapeId: 'cube',
    collidable: true,
    faceTextures: { top: [0, 0] },
    defaultTexture: [1, 0],
    defaultBlocksetId: 'tomb',
    materialGroup: 'gold'
  }],
  materialGroups: [{ id: 'gold', roughness: 0.38, metalness: 0.75, emissive: '#000000', emissiveIntensity: 1 }]
};

/**
 * A saved one-layer world holding `cells` and `partners`, a voxel patch.
 */
function savedWorld(cells = [-3, 4, 70, 1, 0], partners = []) {
  const document = new VoxelDocument({
    chunkSize: 32,
    layers: ['Terrain'],
    blocksets: [{ id: 'tomb', slot: 0, src: 'data:image/png;base64,AAAA', tileSize: 32, cols: 2, rows: 1 }]
  });
  document.world.patchVoxels('Terrain', cells, partners);

  return document.save();
}

function unzip(bytes) {
  return unzipSync(bytes);
}

function archive(options = {}) {
  return createEditorArchive({ world: savedWorld(), blockset: kBlockset, name: 'floating-tomb', ...options });
}

function blocksetAsset(files) {
  return JSON.parse(strFromU8(files['blocksets/floating-tomb.blockset.json']));
}

test('lists the blockset before the map root in the manifest', () => {
  const files = unzip(archive().bytes);
  const manifest = JSON.parse(strFromU8(files['bundle.json']));

  assert.deepEqual(Object.keys(files).sort(), [
    'blocksets/floating-tomb.blockset.json',
    'bundle.json',
    'maps/floating-tomb.voxelmap.json'
  ]);
  assert.deepEqual(manifest.root, { id: 'floating-tomb-map', kind: 'voxelmap' });
  assert.deepEqual(manifest.assets.map(({ kind }) => kind), ['blockset', 'voxelmap']);
});

test('writes a version 5 map an editor world of the default chunk size loads', () => {
  const files = unzip(archive().bytes);
  const document = decodeVoxelWorld(files['maps/floating-tomb.voxelmap.json']);
  const world = new VoxelWorld(DEFAULT_CHUNK_SIZE);
  const blocksets = new BlocksetList();
  deserializeVoxelWorld(document, world, { blocksets });

  assert.equal(document.version, 5);
  assert.equal(document.chunkSize, 32);
  assert.deepEqual(document.blocksets, [
    { id: 'tomb', slot: 0, asset: { id: 'floating-tomb-blockset', kind: 'blockset' } }
  ]);
  assert.equal(world.voxelCount, 1);
  assert.equal(world.getVoxelAt({ x: -3, y: 4, z: 70 })?.blockId, 1);
});

test('keeps both shapes of a merged cell', () => {
  const files = unzip(archive({ world: savedWorld([-3, 4, 70, 1, 0], [0, 2, 0]) }).bytes);
  const world = new VoxelWorld(DEFAULT_CHUNK_SIZE);
  deserializeVoxelWorld(decodeVoxelWorld(files['maps/floating-tomb.voxelmap.json']), world, { blocksets: new BlocksetList() });
  const entry = world.getVoxelAt({ x: -3, y: 4, z: 70 });

  assert.equal(world.voxelCount, 1);
  assert.equal(entry?.blockId, 1);
  assert.equal(entry?.partner?.blockId, 2);
});

test('stores the atlas, blocks and finishes in the blockset asset', () => {
  const asset = blocksetAsset(unzip(archive().bytes));
  const pixels = parsePixelArtDocument(asset.pixels);
  const blockset = new BlocksetDocument(asset);

  assert.equal(asset.version, 1);
  assert.equal(blockset.tileSize, 32);
  assert.deepEqual(pixels.size, { x: 64, y: 32 });
  assert.equal(blockset.materialGroups.get('gold')?.metalness, 0.75);

  const [block] = blockset.blocks;
  assert.equal(block.name, 'Sandstone');
  assert.equal(block.defaultTexture.blocksetId, undefined);
  assert.equal(block.faceTextures.top.blocksetId, undefined);
});

test('blockset blocks project onto the ids the map stores', () => {
  const asset = blocksetAsset(unzip(archive().bytes));
  const [block] = new BlocksetDocument(asset).blocks;
  const projected = new BlocksetSlot({ id: 'tomb', slot: 0 }).projectBlock(block);

  assert.equal(projected.id, 1);
  assert.equal(projected.defaultTexture.blocksetId, 'tomb');
  assert.equal(projected.materialGroup, 'tomb/gold');
});

test('refuses an archive over the editor limits', () => {
  // A 3D checkerboard: every run holds one voxel, the worst case of the format.
  const cells = [];
  for (let y = 0; y < 32; y++) {
    for (let z = 0; z < 32; z++) {
      for (let x = (y + z) % 2; x < 32; x += 2) {
        cells.push(x, y, z, 1, 0);
      }
    }
  }
  const options = { world: savedWorld(cells) };

  assert.throws(
    () => archive({ ...options, limits: { maxEntryBytes: 16 * 1024, maxBytes: 1024 * 1024 } }),
    (error) => error instanceof EditorArchiveError && /voxelmap\.json is .* MiB/.test(error.message)
  );
  assert.throws(
    () => archive({ ...options, limits: { maxEntryBytes: 1024 * 1024, maxBytes: 32 * 1024 } }),
    (error) => error instanceof EditorArchiveError && /archive is .* MiB decoded/.test(error.message)
  );
});

test('refuses a blockset the world does not declare', () => {
  assert.throws(
    () => archive({ blockset: { ...kBlockset, id: 'other' } }),
    EditorArchiveError
  );
});
