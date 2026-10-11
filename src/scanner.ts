import { Parser, tokTypes, type Token, type Options } from 'acorn';
import jsx from 'acorn-jsx';
import { keywords } from './keywords.js';

// Acorn's documented dialect-plugin interface exposes these tokenizer methods.
// Keep the dependency pinned: this small adapter depends on tokenizer internals.
interface DialectParser extends Parser {
  readWord1(): string;
  finishToken(type: typeof tokTypes.name, value: string): void;
  keywords: RegExp;
  containsEsc: boolean;
  input: string;
  pos: number;
  options: Options;
  isContextual(name: string): boolean;
  checkLValSimple(node: Node, bindingType?: number, clashes?: Record<string, boolean>): void;
  checkLocalExport(node: Node): void;
  checkExport(exports: unknown, name: string | Node, position: number): void;
  parseIdent(liberal?: boolean): Node;
  parseLabeledStatement(node: Node, name: string, expression: Node, context: unknown): Node;
  parseSubscript(base: Node, start: number, loc: any, noCalls: boolean, asyncArrow: boolean, optional: boolean, forInit: boolean): Node;
  lastTokEnd: number;
  lastTokStart: number;
  potentialArrowAt: number;
  canInsertSemicolon(): boolean;
}

type Node = { type: string; start: number; end: number; [key: string]: unknown };
export interface Replacement { start: number; end: number; value: string }
type ValueToken = Token & { value: unknown };
const keywordTypes = Object.fromEntries(Object.values(tokTypes).filter(type => type.keyword).map(type => [type.keyword, type]));
const keyword = (word: string): string | undefined => Object.hasOwn(keywords, word) ? keywords[word] : undefined;

function dialect(Base: typeof Parser): typeof Parser {
  const InternalBase = Base as unknown as new (...args: any[]) => DialectParser;
  return class extends InternalBase {
    // Same readWord protocol as Acorn (MIT); translate before finishToken so its
    // regex, template, and JSX context machinery sees actual JavaScript tokens.
    readWord(): void {
      const original = this.readWord1();
      const word = this.containsEsc ? original : (keyword(original) ?? original);
      this.finishToken(this.keywords.test(word) ? keywordTypes[word] : tokTypes.name, word);
    }

    private originalName(position: number, normalized: string): string {
      const original = /^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*/u.exec(this.input.slice(position))?.[0];
      return original && keyword(original) === normalized && ['async', 'of', 'from', 'as', 'get', 'set', 'using'].includes(normalized) ? original : normalized;
    }

    checkLValSimple(node: Node, bindingType?: number, clashes?: Record<string, boolean>): void {
      // Scope checks use source identifiers, but expression parsing must still
      // see "async" while deciding whether a function/arrow modifier was used.
      const name = node.name;
      if (node.type === 'Identifier') node.name = this.originalName(node.start, name as string);
      try { super.checkLValSimple(node, bindingType, clashes); }
      finally { node.name = name; }
    }

    checkLocalExport(node: Node): void {
      super.checkLocalExport({ ...node, name: this.originalName(node.start, node.name as string) });
    }

    checkExport(exports: unknown, name: string | Node, position: number): void {
      if (typeof name !== 'string' && name.type === 'Identifier') {
        const original = this.input.slice(name.start, name.end);
        if (keyword(original)) name = { ...name, name: original };
      }
      super.checkExport(exports, name, position);
    }

    parseIdent(liberal?: boolean): Node {
      const previous = this.input.slice(this.lastTokStart, this.lastTokEnd);
      const node = super.parseIdent(liberal);
      if (!liberal && ['break', 'continue', '중단', '계속'].includes(previous)) {
        node.name = this.originalName(node.start, node.name as string);
      }
      return node;
    }

    parseLabeledStatement(node: Node, name: string, expression: Node, context: unknown): Node {
      const original = this.originalName(expression.start, name);
      return super.parseLabeledStatement(node, original, { ...expression, name: original }, context);
    }

    parseSubscript(base: Node, start: number, loc: any, noCalls: boolean, asyncArrow: boolean, optional: boolean, forInit: boolean): Node {
      // Acorn's async-arrow probe assumes the English token is five characters.
      const koreanAsync = base.type === 'Identifier' && this.input.slice(base.start, base.end) === '비동기'
        && this.lastTokEnd === base.end && this.potentialArrowAt === base.start && !this.canInsertSemicolon();
      return super.parseSubscript(base, start, loc, noCalls, asyncArrow || koreanAsync, optional, forInit);
    }

    private skipTrivia(position: number): number {
      return position + /^(?:\s+|\/\/[^\r\n\u2028\u2029]*|\/\*[\s\S]*?\*\/)*/u.exec(this.input.slice(position))![0].length;
    }

    private peekWord(position: number): { token: ValueToken; start: number; end: number; original: string } | undefined {
      const start = this.skipTrivia(position);
      // A standalone lookahead lexer has no expression context. Restrict it to
      // words so slash operators are never mistaken for regex literals.
      if (!/^[$_\p{ID_Start}\\]/u.test(this.input.slice(start))) return undefined;
      try {
        const token = KoreanParser.tokenizer(this.input.slice(start), { ecmaVersion: 'latest' }).getToken() as ValueToken;
        return { token, start, end: start + token.end, original: this.input.slice(start, start + token.end) };
      } catch { return undefined; } // The main parser reports malformed tokens at original positions.
    }

    // These two Acorn lookaheads inspect raw spellings, not normalized tokens.
    isAsyncFunction(): boolean {
      if (!this.isContextual('async')) return false;
      const next = this.peekWord(this.pos);
      return !!next && next.token.type === tokTypes._function && !/[\r\n\u2028\u2029]/u.test(this.input.slice(this.pos, next.start));
    }

    isUsingKeyword(awaitUsing: boolean, forLoop: boolean): boolean {
      if (!this.isContextual(awaitUsing ? 'await' : 'using')) return false;
      let next = this.peekWord(this.pos);
      if (!next || /[\r\n\u2028\u2029]/u.test(this.input.slice(this.pos, next.start))) return false;
      if (awaitUsing) {
        if (next.token.type !== tokTypes.name || next.token.value !== 'using') return false;
        const end = next.end;
        next = this.peekWord(end);
        if (!next || /[\r\n\u2028\u2029]/u.test(this.input.slice(end, next.start))) return false;
      }
      if (next.token.type !== tokTypes.name) return false;
      if (forLoop && !awaitUsing && next.original === 'of') {
        const rest = this.input.slice(this.skipTrivia(next.end));
        return /^=(?!=|>)/u.test(rest);
      }
      return true;
    }
  } as unknown as typeof Parser;
}

