/**
 * Copyright (c) 2026 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author QB-molstar contributors
 *
 * 焦点可视化：
 * - 高亮：焦点周边的残基（按「原子-原子最小距离」，不是中心），
 *   并把与焦点有非共价相互作用的对方残基也一并高亮。
 * - 相互作用：focus 配体时显示「配体 ↔ 周围」的非共价相互作用（不显示残基-残基）。
 */

import { PluginContext } from '../../mol-plugin/context';
import { Bond, StructureElement, StructureProperties } from '../../mol-model/structure';
import { MolScriptBuilder as MS } from '../../mol-script/language/builder';
import { OrderedSet } from '../../mol-data/int/ordered-set';
import { InteractionsProvider } from '../../mol-model-props/computed/interactions';
import { InteractionsRepresentationProvider } from '../../mol-model-props/computed/representations/interactions';
import { StructureFocusRepresentation } from '../../mol-plugin/behavior/dynamic/selection/structure-focus-representation';
import { addLabelRepresentation } from './residue-labels';

const FocusInteractionsKey = 'easy-focus-interactions';
const FocusHighlightKey = 'easy-focus-highlight';
const FocusPartnersKey = 'easy-focus-partners';
/** 高亮周边半径（Å）：配体-残基最小原子距离 ≤ 此值 */
const HighlightRadius = 3;

function targetKey(loc: StructureElement.Location) {
    return [loc.unit.model.id, loc.unit.id, StructureProperties.residue.key(loc)].join(':');
}

function focusRadius(plugin: PluginContext): number {
    const params = plugin.state.behaviors.cells.get(StructureFocusRepresentation.id)?.transform.params as any;
    return typeof params?.expandRadius === 'number' ? params.expandRadius : HighlightRadius;
}

async function deleteRef(plugin: PluginContext, ref: string | undefined) {
    if (!ref) return;
    try {
        await plugin.build().delete(ref).commit();
    } catch {
        // structure may already be gone
    }
}

/** 与焦点有非共价相互作用的「对方原子」所在残基的表达式（来自已算好的相互作用数据） */
function interactionPartnerExpression(interactions: any, structure: any, focusLoci: StructureElement.Loci) {
    if (!interactions || !interactions.unitsFeatures) return undefined;
    const { contacts, unitsContacts, bridges, unitsFeatures } = interactions;

    // 焦点原子集合（按 unit id → element index）
    const focusUnits = new Map<number, Set<number>>();
    for (const el of focusLoci.elements) {
        let s = focusUnits.get(el.unit.id);
        if (!s) focusUnits.set(el.unit.id, s = new Set());
        OrderedSet.forEach(el.indices, i => s.add(i));
    }
    const isFocus = (unitId: number, element: number) => focusUnits.get(unitId)?.has(element) === true;

    const byUnit = new Map<number, number[]>();
    const addPartner = (unitId: number, element: number) => {
        let arr = byUnit.get(unitId);
        if (!arr) byUnit.set(unitId, arr = []);
        arr.push(element);
    };

    // 跨单元接触：edges[i].unitA / unitB 是 unit id（数字）
    if (contacts?.edges) {
        for (const e of contacts.edges) {
            const fA = unitsFeatures.get(e.unitA);
            const fB = unitsFeatures.get(e.unitB);
            if (!fA || !fB) continue;
            const eA = fA.members[fA.offsets[e.indexA]];
            const eB = fB.members[fB.offsets[e.indexB]];
            const aIn = isFocus(e.unitA, eA);
            const bIn = isFocus(e.unitB, eB);
            if (aIn && !bIn) addPartner(e.unitB, eB);
            else if (bIn && !aIn) addPartner(e.unitA, eA);
        }
    }

    // 单元内接触（配体和蛋白常常在同一个 unit 里）：a[i] / b[i] 是「feature 索引」，
    // 需要经 features.members[features.offsets[...]] 映射到 unit 内 element 索引
    if (unitsContacts) {
        for (const unit of structure.units) {
            const ic = unitsContacts.get(unit.id);
            const features = unitsFeatures.get(unit.id);
            if (!ic?.edgeCount || !features) continue;
            const { edgeCount, a, b } = ic;
            for (let i = 0; i < edgeCount; i++) {
                const ia = features.members[features.offsets[a[i]]];
                const ib = features.members[features.offsets[b[i]]];
                const aIn = isFocus(unit.id, ia);
                const bIn = isFocus(unit.id, ib);
                if (aIn && !bIn) addPartner(unit.id, ib);
                else if (bIn && !aIn) addPartner(unit.id, ia);
            }
        }
    }

    // 水桥：A - (水 M) - B，两端 A/B 是重原子
    if (bridges) {
        for (const b of bridges) {
            const fA = unitsFeatures.get(b.unitA);
            const fB = unitsFeatures.get(b.unitB);
            if (!fA || !fB) continue;
            const eA = fA.members[fA.offsets[b.indexA]];
            const eB = fB.members[fB.offsets[b.indexB]];
            const aIn = isFocus(b.unitA, eA);
            const bIn = isFocus(b.unitB, eB);
            if (aIn && !bIn) addPartner(b.unitB, eB);
            else if (bIn && !aIn) addPartner(b.unitA, eA);
        }
    }

    if (byUnit.size === 0) return undefined;

    const elements: { unit: any, indices: any }[] = [];
    for (const [unitId, indices] of byUnit) {
        const unit = structure.unitMap.get(unitId);
        if (!unit) continue;
        indices.sort((a, b) => a - b);
        elements.push({ unit, indices: OrderedSet.ofSortedArray(indices) });
    }
    if (elements.length === 0) return undefined;

    const partnerLoci = StructureElement.Loci.extendToWholeResidues(StructureElement.Loci(structure, elements));
    return StructureElement.Loci.toExpression(partnerLoci);
}

