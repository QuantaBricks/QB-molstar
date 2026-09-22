/**
 * Copyright (c) 2026 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author QB-molstar contributors
 *
 * 通用动作层：所有「点一下就改」的能力都在这里，UI 和对外 API 共用。
 */

import { PluginContext } from '../../mol-plugin/context';
import { PluginCommands } from '../../mol-plugin/commands';
import { produce } from '../../mol-util/produce';
import { Box3D } from '../../mol-math/geometry';
import { GlbExporter } from '../../extensions/geo-export/glb-exporter';
import * as loaders from '../../extensions/plugin/loaders';
import { StateSelection } from '../../mol-state';
import { PluginStateObject } from '../../mol-plugin-state/objects';
import { SetUtils } from '../../mol-util/set';
import { Task } from '../../mol-task';
import { download } from '../../mol-util/download';
import { PresetStructureRepresentations } from '../../mol-plugin-state/builder/structure/representation-preset';
import { Color } from '../../mol-util/color';
import { ParamDefinition as PD } from '../../mol-util/param-definition';
import { OutlineParams } from '../../mol-canvas3d/passes/outline';
import { ShadowParams } from '../../mol-canvas3d/passes/shadow';
import { Vec3 } from '../../mol-math/linear-algebra';
import { MolScriptBuilder as MS } from '../../mol-script/language/builder';
import { StructureElement, StructureProperties, Structure, Unit } from '../../mol-model/structure';
import { Loci } from '../../mol-model/loci';
import { OrderedSet } from '../../mol-data/int/ordered-set';
import { ChainPalettes, RainbowPalettes } from './palettes';
import { ChainPresentation, EasyColorTheme, EasyRepresentationType, EasyStyle, EasyViewerColorOptions, HydrogenMode, PharmacophoreFeatureType, PharmacophorePoint, Pocket, RepresentationLayer } from './types';
import { showPharmacophore, PharmacophoreHandle } from './overlay-pharmacophore';
import { setHighlightMode as refreshHighlightMode, getHighlightMode } from './focus-visuals';
import { showPockets, PocketHandle } from './overlay-pocket';
import { setLabelColor } from './residue-labels';
import { Interactions } from '../../mol-model-props/computed/interactions/interactions';

export type { EasyColorTheme, EasyRepresentationType, EasyStyle, HydrogenMode } from './types';
export { setupResidueLabels, getLabelStyle, setLabelScale, setLabelColor, setLabelBackgroundColor, setLabelBackgroundOpacity } from './residue-labels';
export { setupFocusVisuals, setInteractionsVisible, areInteractionsVisible, subscribeInteractionsVisible, setInteractionsIncludeWater, areWaterInteractionsVisible, setHighlightScale, setHighlightLineScale, setInteractionLineScale, getHighlightScale, getHighlightLineScale, getInteractionLineScale, getHighlightMode, setHighlightMode } from './focus-visuals';

export const EasyColorThemes: [EasyColorTheme, string][] = [
    ['element-symbol', '元素'],
    ['chain-id', '链'],
    ['sequence-id', '序列彩虹'],
    ['secondary-structure', '二级结构'],
    ['hydrophobicity', '疏水'],
    ['molecule-type', '分子类型'],
    ['residue-name', '残基'],
    ['uniform', '单色'],
];

export const EasyStyles: [EasyStyle, string][] = [
    ['auto', '默认'],
    ['polymer-and-ligand', 'Ribbon+配体'],
    ['atomic-detail', '原子球棍'],
    ['molecular-surface', '分子表面'],
    ['illustrative', '填充'],
    ['coarse-surface', '粗表面'],
];

export const EasyLigandTag = 'qb-ligand';

export function getAllStructures(plugin: PluginContext) {
    return plugin.managers.structure.hierarchy.current.structures;
}

const activeStructureIndex = new WeakMap<PluginContext, number>();
const activeStructureListeners = new Set<() => void>();

/** 当前选中的结构索引（多个结构时只修改选中的那个） */
export function getActiveStructureIndex(plugin: PluginContext): number {
    const all = getAllStructures(plugin);
    if (all.length === 0) return 0;
    const i = activeStructureIndex.get(plugin) ?? 0;
    return Math.min(Math.max(i, 0), all.length - 1);
}

export function setActiveStructure(plugin: PluginContext, index: number) {
    activeStructureIndex.set(plugin, index);
    for (const fn of activeStructureListeners) fn();
}

export function subscribeActiveStructure(fn: () => void) {
    activeStructureListeners.add(fn);
    return () => { activeStructureListeners.delete(fn); };
}

const structureFileNames = new WeakMap<PluginContext, Map<string, string>>();

function structureFileNameMap(plugin: PluginContext) {
    let m = structureFileNames.get(plugin);
    if (!m) { m = new Map(); structureFileNames.set(plugin, m); }
    return m;
}

/** 结构名称，用于「Files」列表（优先显示加载时的文件名） */
export function getStructureLabel(plugin: PluginContext, index: number): string {
    const s = getAllStructures(plugin)[index];
    if (!s) return `#${index + 1}`;
    return structureFileNameMap(plugin).get(s.cell.transform.ref)
        || s.model?.cell.obj?.label
        || s.cell.obj?.label
        || `#${index + 1}`;
}

/** 隐藏/显示某个结构 */
export function setStructureVisible(plugin: PluginContext, index: number, visible: boolean) {
    const s = getAllStructures(plugin)[index];
    if (s) plugin.managers.structure.hierarchy.toggleVisibility([s], visible ? 'show' : 'hide');
}

export function isStructureVisible(plugin: PluginContext, index: number): boolean {
    const s = getAllStructures(plugin)[index];
    if (!s) return true;
    const cell = plugin.state.data.cells.get(s.cell.transform.ref);
    return !(cell?.state.isHidden ?? s.cell.state.isHidden);
}

/** 当前要修改的结构：只有一个时返回它，多个时只返回选中的那个 */
export function getStructures(plugin: PluginContext) {
    const all = getAllStructures(plugin);
    if (all.length <= 1) return all;
    return [all[getActiveStructureIndex(plugin)]];
}

/** 当前场景是否已有结构 */
/** 当前是否有 focus 高亮（点了 ligand/residue） */
export function hasFocusHighlight(plugin: PluginContext): boolean {
    return !!plugin.managers.structure.focus.behaviors.current.value;
}

export function hasContent(plugin: PluginContext): boolean {    return getAllStructures(plugin).length > 0;
}

/** 是否含配体（非聚合物实体） */
export function hasLigands(plugin: PluginContext): boolean {    for (const s of getStructures(plugin)) {
        const model = s.cell.obj?.data?.model;
        if (!model?.entities) continue;
        const types = model.entities.data.type;
        for (let i = 0; i < types.rowCount; i++) {
            const t = types.value(i);
            if (t === 'non-polymer' || t === 'branched') return true;
        }
    }
    return false;
}

