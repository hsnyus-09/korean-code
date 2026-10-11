import assert from 'node:assert/strict';
import test from 'node:test';
import { 경고, 기다리기, 오류출력, 요청, 요소들찾기, 요소찾기, 출력 } from '../src/runtime.js';

test('console wrappers forward all values', () => {
  const original = { log: console.log, warn: console.warn, error: console.error };
  const calls: unknown[][] = [];
  console.log = (...values: unknown[]) => { calls.push(['log', ...values]); };
  console.warn = (...values: unknown[]) => { calls.push(['warn', ...values]); };
  console.error = (...values: unknown[]) => { calls.push(['error', ...values]); };
  try {
    출력('가', 1);
    경고('나');
    오류출력('다');
  } finally {
    console.log = original.log;
    console.warn = original.warn;
    console.error = original.error;
  }
  assert.deepEqual(calls, [['log', '가', 1], ['warn', '나'], ['error', '다']]);
});

test('DOM helpers use the provided root at call time', () => {
  const one = { id: 'one' };
  const two = { id: 'two' };
  const list = [one, two] as unknown as NodeListOf<Element>;
  const root = {
    querySelector(selector: string) {
      assert.equal(selector, '.item');
      return one;
    },
    querySelectorAll(selector: string) {
      assert.equal(selector, '.item');
      return list;
    },
  } as unknown as ParentNode;
  assert.equal(요소찾기('.item', root), one);
  assert.equal(요소들찾기('.item', root), list);
});

test('wait and fetch wrappers preserve browser semantics', async () => {
  const start = Date.now();
  await 기다리기(1);
  assert.ok(Date.now() >= start);

  const original = globalThis.fetch;
  const response = new Response('ok');
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(input, '/api');
    assert.equal(init?.method, 'POST');
    return Promise.resolve(response);
  }) as typeof fetch;
  try {
    assert.equal(await 요청('/api', { method: 'POST' }), response);
  } finally {
    globalThis.fetch = original;
  }
});