/** 取相互作用数据：必须用 repr 实际使用的结构（asParent() 代理），否则拿不到 */
function getInteractions(plugin: PluginContext, componentRef: string) {
    const structure = plugin.state.data.cells.get(componentRef)?.obj?.data as any;
    const proxy = structure?.asParent?.() ?? structure;
    return proxy ? (InteractionsProvider as any).get(proxy)?.value : undefined;
}

function installFocusVisuals(plugin: PluginContext) {
    let interactionsRef: string | undefined;
    let highlightRef: string | undefined;
    let partnerRef: string | undefined;
    let activeKey: string | null = null;
    let disposed = false;
    let queue = Promise.resolve();

    const clear = async () => {
        const a = interactionsRef, b = highlightRef, c = partnerRef;
        interactionsRef = undefined;
        highlightRef = undefined;
        partnerRef = undefined;
        highlightReprRefs = [];
        interactionsReprRef = undefined;
        activeKey = null;
        await deleteRef(plugin, a);
        await deleteRef(plugin, b);
        await deleteRef(plugin, c);
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

        const entityType = StructureProperties.entity.type(firstLocation);
        const isLigand = entityType !== 'polymer' && entityType !== 'water';
        const key = targetKey(firstLocation) + ':' + (isLigand ? 'lig' : 'pol');
        if (key === activeKey && highlightRef) return;

        const focusLoci = StructureElement.Loci.extendToWholeResidues(StructureElement.Loci.remap(loci, parentStructure));
        const focusExpression = StructureElement.Loci.toExpression(focusLoci);

        await clear();
        if (disposed) return;

        let partnerExpression: any;
        if (isLigand) {
            // 先建相互作用表示（顺带把相互作用数据挂到父结构上）
            const ligandComponent: any = await plugin.builders.structure.tryCreateComponentFromExpression(
                parent, focusExpression, FocusInteractionsKey, { label: 'Focus interactions' }
            );
            if (!ligandComponent || disposed) return;
            const ligandRef: string = ligandComponent.ref;
            interactionsRef = ligandRef;
            currentInteractionsRef = ligandRef;
            const interactionsRepr: any = await plugin.builders.structure.representation.addRepresentation(ligandComponent, {
                type: InteractionsRepresentationProvider,
                typeParams: { includeParent: true, parentDisplay: 'between', sizeFactor: interactionLineScale },
            });
            interactionsReprRef = interactionsRepr?.ref;
            const interactions = getInteractions(plugin, ligandRef);
            partnerExpression = interactionPartnerExpression(interactions, parentStructure, focusLoci);
        }

        // 高亮：周边（配体-残基最小原子距离 ≤ radius）∪ 相互作用对方残基（各自独立组件，避免 union 出错）
        const radius = Math.max(focusRadius(plugin), HighlightRadius);
        const nearby = MS.struct.modifier.exceptBy({
            0: MS.struct.modifier.includeSurroundings({ 0: focusExpression, radius, 'as-whole-residues': true }),
            by: focusExpression,
        });

        const highlightComponent: any = await plugin.builders.structure.tryCreateComponentFromExpression(
            parent, nearby, FocusHighlightKey, { label: `Focus highlight (${radius} A)` }
        );
        if (highlightComponent && !disposed) {
            highlightRef = highlightComponent.ref;
            const hr: any = await plugin.builders.structure.representation.addRepresentation(highlightComponent, {
                type: highlightMode,
                color: 'element-symbol',
                colorParams: { carbonColor: { name: 'element-symbol', params: {} } },
                size: 'physical',
                sizeParams: { scale: highlightScale },
                typeParams: highlightTypeParams(),
            });
            if (hr?.ref) highlightReprRefs.push(hr.ref);
            await addLabelRepresentation(plugin, highlightComponent);
        }

        if (partnerExpression) {
            const partnerComponent: any = await plugin.builders.structure.tryCreateComponentFromExpression(
                parent, partnerExpression, FocusPartnersKey, { label: 'Focus interaction partners' }
            );
            if (partnerComponent && !disposed) {
                partnerRef = partnerComponent.ref;
                const pr: any = await plugin.builders.structure.representation.addRepresentation(partnerComponent, {
                    type: highlightMode,
                    color: 'element-symbol',
                    colorParams: { carbonColor: { name: 'element-symbol', params: {} } },
                    size: 'physical',
                    sizeParams: { scale: highlightScale },
                    typeParams: highlightTypeParams(),
                });
                if (pr?.ref) highlightReprRefs.push(pr.ref);
                await addLabelRepresentation(plugin, partnerComponent);
            }
        }
    };

    const sub = plugin.managers.structure.focus.behaviors.current.subscribe((entry: any) => {
        queue = queue.then(() => update(entry)).catch(err => console.warn('Focus visuals:', err));
    });

    return { dispose() { disposed = true; sub.unsubscribe(); void clear(); } };
}