const LigandComponentTag = 'structure-component-static-ligand';
const LigandElementParams = { carbonColor: { name: 'element-symbol', params: {} } };

function getLigandComponents(plugin: PluginContext) {
    const result: any[] = [];
    for (const s of getStructures(plugin)) {
        for (const c of s.components) {
            const tags = c.cell.transform.tags ?? [];
            if (tags.includes(LigandComponentTag) || tags.includes(EasyLigandTag)) result.push(c);
        }
    }
    return result;
}

/** 配体组件上的所有表示（可按类型过滤） */
function ligandReprs(plugin: PluginContext, type?: EasyRepresentationType) {
    const result: { repr: any, type: EasyRepresentationType }[] = [];
    for (const c of getLigandComponents(plugin)) {
        for (const r of c.representations) {
            const name = (r.cell.transform.params as any)?.type?.name as EasyRepresentationType | undefined;
            if (!name) continue;
            if (type && name !== type) continue;
            result.push({ repr: r, type: name });
        }
    }
    return result;
}

/** 配体当前的表示层（增量叠加，去重） */
export function getLigandLayers(plugin: PluginContext): RepresentationLayer[] {
    const layers: RepresentationLayer[] = [];
    const seen = new Set<string>();
    for (const { repr, type } of ligandReprs(plugin)) {
        if (seen.has(type)) continue;
        seen.add(type);
        const params = repr.cell.transform.params as any;
        const typeParams = params?.type?.params ?? {};
        layers.push({
            type,
            color: params?.colorTheme?.name ?? 'element-symbol',
            colorOptions: params?.colorTheme?.params,
            alpha: typeParams.alpha,
            size: params?.sizeTheme?.params?.scale,
            visible: !repr.cell.state.isHidden,
        });
    }
    return layers;
}

/** 追加一个配体表示（已存在则重新显示） */
export async function addLigandLayer(plugin: PluginContext, type: EasyRepresentationType) {
    const existing = ligandReprs(plugin, type);
    if (existing.length > 0) {
        plugin.managers.structure.hierarchy.toggleVisibility(existing.map(e => e.repr), 'show');
        return;
    }
    const isSurface = SurfaceTypes.has(type);
    await plugin.dataTransaction(async () => {
        for (const s of getStructures(plugin)) {
            const ligand = await plugin.builders.structure.tryCreateComponentStatic(s.cell, 'ligand', { label: 'Ligands' });
            if (!ligand) continue;
            await plugin.builders.structure.representation.addRepresentation(ligand, {
                type: type as any,
                color: 'element-symbol',
                colorParams: LigandElementParams,
                ...(isSurface ? { typeParams: { quality: currentSurfaceQuality() } } : {}),
            }, { tag: `qb-ligand-repr-${type}` });
        }
    }, { canUndo: 'Add Ligand Layer' });
}

/** 移除一个配体表示（删除） */
export async function removeLigandLayer(plugin: PluginContext, type: EasyRepresentationType) {
    const refs = ligandReprs(plugin, type).map(e => e.repr.cell.transform.ref);
    if (refs.length === 0) return;
    const b = plugin.build();
    for (const ref of refs) b.delete(ref);
    await b.commit({ canUndo: 'Remove Ligand Layer' });
}

export function setLigandLayerVisible(plugin: PluginContext, type: EasyRepresentationType, visible: boolean) {
    for (const { repr } of ligandReprs(plugin, type)) {
        plugin.state.data.updateCellState(repr.cell.transform.ref, { isHidden: !visible });
    }
}

/** 原地改配体层颜色，不重建几何 */
export async function updateLigandLayerColor(plugin: PluginContext, type: EasyRepresentationType, color: EasyColorTheme, colorOptions?: EasyViewerColorOptions) {
    const colorParams = colorThemeParams(color, colorOptions);
    const update = plugin.build();
    for (const { repr } of ligandReprs(plugin, type)) {
        update.to(repr.cell).update(old => { old.colorTheme = { name: color, params: colorParams } as any; });
    }
    await update.commit({ canUndo: 'Ligand Color' });
}

/** 原地改配体层透明度，不重建几何 */
export async function updateLigandLayerAlpha(plugin: PluginContext, type: EasyRepresentationType, alpha: number) {
    const update = plugin.build();
    for (const { repr } of ligandReprs(plugin, type)) {
        update.to(repr.cell).update(old => {
            const p = old as any;
            if (!p.type.params) p.type.params = {};
            p.type.params.alpha = alpha;
        });
    }
    await update.commit({ canUndo: 'Ligand Alpha' });
}

/** 配体层大小（球棍/填充等的 sizeTheme.scale） */
export async function updateLigandLayerSize(plugin: PluginContext, type: EasyRepresentationType, size: number) {
    const update = plugin.build();
    for (const { repr } of ligandReprs(plugin, type)) {
        update.to(repr.cell).update(old => {
            const p = old as any;
            if (!p.sizeTheme) p.sizeTheme = { name: 'physical', params: {} };
            if (!p.sizeTheme.params) p.sizeTheme.params = {};
            p.sizeTheme.params.scale = size;
        });
    }
    await update.commit({ canUndo: 'Ligand Size' });
}

/** 检测已加载结构里的聚合物链（label_asym_id） */
export function getAvailableChains(plugin: PluginContext): string[] {
    const result = new Set<string>();
    for (const s of getStructures(plugin)) {
        const struct = s.cell.obj?.data;
        const model = struct?.model;
        if (!model?.atomicHierarchy || !model.entities) continue;
        const { label_asym_id, label_entity_id } = model.atomicHierarchy.chains;
        for (let i = 0; i < label_asym_id.rowCount; i++) {
            const entityId = label_entity_id.value(i);
            const entityIndex = model.entities.getEntityIndex(entityId);
            if (entityIndex < 0) continue;
            if (model.entities.data.type.value(entityIndex) === 'polymer') {
                result.add(label_asym_id.value(i));
            }
        }
    }
    return Array.from(result).sort();
}

/** 根据配色主题生成 colorParams（链/彩虹/单色用自定义调色板） */
export function colorThemeParams(name: EasyColorTheme, opts?: EasyViewerColorOptions): any {
    switch (name) {
        case 'chain-id': {
            const palette = ChainPalettes[opts?.chainPalette ?? 'default'] ?? ChainPalettes.default;
            return { palette: { name: 'colors', params: { list: { kind: 'set', colors: palette.colors.map(c => Color(c)) } } } };
        }
        case 'sequence-id': {
            const palette = RainbowPalettes[opts?.rainbowPalette ?? 'rainbow'] ?? RainbowPalettes.rainbow;
            return { list: { kind: 'interpolate', colors: palette.colors.map(c => Color(c)) } };
        }
        case 'uniform':
            return { value: Color(opts?.uniformColor ?? 0x94a3b8) };
        default:
            return undefined;
    }
}

