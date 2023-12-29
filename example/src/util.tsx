import React from "react";
import { Text } from "react-native";

export const padZero = (n: number) => {
  return n <= 9 ? n.toString().padStart(2, "0") : n.toString();
};

export const breakdownTime = (secs: number) => {
  let remainingSeconds = secs;

  const days = Math.floor(remainingSeconds / (60 * 60 * 24));
  if (days) {
    remainingSeconds %= 60 * 60 * 24;
  }
  const hours = Math.floor(remainingSeconds / (60 * 60));
  if (hours) {
    remainingSeconds %= 60 * 60;
  }
  const mins = Math.floor(remainingSeconds / 60);
  if (mins) {
    remainingSeconds %= 60;
  }

  return { days, hours, mins, seconds: Math.floor(remainingSeconds) };
};

export const toTimeString = (secs: number) => {
  const { hours, mins, seconds } = breakdownTime(secs);

  // prettier-ignore
  return `${hours ? `${padZero(hours)} ` : ``}${padZero(mins)}:${padZero(seconds)}`;
};

export function truncateObject(o: Object, max = 6) {
  const keys = Object.keys(o);
  if (keys.length < max) {
    return JSON.stringify(o);
  }

  const truncated = keys
    .slice(0, max)
    .map((key) => `${key}: ${(o as any)[key]}`)
    .join(", ");

  return `{ ${truncated}, ... }`;
}

export function PrettyObject(props: { o: Object; truncateKeys?: string[] }) {
  return (
    <React.Fragment>
      {!Object.keys(props.o).length ? (
        <Text>(Empty)</Text>
      ) : (
        Object.entries(props.o || {}).map(([key, val]) => (
          <Text key={key}>
            {/* eslint-disable-next-line react-native/no-inline-styles */}
            <Text style={{ fontWeight: "bold" }}>{key}</Text>
            {": "}
            {(props.truncateKeys || []).includes(key)
              ? truncateObject(val)
              : String(val)}
          </Text>
        ))
      )}
    </React.Fragment>
  );
}
