import test from 'node:test';
import assert from 'node:assert/strict';
import {
  배치효과사용,
  메모사용,
  문맥사용,
  리듀서사용,
  상태사용,
  참조사용,
  콜백사용,
  효과사용,
} from '../src/react.js';
import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

test('React Korean hook aliases are direct reexports', () => {
  assert.equal(상태사용, useState);
  assert.equal(효과사용, useEffect);
  assert.equal(참조사용, useRef);
  assert.equal(메모사용, useMemo);
  assert.equal(콜백사용, useCallback);
  assert.equal(문맥사용, useContext);
  assert.equal(리듀서사용, useReducer);
  assert.equal(배치효과사용, useLayoutEffect);
});
