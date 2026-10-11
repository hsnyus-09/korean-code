import assert from 'node:assert/strict';
import test from 'node:test';
import { compile, CompileError, keywords } from '../src/index.js';

const expectedKeywords = {
  상수: 'const', 변수: 'let', 옛변수: 'var', 함수: 'function', 반환: 'return',
  만약: 'if', 아니면: 'else', 선택: 'switch', 경우: 'case', 기본: 'default',
  반복: 'for', 동안: 'while', 실행: 'do', 중단: 'break', 계속: 'continue',
  시도: 'try', 잡기: 'catch', 마침내: 'finally', 던지기: 'throw',
  가져오기: 'import', 내보내기: 'export', 출처: 'from', 별칭: 'as',
  클래스: 'class', 상속: 'extends', 생성: 'new', 이것: 'this', 부모: 'super', 정적: 'static',
  비동기: 'async', 기다림: 'await', 양보: 'yield',
  참: 'true', 거짓: 'false', 널: 'null', 자료형: 'typeof', 삭제: 'delete', 무효: 'void',
  안에: 'in', 인스턴스인가: 'instanceof', 중: 'of', 읽기: 'get', 쓰기: 'set',
  함께: 'with', 디버거: 'debugger', 사용선언: 'using',
};

test('keeps the approved Korean keyword dictionary stable', () => {
  assert.deepEqual(keywords, expectedKeywords);
});

test('compiles Korean JavaScript modules without executing code', () => {
  const source = `
가져오기 { 값 별칭 입력값 } 출처 "./dep.js";
클래스 기본값 {}
클래스 상자 상속 기본값 {
  정적 읽기 이름() { 반환 "상자"; }
  쓰기 내용(값) { 이것.값 = 값; }
}
함수* 숫자들() { 양보 1; }
내보내기 기본 비동기 함수 실행하기(목록) {
  상수 참값 = 참;
  변수 합 = 0;
  옛변수 비었음 = 널;
  만약 (참값 && 자료형 비었음 === "object") {
    반복 (상수 항목 중 목록) { 합 += 항목; }
  } 아니면 {
    동안 (거짓) { 중단; }
  }
  선택 (합) {
    경우 0: 계속할수없음: 중단;
    기본: 합 += 기다림 Promise.resolve(입력값);
  }
  시도 { 생성 상자(); } 잡기 (오류) { 던지기 오류; } 마침내 { 디버거; }
  반환 합 + 무효 삭제 ({ a: 1 }).a;
}`;
  const result = compile(source, { filename: 'module.kjs' });
  assert.match(result.code, /import \{ 값 as 입력값 \} from "\.\/dep\.js";/u);
  assert.match(result.code, /class 상자 extends 기본값/u);
  assert.match(result.code, /static get 이름/u);
  assert.match(result.code, /function\* 숫자들\(\) \{ yield 1; \}/u);
  assert.match(result.code, /export default async function 실행하기/u);
  assert.match(result.code, /for \(const 항목 of 목록\)/u);
});

test('preserves strings comments regex literals and property names', () => {
  const source = `
상수 obj = { 반환: "반환", 만약: /반환+/u };
// 반환 만약 반복
상수 text = \`반환 \${만약값 ? "상수" : "변수"}\`;
obj.반환 = obj["만약"];
`;
  const result = compile(source, { filename: 'preserve.kjs' });
  assert.match(result.code, /const obj = \{ 반환: "반환", 만약: \/반환\+\/u \};/u);
  assert.match(result.code, /\/\/ 반환 만약 반복/u);
  assert.match(result.code, /`반환 \$\{만약값 \? "상수" : "변수"\}`/u);
  assert.match(result.code, /obj\.반환 = obj\["만약"\];/u);
});

test('lowers JSX while preserving JSX text and tag names', () => {
  const source = `
가져오기 { 상태사용 } 출처 "korean-code/react";
내보내기 기본 함수 카운터() {
  상수 [횟수, 횟수설정] = 상태사용(0);
  반환 <button data-label="반환" onClick={() => 횟수설정(횟수 + 1)}>반환: {횟수}</button>;
}`;
  const result = compile(source, { filename: 'counter.kjsx' });
  assert.match(result.code, /import \{ 상태사용 \} from "korean-code\/react";/u);
  assert.match(result.code, /from "react\/jsx-runtime"/u);
  assert.match(result.code, /return \/\*#__PURE__\*\//u);
  assert.match(result.code, /"반환: "/u);
});

test('reports extension and syntax errors with filename and original location', () => {
  assert.throws(() => compile('상수 x = 1;', { filename: 'bad.js' }), (error) => {
    assert.ok(error instanceof CompileError);
    assert.equal(error.code, 'KOREAN_CODE_EXTENSION');
    assert.equal(error.filename, 'bad.js');
    return true;
  });

  assert.throws(() => compile('상수 = ;', { filename: 'bad.kjs' }), (error) => {
    assert.ok(error instanceof CompileError);
    assert.equal(error.filename, 'bad.kjs');
    assert.equal(error.line, 1);
    assert.ok(error.column >= 1);
    return true;
  });
});
