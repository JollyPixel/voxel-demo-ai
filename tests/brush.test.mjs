import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Brush } from '../src/builder/Brush.ts';
import { outerCorner, rising } from '../src/builder/orientation.ts';
import { createRandom } from '../src/utils/random.ts';

const kStone = { ids: [1], layer: 'Structure' };
const kStair = { ids: [2], layer: 'Structure' };
const kFlower = { ids: [3], layer: 'Detail' };
const kRock = { ids: [4, 5, 6], layer: 'Terrain' };

function recordingBrush() {
  const cells = new Map();
  const world = {
    getLayer(name) {
      return {
        setVoxelAt({ x, y, z }, entry) { cells.set(`${name}|${x},${y},${z}`, entry); },
        removeVoxelAt({ x, y, z }) { cells.delete(`${name}|${x},${y},${z}`); }
      };
    }
  };

  return { brush: Brush.forWorld(world), cells };
}

test('seeded random sequence is repeatable', () => {
  const a = createRandom(42);
  const b = createRandom(42);
  assert.deepEqual(Array.from({ length: 20 }, a), Array.from({ length: 20 }, b));
  assert.notDeepEqual(Array.from({ length: 4 }, createRandom(1)), Array.from({ length: 4 }, createRandom(2)));
});

test('disc contains lattice points inside the requested radius', () => {
  const { brush, cells } = recordingBrush();
  brush.disc([3, 8, -2], 2, kStone);
  assert.equal(cells.size, 13);
  for (const key of cells.keys()) {
    const [x, y, z] = key.split('|')[1].split(',').map(Number);
    assert.ok((x - 3) ** 2 + (z + 2) ** 2 <= 4);
    assert.equal(y, 8);
  }
});

test('blocks are written to their own layer', () => {
  const { brush, cells } = recordingBrush();
  brush.put([0, 0, 0], kStone);
  brush.put([0, 1, 0], kFlower);
  assert.deepEqual([...cells.keys()], ['Structure|0,0,0', 'Detail|0,1,0']);
});

test('alternate tiles are chosen from the world position', () => {
  const first = recordingBrush();
  const second = recordingBrush();
  first.brush.box([0, 0, 0], [9, 0, 9], kRock);
  second.brush.translated([5, 0, 0]).box([-5, 0, 0], [4, 0, 9], kRock);
  const ids = [...first.cells.values()].map(({ blockId }) => blockId);
  assert.deepEqual(new Set(ids), new Set(kRock.ids));
  assert.deepEqual(ids, [...second.cells.values()].map(({ blockId }) => blockId));
});

test('clear empties every layer', () => {
  const { brush, cells } = recordingBrush();
  brush.put([0, 0, 0], kStone);
  brush.put([0, 0, 0], kFlower);
  brush.put([1, 0, 0], kStone);
  brush.clear([0, 0, 0], [0, 0, 0]);
  assert.deepEqual([...cells.keys()], ['Structure|1,0,0']);
});

test('translated brushes compose offsets, rotations and flips', () => {
  const { brush, cells } = recordingBrush();
  const translated = brush.translated([40, 0, -20]).translated([0, 1, 0]);
  translated.put([1, 2, 3], kStair, { ...rising('W'), flipY: true });
  const [[key, entry]] = cells;
  assert.equal(key, 'Structure|41,3,-17');
  assert.equal(entry.transform & 3, 3);
  assert.ok((entry.transform & 16) !== 0);
});

test('orientation helpers follow the engine rotation table', () => {
  assert.deepEqual(['S', 'E', 'N', 'W'].map((direction) => rising(direction).rotation), [0, 1, 2, 3]);
  // Ramp corners peak at (-x, +z) unturned; stair corners one turn later.
  assert.equal(outerCorner('ramp', -1, 1).rotation, 0);
  assert.equal(outerCorner('ramp', 1, -1).rotation, 2);
  assert.equal(outerCorner('stair', -1, -1).rotation, 0);
});

test('fixtures are shared and recorded in world coordinates', () => {
  const { brush } = recordingBrush();
  brush.translated([10, 0, 5]).pool([1, 2, 3], 4, 6);
  brush.light([0, 1, 0], { color: '#fff', intensity: 1, distance: 2 });
  assert.deepEqual(brush.fixtures.pools, [{ center: [11, 2, 8], width: 4, depth: 6 }]);
  assert.deepEqual(brush.fixtures.lights[0].position, [0, 1, 0]);
});