interface FocusVisualsState {
    focus?: { dispose: () => void };
}

const states = new WeakMap<PluginContext, FocusVisualsState>();

let interactionsVisible = true;
let currentInteractionsRef: string | undefined;
const interactionsVisListeners = new Set<() => void>();

/** 显示/隐藏配体-残基相互作用 */
export function setInteractionsVisible(plugin: PluginContext, visible: boolean) {
    interactionsVisible = visible;
    if (currentInteractionsRef) {
        try { plugin.state.data.updateCellState(currentInteractionsRef, { isHidden: !visible }); } catch { /* gone */ }
    }
    for (const fn of interactionsVisListeners) fn();
}

export function areInteractionsVisible() {
    return interactionsVisible;
}

export function subscribeInteractionsVisible(fn: () => void) {
    interactionsVisListeners.add(fn);
    return () => { interactionsVisListeners.delete(fn); };
}

let highlightScale = 0.5;
let interactionLineScale = 0.2;
let highlightMode: 'ball-and-stick' | 'line' = 'ball-and-stick';
let interactionsReprRef: string | undefined;
let highlightReprRefs: string[] = [];

export function getHighlightScale() { return highlightScale; }
export function getInteractionLineScale() { return interactionLineScale; }
export function getHighlightMode() { return highlightMode; }

function highlightTypeParams() {
    return highlightMode === 'line'
        ? {}
        : { sizeFactor: 0.16, excludeTypes: ['hydrogen-bond', 'metal-coordination'] };
}

/** 高亮残基的表现形式：球棍 / line */
export async function setHighlightMode(plugin: PluginContext, mode: 'ball-and-stick' | 'line') {
    highlightMode = mode;
    if (highlightReprRefs.length === 0) return;
    const b = plugin.build();
    for (const ref of highlightReprRefs) {
        b.to(ref).update((old: any) => {
            old.type = { name: mode, params: mode === 'line' ? {} : { sizeFactor: 0.16, excludeTypes: ['hydrogen-bond', 'metal-coordination'] } };
        });
    }
    await b.commit({ canUndo: 'Highlight Mode' });
    for (const fn of interactionsVisListeners) fn();
}

/** 高亮残基球棍的粗细 */
export async function setHighlightScale(plugin: PluginContext, scale: number) {
    highlightScale = scale;
    if (highlightReprRefs.length === 0) return;
    const b = plugin.build();
    for (const ref of highlightReprRefs) {
        b.to(ref).update((old: any) => { old.sizeTheme = { ...old.sizeTheme, params: { ...(old.sizeTheme?.params || {}), scale } }; });
    }
    await b.commit({ canUndo: 'Highlight Scale' });
    for (const fn of interactionsVisListeners) fn();
}

/** 相互作用虚线的粗细 */
export async function setInteractionLineScale(plugin: PluginContext, scale: number) {
    interactionLineScale = scale;
    if (!interactionsReprRef) return;
    const b = plugin.build();
    b.to(interactionsReprRef).update((old: any) => { old.type.params.sizeFactor = scale; });
    await b.commit({ canUndo: 'Interaction Line Scale' });
    for (const fn of interactionsVisListeners) fn();
}

/** 安装：focus 高亮周边残基 + 配体-残基相互作用 */
export function setupFocusVisuals(plugin: PluginContext) {
    let s = states.get(plugin);
    if (!s) {
        s = {};
        states.set(plugin, s);
    }
    s.focus = installFocusVisuals(plugin);
}
