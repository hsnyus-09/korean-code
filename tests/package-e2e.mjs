import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = new URL('../', import.meta.url).pathname;
const directory = await mkdtemp(join(tmpdir(), 'korean-code-package-'));
const run = (command, args, cwd = directory) => execFileSync(command, args, { cwd, stdio: 'inherit' });
let browser;
let server;
let preview;

try {
  run('pnpm', ['pack', '--pack-destination', directory], root);
  await writeFile(join(directory, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  run('npm', ['install', '--ignore-scripts', join(directory, 'korean-code-0.1.0.tgz')]);
  const require = createRequire(join(directory, 'package.json'));
  // Resolve import conditions from the installed consumer, not this repository.
  await writeFile(join(directory, 'loader.mjs'), 'export const load = name => import(name);');
  const { load } = await import(pathToFileURL(join(directory, 'loader.mjs')).href);
  const { compile } = await load('korean-code');
  const runtime = await load('korean-code/runtime');
  assert.match(compile('상수 x = 1;').code, /const x = 1/u);
  assert.equal(typeof runtime.출력, 'function');
  assert.throws(() => require.resolve('react'), error => error?.code === 'MODULE_NOT_FOUND');
  assert.throws(() => require.resolve('vite'), error => error?.code === 'MODULE_NOT_FOUND');
  console.log('PASS: packed compiler and runtime work without React or Vite');

  run('npm', ['install', 'vite@^8.3.4', 'react@^19.3.0', 'react-dom@^19.3.0']);
  const vite = await load('vite');
  const { default: koreanCode } = await load('korean-code/vite');
  const hooks = await load('korean-code/react');
  const react = await load('react');
  assert.equal(hooks.상태사용, react.useState);
  const write = (filename, source) => writeFile(join(directory, filename), source);
  await write('index.html', '<!doctype html><html lang="ko"><meta charset="UTF-8"><div id="root"></div><script type="module" src="/main.kjsx"></script></html>');
  await write('plain.js', 'export const suffix = "!";');
  await write('message.kjs', '가져오기 { suffix } 출처 "./plain.js"; 상수 문구 = "한글" + suffix; 내보내기 { 문구 별칭 기본 };');
  await write('forward.kjs', '내보내기 { 기본 별칭 별도문구 } 출처 "./message.kjs";');
  await write('main.kjsx', `
가져오기 { createRoot } 출처 'react-dom/client';
가져오기 { 상태사용, 효과사용 } 출처 'korean-code/react';
가져오기 { 기본 별칭 문구 } 출처 './message.kjs';
가져오기 { 별도문구 } 출처 './forward.kjs';
만약 (문구 !== 별도문구) 던지기 Error('재내보내기 불일치');
함수 카운터() {
  상수 [수, 설정] = 상태사용(0);
  상수 [이름, 이름설정] = 상태사용('');
  효과사용(() => { document.title = '횟수:' + 수; }, [수]);
  반환 <><button onClick={() => 설정(수 + 1)}>{문구} {수}</button><input aria-label="이름" value={이름} onChange={e => 이름설정(e.target.value)}/><p>{이름}</p></>;
}
createRoot(document.getElementById('root')).render(<카운터/>);
`);
  await write('vanilla.html', '<!doctype html><html lang="ko"><meta charset="UTF-8"><button>클릭</button><script type="module" src="/vanilla.kjs"></script></html>');
  await write('vanilla.kjs', `가져오기 { 요소찾기 } 출처 'korean-code/runtime'; 상수 버튼 = 요소찾기('button'); 버튼.addEventListener('click', () => { 버튼.textContent = '성공'; });`);
  browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const config = { root: directory, configFile: false, plugins: [koreanCode()], logLevel: 'warn' };
  server = await vite.createServer({ ...config, server: { host: '127.0.0.1', port: 0 } });
  await server.listen();

  async function verify(base) {
    await page.goto(base);
    const button = page.getByRole('button');
    await button.waitFor();
    assert.equal(await button.textContent(), '한글! 0');
    await button.click();
    await page.waitForFunction(() => document.title === '횟수:1');
    assert.equal(await button.textContent(), '한글! 1');
    await page.getByRole('textbox', { name: '이름' }).fill('세종');
    assert.equal(await page.locator('p').textContent(), '세종');
    await page.goto(new URL('vanilla.html', base).href);
    await page.getByRole('button').click();
    assert.equal(await page.getByRole('button').textContent(), '성공');
  }
  const base = server.resolvedUrls.local[0];
  await verify(base);
  await page.goto(base);
  await page.getByRole('button').click();
  await page.waitForFunction(() => document.title === '횟수:1');
  const navigation = page.waitForEvent('framenavigated', { predicate: frame => frame === page.mainFrame() });
  await write('message.kjs', '가져오기 { suffix } 출처 "./plain.js"; 상수 문구 = "수정" + suffix; 내보내기 { 문구 별칭 기본 };');
  await navigation;
  await page.waitForFunction(() => document.querySelector('button')?.textContent === '수정! 0');
  console.log('PASS: installed package dev, JSX, DOM, cross-file imports, React hooks, input, full reload');
  await server.close(); server = undefined;
  // Restore the shared fixture before proving the same behavior in production.
  await write('message.kjs', '가져오기 { suffix } 출처 "./plain.js"; 상수 문구 = "한글" + suffix; 내보내기 { 문구 별칭 기본 };');
  await vite.build({ ...config, build: { sourcemap: true, rolldownOptions: { input: { main: join(directory, 'index.html'), vanilla: join(directory, 'vanilla.html') } } } });
  preview = await vite.preview({ root: directory, configFile: false, preview: { host: '127.0.0.1', port: 0 } });
  await verify(preview.resolvedUrls.local[0]);
  assert.deepEqual(errors, []);
  const packed = JSON.parse(await readFile(join(directory, 'node_modules/korean-code/package.json'), 'utf8'));
  assert.equal(packed.name, 'korean-code');
  console.log('PASS: installed package production builds run in Chromium without page errors');
} finally {
  await server?.close();
  if (preview) await new Promise((resolve, reject) => preview.httpServer.close(error => error ? reject(error) : resolve()));
  await browser?.close();
  await rm(directory, { recursive: true, force: true });
}
