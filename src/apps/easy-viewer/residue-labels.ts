/**
 * Copyright (c) 2026 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author QB-molstar contributors
 *
 * 残基标签：
 * - 点击配体：显示附近氨基酸的 3D 标签（参考 chemOrchestra 的 ligandNeighborhood）
 * - 标签大小 / 文字颜色 / 背景颜色 / 背景不透明度 可在面板里调整
 */

import { PluginContext } from '../../mol-plugin/context';
import { Bond, StructureElement, StructureProperties } from '../../mol-model/structure';
import { MolScriptBuilder as MS } from '../../mol-script/language/builder';
import { Color } from '../../mol-util/color';
import { StructureFocusRepresentation } from '../../mol-plugin/behavior/dynamic/selection/structure-focus-representation';

const FocusLabelsKey = 'easy-focus-labels';

export interface LabelStyle {
    /** 文字颜色 */
    color: number;
    /** 背景颜色 */
    backgroundColor: number;
    /** 背景不透明度 */
    backgroundOpacity: number;
    /** 标签大小 */
    scale: number;
}

const labelStyle: LabelStyle = {
    color: 0x000000,
    backgroundColor: 0xffffff,
    backgroundOpacity: 0,
    scale: 0.65,
};

export function getLabelStyle(): LabelStyle {
    return { ...labelStyle };
}

function labelTypeParams() {
    return {
        level: 'residue' as const,
        residueScale: labelStyle.scale,
        background: true,
        backgroundMargin: 0.2,
        backgroundColor: Color(labelStyle.backgroundColor),
        backgroundOpacity: labelStyle.backgroundOpacity,
        borderWidth: 0,
        ignoreHydrogens: true,
        // 字体图集分辨率最高档（64*(quality+1)px 字形），减少放大时的模糊
        fontQuality: 4,
        fontWeight: 'normal' as const,
    };
}

export function addLabelRepresentation(plugin: PluginContext, component: any) {
    return plugin.builders.structure.representation.addRepresentation(component, {
        type: 'label',
        typeParams: labelTypeParams(),
        color: 'uniform',
        colorParams: { value: Color(labelStyle.color) },
    });
}

/** 更新所有 label 表示 */
async function updateLabelReprs(plugin: PluginContext, fn: (old: any) => void, canUndo: string) {
    const b = plugin.build();
    plugin.state.data.cells.forEach((cell, ref) => {
        const params = cell.transform.params as any;
        if (params?.type?.name === 'label') b.to(ref).update(fn);
    });
    await b.commit({ canUndo });
}

export async function setLabelScale(plugin: PluginContext, scale: number) {
    labelStyle.scale = scale;
    await updateLabelReprs(plugin, old => { old.type.params.residueScale = scale; }, 'Label Scale');
}

export async function setLabelColor(plugin: PluginContext, color: number) {
    labelStyle.color = color;
    await updateLabelReprs(plugin, old => { old.colorTheme.params.value = Color(color); }, 'Label Color');
}

export async function setLabelBackgroundColor(plugin: PluginContext, color: number) {
    labelStyle.backgroundColor = color;
    await updateLabelReprs(plugin, old => { old.type.params.backgroundColor = Color(color); }, 'Label Background');
}

export async function setLabelBackgroundOpacity(plugin: PluginContext, opacity: number) {
    labelStyle.backgroundOpacity = opacity;
    await updateLabelReprs(plugin, old => { old.type.params.backgroundOpacity = opacity; }, 'Label Background Opacity');
}

async function deleteRef(plugin: PluginContext, ref: string | undefined) {
    if (!ref) return;
    try {
        await plugin.build().delete(ref).commit();
    } catch {
        // structure may already be gone
    }
}

function residueKey(loc: StructureElement.Location) {
    return [loc.unit.model.id, loc.unit.id, StructureProperties.residue.key(loc)].join(':');
}

/** 焦点半径：读取 StructureFocusRepresentation 的 expandRadius，保证与高亮一致 */
function focusRadius(plugin: PluginContext): number {
    const params = plugin.state.behaviors.cells.get(StructureFocusRepresentation.id)?.transform.params as any;
    return typeof params?.expandRadius === 'number' ? params.expandRadius : 3;
}

/** 与高亮 focus 同步：焦点变化时给焦点周边的完整残基显示标签 */
function installFocusLabels(plugin: PluginContext) {
    let componentRef: string | undefined;
    let activeKey: string | null = null;
    let disposed = false;
    let queue = Promise.resolve();

    const clear = async () => {
        const ref = componentRef;
        componentRef = undefined;
        activeKey = null;
        await deleteRef(plugin, ref);
    };

    const update = async (entry: any) => {
        if (disposed) return;
        let loci = entry?.loci;
        if (Bond.isLoci(loci)) loci = Bond.toStructureElementLoci(loci);
        if (!StructureElement.Loci.is(loci) || StructureElement.Loci.isEmpty(loci)) { await clear(); return; }

        const firstLocation = StructureElement.Loci.getFirstLocation(loci);
        if (!firstLocation) { await clear(); return; }

        const parent = plugin.helpers.substructureParent.get(loci.structure);
        const parentStructure = parent?.obj?.data;
        if (!parent || !parentStructure) return;

        const radius = focusRadius(plugin);
        const key = residueKey(firstLocation) + ':' + radius;
        if (key === activeKey && componentRef) return;

        const target = StructureElement.Loci.toExpression(StructureElement.Loci.extendToWholeResidues(StructureElement.Loci.remap(loci, parentStructure)));
        const surroundings = MS.struct.modifier.includeSurroundings({ 0: target, radius, 'as-whole-residues': true });
        // 只给聚合物残基打标签（不显示配体/水/离子的名字）
        const polymer = MS.struct.generator.atomGroups({
            'entity-test': MS.core.rel.eq([MS.struct.atomProperty.macromolecular.entityType(), 'polymer'])
        });
        const labelsExpression = MS.struct.modifier.intersectBy({ 0: surroundings, by: polymer });

        await clear();
        if (disposed) return;
        const component = await plugin.builders.structure.tryCreateComponentFromExpression(
            parent, labelsExpression, FocusLabelsKey, { label: `Focus labels (${radius} A)` }
        );
        if (!component || disposed) return;
        componentRef = component.ref;
        activeKey = key;
        await addLabelRepresentation(plugin, component);
    };

    const sub = plugin.managers.structure.focus.behaviors.current.subscribe((entry: any) => {
        queue = queue.then(() => update(entry)).catch(err => console.warn('Focus labels:', err));
    });

    return { dispose() { disposed = true; sub.unsubscribe(); void clear(); } };
}

interface ResidueLabelState {
    focus?: { dispose: () => void };
}

const states = new WeakMap<PluginContext, ResidueLabelState>();

/** 安装：焦点周边残基标签（标签表示由 focus-visuals 的组件负责，这里不再单独建组件） */
export function setupResidueLabels(plugin: PluginContext) {
    let s = states.get(plugin);
    if (!s) {
        s = {};
        states.set(plugin, s);
    }
    void installFocusLabels;
}