export async function setColorTheme(plugin: PluginContext, name: EasyColorTheme, opts?: EasyViewerColorOptions) {
    const colorParams = colorThemeParams(name, opts);
    await plugin.dataTransaction(async () => {
        for (const s of getStructures(plugin)) {
            await plugin.managers.structure.component.updateRepresentationsTheme(s.components, { color: name, colorParams });
        }
    }, { canUndo: 'Easy Color Theme' });
}

/** 各样式对应的外观：true = 插画风（描边/平光），false = 高光（正常光照/无描边） */
const StyleAppearance: { [K in EasyStyle]: boolean } = {
    auto: false,
    'polymer-and-ligand': true,
    'atomic-detail': false,
    'molecular-surface': true,
    'illustrative': true,
    'coarse-surface': true,
};

export type BaseStyle = 'cartoon' | '3d' | 'reflective';

const DefaultMaterial = { metalness: 0, roughness: 1, bumpiness: 0 };
const ReflectiveMaterial = { metalness: 0.6, roughness: 0.15, bumpiness: 0 };
export const DefaultLightIntensity = 0.6;
export const ReflectiveLightIntensity = 2.0;

/**
 * 三选一渲染风格（表示相同，只是外观不同）：
 * - 'cartoon'    卡通：插画风（平光 + 描边）
 * - '3d'         3D：写实（正常光照 + 哑光）
 * - 'reflective' 高反光：金属感（低粗糙度 + 高金属度 + 更强光照）
 * 返回外观是否插画风，供 UI 同步。
 */
export async function setBaseStyle(plugin: PluginContext, mode: BaseStyle): Promise<boolean> {
    // 只切换外观，不重建表示，避免覆盖用户已调好的样式
    const illustrative = mode === 'cartoon';
    await setIllustrative(plugin, illustrative, mode === 'reflective' ? ReflectiveMaterial : DefaultMaterial);
    setLightIntensity(plugin, mode === 'reflective' ? ReflectiveLightIntensity : DefaultLightIntensity);
    return illustrative;
}

/** 应用样式，并返回该样式对应的外观（是否插画风），供 UI 同步。 */
export async function setStyle(plugin: PluginContext, name: EasyStyle): Promise<boolean> {
    const illustrative = StyleAppearance[name] ?? false;
    await setIllustrative(plugin, illustrative);

    const provider = (PresetStructureRepresentations as any)[name];
    if (provider) await plugin.managers.structure.component.applyPreset(getStructures(plugin), provider);
    return illustrative;
}

/** 归一化：把简写的 representation/color 转成层列表 */
export function getLayers(pres: ChainPresentation): RepresentationLayer[] {
    if (pres.layers) return pres.layers;
    const raw = pres.representation ?? 'cartoon';
    const types = Array.isArray(raw) ? raw : [raw];
    return types.map(type => ({ type, color: pres.color, colorOptions: pres.colorOptions, alpha: pres.alpha, visible: pres.visible }));
}

async function addChainPresentationFor(plugin: PluginContext, structure: ReturnType<typeof getStructures>[number], pres: ChainPresentation) {
    const expr = MS.struct.generator.atomGroups({
        'chain-test': MS.core.rel.eq([MS.struct.atomProperty.macromolecular.label_asym_id(), pres.chain])
    });
    const comp = await plugin.builders.structure.tryCreateComponentFromExpression(
        structure.cell, expr, `qb-chain-${pres.chain}`, { label: `Chain ${pres.chain}` }
    );
    if (!comp) return;

    const layers = getLayers(pres);
    const desiredTags = new Set(layers.map(l => `qb-chain-repr-${pres.chain}-${l.type}`));

    for (const layer of layers) {
        const color = layer.color ?? 'chain-id';
        const isSurface = layer.type === 'molecular-surface' || layer.type === 'gaussian-surface';
        // 表面精度随渲染质量（拖动时隐藏表面，交互仍流畅）；alpha 对所有类型生效（含 Ribbon）
        const typeParams = isSurface
            ? { quality: currentSurfaceQuality(), ...(layer.alpha !== undefined ? { alpha: layer.alpha } : {}) }
            : (layer.alpha !== undefined ? { alpha: layer.alpha } : undefined);

        const isTube = layer.type === 'backbone';
        const reprType: any = isTube ? 'putty' : layer.type;
        const reprTypeParams = isTube
            ? { ...(layer.alpha !== undefined ? { alpha: layer.alpha } : {}), visuals: ['polymer-tube'], sizeFactor: (layer.size ?? 0.08) * 2 }
            : typeParams;

        const repr = await plugin.builders.structure.representation.addRepresentation(comp, {
            type: reprType,
            color,
            colorParams: colorThemeParams(color, layer.colorOptions),
            typeParams: reprTypeParams,
        }, { tag: `qb-chain-repr-${pres.chain}-${layer.type}` });

        if (repr) {
            plugin.state.data.updateCellState(repr.ref, { isHidden: layer.visible === false });
        }
    }

    // 取消的表示：隐藏（不删除，重新添加即可恢复）
    for (const s of getStructures(plugin)) {
        for (const c of s.components) {
            for (const r of c.representations) {
                const t = (r.cell.transform.tags ?? []).find(x => x.startsWith(`qb-chain-repr-${pres.chain}-`));
                if (t && !desiredTags.has(t)) plugin.state.data.updateCellState(r.ref, { isHidden: true });
            }
        }
    }
}

/** 只移除聚合物/链组件，保留配体、水、离子等 */
async function removeChainComponents(plugin: PluginContext) {
    const toRemove: any[] = [];
    for (const s of getStructures(plugin)) {
        for (const c of s.components) {
            const tags = c.cell.transform.tags ?? [];
            if (tags.some(t => t === 'structure-component-static-polymer' || t.startsWith('structure-component-qb-chain-'))) {
                toRemove.push(c);
            }
        }
    }
    if (toRemove.length > 0) await plugin.managers.structure.hierarchy.remove(toRemove, true);
}

/** 按链设置表示/风格/颜色（保留配体、水等） */
export async function setChainPresentations(plugin: PluginContext, presentations: ChainPresentation[]) {
    const structures = getStructures(plugin);
    await removeChainComponents(plugin);
    await plugin.dataTransaction(async () => {
        for (const s of structures) {
            for (const pres of presentations) await addChainPresentationFor(plugin, s, pres);
        }
    }, { canUndo: 'Chain Presentations' });
}

