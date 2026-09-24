"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertLoca = convertLoca;
const path = __importStar(require("node:path"));
const executor_1 = require("./executor");
const convertLocaRule = {
    action: "convert-loca",
    validExts: [".loca", ".xml"],
    getTargets: (inputExt) => {
        return inputExt === "loca"
            ? [{ label: ".xml (Текстовый формат для редактирования)", format: "xml" }]
            : [{ label: ".loca (Бинарный формат для игры)", format: "loca" }];
    },
    getOutputPath: (dir, fileName, targetFormat) => path.join(dir, `${fileName}.${targetFormat}`),
    getTitle: (inputFormat, outputFormat) => `Конвертация локализации: ${inputFormat.toUpperCase()} → ${outputFormat.toUpperCase()}`,
};
async function convertLoca(uri, toolPath, game, outputChannel) {
    await (0, executor_1.executeDivineTask)(uri, toolPath, game, outputChannel, convertLocaRule);
}
//# sourceMappingURL=loca.js.map