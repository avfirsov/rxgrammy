"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeGrammyReactive = exports.createChain = void 0;
var rxjs_1 = require("rxjs");
var common_1 = require("./utils/common");
var tg_1 = require("./utils/tg");
var operators_1 = require("rxjs/operators");
var createChain = function ($, allowedChains, params) {
    var self = {
        $: $,
        notFrom: function (filterOpts) {
            var filtered = self.$.pipe((0, rxjs_1.filter)(function (_a) {
                var ctx = _a.ctx;
                var userId = ctx.message.from.id;
                if ("userIds" in filterOpts && filterOpts.userIds.includes(userId)) {
                    return false;
                }
                if ("chatIds" in filterOpts &&
                    filterOpts.chatIds.includes(ctx.message.chat.id)) {
                    return false;
                }
                return true;
            }));
            return (0, exports.createChain)(filtered, allowedChains, params);
        },
        from: function (filterOpts) {
            var filtered = self.$.pipe((0, rxjs_1.filter)(function (_a) {
                var ctx = _a.ctx;
                var userId = ctx.message.from.id;
                if ("userIds" in filterOpts && !filterOpts.userIds.includes(userId)) {
                    return false;
                }
                if ("chatIds" in filterOpts &&
                    !filterOpts.chatIds.includes(ctx.message.chat.id)) {
                    return false;
                }
                return true;
            }));
            return (0, exports.createChain)(filtered, allowedChains, params);
        },
    };
    if (allowedChains.includes("Replies")) {
        Object.defineProperties(self, {
            thatAreReplies: {
                get: function () {
                    var $ = self.$.pipe((0, rxjs_1.filter)((0, tg_1.pluckCtx)(tg_1.isReplyMessage)));
                    return (0, exports.createChain)($, (0, common_1.dropChain)(allowedChains, "Replies"), params);
                },
            },
            thatAreNotReplies: {
                get: function () {
                    var $ = self.$.pipe((0, rxjs_1.filter)((0, tg_1.pluckCtx)((0, common_1.not)(tg_1.isReplyMessage))));
                    return (0, exports.createChain)($, (0, common_1.dropChain)(allowedChains, "Replies"), params);
                },
            },
        });
    }
    if (allowedChains.includes("ContentType")) {
        var selfTyped_1 = self;
        var sameUserSameChatMessagesWithMedia$$ = selfTyped_1.$.pipe(
        //берем только сообщения с медиа
        (0, rxjs_1.filter)(function (_a) {
            var ctx = _a.ctx;
            return !!ctx.message.media_group_id;
        }), (0, rxjs_1.groupBy)(tg_1.getUserChatKeyByWrappedCtx, {
            duration: function (sameUserSameChatMessages$) {
                //если от юзера нет сообщений в течение 5 минут, закрываем поток
                return sameUserSameChatMessages$.pipe((0, rxjs_1.debounceTime)(common_1.FIVE_MINUTES), (0, operators_1.take)(1));
            },
        }));
        var sameMediaGroupMessages$$_1 = sameUserSameChatMessagesWithMedia$$.pipe((0, rxjs_1.mergeMap)(function (sameUserSameChatMessagesWithSameMediaGroup$) {
            return sameUserSameChatMessagesWithSameMediaGroup$.pipe((0, rxjs_1.groupBy)(tg_1.getMediaGroupIdFromWrapppedCtx, {
                duration: function (sameUserSameChatMessagesSameMediaGroup$) {
                    //ожидаем поступления сообщений в группу в течение 5 минут
                    return sameUserSameChatMessagesSameMediaGroup$.pipe((0, rxjs_1.debounceTime)(common_1.FIVE_MINUTES), (0, operators_1.take)(1));
                },
            }));
        }));
        Object.defineProperties(self, {
            withDocuments: {
                get: function () {
                    var docMessagesBatches$ = sameMediaGroupMessages$$_1.pipe((0, rxjs_1.mergeMap)(function (sameMediaGroupMessages$) {
                        return sameMediaGroupMessages$.pipe((0, rxjs_1.first)(), (0, rxjs_1.filter)(
                        //сообщения в группах документов начинаются либо с сообщения с ctx.message.document, либо с текстовой подписи - простого сообщения
                        //TODO: проверить это утверждение
                        //TODO: абстрагировать фильтр
                        //TODO: проверить будет ли везде reply_message
                        function (_a) {
                            var ctx = _a.ctx;
                            return !!ctx.message.document || !!ctx.message.text;
                        }), (0, rxjs_1.map)(function (payload) {
                            return sameMediaGroupMessages$.pipe((0, rxjs_1.startWith)(payload));
                        }));
                    }), (0, rxjs_1.mergeMap)(function (sameMediaGroupDocumentMessages$) {
                        return sameMediaGroupDocumentMessages$.pipe(
                        //закрываем стрим пачки документов если не приходили новые документы в течение uxDebounce
                        (0, rxjs_1.takeUntil)(sameMediaGroupDocumentMessages$.pipe(
                        //TODO: абстрагировать условие
                        (0, rxjs_1.filter)((0, tg_1.pluckCtx)(tg_1.ctxHasDocument)), (0, rxjs_1.debounceTime)(params.uxDebounce))), (0, operators_1.toArray)());
                    }));
                    var $ = docMessagesBatches$.pipe((0, rxjs_1.map)(function (payloads) {
                        var _a, _b;
                        return (__assign(__assign({}, payloads[0]), { 
                            //если в первом сообщении нет документа - это текстовая аннотация
                            textCtx: !payloads[0].ctx.message.document
                                ? payloads[0].ctx
                                : null, documentCtxs: payloads
                                .filter((0, tg_1.pluckCtx)(tg_1.ctxHasDocument))
                                .map(function (_a) {
                                var ctx = _a.ctx;
                                return ctx;
                            }), documents: payloads
                                .map(function (_a) {
                                var ctx = _a.ctx;
                                return ctx.message.document;
                            })
                                .filter(common_1.isNotUndefined), 
                            //если отправляют один документ, то текст записывается в нем как caption. Иначе, если документов больше - отправляется
                            //предшествующим текстовым сообщением
                            text: (_b = (_a = payloads[0].ctx.message.text) !== null && _a !== void 0 ? _a : payloads[0].ctx.message.caption) !== null && _b !== void 0 ? _b : "" }));
                    }));
                    return (0, exports.createChain)($, __spreadArray(__spreadArray([], (0, common_1.dropChain)(allowedChains, "ContentType"), true), ["Fetch"], false), params);
                },
            },
            withPhotos: {
                get: function () {
                    var photoMessagesBatches$ = sameMediaGroupMessages$$_1.pipe((0, rxjs_1.mergeMap)(function (sameMediaGroupMessages$) {
                        return sameMediaGroupMessages$.pipe((0, rxjs_1.first)(), (0, rxjs_1.filter)(function (_a) {
                            var ctx = _a.ctx;
                            return !!ctx.message.photo;
                        }), (0, rxjs_1.map)(function (payload) {
                            return sameMediaGroupMessages$.pipe((0, rxjs_1.startWith)(payload));
                        }));
                    }), (0, rxjs_1.mergeMap)(function (sameMediaGroupPhotoMessages$) {
                        return sameMediaGroupPhotoMessages$.pipe(
                        //закрываем стрим пачки фоток если не приходили новые документы в течение uxDebounce
                        (0, rxjs_1.takeUntil)(sameMediaGroupPhotoMessages$.pipe((0, rxjs_1.debounceTime)(params.uxDebounce))), (0, operators_1.toArray)());
                    }));
                    var $ = photoMessagesBatches$.pipe((0, rxjs_1.map)(function (payloads) { return (__assign(__assign({}, payloads[0]), { photosCtxs: payloads
                            .filter((0, tg_1.pluckCtx)(tg_1.ctxHasPhoto))
                            .map(function (_a) {
                            var ctx = _a.ctx;
                            return ctx;
                        }), photos: payloads
                            .filter((0, tg_1.pluckCtx)(tg_1.ctxHasPhoto))
                            .map(function (_a) {
                            var _b;
                            var ctx = _a.ctx;
                            return (_b = ctx.message.photo) === null || _b === void 0 ? void 0 : _b.pop();
                        })
                            .filter(common_1.isNotUndefined) })); }));
                    return (0, exports.createChain)($, __spreadArray(__spreadArray([], (0, common_1.dropChain)(allowedChains, "ContentType"), true), ["Fetch"], false), params);
                },
            },
            withText: {
                get: function () {
                    var $ = selfTyped_1.$.pipe(
                    //берем только сообщения с медиа
                    (0, rxjs_1.filter)((0, tg_1.pluckCtx)(tg_1.ctxHasTextOnly)));
                    return (0, exports.createChain)($, (0, common_1.dropChain)(allowedChains, "ContentType"), params);
                },
            },
        });
    }
    if (allowedChains.includes("Fetch")) {
        var selfTyped_2 = self;
        Object.defineProperties(self, {
            fetch: {
                get: function () {
                    var _this = this;
                    var $ = selfTyped_2.$.pipe((0, rxjs_1.map)(function (payload) { return __awaiter(_this, void 0, void 0, function () {
                        var toFetch, fetchedWrapped, fetched;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    toFetch = "documentCtxs" in payload
                                        ? payload.documentCtxs
                                        : "photosCtxs" in payload
                                            ? payload.photosCtxs
                                            : [];
                                    return [4 /*yield*/, Promise.allSettled(toFetch.map(tg_1.fetchFileFromCtx))];
                                case 1:
                                    fetchedWrapped = _a.sent();
                                    fetched = fetchedWrapped
                                        .map(function (wrapped) {
                                        if ("value" in wrapped) {
                                            return wrapped.value;
                                        }
                                        if ("reason" in wrapped) {
                                            return { error: wrapped.reason };
                                        }
                                    })
                                        .filter(common_1.isNotUndefined);
                                    return [2 /*return*/, __assign(__assign({}, payload), { fetched: fetched })];
                            }
                        });
                    }); }), (0, rxjs_1.mergeMap)(function (promise) { return (0, rxjs_1.from)(promise); }));
                    return (0, exports.createChain)($, (0, common_1.dropChain)(allowedChains, "Fetch"), params);
                },
            },
        });
    }
    return self;
};
exports.createChain = createChain;
var makeGrammyReactive = function (bot, params) {
    var _a;
    var messages$ = (0, rxjs_1.fromEventPattern)(function (handler) {
        return bot.on("message", function (ctx, next) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, handler({ ctx: ctx })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, next()];
                }
            });
        }); });
    }).pipe((0, rxjs_1.share)());
    return (0, exports.createChain)(messages$, ["Replies", "ContentType"], {
        uxDebounce: (_a = params === null || params === void 0 ? void 0 : params.uxDebounce) !== null && _a !== void 0 ? _a : 200,
        apiToken: bot.token,
    });
};
exports.makeGrammyReactive = makeGrammyReactive;