/** 追加一条链的表示（不清空其他） */
export async function addChainPresentation(plugin: PluginContext, pres: ChainPresentation) {
    await plugin.dataTransaction(async () => {
        for (const s of getStructures(plugin)) await addChainPresentationFor(plugin, s, pres);
    }, { canUndo: 'Add Chain Presentation' });
}

/** 批量追加多条链的表示，合并在同一个事务里提交（性能友好） */
export async function addChainPresentations(plugin: PluginContext, presentations: ChainPresentation[]) {
    if (presentations.length === 0) return;
    await plugin.dataTransaction(async () => {
        for (const s of getStructures(plugin)) {
            for (const pres of presentations) await addChainPresentationFor(plugin, s, pres);
        }
    }, { canUndo: 'Chain Presentations' });
}

/**
 * 只更新某一层的颜色（原地改 colorTheme），不重建几何。
 * 用于分子表面这类几何计算昂贵的表示，改颜色时避免重算。
 */
export async function updateLayerColor(plugin: PluginContext, chain: string, type: EasyRepresentationType, color: EasyColorTheme, colorOptions?: EasyViewerColorOptions) {
    const tag = `qb-chain-repr-${chain}-${type}`;
    const colorParams = colorThemeParams(color, colorOptions);
    const update = plugin.build();
    for (const s of getStructures(plugin)) {
        for (const c of s.components) {
            for (const r of c.representations) {
                if ((r.cell.transform.tags ?? []).includes(tag)) {
                    update.to(r.cell).update(old => { old.colorTheme = { name: color, params: colorParams } as any; });
                }
            }
        }
    }
    await update.commit({ canUndo: 'Layer Color' });
}

/** 只更新某一层的透明度（原地改 type.params.alpha），不重建几何 */
export async function updateLayerAlpha(plugin: PluginContext, chain: string, type: EasyRepresentationType, alpha: number) {
    const tag = `qb-chain-repr-${chain}-${type}`;
    const update = plugin.build();
    for (const s of getStructures(plugin)) {
        for (const c of s.components) {
            for (const r of c.representations) {
                if ((r.cell.transform.tags ?? []).includes(tag)) {
                    update.to(r.cell).update(old => {
                        const p = old as any;
                        if (!p.type.params) p.type.params = {};
                        p.type.params.alpha = alpha;
                    });
                }
            }
        }
    }
    await update.commit({ canUndo: 'Layer Alpha' });
}

/** 显隐某一层（用官方 toggleVisibility，走同一套可见性逻辑） */
export function setLayerVisible(plugin: PluginContext, chain: string, type: EasyRepresentationType, visible: boolean) {
    const tag = `qb-chain-repr-${chain}-${type}`;
    const refs: any[] = [];
    for (const s of getStructures(plugin)) {
        for (const c of s.components) {
            for (const r of c.representations) {
                if ((r.cell.transform.tags ?? []).includes(tag)) refs.push(r);
            }
        }
    }
    if (refs.length > 0) plugin.managers.structure.hierarchy.toggleVisibility(refs, visible ? 'show' : 'hide');
}

/** 所有配体组件的 ref（默认 preset 的 + 手动创建的） */
function ligandComponentRefs(plugin: PluginContext) {
    const refs: any[] = [];
    for (const s of getStructures(plugin)) {
        for (const c of s.components) {
            const tags = c.cell.transform.tags ?? [];
            if (tags.includes(EasyLigandTag) || tags.includes('structure-component-static-ligand')) refs.push(c);
        }
    }
    return refs;
}

export async function showLigands(plugin: PluginContext) {
    const existing = ligandComponentRefs(plugin);
    if (existing.length > 0) {
        plugin.managers.structure.hierarchy.toggleVisibility(existing, 'show');
        return;
    }
    await plugin.dataTransaction(async () => {
        for (const s of getStructures(plugin)) {
            const ligand = await plugin.builders.structure.tryCreateComponentStatic(s.cell, 'ligand', { label: 'Ligands', tags: [EasyLigandTag] });
            if (ligand) {
                await plugin.builders.structure.representation.addRepresentation(ligand, {
                    type: 'ball-and-stick',
                    color: 'element-symbol',
                    colorParams: { carbonColor: { name: 'element-symbol', params: {} } }
                }, { tag: 'qb-ligand-repr' });
            }
        }
    }, { canUndo: 'Show Ligands' });
}

/** 显示/隐藏配体（不重建） */
export function setLigandsVisible(plugin: PluginContext, visible: boolean) {
    const refs = ligandComponentRefs(plugin);
    if (refs.length > 0) plugin.managers.structure.hierarchy.toggleVisibility(refs, visible ? 'show' : 'hide');
}

export function hideLigands(plugin: PluginContext) {
    setLigandsVisible(plugin, false);
}

export function areLigandsVisible(plugin: PluginContext) {
    return ligandComponentRefs(plugin).some(c => !c.cell.state.isHidden);
}

/** 显示/隐藏某条链（不重建） */
export function setChainVisible(plugin: PluginContext, chain: string, visible: boolean) {
    const refs: any[] = [];
    for (const s of getStructures(plugin)) {
        for (const c of s.components) {
            const tags = c.cell.transform.tags ?? [];
            if (tags.some(t => t === `structure-component-qb-chain-${chain}`)) refs.push(c);
        }
    }
    if (refs.length > 0) plugin.managers.structure.hierarchy.toggleVisibility(refs, visible ? 'show' : 'hide');
}

export function setWaterVisible(plugin: PluginContext, visible: boolean) {
    for (const s of getStructures(plugin)) {
        for (const c of s.components) {
            if (c.cell.transform.tags?.some(t => t.includes('water'))) {
                plugin.managers.structure.hierarchy.toggleVisibility([c], visible ? 'show' : 'hide');
            }
        }
    }
}

function waterComponents(plugin: PluginContext) {
    const result: any[] = [];
    for (const s of getStructures(plugin)) {
        for (const c of s.components) {
            if (c.cell.transform.tags?.some(t => t.includes('water'))) result.push(c);
        }
    }
    return result;
}

/** 是否含水分子 */
export function hasWater(plugin: PluginContext): boolean {
    return waterComponents(plugin).length > 0;
}

/** 水分子当前是否可见 */
export function isWaterVisible(plugin: PluginContext): boolean {
    return waterComponents(plugin).some(c => !c.cell.state.isHidden);
}

const hydrogenPresence = new WeakMap<object, boolean>();

/** 是否含氢原子（按模型缓存，避免每次遍历全部原子） */
export function hasHydrogens(plugin: PluginContext): boolean {
    for (const s of getStructures(plugin)) {
        const model = s.cell.obj?.data?.model;
        if (!model) continue;
        let has = hydrogenPresence.get(model);
        if (has === undefined) {
            has = false;
            const sym = model.atomicHierarchy.atoms.type_symbol;
            for (let i = 0; i < sym.rowCount; i++) {
                if (sym.value(i) === 'H') { has = true; break; }
            }
            hydrogenPresence.set(model, has);
        }
        if (has) return true;
    }
    return false;
}