const KoreanParser = Parser.extend(dialect);
const KoreanJsxParser = Parser.extend(jsx(), dialect);

/** Parse at original offsets, then rewrite only tokens used as syntax. */
export function scan(source: string, withJsx: boolean): Replacement[] {
  const tokens: Token[] = [];
  const ast = (withJsx ? KoreanJsxParser : KoreanParser).parse(source, {
    ecmaVersion: 'latest', sourceType: 'module', locations: true, onToken: tokens,
  });
  const identifiers = new Set<number>();
  const defaultSpecifiers = new Set<number>();
  function visit(value: unknown): void {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(visit); return; }
    const node = value as Node;
    if (node.type === 'ImportSpecifier' || node.type === 'ExportSpecifier') {
      for (const field of node.type === 'ImportSpecifier' ? ['imported'] : ['local', 'exported']) {
        const identifier = node[field] as Node;
        if (identifier.type === 'Identifier' && identifier.name === 'default' && source.slice(identifier.start, identifier.end) === '기본') {
          defaultSpecifiers.add(identifier.start);
        }
      }
    }
    if (node.type === 'Identifier' || node.type === 'PrivateIdentifier') identifiers.add(node.start);
    for (const [key, child] of Object.entries(node)) {
      if (key !== 'loc') visit(child);
    }
  }
  visit(ast);
  return tokens.flatMap(token => {
    const original = source.slice(token.start, token.end);
    const mapped = keyword(original);
    if (!mapped || (identifiers.has(token.start) && !defaultSpecifiers.has(token.start)) || (!token.type.keyword && token.type !== tokTypes.name)) return [];
    return [{ start: token.start, end: token.end, value: mapped }];
  });
}
