/**
 * Copyright (c) 2026 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author QB-molstar contributors
 */

export type Vec3Tuple = [number, number, number];

/** 配色主题 */
export type EasyColorTheme =
    | 'element-symbol'
    | 'chain-id'
    | 'sequence-id'
    | 'secondary-structure'
    | 'hydrophobicity'
    | 'molecule-type'
    | 'residue-name'
    | 'uniform';

/** 整体样式预设 */
export type EasyStyle =
    | 'auto'
    | 'polymer-and-ligand'
    | 'atomic-detail'
    | 'molecular-surface'
    | 'illustrative'
    | 'coarse-surface';

/** 表示类型（Mol* representation type） */
export type EasyRepresentationType =
    | 'cartoon'
    | 'ball-and-stick'
    | 'spacefill'
    | 'molecular-surface'
    | 'gaussian-surface'
    | 'line'
    | 'point';

export type HydrogenMode = 'none' | 'polar' | 'all';

/** 单个表示层：类型 + 自己的颜色/透明度/可见 */
export interface RepresentationLayer {
    type: EasyRepresentationType;
    /** 配色主题，默认 chain-id */
    color?: EasyColorTheme;
    colorOptions?: EasyViewerColorOptions;
    /** 透明度，surface 类常用 */
    alpha?: number;
    /** 是否可见，默认 true */
    visible?: boolean;
}

/** 按链指定表示：一条链可叠加多层，每层独立配置 */
export interface ChainPresentation {
    /** 链 ID（label_asym_id） */
    chain: string;
    /** 表示层列表（推荐） */
    layers?: RepresentationLayer[];
    /** 简写（兼容）：表示类型，配合下面的 color/alpha/visible */
    representation?: EasyRepresentationType | EasyRepresentationType[];
    color?: EasyColorTheme;
    colorOptions?: EasyViewerColorOptions;
    alpha?: number;
    visible?: boolean;
}

/** 药效团特征类型（对齐常见 pharmacophore 输出） */
export type PharmacophoreFeatureType =
    | 'Donor'
    | 'Acceptor'
    | 'Hydrophobe'
    | 'LumpedHydrophobe'
    | 'Aromatic'
    | 'NegIonizable'
    | 'PosIonizable';

export interface PharmacophorePoint {
    /** 三维坐标 */
    center: Vec3Tuple;
    /** 半径（埃） */
    radius: number;
    type: PharmacophoreFeatureType;
}

/** fpocket 风格的口袋数据 */
export interface Pocket {
    pocket_id: number | string;
    center: Vec3Tuple;
    alpha_spheres?: Vec3Tuple[];
    score?: number;
    druggability_score?: number;
    volume?: number;
    number_of_alpha_spheres?: number;
    total_sasa?: number;
}

/** 结构输入 */
export interface StructureInput {
    data: string | Uint8Array | number[];
    format: string;
    label?: string;
    isBinary?: boolean;
}

/** 通用输入集合，可一次喂给 viewer */
export interface EasyViewerInputs {
    /** 单个结构（可含多个配体） */
    structure?: StructureInput;
    /** 多个结构（如多个配体文件 / 多个对接 pose），会依次加载 */
    structures?: StructureInput[];
    pharmacophore?: PharmacophorePoint[];
    pockets?: Pocket[];
}

export interface EasyViewerColorOptions {
    /** 链配色方案名（ChainPalettes 的 key） */
    chainPalette?: string;
    /** 彩虹/序列配色方案名（RainbowPalettes 的 key） */
    rainbowPalette?: string;
    /** 单色（hex number） */
    uniformColor?: number;
}