const HydrogenOption: { [K in HydrogenMode]: 'all' | 'hide-all' | 'only-polar' } = {
    none: 'hide-all',
    polar: 'only-polar',
    all: 'all',
};

let hydrogenMode: HydrogenMode = 'polar';

export function getHydrogenMode(): HydrogenMode {
    return hydrogenMode;
}

/** 氢原子显示：写入组件管理器选项，作用于所有表示（含之后新加载的结构） */
export async function setHydrogens(plugin: PluginContext, mode: HydrogenMode) {
    hydrogenMode = mode;
    await plugin.managers.structure.component.setOptions({
        ...plugin.managers.structure.component.state.options,
        hydrogens: HydrogenOption[mode],
    });
}

/** 结构加载后重新套用当前氢设置（配体等新组件也跟随） */
export async function reapplyHydrogens(plugin: PluginContext) {
    await setHydrogens(plugin, hydrogenMode);
}

//

const classicListeners = new Set<() => void>();
let classicMode = false;

export function isClassicMode() {
    return classicMode;
}

/** 在「简易界面」和「传统 Mol* 界面」之间切换。返回切换后的状态（true = 传统）。 */
export function toggleClassicMode(plugin: PluginContext) {
    classicMode = !classicMode;
    for (const fn of classicListeners) fn();
    applyClassicLayout(plugin, classicMode);
    return classicMode;
}

export function subscribeClassicMode(fn: () => void) {
    classicListeners.add(fn);
    return () => { classicListeners.delete(fn); };
}

/**
 * 传统界面：只显示右侧原生 Structure 工具面板（可改 representation）。
 * 简易界面：隐藏右侧，显示左侧简易面板。
 * 顶部序列、底部时间线始终关闭。
 */
export async function applyClassicLayout(plugin: PluginContext, classic: boolean) {
    const controls = plugin.spec.components?.controls;
    if (controls) {
        controls.right = classic ? undefined : 'none';
    }
    const state = produce(plugin.layout.state, s => {
        s.regionState.right = classic ? 'full' : 'hidden';
        // 传统界面时关闭简易面板；返回简易界面时恢复
        s.regionState.left = classic ? 'hidden' : 'full';
    });
    await PluginCommands.Layout.Update(plugin, { state });
}

/** 显示/隐藏左侧面板 */
export async function setPanelVisible(plugin: PluginContext, visible: boolean) {
    const collapsed = plugin.behaviors.layout.leftPanelTabName.value === 'none';
    const state = produce(plugin.layout.state, s => {
        s.regionState.left = visible ? (collapsed ? 'collapsed' : 'full') : 'hidden';
    });
    await PluginCommands.Layout.Update(plugin, { state });
}

export function isPanelVisible(plugin: PluginContext) {
    return plugin.layout.state.regionState.left !== 'hidden';
}

/** 某条链的 loci */
function getChainLoci(structure: Structure, chain: string): StructureElement.Loci | undefined {
    const elements: any[] = [];
    for (const unit of structure.units) {
        if (!Unit.isAtomic(unit)) continue;
        const { label_asym_id } = unit.model.atomicHierarchy.chains;
        const chainSegments = unit.model.atomicHierarchy.chainAtomSegments;
        const indices: number[] = [];
        for (let i = 0; i < unit.elements.length; i++) {
            const a = unit.elements[i];
            if (label_asym_id.value(chainSegments.index[a]) === chain) indices.push(a);
        }
        if (indices.length > 0) elements.push({ unit, indices: OrderedSet.ofSortedArray(indices) });
    }
    if (elements.length === 0) return undefined;
    return StructureElement.Loci(structure, elements);
}

/** 在 canvas 上高亮某条链（chain 为 null 则清除） */
export function highlightChain(plugin: PluginContext, chain: string | null) {
    const selects = plugin.managers.interactivity.lociSelects;
    selects.deselectAll();
    if (!chain) return;
    const structure = getStructures(plugin)[0]?.cell.obj?.data;
    const loci = structure ? getChainLoci(structure, chain) : undefined;
    if (loci) selects.select({ loci });
}

//

let targetedChain: string | null = null;
const targetedChainListeners = new Set<() => void>();

export function getTargetedChain() {
    return targetedChain;
}

export function subscribeTargetedChain(fn: () => void) {
    targetedChainListeners.add(fn);
    return () => { targetedChainListeners.delete(fn); };
}

/** 设置「目标链」：通知 UI（null = 全部链）。highlight 为 true 时同时高亮整条链。 */
export function setTargetedChain(plugin: PluginContext, chain: string | null, highlight = true) {
    targetedChain = chain;
    if (highlight) highlightChain(plugin, chain);
    for (const fn of targetedChainListeners) fn();
}

function chainTypeName(subtype: string): string {
    if (!subtype) return '';
    if (subtype.indexOf('polypeptide') >= 0) return 'protein';
    if (subtype.indexOf('polydeoxyribonucleotide') >= 0) return 'DNA';
    if (subtype.indexOf('polyribonucleotide') >= 0) return 'RNA';
    if (subtype.indexOf('oligosaccharide') >= 0) return 'saccharide';
    return '';
}

/** 每条链的类型（protein / DNA / RNA / saccharide） */
export function getChainTypes(plugin: PluginContext): { [chain: string]: string } {
    const result: { [chain: string]: string } = {};
    for (const s of getStructures(plugin)) {
        const struct = s.cell.obj?.data;
        const model = struct?.model;
        if (!model?.atomicHierarchy || !model.entities) continue;
        const { label_asym_id, label_entity_id } = model.atomicHierarchy.chains;
        for (let i = 0; i < label_asym_id.rowCount; i++) {
            const entityId = label_entity_id.value(i);
            const entityIndex = model.entities.getEntityIndex(entityId);
            if (entityIndex < 0) continue;
            result[label_asym_id.value(i)] = chainTypeName(model.entities.subtype.value(entityIndex));
        }
    }
    return result;
}

/** 显示/隐藏顶部序列视图 */
export async function setSequenceVisible(plugin: PluginContext, visible: boolean) {
    const controls = plugin.spec.components?.controls;
    if (controls) controls.top = visible ? undefined : 'none';
    const state = produce(plugin.layout.state, s => {
        s.regionState.top = visible ? 'full' : 'hidden';
    });
    await PluginCommands.Layout.Update(plugin, { state });
}

export function isSequenceVisible(plugin: PluginContext) {
    return plugin.spec.components?.controls?.top !== 'none';
}

