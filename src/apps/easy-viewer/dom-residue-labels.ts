/**
 * Interaction 残基标签：HTML 矢量字，叠在 WebGL canvas 最上层（不参与后处理/SMAA）。
 */

import { PluginContext } from '../../mol-plugin/context';
import { Structure, StructureElement, StructureProperties, Unit } from '../../mol-model/structure';
import { BoundaryHelper } from '../../mol-math/geometry/boundary-helper';
import { Vec3 } from '../../mol-math/linear-algebra';
import { getLabelStyle, type LabelStyle } from './residue-labels';

/** Canvas3D 本身没有 canvas 字段，实际元素在 canvas3dContext 上 */
function viewCanvas(plugin: PluginContext): HTMLCanvasElement | undefined {
    return plugin.canvas3dContext?.canvas
        ?? plugin.layout?.root?.querySelector('canvas') ?? undefined;
}

function labelMountParent(plugin: PluginContext): HTMLElement | undefined {
    const canvas = viewCanvas(plugin);
    let el: HTMLElement | null | undefined = canvas?.parentElement;
    while (el) {
        if (el.classList.contains('msp-viewport')) return el;
        el = el.parentElement;
    }
    return canvas?.parentElement ?? plugin.layout?.root ?? undefined;
}

export interface DomLabelSpec {
    id: string;
    text: string;
    x: number;
    y: number;
    z: number;
}

const boundaryHelper = new BoundaryHelper('98');
const tmpVec = Vec3();

function projectPoint(plugin: PluginContext, x: number, y: number, z: number, width: number, height: number): [number, number] | null {
    try {
        const camera = plugin.canvas3d?.camera;
        if (!camera) return null;
        camera.update();
        const p = camera.projectionView;
        const cx = p[0] * x + p[4] * y + p[8] * z + p[12];
        const cy = p[1] * x + p[5] * y + p[9] * z + p[13];
        const cw = p[3] * x + p[7] * y + p[11] * z + p[15];
        if (Math.abs(cw) < 1e-9) return null;
        const px = (cx / cw + 1) * 0.5 * width;
        const py = (1 - cy / cw) * 0.5 * height;
        if (px < -40 || px > width + 40 || py < -40 || py > height + 40) return null;
        return [px, py];
    } catch {
        return null;
    }
}

export function residueLabelSpecsFromStructure(structure: Structure): DomLabelSpec[] {
    const out: DomLabelSpec[] = [];
    const loc = StructureElement.Location.create(structure);
    for (const unit of structure.units) {
        if (!Unit.isAtomic(unit)) continue;
        loc.unit = unit;
        const { elements } = unit;
        const residueIndex = unit.model.atomicHierarchy.residueAtomSegments.index;
        const c = unit.conformation;
        let j = 0;
        while (j < elements.length) {
            const start = j;
            const rI = residueIndex[elements[j]];
            j++;
            while (j < elements.length && residueIndex[elements[j]] === rI) j++;

            boundaryHelper.reset();
            for (let e = start; e < j; e++) {
                c.position(elements[e], tmpVec);
                boundaryHelper.includePosition(tmpVec);
            }
            boundaryHelper.finishedIncludeStep();
            for (let e = start; e < j; e++) {
                c.position(elements[e], tmpVec);
                boundaryHelper.radiusPosition(tmpVec);
            }
            loc.element = elements[start];
            const entityType = StructureProperties.entity.type(loc);
            if (entityType !== 'polymer' && entityType !== 'water') continue;
            const comp = StructureProperties.atom.label_comp_id(loc);
            const isWater = entityType === 'water';
            const text = isWater ? comp : `${comp} ${StructureProperties.residue.auth_seq_id(loc)}`;
            const { center } = boundaryHelper.getSphere();
            out.push({
                id: `${unit.id}:${rI}`,
                text,
                x: center[0],
                y: center[1],
                z: center[2],
            });
        }
    }
    return out;
}

function mergeSpecs(out: DomLabelSpec[], seen: Set<string>, specs: DomLabelSpec[]) {
    for (const s of specs) {
        if (seen.has(s.id)) continue;
        seen.add(s.id);
        out.push(s);
    }
}

function specsFromComponentRefs(plugin: PluginContext, refs: (string | undefined)[], focusLoci?: StructureElement.Loci): DomLabelSpec[] {
    const out: DomLabelSpec[] = [];
    const seen = new Set<string>();
    if (focusLoci && !StructureElement.Loci.isEmpty(focusLoci)) {
        try {
            mergeSpecs(out, seen, residueLabelSpecsFromStructure(StructureElement.Loci.toStructure(focusLoci)));
        } catch {
            // ignore invalid loci
        }
    }
    for (const ref of refs) {
        if (!ref) continue;
        const data = plugin.state.data.cells.get(ref)?.obj?.data;
        if (!data?.units) continue;
        mergeSpecs(out, seen, residueLabelSpecsFromStructure(data as Structure));
    }
    return out;
}

