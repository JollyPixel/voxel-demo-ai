import assert from 'node:assert/strict';
import { test } from 'node:test';
import { strFromU8, unzipSync } from 'fflate';
import { decodePixelArtDocument } from '@jolly-pixel/pixel-draw.renderer';
import {
  BlockRegistry,
  decodeVoxelDocument,
  deserializeVoxelWorld,
  TilesetList,
  VoxelWorld
} from '@jolly-pixel/voxel.renderer';
import { createEditorArchive, EDITOR_TARGET, EditorArchiveError } from '../src/core/export/editorArchive.ts';

const kAtlas = { width: 64, height: 32, data: new Uint8ClampedArray(64 * 32 * 4).fill(200) };
const kTileset = { id: 'tomb', tileSize: 32, atlas: kAtlas };

function savedWorld(voxels = { '-3,4,70': { block: 1, transform: 0 } }) {
  return {
    version: 1,
    chunkSize: 32,
    tilesets: [{ id: 'tomb', src: 'data:image/png;base64,AAAA', tileSize: 32, cols: 2, rows: 1 }],
    layers: [{ id: 'layer_0', name: 'Terrain', visible: true, order: 0, voxels }],
    objectLayers: [],
    blocks: [{
      id: 1,
      name: 'Sandstone',
      shapeId: 'cube',
      collidable: true,
      faceTextures: {},
      properties: {},
      defaultTexture: { tilesetId: 'tomb', col: 1, row: 0 }
    }]
  };
}

function unzip(bytes) {
  return unzipSync(bytes);
}

test('lists the tileset before the map root in the manifest', () => {
  const files = unzip(createEditorArchive({ world: savedWorld(), tileset: kTileset, name: 'floating-tomb' }).bytes);
  const manifest = JSON.parse(strFromU8(files['bundle.json']));

  assert.deepEqual(Object.keys(files).sort(), [
    'bundle.json',
    'maps/floating-tomb.voxelmap.json',
    'textures/floating-tomb.pixelart'
  ]);
  assert.deepEqual(manifest.root, { id: 'floating-tomb-map', kind: 'voxelmap' });
  assert.deepEqual(manifest.assets.map(({ kind }) => kind), ['pixelart', 'voxelmap']);
});

test('writes a map an editor world of the editor chunk size loads', () => {
  const files = unzip(createEditorArchive({ world: savedWorld(), tileset: kTileset, name: 'floating-tomb' }).bytes);
  const document = decodeVoxelDocument(files['maps/floating-tomb.voxelmap.json']);
  const world = new VoxelWorld(EDITOR_TARGET.chunkSize);
  const blocks = new BlockRegistry();
  const tilesets = new TilesetList();
  deserializeVoxelWorld(document, world, { blocks, tilesets });

  assert.equal(document.chunkSize, 16);
  assert.deepEqual(document.tilesets, [
    { id: 'tomb', asset: { id: 'floating-tomb-tileset', kind: 'pixelart' }, tileSize: 32 }
  ]);
  assert.equal(world.voxelCount, 1);
  assert.equal([...blocks][0].name, 'Sandstone');
});

test('stores the atlas pixels as a pixel-art document', () => {
  const files = unzip(createEditorArchive({ world: savedWorld(), tileset: kTileset, name: 'floating-tomb' }).bytes);
  const document = decodePixelArtDocument(files['textures/floating-tomb.pixelart']);

  assert.deepEqual(document.size, { x: 64, y: 32 });
  assert.deepEqual(document.uvRegions, []);
});

test('refuses a world over the editor entry limit', () => {
  const voxels = {};
  for (let i = 0; i < 520_000; i++) {
    voxels[`${i},0,0`] = { block: 1, transform: 0 };
  }

  assert.throws(
    () => createEditorArchive({ world: savedWorld(voxels), tileset: kTileset, name: 'floating-tomb' }),
    (error) => error instanceof EditorArchiveError && /voxelmap\.json is .* MiB/.test(error.message)
  );
});

test('refuses a tileset the world does not declare', () => {
  assert.throws(
    () => createEditorArchive({ world: savedWorld(), tileset: { ...kTileset, id: 'other' }, name: 'floating-tomb' }),
    EditorArchiveError
  );
});
