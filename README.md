# korean-code

한글로 쓰는 JavaScript.

`.kjs`와 `.kjsx` 파일의 한글 키워드를 JavaScript로 변환합니다. Vite 플러그인과 React 훅, 브라우저 API의 한글 별칭을 제공합니다.

```jsx
가져오기 { 상태사용 } 출처 'korean-code/react';

내보내기 기본 함수 카운터() {
  상수 [횟수, 횟수설정] = 상태사용(0);

  반환 (
    <button onClick={() => 횟수설정(횟수 + 1)}>
      클릭: {횟수}
    </button>
  );
}
```

## 시작하기

Node.js `^22.18.0 || >=24.11.0`이 필요합니다. Vite 8과 React 19를 지원하며, 패키지는 ESM입니다.

> 아직 npm에 배포되지 않았습니다. 배포 전에는 [로컬 예제](#예제)를 실행할 수 있습니다.

```sh
pnpm add korean-code
```

Vite 설정에 플러그인을 추가합니다.

```js
// vite.config.js
import { defineConfig } from 'vite';
import koreanCode from 'korean-code/vite';

export default defineConfig({
  plugins: [koreanCode()],
});
```

JavaScript는 `.kjs`, JSX는 `.kjsx` 확장자를 사용합니다. 가져올 때도 확장자를 적어 주세요.

```js
import './main.kjs';
import App from './App.kjsx';
```

`.js`와 `.jsx` 파일은 변환하지 않습니다. 한글 파일도 빌드 후에는 일반 JavaScript로 실행됩니다.

## 문법

키워드만 한글로 바뀝니다. 연산자, 괄호, 세미콜론 규칙은 JavaScript와 같으며 영문 키워드를 함께 써도 됩니다.

```js
상수 숫자들 = [1, 2, 3];

반복 (상수 숫자 중 숫자들) {
  만약 (숫자 > 1) {
    console.log(숫자);
  }
}
```

| 한글 | JavaScript |
| --- | --- |
| 상수, 변수, 옛변수 | const, let, var |
| 함수, 반환 | function, return |
| 만약, 아니면, 선택, 경우, 기본 | if, else, switch, case, default |
| 반복, 동안, 실행, 중단, 계속 | for, while, do, break, continue |
| 시도, 잡기, 마침내, 던지기 | try, catch, finally, throw |
| 가져오기, 내보내기, 출처, 별칭 | import, export, from, as |
| 클래스, 상속, 생성, 이것, 부모, 정적 | class, extends, new, this, super, static |
| 비동기, 기다림, 양보 | async, await, yield |
| 참, 거짓, 널 | true, false, null |
| 자료형, 삭제, 무효, 안에, 인스턴스인가 | typeof, delete, void, in, instanceof |
| 중, 읽기, 쓰기, 함께, 디버거, 사용선언 | of, get, set, with, debugger, using |

문자열, 주석, 정규식, 템플릿 문자열의 텍스트, JSX 태그·속성·텍스트, 객체 프로퍼티와 멤버 이름은 변환하지 않습니다.

`출처`, `중`처럼 문맥에 따라 쓰이는 별칭은 일반 변수명으로도 사용할 수 있습니다. 예약어 별칭에는 JavaScript 예약어와 같은 제약이 적용됩니다. `undefined`, `constructor`, `import.meta`, `new.target`은 그대로 씁니다.

모듈에서 `기본`은 `default`를 뜻합니다. 실제 이름이 `기본`인 내보내기를 가져오려면 문자열 이름을 사용합니다.

```js
가져오기 { 기본 별칭 값 } 출처 './module.js';
가져오기 { '기본' 별칭 한글이름 } 출처 './module.js';
```

`함께`(`with`)는 가져오기 속성에서 사용할 수 있습니다. `with` 문은 JavaScript와 마찬가지로 ES 모듈에서 허용되지 않습니다.

## 한글 API

필요한 경우에만 가져와서 사용할 수 있습니다. 기존 JavaScript API를 그대로 써도 됩니다.

### 브라우저

```js
가져오기 { 출력, 요소찾기, 기다리기, 요청 } 출처 'korean-code/runtime';

출력('안녕');
상수 버튼 = 요소찾기('button');
기다림 기다리기(100);
상수 응답 = 기다림 요청('/api');
```

| API | 동작 |
| --- | --- |
| `출력`, `경고`, `오류출력` | `console.log`, `console.warn`, `console.error` |
| `요소찾기(selector, root?)` | `querySelector` |
| `요소들찾기(selector, root?)` | `querySelectorAll` — `NodeList` 반환 |
| `기다리기(ms)` | 지정한 시간 후 완료되는 `Promise` |
| `요청(...args)` | `fetch` |

요소 검색의 `root` 기본값은 `document`입니다. 브라우저 전역은 함수를 호출할 때 접근합니다.

### React

```js
가져오기 { 상태사용, 효과사용 } 출처 'korean-code/react';
```

React 훅을 이름만 바꿔 내보냅니다. 사용법과 훅 규칙은 동일합니다.

| 한글 | React |
| --- | --- |
| 상태사용 | useState |
| 효과사용 | useEffect |
| 참조사용 | useRef |
| 메모사용 | useMemo |
| 콜백사용 | useCallback |
| 문맥사용 | useContext |
| 리듀서사용 | useReducer |
| 배치효과사용 | useLayoutEffect |

## 컴파일러 API

Vite 없이 코드만 변환할 수도 있습니다.

```js
import { compile } from 'korean-code';

const { code, map } = compile('상수 값 = 1;', {
  filename: 'example.kjs',
});

console.log(code); // const 값 = 1;
```

`compile(source, options?)`는 변환된 `code`와 원본 내용을 포함한 v3 소스맵 `map`을 반환합니다.

| 옵션 | 기본값 | 설명 |
| --- | --- | --- |
| `filename` | `anonymous.kjs` | `.kjs` 또는 `.kjsx` 파일명 |
| `development` | `false` | JSX 개발 런타임 사용 여부 |

문법 오류는 `CompileError`로 전달됩니다. `filename`, `line`, `column`, `code`를 확인할 수 있습니다. 줄과 열은 1부터 시작하며, 오류 코드는 `KOREAN_CODE_SYNTAX` 또는 `KOREAN_CODE_EXTENSION`입니다.

컴파일러는 입력 코드를 실행하거나 프로젝트의 Babel 설정을 읽지 않습니다.

## 예제

- [Vanilla](examples/vanilla) — DOM과 이벤트
- [React](examples/react) — 상태와 효과

저장소 루트에서 실행합니다.

```sh
pnpm install
pnpm build
pnpm --dir examples/react install
pnpm --dir examples/react dev
```

Vanilla 예제는 위 명령의 `examples/react`를 `examples/vanilla`로 바꾸면 됩니다. 예제는 로컬 패키지(`file:../..`)를 사용하므로, 패키지를 수정한 뒤에는 다시 빌드하고 예제 의존성을 갱신해야 합니다.

## 개발

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

브라우저 테스트는 패키지 압축본을 별도 프로젝트에 설치해 Vite 개발 서버와 프로덕션 빌드를 확인합니다.

```sh
pnpm exec playwright install chromium
pnpm test:e2e
```

## 지원 범위

현재 버전은 JavaScript와 JSX를 위한 실험적 구현입니다.

- `.kjsx`는 React automatic JSX runtime을 사용합니다.
- 개발 중 한글 파일을 수정하면 페이지 전체를 새로고침합니다. React Fast Refresh는 지원하지 않습니다.
- 한글 훅 이름에 대한 ESLint 훅 규칙 및 React Compiler 연동은 제공하지 않습니다.
- TypeScript 입력, Next.js·SSR 전용 통합, 편집기 확장, 프로젝트 생성 CLI는 제공하지 않습니다.
- HTML과 CSS 문법은 바꾸지 않습니다.

파서는 Acorn 내부 확장 지점을 사용합니다. Acorn 버전은 고정되어 있으며, 변경할 때는 문법 회귀 테스트를 확인해야 합니다.

## 라이선스

[MIT](LICENSE)
