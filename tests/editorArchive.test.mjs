import assert from 'node:assert/strict';
import { test } from 'node:test';
import { strFromU8, unzipSync } from 'fflate';
import { parsePixelArtDocument } from '@jolly-pixel/pixel-draw.renderer';
import {
  DEFAULT_CHUNK_SIZE,
  decodeVoxelDocument,
  deserializeVoxelWorld,
  projectTilesetBlock,
  TilesetDocument,
  TilesetList,
  VoxelWorld
} from '@jolly-pixel/voxel.renderer';
import { createEditorArchive, EditorArchiveError } from '../src/core/export/editorArchive.ts';

const kAtlas = { width: 64, height: 32, data: new Uint8ClampedArray(64 * 32 * 4).fill(200) };
const kTileset = {
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
    defaultTilesetId: 'tomb',
    materialGroup: 'gold'
  }],
  materialGroups: [{ id: 'gold', roughness: 0.38, metalness: 0.75, emissive: '#000000', emissiveIntensity: 1 }]
};

function savedWorld(voxels = { '-3,4,70': { block: 1, transform: 0 } }) {
  return {
    version: 2,
    chunkSize: 32,
    tilesets: [{ id: 'tomb', slot: 0, src: 'data:image/png;base64,AAAA', tileSize: 32, cols: 2, rows: 1 }],
    layers: [{ id: 'layer_0', name: 'Terrain', visible: true, order: 0, voxels }],
    objectLayers: []
  };
}

function unzip(bytes) {
  return unzipSync(bytes);
}

function archive(options = {}) {
  return createEditorArchive({ world: savedWorld(), tileset: kTileset, name: 'floating-tomb', ...options });
}

function tilesetAsset(files) {
  return JSON.parse(strFromU8(files['tilesets/floating-tomb.tileset.json']));
}

test('lists the tileset before the map root in the manifest', () => {
  const files = unzip(archive().bytes);
  const manifest = JSON.parse(strFromU8(files['bundle.json']));

  assert.deepEqual(Object.keys(files).sort(), [
    'bundle.json',
    'maps/floating-tomb.voxelmap.json',
    'tilesets/floating-tomb.tileset.json'
  ]);
  assert.deepEqual(manifest.root, { id: 'floating-tomb-map', kind: 'voxelmap' });
  assert.deepEqual(manifest.assets.map(({ kind }) => kind), ['tileset', 'voxelmap']);
});

test('writes a version 2 map an editor world of the default chunk size loads', () => {
  const files = unzip(archive().bytes);
  const document = decodeVoxelDocument(files['maps/floating-tomb.voxelmap.json']);
  const world = new VoxelWorld(DEFAULT_CHUNK_SIZE);
  const tilesets = new TilesetList();
  deserializeVoxelWorld(document, world, { tilesets });

  assert.equal(document.version, 2);
  assert.equal(document.chunkSize, 32);
  assert.deepEqual(document.tilesets, [
    { id: 'tomb', slot: 0, asset: { id: 'floating-tomb-tileset', kind: 'tileset' } }
  ]);
  assert.equal(world.voxelCount, 1);
  assert.equal(world.getVoxelAt({ x: -3, y: 4, z: 70 })?.blockId, 1);
});

test('stores the atlas, blocks and finishes in the tileset asset', () => {
  const asset = tilesetAsset(unzip(archive().bytes));
  const pixels = parsePixelArtDocument(asset.pixels);
  const tileset = new TilesetDocument(asset);

  assert.equal(asset.version, 1);
  assert.equal(tileset.tileSize, 32);
  assert.deepEqual(pixels.size, { x: 64, y: 32 });
  assert.equal(tileset.materialGroups.get('gold')?.metalness, 0.75);

  const [block] = tileset.blocks;
  assert.equal(block.name, 'Sandstone');
  assert.equal(block.defaultTexture.tilesetId, undefined);
  assert.equal(block.faceTextures.top.tilesetId, undefined);
});

test('tileset blocks project onto the ids the map stores', () => {
  const asset = tilesetAsset(unzip(archive().bytes));
  const [block] = new TilesetDocument(asset).blocks;
  const projected = projectTilesetBlock({ id: 'tomb', slot: 0 }, block);

  assert.equal(projected.id, 1);
  assert.equal(projected.defaultTexture.tilesetId, 'tomb');
  assert.equal(projected.materialGroup, 'tomb/gold');
});

test('refuses an archive over the editor limits', () => {
  const voxels = {};
  for (let i = 0; i < 1000; i++) {
    voxels[`${i},0,0`] = { block: 1, transform: 0 };
  }
  const options = { world: savedWorld(voxels) };

  assert.throws(
    () => archive({ ...options, limits: { maxEntryBytes: 16 * 1024, maxBytes: 1024 * 1024 } }),
    (error) => error instanceof EditorArchiveError && /voxelmap\.json is .* MiB/.test(error.message)
  );
  assert.throws(
    () => archive({ ...options, limits: { maxEntryBytes: 1024 * 1024, maxBytes: 32 * 1024 } }),
    (error) => error instanceof EditorArchiveError && /archive is .* MiB decoded/.test(error.message)
  );
});

test('refuses a tileset the world does not declare', () => {
  assert.throws(
    () => archive({ tileset: { ...kTileset, id: 'other' } }),
    EditorArchiveError
  );
});
