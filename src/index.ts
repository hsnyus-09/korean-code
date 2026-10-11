import MagicString from 'magic-string';
import { parse } from '@babel/parser';
import { transformFromAstSync } from '@babel/core';
import jsx from '@babel/plugin-transform-react-jsx';
import jsxDevelopment from '@babel/plugin-transform-react-jsx-development';
import remapping from '@jridgewell/remapping';
import { scan, type Replacement } from './scanner.js';
export { keywords } from './keywords.js';

export interface CompileOptions { filename?: string; development?: boolean }
export interface SourceMap {
  version: 3; sources: string[]; sourcesContent?: (string | null)[];
  names: string[]; mappings: string; file?: string;
}
export interface CompileResult { code: string; map: SourceMap }

export class CompileError extends SyntaxError {
  readonly code: 'KOREAN_CODE_SYNTAX' | 'KOREAN_CODE_EXTENSION';
  constructor(message: string, readonly filename: string, readonly line: number, readonly column: number,
    code: CompileError['code'] = 'KOREAN_CODE_SYNTAX', options?: ErrorOptions) {
    super(`${filename}:${line}:${column}: ${message}`, options);
    this.name = 'CompileError';
    this.code = code;
  }
}

/** Compiles an ES module without executing it. Error columns are one-based. */
export function compile(source: string, options: CompileOptions = {}): CompileResult {
  const filename = options.filename ?? 'anonymous.kjs';
  if (!/\.kjsx?$/u.test(filename)) throw new CompileError('파일 확장자는 .kjs 또는 .kjsx여야 합니다.', filename, 1, 1, 'KOREAN_CODE_EXTENSION');
  const withJsx = filename.endsWith('.kjsx');
  const output = new MagicString(source);
  let replacements: Replacement[];
  try {
    replacements = scan(source, withJsx);
    for (const replacement of replacements) output.overwrite(replacement.start, replacement.end, replacement.value);
  } catch (cause) {
    const error = cause as { message: string; loc?: { line: number; column: number } };
    throw new CompileError(`문법 오류: ${error.message}`, filename, error.loc?.line ?? 1, (error.loc?.column ?? 0) + 1, 'KOREAN_CODE_SYNTAX', { cause });
  }
  const code = output.toString();
  const map: SourceMap = JSON.parse(output.generateMap({ source: filename, includeContent: true, hires: true }).toString());
  try {
    const ast = parse(code, { sourceType: 'module', plugins: withJsx ? ['jsx'] : [] });
    if (!withJsx) return { code, map };
    const result = transformFromAstSync(ast, code, {
      filename, sourceFileName: filename, sourceMaps: true,
      configFile: false, babelrc: false,
      plugins: [[options.development ? jsxDevelopment : jsx, { runtime: 'automatic' }]],
    });
    if (result?.code == null || !result.map) throw new Error('JSX 변환 결과를 생성하지 못했습니다.');
    return { code: result.code, map: JSON.parse(remapping([JSON.stringify(result.map), JSON.stringify(map)], () => null).toString()) };
  } catch (cause) {
    const error = cause as { message: string; pos?: number };
    const offset = error.pos ?? 0;
    // Map a generated offset back through the exact edits, including changed lengths.
    let originalOffset = offset;
    let delta = 0;
    for (const edit of replacements) {
      const start = edit.start + delta;
      if (offset < start) break;
      if (offset < start + edit.value.length) { originalOffset = edit.start; break; }
      delta += edit.value.length - (edit.end - edit.start);
      originalOffset = offset - delta;
    }
    const before = source.slice(0, originalOffset);
    const lines = before.split(/\r\n|[\r\n\u2028\u2029]/u);
    throw new CompileError(`문법 오류: ${error.message}`, filename, lines.length, lines.at(-1)!.length + 1, 'KOREAN_CODE_SYNTAX', { cause });
  }
}
