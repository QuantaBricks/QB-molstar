/**
 * Copyright (c) 2026 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author QB-molstar contributors
 *
 * 默认配色：加载出来就好看。参考 chemOrchestra 的做法并整理为通用层。
 */

import { ElementSymbolColorThemeProvider, ElementSymbolColorThemeParams } from '../../mol-theme/color/element-symbol';
import { PharmacophoreFeatureType } from './types';

export interface NamedPalette {
    label: string;
    colors: number[];
}

/** 链配色（用于 chain-id 主题的 set 调色板） */
export const ChainPalettes: { [name: string]: NamedPalette } = {
    default: {
        label: '标准',
        colors: [0x3b82f6, 0xef4444, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899, 0x14b8a6, 0xf97316],
    },
    pastel: {
        label: '柔和',
        colors: [0x93c5fd, 0xfca5a5, 0x86efac, 0xfde047, 0xc084fc, 0xfbcfe8, 0x99f6e4, 0xfdba74],
    },
    warm: {
        label: '暖色',
        colors: [0xef4444, 0xf97316, 0xf59e0b, 0xeab308, 0xb45309, 0x991b1b, 0x7c2d12],
    },
    cool: {
        label: '冷色',
        colors: [0x3b82f6, 0x06b6d4, 0x14b8a6, 0x10b981, 0x1d4ed8, 0x0f766e, 0x065f46],
    },
};

/** 序列彩虹配色（用于 sequence-id 主题的 interpolate 调色板） */
export const RainbowPalettes: { [name: string]: NamedPalette } = {
    rainbow: {
        label: '彩虹 (蓝→红)',
        colors: [0x2222cc, 0x0099ff, 0x00cc88, 0xffee00, 0xff7700, 0xcc0000],
    },
    blue: {
        label: '蓝色渐变',
        colors: [0x1e40af, 0x3b82f6, 0x06b6d4, 0xecfeff],
    },
    sunset: {
        label: '日落',
        colors: [0x991b1b, 0xd97706, 0xfef08a],
    },
    ocean: {
        label: '海洋',
        colors: [0x065f46, 0x0d9488, 0x38bdf8, 0xe0f2fe],
    },
    forest: {
        label: '森林',
        colors: [0x14532d, 0x22c55e, 0xa3e635],
    },
};

/** 口袋颜色（hex number / CSS） */
export const PocketHexColors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0xa8e063, 0x6c5ce7, 0xfd79a8, 0xfdcb6e, 0x00b894];
export const PocketCssColors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e063', '#6c5ce7', '#fd79a8', '#fdcb6e', '#00b894'];

/** 药效团特征颜色 */
export const PharmacophoreHexColors: { [K in PharmacophoreFeatureType]: number } = {
    Donor: 0x3b82f6,
    Acceptor: 0xef4444,
    Hydrophobe: 0xeab308,
    LumpedHydrophobe: 0xf59e0b,
    Aromatic: 0xa855f7,
    NegIonizable: 0xf97316,
    PosIonizable: 0x22c55e,
};

let defaultsApplied = false;

/**
 * 默认友好：让 element-symbol 主题的碳原子也按元素着色（默认是 chain-id）。
 * 这样默认 preset 出来的球棍/配体就是标准化学配色。
 */
export function applyDefaultColors() {
    if (defaultsApplied) return;
    defaultsApplied = true;
    try {
        (ElementSymbolColorThemeProvider.defaultValues as any).carbonColor = { name: 'element-symbol', params: {} };
        if (ElementSymbolColorThemeParams.carbonColor) {
            (ElementSymbolColorThemeParams.carbonColor as any).defaultValue = { name: 'element-symbol', params: {} };
        }
    } catch (e) {
        console.warn('EasyViewer: applyDefaultColors failed', e);
    }
}
