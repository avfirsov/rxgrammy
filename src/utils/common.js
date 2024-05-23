"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dropChain = exports.FIVE_MINUTES = exports.excludeFromArray = exports.filter = exports.onlyFullfilledUnwrapped = exports.promiseIsRejected = exports.promiseIsSettled = exports.every = exports.isNotNull = exports.isNotUndefined = exports.hasItems = exports.not = void 0;
var not = function (predicate) {
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return !predicate.apply(void 0, args);
    };
};
exports.not = not;
var hasItems = function (n) {
    return function (arr) {
        return typeof n === "undefined" ? arr.length > 0 : arr.length === n;
    };
};
exports.hasItems = hasItems;
var isNotUndefined = function (item) {
    return typeof item !== "undefined";
};
exports.isNotUndefined = isNotUndefined;
var isNotNull = function (item) { return typeof item !== null; };
exports.isNotNull = isNotNull;
var every = function (p) {
    return function (arr) {
        return arr.every(p);
    };
};
exports.every = every;
var promiseIsSettled = function (promiseSettledResult) {
    return promiseSettledResult.status === "fulfilled";
};
exports.promiseIsSettled = promiseIsSettled;
var promiseIsRejected = function (promiseSettledResult) {
    return (0, exports.not)(exports.promiseIsSettled)(promiseSettledResult);
};
exports.promiseIsRejected = promiseIsRejected;
var onlyFullfilledUnwrapped = function (settledPromises) {
    return settledPromises
        .filter(exports.promiseIsSettled)
        .map(function (fullfilled) { return fullfilled.value; });
};
exports.onlyFullfilledUnwrapped = onlyFullfilledUnwrapped;
var filter = function (p) {
    return function (arr) {
        return arr.filter(p);
    };
};
exports.filter = filter;
var excludeFromArray = function (arr, value) {
    var copy = arr.slice();
    var index = copy.indexOf(value);
    if (index > -1) {
        // only splice array when item is found
        copy.splice(index, 1); // 2nd parameter means remove one item only
    }
    return copy;
};
exports.excludeFromArray = excludeFromArray;
exports.FIVE_MINUTES = 1000 * 60 * 5;
var dropChain = function (allowedChains, dropChain) {
    return (0, exports.excludeFromArray)(allowedChains, dropChain);
};
exports.dropChain = dropChain;
