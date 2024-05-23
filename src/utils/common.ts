import { AllChains } from "../types";

export const not =
  <T extends any[]>(
    predicate: (...args: T) => boolean,
  ): ((...args: T) => boolean) =>
  (...args: T): boolean =>
    !predicate(...args);

export const hasItems =
  (n?: number) =>
  <T>(arr: T[]): boolean =>
    typeof n === "undefined" ? arr.length > 0 : arr.length === n;
export const isNotUndefined = <T>(item: T | undefined | void): item is T =>
  typeof item !== "undefined";
export const isNotNull = <T>(item: T | null): item is T => typeof item !== null;
export const every =
  <T>(p: (item: T) => boolean) =>
  (arr: T[]): boolean =>
    arr.every(p);
export const promiseIsSettled = <T>(
  promiseSettledResult: PromiseSettledResult<T>,
): promiseSettledResult is PromiseFulfilledResult<T> =>
  promiseSettledResult.status === "fulfilled";
export const promiseIsRejected = <T>(
  promiseSettledResult: PromiseSettledResult<T>,
): promiseSettledResult is PromiseRejectedResult =>
  not(promiseIsSettled)(promiseSettledResult);
export const onlyFullfilledUnwrapped = <T>(
  settledPromises: PromiseSettledResult<T>[],
): T[] =>
  settledPromises
    .filter(promiseIsSettled)
    .map((fullfilled) => fullfilled.value);
export const filter =
  <T, K extends T>(p: (item: T) => item is K) =>
  (arr: T[]): K[] =>
    arr.filter(p);

export const excludeFromArray = <T>(arr: T[], value: T): T[] => {
  const copy = arr.slice();
  const index = copy.indexOf(value);
  if (index > -1) {
    // only splice array when item is found
    copy.splice(index, 1); // 2nd parameter means remove one item only
  }
  return copy;
};
export const FIVE_MINUTES = 1000 * 60 * 5;
export const dropChain = <
  AllowedChainsTup extends AllChains[],
  Dropped extends AllChains,
>(
  allowedChains: AllowedChainsTup,
  dropChain: Dropped,
) =>
  excludeFromArray(allowedChains, dropChain) as Exclude<
    AllowedChainsTup[number],
    Dropped
  >[];

