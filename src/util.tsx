// @flow
import { useState, useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";

const noop = () => {};

export function useInterval(
  callback: () => void,
  delay: number,
  cleanup: () => void = noop
) {
  const savedCallback: { current: Function | undefined } = useRef();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cleanupCallback = useCallback(cleanup, []);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    let id: NodeJS.Timeout | undefined;
    let tick = () => {
      savedCallback.current && savedCallback.current();
    };

    if (delay !== null) {
      id = setInterval(tick, delay);
    }

    return () => {
      clearInterval(id);
      cleanupCallback();
    };
  }, [delay, cleanupCallback]);
}

export function useStateCallback<T>(
  initialState: T
): [T, (state: T, callback?: (state: T) => void) => void] {
  const [state, setState] = useState(initialState);
  const callbackRef: { current: ((state: T) => void) | undefined } = useRef();

  // eslint-disable-next-line @typescript-eslint/no-shadow
  const setStateCallback = useCallback((state, cb) => {
    callbackRef.current = cb;
    setState(state);
  }, []);

  useEffect(() => {
    if (callbackRef.current) {
      callbackRef.current(state);
      callbackRef.current = undefined;
    }
  }, [state]);

  return [state, setStateCallback];
}

export function roundToPlace(float: number, places: number = 2) {
  return Number(float.toFixed(places));
}

export function cycleEl<T>(arr: Array<T>, startFromElem?: T): T {
  return arr[
    (arr.findIndex((elem) => elem === startFromElem) + 1) % arr.length
  ] as T;
}

export function isWebVersion(): boolean {
  return Platform.OS === "web";
}

export function mergeObject<T>(prev: Object, next: Object) {
  return { ...prev, ...next } as T;
}

export function range(start: number, end?: number): Array<number> {
  if (end === undefined) {
    end = start;
    start = 0;
  }
  let arr = [];
  for (let i = start; i < end; i++) {
    arr.push(i);
  }
  return arr;
}