/** 悬停信息：只显示链和氨基酸序号（深蓝，字号见 CSS） */
export function setupLociLabels(plugin: PluginContext) {
    plugin.managers.lociLabels.clearProviders();
    plugin.managers.lociLabels.addProvider({
        priority: 200,
        label: (loci: Loci) => {
            // 悬停到相互作用（虚线）上：显示相互作用类型 + 距离
            if (Interactions.isLoci(loci as any)) {
                const l = loci as any;
                try {
                    const element = l.elements?.[0];
                    if (!element) return undefined;
                    const structure = l.data.structure;
                    const inter = l.data.interactions;
                    const type = Interactions.locationLabel(Interactions.Location(inter, structure, element.unitA, element.indexA, element.unitB, element.indexB));
                    let dist = '';
                    const fA = inter.unitsFeatures.get(element.unitA.id);
                    const fB = inter.unitsFeatures.get(element.unitB.id);
                    if (fA && fB) {
                        const pA = Vec3(), pB = Vec3();
                        const uA = structure.unitMap.get(element.unitA.id);
                        const uB = structure.unitMap.get(element.unitB.id);
                        uA.conformation.position(uA.elements[fA.members[fA.offsets[element.indexA]]], pA);
                        uB.conformation.position(uB.elements[fB.members[fB.offsets[element.indexB]]], pB);
                        dist = `  ${Vec3.distance(pA, pB).toFixed(2)} Å`;
                    }
                    return `${type}${dist}`;
                } catch {
                    return undefined;
                }
            }
            if (!StructureElement.Loci.is(loci)) return undefined;
            const first = loci.elements[0];
            if (!first) return undefined;

            const loc = StructureElement.Location.create(loci.structure, first.unit, first.unit.elements[OrderedSet.start(first.indices)]);
            return `Chain ${StructureProperties.chain.label_asym_id(loc)} &nbsp; ${StructureProperties.atom.label_comp_id(loc)} ${StructureProperties.residue.auth_seq_id(loc)}`;
        },
    });
}

/** 低开销的遮蔽(SSAO)参数：半分辨率、采样 16 */
const CheapOcclusionParams = {
    multiScale: { name: 'off' as const, params: {} },
    radius: 5,
    bias: 0.8,
    blurKernelSize: 15,
    blurDepthBias: 0.5,
    samples: 16,
    resolutionScale: 0.5,
    color: Color(0x000000),
    transparentThreshold: 0.4,
};

type PostKey = 'outline' | 'shadow' | 'occlusion';
/** 描边不包含透明对象：避免把半透明文字（标签）也描边而显得粗/糊 */
const OutlineOnParams = { ...PD.getDefaultValues(OutlineParams), includeTransparent: false };
const DefaultPostParams: { [K in PostKey]: any } = {
    outline: OutlineOnParams,
    shadow: PD.getDefaultValues(ShadowParams),
    occlusion: CheapOcclusionParams,
};

function setPostprocessing(plugin: PluginContext, key: PostKey, on: boolean) {
    const c = plugin.canvas3d;
    if (!c) return;
    const pp = c.props.postprocessing as any;
    const current = pp[key];
    const params = current?.name === 'on' ? current.params : DefaultPostParams[key];
    c.setProps({ postprocessing: { ...pp, [key]: on ? { name: 'on', params } : { name: 'off', params: {} } } });
    plugin.events.canvas3d.settingsUpdated.next(void 0);
}

export function setOutline(plugin: PluginContext, on: boolean) { setPostprocessing(plugin, 'outline', on); }
export function isOutlineOn(plugin: PluginContext) { return plugin.canvas3d?.props.postprocessing.outline.name === 'on'; }
export function setShadow(plugin: PluginContext, on: boolean) { setPostprocessing(plugin, 'shadow', on); }
export function isShadowOn(plugin: PluginContext) { return plugin.canvas3d?.props.postprocessing.shadow.name === 'on'; }
export function setOcclusion(plugin: PluginContext, on: boolean) { setPostprocessing(plugin, 'occlusion', on); }
export function isOcclusionOn(plugin: PluginContext) { return plugin.canvas3d?.props.postprocessing.occlusion.name === 'on'; }

/** 插画风：平光(ignoreLight) + 描边/遮蔽后处理，卡通看起来像 illustrative */
export async function setIllustrative(plugin: PluginContext, on: boolean, materialStyle?: any) {
    await plugin.managers.structure.component.setOptions({
        ...plugin.managers.structure.component.state.options,
        ignoreLight: on,
        ...(materialStyle ? { materialStyle } : {}),
    });

    // 焦点高亮表示不在组件管理器里，需要单独套用当前材质/光照，否则高反光下发惨白
    await refreshHighlightMode(plugin, getHighlightMode());

    // 扁平风下球棍/空间填充保持立体明暗，否则原子挤在一起分不清
    if (on) {
        const update = plugin.build();
        let any = false;
        for (const s of getStructures(plugin)) {
            for (const c of s.components) {
                for (const r of c.representations) {
                    const name = (r.cell.transform.params as any)?.type?.name;
                    if (name === 'ball-and-stick' || name === 'spacefill' || name === 'line') {
                        update.to(r.cell).update(old => { (old as any).type.params.ignoreLight = false; });
                        any = true;
                    }
                }
            }
        }
        if (any) await update.commit();
    }

    if (!plugin.canvas3d) return;
    // 明暗通道（遮蔽 SSAO）默认开，描边默认开
    plugin.canvas3d.setProps({
        postprocessing: {
            outline: { name: 'on', params: OutlineOnParams },
            occlusion: { name: 'on', params: CheapOcclusionParams },
            shadow: { name: 'off', params: {} },
        },
    });
    plugin.events.canvas3d.settingsUpdated.next(void 0);
}

export type ScreenshotResolution = 'viewport' | 'hd' | 'full-hd' | 'ultra-hd' | '8k-ultra-hd';

const SurfaceTypes = new Set(['molecular-surface', 'gaussian-surface']);

export type RenderQuality = 'high' | 'normal' | 'preview';

const SurfaceQualityByRender: { [K in RenderQuality]: 'high' | 'medium' | 'low' } = {
    high: 'high',
    normal: 'medium',
    preview: 'low',
};

let renderQuality: RenderQuality = 'high';

export function getRenderQuality() {
    return renderQuality;
}

function currentSurfaceQuality() {
    return SurfaceQualityByRender[renderQuality];
}