function applySpanStyle(el: HTMLSpanElement, style: LabelStyle) {
    const fontPx = Math.round(11 + style.scale * 10);
    el.style.fontSize = `${fontPx}px`;
    el.style.fontWeight = '600';
    el.style.fontFamily = 'system-ui, -apple-system, "Segoe UI", sans-serif';
    el.style.color = `#${style.color.toString(16).padStart(6, '0')}`;
    el.style.lineHeight = '1.15';
    el.style.letterSpacing = '0.02em';
    el.style.border = 'none';
    el.style.outline = 'none';
    el.style.boxShadow = 'none';
    el.style.textShadow = 'none';
    if (style.backgroundOpacity > 0.001) {
        const bg = style.backgroundColor.toString(16).padStart(6, '0');
        el.style.backgroundColor = `rgba(${parseInt(bg.slice(0, 2), 16)},${parseInt(bg.slice(2, 4), 16)},${parseInt(bg.slice(4, 6), 16)},${style.backgroundOpacity})`;
        el.style.padding = '2px 5px';
        el.style.borderRadius = '3px';
    } else {
        el.style.backgroundColor = 'transparent';
        el.style.padding = '0';
        el.style.borderRadius = '0';
    }
}

export class DomResidueLabelLayer {
    private root: HTMLDivElement | undefined;
    private raf = 0;
    private specs: DomLabelSpec[] = [];
    private spans = new Map<string, HTMLSpanElement>();

    constructor(private readonly plugin: PluginContext) {}

    attach() {
        if (this.root) return;
        const parent = labelMountParent(this.plugin);
        if (!parent) return;
        if (getComputedStyle(parent).position === 'static') {
            parent.style.position = 'relative';
        }
        const root = document.createElement('div');
        root.className = 'easy-dom-residue-labels';
        Object.assign(root.style, {
            position: 'absolute',
            left: '0',
            top: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            overflow: 'hidden',
            zIndex: '2',
        });
        parent.appendChild(root);
        this.root = root;
        this.applyPanelClip();
    }

    /** 宽屏浮动侧栏区域不绘制标签，避免挡住面板（侧栏 z-index 更高，此处再裁剪一层） */
    private applyPanelClip() {
        if (!this.root) return;
        const panel = document.querySelector('.msp-layout-left .easy-panel') as HTMLElement | null;
        if (!panel || panel.offsetParent === null) {
            this.root.style.clipPath = '';
            return;
        }
        const vp = this.root.getBoundingClientRect();
        const pr = panel.getBoundingClientRect();
        if (vp.width <= 0 || vp.height <= 0) return;
        const left = Math.max(0, Math.min(vp.width, pr.right - vp.left));
        if (left <= 1) {
            this.root.style.clipPath = '';
            return;
        }
        this.root.style.clipPath = `polygon(${left}px 0, 100% 0, 100% 100%, ${left}px 100%)`;
    }

    setFromComponentRefs(refs: (string | undefined)[], focusLoci?: StructureElement.Loci) {
        this.specs = specsFromComponentRefs(this.plugin, refs, focusLoci);
        this.attach();
        this.syncDomNodes();
        if (this.specs.length > 0) this.startLoop();
    }

    clear() {
        this.specs = [];
        this.syncDomNodes();
        this.stopLoop();
    }

    refreshStyle() {
        const style = getLabelStyle();
        for (const el of this.spans.values()) applySpanStyle(el, style);
    }

    dispose() {
        this.clear();
        this.root?.remove();
        this.root = undefined;
    }

    private syncDomNodes() {
        if (!this.root) return;
        const style = getLabelStyle();
        const ids = new Set(this.specs.map(s => s.id));
        for (const [id, el] of this.spans) {
            if (!ids.has(id)) {
                el.remove();
                this.spans.delete(id);
            }
        }
        for (const s of this.specs) {
            let el = this.spans.get(s.id);
            if (!el) {
                el = document.createElement('span');
                el.textContent = s.text;
                applySpanStyle(el, style);
                Object.assign(el.style, {
                    position: 'absolute',
                    transform: 'translate(-50%, -50%)',
                    whiteSpace: 'nowrap',
                });
                this.root.appendChild(el);
                this.spans.set(s.id, el);
            } else if (el.textContent !== s.text) {
                el.textContent = s.text;
            }
        }
    }

    private updatePositions() {
        if (this.specs.length === 0) return;
        if (!this.root) this.attach();
        if (!this.root) return;
        this.applyPanelClip();
        if (this.spans.size === 0 && this.specs.length > 0) this.syncDomNodes();
        const canvas = viewCanvas(this.plugin);
        if (!canvas || canvas.clientWidth === 0 || canvas.clientHeight === 0) return;
        for (const s of this.specs) {
            const el = this.spans.get(s.id);
            if (!el) continue;
            const p = projectPoint(this.plugin, s.x, s.y, s.z, canvas.clientWidth, canvas.clientHeight);
            if (!p) {
                el.style.visibility = 'hidden';
                continue;
            }
            el.style.visibility = 'visible';
            el.style.left = `${p[0]}px`;
            el.style.top = `${p[1]}px`;
        }
    }

    private tick = () => {
        this.updatePositions();
        this.raf = requestAnimationFrame(this.tick);
    };

    private startLoop() {
        if (this.raf) return;
        this.raf = requestAnimationFrame(this.tick);
    }

    private stopLoop() {
        if (this.raf) cancelAnimationFrame(this.raf);
        this.raf = 0;
    }
}

const layers = new WeakMap<PluginContext, DomResidueLabelLayer>();

export function getDomResidueLabelLayer(plugin: PluginContext): DomResidueLabelLayer {
    let layer = layers.get(plugin);
    if (!layer) {
        layer = new DomResidueLabelLayer(plugin);
        layers.set(plugin, layer);
    }
    return layer;
}

export function refreshDomResidueLabelStyle(plugin: PluginContext) {
    layers.get(plugin)?.refreshStyle();
}
