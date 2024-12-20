import { describe, it } from 'node:test';
import assert from 'node:assert';

import { merge, flatten } from './src/util.js';
import types from './src/types.js';
import log from './src/log.js';

describe('logger', () => {
  const logger = log(true);

  const plain = logger('<magenta>colorized</magenta>');
  it('logs colorized text with prefix to the console', () => {
    assert.strictEqual(plain, '_  \x1B[35mcolorized\x1B[0m');
  });

  const box = logger(`<box><yellow><blue>blue</blue></yellow><hr><cyan>cyan</cyan></box>`);
  it('logs advanced ascii box layout to the console', () => {
    assert.strictEqual(box, '   \r\n   ┌────────┐\n   │  \x1B[33;44mblue\x1B[0m  │\n   ├────────┤\n   │  \x1B[36mcyan\x1B[0m  │\n   └────────┘');
  });
});

describe('types', () => {
  it('resolves mime type based on file extension', () => {
    assert.strictEqual('image/svg+xml', types('logo.svg'));
  });

  it('returns fallback mime type for files without extension', () => {
    assert.strictEqual('text/html', types('LICENSE'));
  });
});

describe('flatten', () => {
  const obj = { this: { should: { be: { a: 'string' } } } };

  it('uses dot as default separator', () => {
    assert.strictEqual(obj.this.should.be.a, flatten(obj)['this.should.be.a']);
  });

  it('supports optional separator and prefix', () => {
    assert.strictEqual(obj.this.should.be.a, flatten(obj, '/')['/this/should/be/a']);
  });
});

describe('merge', () => {
  const obj = { one: { two: true } };

  it('adds nested prop', () => {
    const merged1 = merge(obj, { one: { three: true } });
    assert.strictEqual(merged1.one.two, true);
    assert.strictEqual(merged1.one.three, true);
  });

  it('updates nested true to false', () => {
    const merged2 = merge(obj, { one: { two: false } });
    assert.strictEqual(merged2.one.two, false);
    assert.strictEqual(merged2.one.three, true);
  });

  it('modifies first argument object', () => {
    assert.notStrictEqual(JSON.stringify(obj), JSON.stringify({ one: { two: true } }));
  });
});