/** 渲染质量：高清 / 普通 / 预览。主要影响表面多面体个数、分辨率与多重采样。 */
export async function setRenderQuality(plugin: PluginContext, level: RenderQuality) {
    renderQuality = level;

    if (plugin.canvas3d) {
        plugin.canvas3d.setProps({
            multiSample: { ...plugin.canvas3d.props.multiSample, mode: level === 'high' ? 'on' : 'off' },
        });
    }
    plugin.canvas3dContext?.setProps({
        resolutionMode: 'auto',
        pixelScale: level === 'preview' ? 0.75 : 1,
    });
    plugin.events.canvas3d.settingsUpdated.next(void 0);

    const q = SurfaceQualityByRender[level];
    const b = plugin.build();
    plugin.state.data.cells.forEach((cell, ref) => {
        const params = cell.transform.params as any;
        if (SurfaceTypes.has(params?.type?.name)) {
            b.to(ref).update(old => { (old as any).type.params.quality = q; });
        }
    });
    await b.commit({ canUndo: 'Render Quality' });
}

function getSurfaceReprs(plugin: PluginContext) {
    const result: { ref: string, quality: string }[] = [];
    plugin.state.data.cells.forEach((cell, ref) => {
        const params = cell.transform.params as any;
        const typeName = params?.type?.name;
        if (SurfaceTypes.has(typeName)) {
            result.push({ ref, quality: params.type.params?.quality ?? 'auto' });
        }
    });
    return result;
}

/** 渲染/导出期间把表面临时提到 high 质量，结束后恢复（交互保持低质量，流畅） */
async function withHighQualitySurfaces<T>(plugin: PluginContext, fn: () => Promise<T>): Promise<T> {
    const surfaces = getSurfaceReprs(plugin);
    if (surfaces.length === 0) return fn();

    const b = plugin.build();
    for (const { ref } of surfaces) {
        b.to(ref).update(old => { (old as any).type.params.quality = 'high'; });
    }
    await b.commit();

    try {
        return await fn();
    } finally {
        const rb = plugin.build();
        for (const { ref, quality } of surfaces) {
            rb.to(ref).update(old => { (old as any).type.params.quality = quality; });
        }
        await rb.commit();
    }
}

/**
 * 导出图片：独立高分辨率渲染，不受交互分辨率影响。
 * 导出前临时把表面质量提到 high，导出后恢复。
 */
export async function screenshot(plugin: PluginContext, resolution: ScreenshotResolution = 'full-hd', highQuality = true) {
    const helper = plugin.helpers.viewportScreenshot;
    if (!helper) return;

    helper.behaviors.values.next({ ...helper.values, resolution: { name: resolution, params: {} } as any });
    if (highQuality) await withHighQualitySurfaces(plugin, () => helper.download());
    else await helper.download();
}

/**
 * 包装内置截图 helper 的 复制/下载/取图 方法，
 * 让它们也临时提升表面质量（否则内置面板导出的面还是粗糙）。
 */
export function wrapScreenshotQuality(plugin: PluginContext) {
    const helper = plugin.helpers.viewportScreenshot as any;
    if (!helper) return;

    const origCopy = helper.copyToClipboard?.bind(helper);
    if (origCopy) helper.copyToClipboard = () => withHighQualitySurfaces(plugin, origCopy);

    const origDownload = helper.download?.bind(helper);
    if (origDownload) helper.download = (filename?: string) => withHighQualitySurfaces(plugin, () => origDownload(filename));

    const origDataUri = helper.getImageDataUri?.bind(helper);
    if (origDataUri) helper.getImageDataUri = () => withHighQualitySurfaces(plugin, origDataUri);
}

/** 设置导出图片的默认分辨率 */
export function setScreenshotResolution(plugin: PluginContext, resolution: ScreenshotResolution) {
    const helper = plugin.helpers.viewportScreenshot;
    if (!helper) return;
    helper.behaviors.values.next({ ...helper.values, resolution: { name: resolution, params: {} } as any });
}

/**
 * 拖动时临时隐藏分子表面（最吃 GPU），停手后恢复。描边保持不动。
 */
export function enableAdaptivePerformance(plugin: PluginContext) {
    const c = plugin.canvas3d;
    if (!c) return;
    let handle: any;

    const getSurfaces = () => {
        const refs: any[] = [];
        for (const s of getAllStructures(plugin)) {
            for (const comp of s.components) {
                for (const r of comp.representations) {
                    const tags = r.cell.transform.tags ?? [];
                    if (tags.some(t => t.endsWith('-molecular-surface') || t.endsWith('-gaussian-surface'))) refs.push(r);
                }
            }
        }
        return refs;
    };

    c.interaction.drag.subscribe(() => {
        const surfaces = getSurfaces();
        for (const r of surfaces) plugin.state.data.updateCellState(r.ref, { isHidden: true });
        clearTimeout(handle);
        handle = setTimeout(() => {
            for (const r of surfaces) plugin.state.data.updateCellState(r.ref, { isHidden: false });
        }, 180);
    });
}

export function resetCamera(plugin: PluginContext) {
    PluginCommands.Camera.Reset(plugin, {});
}

/** 导出状态（json） */
export function exportState(plugin: PluginContext) {
    PluginCommands.State.Snapshots.DownloadToFile(plugin, { type: 'json' });
}

/** 加载状态文件（json/zip） */
export function loadStateFile(plugin: PluginContext, file: File) {
    PluginCommands.State.Snapshots.OpenFile(plugin, { file });
}

/** 打开本地文件：结构（pdb/mmcif/cif/sdf/mol2/...）与状态文件（.molj/.molx）自动识别。
 *  mode='new' 先清空当前场景，mode='add' 追加到当前场景。 */
export async function loadStructureFile(plugin: PluginContext, file: File, mode: 'new' | 'add' = 'new') {
    if (mode === 'new') { await plugin.clear(); clearPharmacophore(plugin); }
    const result = await loaders.loadFiles(plugin, [file]);
    const all = getAllStructures(plugin);
    if (all.length) structureFileNameMap(plugin).set(all[all.length - 1].cell.transform.ref, file.name);
    setActiveStructure(plugin, mode === 'add' ? all.length - 1 : 0);
    await reapplyHydrogens(plugin);
    return result;
}

/** 导出当前画面几何为 GLB */
export function exportGlb(plugin: PluginContext) {
    if (!plugin.canvas3d) return;
    const models = plugin.state.data.select(StateSelection.Generators.rootsOfType(PluginStateObject.Molecule.Model)).map(s => s.obj!.data);
    const ids = new Set<string>();
    models.forEach(m => ids.add(m.entryId.toUpperCase()));
    const filename = (SetUtils.toArray(ids).join('-') || 'molstar-model') + '.glb';

    const task = Task.create('Export GLB', async ctx => {
        const renderObjects = plugin.canvas3d!.getRenderObjects();
        const boundingSphere = plugin.canvas3d!.boundingSphereVisible;
        const boundingBox = Box3D.fromSphere3D(Box3D(), boundingSphere);
        const exporter = new GlbExporter(boundingBox);
        for (let i = 0; i < renderObjects.length; i++) {
            await ctx.update({ message: `Exporting object ${i + 1}/${renderObjects.length}` });
            await exporter.add(renderObjects[i], plugin.canvas3d!.webgl, ctx);
        }
        const blob = await exporter.getBlob(ctx);
        download(blob, filename);
    });
    return plugin.runTask(task, { useOverlay: true });
}

