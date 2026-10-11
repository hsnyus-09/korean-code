export const 출력 = (...values: unknown[]): void => {
  console.log(...values);
};

export const 경고 = (...values: unknown[]): void => {
  console.warn(...values);
};

export const 오류출력 = (...values: unknown[]): void => {
  console.error(...values);
};

export const 요소찾기 = <T extends Element = Element>(selector: string, root: ParentNode = document): T | null => {
  return root.querySelector<T>(selector);
};

export const 요소들찾기 = <T extends Element = Element>(selector: string, root: ParentNode = document): NodeListOf<T> => {
  return root.querySelectorAll<T>(selector);
};

export const 기다리기 = (ms: number): Promise<void> => {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
};

export const 요청: typeof fetch = (...args) => {
  return globalThis.fetch(...args);
};
