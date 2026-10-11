/** One dictionary shared by the compiler, documentation, and coverage tests. */
export const keywords: Readonly<Record<string, string>> = Object.freeze({
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
});