/** 深色背景 → 白字，浅色背景 → 黑字（WCAG 相对亮度，阈值 0.5） */
export function autoLabelColor(bg: Color): number {
    return Color.luminance(bg) < 0.5 ? 0xffffff : 0x000000;
}

export function setBackground(plugin: PluginContext, color: Color) {
    plugin.canvas3d?.setProps({ renderer: { backgroundColor: color } });
    void setLabelColor(plugin, autoLabelColor(color));
}

/** 光照强度（主光源 intensity） */
export function getLightIntensity(plugin: PluginContext): number {
    return plugin.canvas3d?.props.renderer.light?.[0]?.intensity ?? 0.6;
}

export function setLightIntensity(plugin: PluginContext, intensity: number) {
    const light = plugin.canvas3d?.props.renderer.light;
    if (!light || light.length === 0) return;
    plugin.canvas3d?.setProps({ renderer: { light: [{ ...light[0], intensity }] } });
    plugin.events.canvas3d.settingsUpdated.next(void 0);
}

//

interface OverlayState {
    pharmacophore?: PharmacophoreHandle;
    pharmacophorePoints: PharmacophorePoint[];
    pharmacophoreScale: number;
    pharmacophoreVisible: boolean;
    hiddenPharmacophoreTypes: Set<PharmacophoreFeatureType>;
    pockets?: PocketHandle;
    pocketData: Pocket[];
    hiddenPockets: Set<number | string>;
}

const overlayStates = new WeakMap<PluginContext, OverlayState>();

function overlayState(plugin: PluginContext): OverlayState {
    let s = overlayStates.get(plugin);
    if (!s) {
        s = { pharmacophorePoints: [], pharmacophoreScale: 1, pharmacophoreVisible: true, hiddenPharmacophoreTypes: new Set(), pocketData: [], hiddenPockets: new Set() };
        overlayStates.set(plugin, s);
    }
    return s;
}

export async function setPharmacophore(plugin: PluginContext, points: PharmacophorePoint[], scale = 1) {
    const s = overlayState(plugin);
    s.pharmacophore?.dispose();
    s.pharmacophorePoints = points;
    s.pharmacophoreScale = scale;
    const handle = await showPharmacophore(plugin, points, scale);
    // 重建后按当前状态恢复：整体可见性 + 被隐藏的特征类型
    handle.setVisible(s.pharmacophoreVisible);
    for (const type of s.hiddenPharmacophoreTypes) handle.setTypeVisible(type, false);
    s.pharmacophore = handle;
    plugin.canvas3d?.requestDraw();
    plugin.events.canvas3d.settingsUpdated.next(void 0);
    notifyPharmacophore();
    setTimeout(() => plugin.canvas3d?.requestDraw(), 200);
}

const pharmacophoreListeners = new Set<() => void>();
function notifyPharmacophore() { for (const fn of pharmacophoreListeners) fn(); }
export function subscribePharmacophore(fn: () => void) {
    pharmacophoreListeners.add(fn);
    return { unsubscribe: () => { pharmacophoreListeners.delete(fn); } };
}

export function clearPharmacophore(plugin: PluginContext) {
    const s = overlayState(plugin);
    s.pharmacophore?.dispose();
    s.pharmacophore = undefined;
    s.pharmacophorePoints = [];
    s.hiddenPharmacophoreTypes.clear();
    notifyPharmacophore();
}

export function getPharmacophorePoints(plugin: PluginContext) {
    return overlayState(plugin).pharmacophorePoints;
}

/** 显示/隐藏药效团（不重建） */
export function setPharmacophoreVisible(plugin: PluginContext, visible: boolean) {
    const s = overlayState(plugin);
    s.pharmacophoreVisible = visible;
    s.pharmacophore?.setVisible(visible);
    notifyPharmacophore();
}

export function isPharmacophoreVisible(plugin: PluginContext) {
    return overlayState(plugin).pharmacophoreVisible;
}

/** 显示/隐藏某一类药效团特征（不重建，不丢失点数据） */
export function setPharmacophoreTypeVisible(plugin: PluginContext, type: PharmacophoreFeatureType, visible: boolean) {
    const s = overlayState(plugin);
    if (visible) s.hiddenPharmacophoreTypes.delete(type);
    else s.hiddenPharmacophoreTypes.add(type);
    s.pharmacophore?.setTypeVisible(type, visible);
    notifyPharmacophore();
}

export function getHiddenPharmacophoreTypes(plugin: PluginContext) {
    return overlayState(plugin).hiddenPharmacophoreTypes;
}

export async function setPockets(plugin: PluginContext, pockets: Pocket[]) {
    const s = overlayState(plugin);
    await s.pockets?.dispose();
    s.pocketData = pockets;
    s.hiddenPockets.clear();
    s.pockets = await showPockets(plugin, pockets);
}

export async function clearPockets(plugin: PluginContext) {
    const s = overlayState(plugin);
    await s.pockets?.dispose();
    s.pockets = undefined;
    s.pocketData = [];
    s.hiddenPockets.clear();
}

export function setPocketVisible(plugin: PluginContext, id: number | string, visible: boolean) {
    const s = overlayState(plugin);
    if (visible) s.hiddenPockets.delete(id);
    else s.hiddenPockets.add(id);
    s.pockets?.setPocketVisible(id, visible);
}

/** 显示/隐藏全部口袋（不重建） */
export function setPocketsVisible(plugin: PluginContext, visible: boolean) {
    const s = overlayState(plugin);
    s.hiddenPockets.clear();
    if (!visible) for (const p of s.pocketData) s.hiddenPockets.add(p.pocket_id);
    s.pockets?.setAllVisible(visible);
}

export function getPocketData(plugin: PluginContext) {
    return overlayState(plugin).pocketData;
}

export function getHiddenPockets(plugin: PluginContext) {
    return overlayState(plugin).hiddenPockets;
}

export function setSpin(plugin: PluginContext, on: boolean) {
    const c = plugin.canvas3d;
    if (!c) return;
    const isSpinning = c.props.trackball.animate.name === 'spin';
    if (on === isSpinning) return;
    c.setProps({
        trackball: {
            ...c.props.trackball,
            animate: on
                ? { name: 'spin', params: { speed: 0.1, axis: Vec3.create(0, -1, 0) } }
                : { name: 'off', params: {} }
        }
    });
    plugin.events.canvas3d.settingsUpdated.next(void 0);
}
