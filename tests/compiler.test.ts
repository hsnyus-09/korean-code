import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';
import { CompileError, compile, keywords } from '../src/index.js';

function compileCode(source: string, filename = 'sample.kjs'): string {
  return compile(source, { filename }).code;
}

function runExpression(source: string): unknown {
  return vm.runInNewContext(compileCode(source), {}, { filename: 'sample.kjs' });
}

const aliasCases: Readonly<Record<string, { source: string; expected: string }>> = {
  상수: { source: '상수 값 = 1;', expected: 'const 값 = 1;' },
  변수: { source: '변수 값 = 1;', expected: 'let 값 = 1;' },
  옛변수: { source: '옛변수 값 = 1;', expected: 'var 값 = 1;' },
  함수: { source: '함수 값() {}', expected: 'function 값() {}' },
  반환: { source: '함수 값() { 반환 1; }', expected: 'return 1;' },
  만약: { source: '만약 (참) {}', expected: 'if (true) {}' },
  아니면: { source: '만약 (거짓) {} 아니면 {}', expected: 'else {}' },
  선택: { source: '선택 (1) { 기본: 중단; }', expected: 'switch (1)' },
  경우: { source: '선택 (1) { 경우 1: 중단; 기본: 중단; }', expected: 'case 1:' },
  기본: { source: '선택 (1) { 기본: 중단; }', expected: 'default:' },
  반복: { source: '반복 (변수 i = 0; i < 1; i++) {}', expected: 'for (let i = 0;' },
  동안: { source: '동안 (거짓) { 중단; }', expected: 'while (false)' },
  실행: { source: '실행 { 중단; } 동안 (거짓);', expected: 'do {' },
  중단: { source: '동안 (참) { 중단; }', expected: 'break;' },
  계속: { source: '반복 (변수 i = 0; i < 1; i++) { 계속; }', expected: 'continue;' },
  시도: { source: '시도 {} 잡기 (오류) {}', expected: 'try {}' },
  잡기: { source: '시도 {} 잡기 (오류) {}', expected: 'catch (오류)' },
  마침내: { source: '시도 {} 마침내 {}', expected: 'finally {}' },
  던지기: { source: '함수 실패() { 던지기 Error(); }', expected: 'throw Error();' },
  가져오기: { source: "가져오기 값 출처 './x.js';", expected: "import 값 from './x.js';" },
  내보내기: { source: '내보내기 상수 값 = 1;', expected: 'export const 값 = 1;' },
  출처: { source: "가져오기 값 출처 './x.js';", expected: "from './x.js';" },
  별칭: { source: "가져오기 { x 별칭 y } 출처 './x.js';", expected: 'x as y' },
  클래스: { source: '클래스 A {}', expected: 'class A {}' },
  상속: { source: '클래스 A {} 클래스 B 상속 A {}', expected: 'extends A' },
  생성: { source: '클래스 A {} 생성 A();', expected: 'new A();' },
  이것: { source: '클래스 A { 값() { 반환 이것; } }', expected: 'return this;' },
  부모: { source: '클래스 A { 값() {} } 클래스 B 상속 A { 값() { 반환 부모.값(); } }', expected: 'super.값();' },
  정적: { source: '클래스 A { 정적 값() {} }', expected: 'static 값()' },
  비동기: { source: '비동기 함수 값() {}', expected: 'async function 값()' },
  기다림: { source: '비동기 함수 값() { 반환 기다림 Promise.resolve(1); }', expected: 'await Promise.resolve(1)' },
  양보: { source: '함수 *값() { 양보 1; }', expected: 'yield 1;' },
  참: { source: '참;', expected: 'true;' },
  거짓: { source: '거짓;', expected: 'false;' },
  널: { source: '널;', expected: 'null;' },
  자료형: { source: '자료형 값;', expected: 'typeof 값;' },
  삭제: { source: '삭제 값.x;', expected: 'delete 값.x;' },
  무효: { source: '무효 0;', expected: 'void 0;' },
  안에: { source: "'x' 안에 값;", expected: "'x' in 값;" },
  인스턴스인가: { source: '값 인스턴스인가 A;', expected: '값 instanceof A;' },
  중: { source: '반복 (상수 값 중 [1]) {}', expected: 'of [1]' },
  읽기: { source: '클래스 A { 읽기 값() { 반환 1; } }', expected: 'get 값()' },
  쓰기: { source: '클래스 A { 쓰기 값(v) {} }', expected: 'set 값(v)' },
  함께: { source: "가져오기 data 출처 './x.json' 함께 { type: 'json' };", expected: "with { type: 'json' }" },
  디버거: { source: '디버거;', expected: 'debugger;' },
  사용선언: { source: '사용선언 값 = null;', expected: 'using 값 = null;' },
};

for (const [alias, target] of Object.entries(keywords)) {
  test(`translates ${alias} to ${target} in a syntax position`, () => {
    const testCase = aliasCases[alias];
    assert.ok(testCase, `missing alias coverage for ${alias}`);
    assert.equal(compileCode(testCase.source).includes(testCase.expected), true);
  });
}

