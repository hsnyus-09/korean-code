import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { compile } from '../src/index.js';

test('does not treat Object.prototype names as Korean keywords', () => {
  const source = `클래스 A { constructor() { 이것.값 = 1; } }
클래스 B 상속 A { constructor() { 부모(); } }
상수 toString = 2; 상수 hasOwnProperty = 3;
(생성 B()).값 + toString + hasOwnProperty;`;
  assert.equal(vm.runInNewContext(compile(source).code), 6);
});

test('supports async arrows and async function expressions', async () => {
  const source = `상수 f = 비동기 (값) => 기다림 Promise.resolve(값);
상수 g = 비동기 함수(값) { 반환 기다림 f(값); }; g(7);`;
  assert.equal(await vm.runInNewContext(compile(source).code), 7);
});

test('keeps contextual aliases distinct in destructuring, parameters and exports', () => {
  const source = '상수 {중, of} = {중:1, of:2}; 함수 f(읽기,get){반환 읽기+get;} 내보내기 {중,of};';
  assert.match(compile(source).code, /export \{중,of\}/u);
  const runnable = source.replace('내보내기 {중,of};', 'f(중,of);');
  assert.equal(vm.runInNewContext(compile(runnable).code), 3);
});

test('supports await using and ordinary using identifiers', () => {
  assert.match(compile('기다림 사용선언 값 = { [Symbol.asyncDispose]: 비동기 함수() {} };').code, /await using 값/u);
  assert.equal(compile('상수 사용선언 = 1; 상수 using = 2; 내보내기 {사용선언,using};').code,
    'const 사용선언 = 1; const using = 2; export {사용선언,using};');
});

test('contextual keyword lookahead does not misread division as a regex', () => {
  for (const name of ['async', '비동기', 'using', '사용선언']) {
    const source = `상수 ${name} = 8; ${name} / 2;`;
    assert.equal(vm.runInNewContext(compile(source).code), 4);
  }
});

test('empty .kjsx modules compile without an artificial syntax error', () => {
  assert.equal(compile('', { filename: 'empty.kjsx' }).code, '');
});

test('translates default import and export specifiers, not quoted Korean names', () => {
  assert.equal(compile('가져오기 { 기본 별칭 이름 } 출처 "x";').code, 'import { default as 이름 } from "x";');
  assert.equal(compile('내보내기 { 기본 별칭 이름 } 출처 "x";').code, 'export { default as 이름 } from "x";');
  assert.equal(compile('상수 값=1; 내보내기 { 값 별칭 기본 };').code, 'const 값=1; export { 값 as default };');
  assert.equal(compile('가져오기 { "기본" 별칭 이름 } 출처 "x";').code, 'import { "기본" as 이름 } from "x";');
});

test('keeps Korean and English contextual labels distinct', () => {
  for (const target of ['중', 'of']) {
    const source = `상수 값=[]; 중: {of: {값.push(1); 중단 ${target};} 값.push(2);} 값;`;
    const expected = target === '중' ? [1] : [1, 2];
    assert.deepEqual(Array.from(vm.runInNewContext(compile(source).code)), expected);
  }
});
