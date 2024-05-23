"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileUrl = exports.fetchFileFromCtx = exports.getMediaGroupIdFromWrapppedCtx = exports.getUserChatKeyByWrappedCtx = exports.isReplyMessage = exports.ctxHasTextOnly = exports.ctxHasDocument = exports.ctxHasPhoto = exports.pluckCtx = void 0;
function pluckCtx(p) {
    return function (wrapped) {
        if (typeof p === "undefined") {
            return wrapped.ctx;
        }
        return p(wrapped.ctx);
    };
}
exports.pluckCtx = pluckCtx;
var ctxHasPhoto = function (ctx) {
    return !!ctx.message.photo;
};
exports.ctxHasPhoto = ctxHasPhoto;
var ctxHasDocument = function (ctx) { return !!ctx.message.document; };
exports.ctxHasDocument = ctxHasDocument;
var ctxHasTextOnly = function (ctx) {
    return !(0, exports.ctxHasPhoto)(ctx) && !(0, exports.ctxHasDocument)(ctx);
};
exports.ctxHasTextOnly = ctxHasTextOnly;
var isReplyMessage = function (ctx) {
    return !!ctx.message.reply_to_message;
};
exports.isReplyMessage = isReplyMessage;
var getUserChatKeyByWrappedCtx = function (_a) {
    var ctx = _a.ctx;
    return "".concat(ctx.chat.id, "-").concat(ctx.message.message_id);
};
exports.getUserChatKeyByWrappedCtx = getUserChatKeyByWrappedCtx;
var getMediaGroupIdFromWrapppedCtx = function (_a) {
    var ctx = _a.ctx;
    return ctx.message.media_group_id;
};
exports.getMediaGroupIdFromWrapppedCtx = getMediaGroupIdFromWrapppedCtx;
var fetchFileFromCtx = function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var file, fileInfo, fileUrl, data, error_1;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                file = ((_a = ctx.message) === null || _a === void 0 ? void 0 : _a.document) || ((_c = (_b = ctx.message) === null || _b === void 0 ? void 0 : _b.photo) === null || _c === void 0 ? void 0 : _c[ctx.message.photo.length - 1]);
                console.log("=>(tg.ts:37) file", file);
                console.log("=>(tg.ts:38) file.file_id", file === null || file === void 0 ? void 0 : file.file_id);
                if (!file || !file.file_id) {
                    throw new Error("Файл не найден");
                }
                _d.label = 1;
            case 1:
                _d.trys.push([1, 4, , 6]);
                return [4 /*yield*/, ctx.api.getFile(file.file_id)];
            case 2:
                fileInfo = _d.sent();
                fileUrl = (0, exports.getFileUrl)(fileInfo.file_path || "");
                return [4 /*yield*/, fetch(fileUrl)];
            case 3:
                data = _d.sent();
                console.log("=>(tg.ts:193) data", data);
                return [2 /*return*/, {
                        data: data,
                        fileInfo: fileInfo,
                    }];
            case 4:
                error_1 = _d.sent();
                console.error("Ошибка при получении файла:", error_1);
                return [4 /*yield*/, ctx.reply("Не удалось получить файл.")];
            case 5:
                _d.sent();
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); };
exports.fetchFileFromCtx = fetchFileFromCtx;
var getFileUrl = function (file_path) {
    return "https://api.telegram.org/file/bot".concat(process.env.BOT_TOKEN, "/").concat(file_path);
};
exports.getFileUrl = getFileUrl;