test('preserves strings comments regular expressions and division expressions', () => {
  const source = `
    // 반환 상수
    상수 문자열 = '반환 상수';
    상수 정규식 = /반환+/u;
    문자열 + ':' + 정규식.test('반환') + ':' + (8 / 2);
  `;

  assert.equal(runExpression(source), '반환 상수:true:4');
  assert.match(compileCode(source), /\/\/ 반환 상수/u);
  assert.match(compileCode(source), /'반환 상수'/u);
  assert.match(compileCode(source), /\/반환\+\/u/u);
  assert.match(compileCode(source), /8 \/ 2/u);
});

test('translates expressions inside nested template placeholders', () => {
  const source = '상수 값 = 1; `문자 ${`안쪽 ${참 ? 값 + 1 : 0}`}`;';

  assert.equal(runExpression(source), '문자 안쪽 2');
});

test('preserves JSX tag names attribute names and text while translating JSX expressions', () => {
  const code = compileCode('함수 보기() { 반환 <화면 이름="상수">텍스트 {참}</화면>; }', 'view.kjsx');

  assert.match(code, /_jsxs\(화면/u);
  assert.match(code, /이름: "상수"/u);
  assert.match(code, /children: \["텍스트 ", true\]/u);
});

test('preserves object property names and private field names', () => {
  const source = `
    클래스 상자 {
      #상수 = 2;
      읽기 반환() { 반환 이것.#상수; }
      쓰기 반환(값) { 이것.#상수 = 값; }
    }
    상수 상 = 생성 상자();
    상.반환 = 3;
    상.반환;
  `;

  assert.equal(runExpression(source), 3);
});

test('keeps contextual Korean identifiers distinct from English spellings', () => {
  const code = compileCode('상수 async = 1; 상수 비동기 = 2; async + 비동기;');

  assert.match(code, /const async = 1/u);
  assert.match(code, /const 비동기 = 2/u);
  assert.equal(vm.runInNewContext(code), 3);
});

test('translates async generator class methods', async () => {
  const code = compileCode('클래스 A { 비동기 *값() { 양보 기다림 Promise.resolve(1); } } A;');
  const Klass = vm.runInNewContext(code) as { new(): { 값(): AsyncGenerator<number> } };
  const iterator = new Klass().값();
  const next = await iterator.next();

  assert.equal(next.value, 1);
  assert.equal(next.done, false);
});

test('preserves ASI semantics for return followed by a newline', () => {
  const source = `
    함수 값() {
      반환
      1;
    }
    값();
  `;

  assert.equal(runExpression(source), undefined);
});

test('compiles module import export aliases without executing user source', () => {
  const code = compileCode("가져오기 { x 별칭 y } 출처 './dep.js'; 내보내기 { y };");

  assert.equal(code, "import { x as y } from './dep.js'; export { y };");
});

test('does not execute user code during compilation', () => {
  const sideEffectKey = '__koreanCodeSideEffect';
  const globals = globalThis as Record<string, unknown>;
  delete globals[sideEffectKey];

  compile(`globalThis.${sideEffectKey} = 1; 함수 값() { 반환 1; }`, { filename: 'safe.kjs' });

  assert.equal(globals[sideEffectKey], undefined);
});

test('rejects filenames without a Korean code extension', () => {
  assert.throws(
    () => compile('상수 값 = 1;', { filename: 'plain.js' }),
    (error: unknown) => error instanceof CompileError
      && error.code === 'KOREAN_CODE_EXTENSION'
      && error.filename === 'plain.js',
  );
});

test('rejects JSX syntax in .kjs files', () => {
  assert.throws(
    () => compile('상수 값 = <div />;', { filename: 'plain.kjs' }),
    (error: unknown) => error instanceof CompileError
      && error.code === 'KOREAN_CODE_SYNTAX'
      && error.line === 1
      && error.column > 0,
  );
});

test('reports original source positions for syntax errors after keyword replacement', () => {
  assert.throws(
    () => compile('함수 값() {\n  반환 ;\n  상수 x = ;\n}', { filename: 'broken.kjs' }),
    (error: unknown) => error instanceof CompileError
      && error.code === 'KOREAN_CODE_SYNTAX'
      && error.filename === 'broken.kjs'
      && error.line === 3
      && error.column === 10,
  );
});

test('emits a source map whose generated keyword points to the original alias', () => {
  const result = compile('\n상수 값 = 1;', { filename: 'mapped.kjs' });
  const traced = new TraceMap(result.map);

  assert.deepEqual(
    originalPositionFor(traced, { line: 2, column: 0 }),
    { source: 'mapped.kjs', line: 2, column: 0, name: null },
  );
});

test('composes JSX maps back to Korean syntax and original source content', () => {
  const source = '함수 앱() {\n  반환 <div>{(() => { 던지기 Error("실패"); })()}</div>;\n}';
  for (const development of [false, true]) {
    const result = compile(source, { filename: 'source.kjsx', development });
    const lines = result.code.split('\n');
    const line = lines.findIndex(value => value.includes('throw'));
    assert.deepEqual(originalPositionFor(new TraceMap(result.map), { line: line + 1, column: lines[line].indexOf('throw') }),
      { source: 'source.kjsx', line: 2, column: 20, name: null });
    assert.deepEqual(result.map.sourcesContent, [source]);
  }
});
