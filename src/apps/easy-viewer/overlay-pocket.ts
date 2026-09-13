/**
 * Copyright (c) 2026 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author QB-molstar contributors
 *
 * 口袋渲染：fpocket alpha 球 -> 假 PDB -> 每口袋一个 gaussian-surface，
 * 并提供把口袋编号/坐标投影到屏幕的 2D 标签绘制函数。
 * 参考 chemOrchestra 的 MolstarPDBe.tsx，整理为通用实现。
 */

import { PluginContext } from '../../mol-plugin/context';
import { MolScriptBuilder as MS } from '../../mol-script/language/builder';
import { Color } from '../../mol-util/color';
import { Pocket } from './types';
import { PocketCssColors, PocketHexColors } from './palettes';

const CHAINS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export interface PocketHandle {
    /** 移除所有口袋渲染 */
    dispose(): Promise<void>;
    /** 显示/隐藏某个口袋 */
    setPocketVisible(id: number | string, visible: boolean): void;
    /** 是否已加载口袋 */
    readonly isEmpty: boolean;
}

function formatPocketPdb(pockets: Pocket[]) {
    const lines = ['REMARK fpocket alpha spheres'];
    let serial = 1;
    pockets.forEach((pocket, pi) => {
        const chain = CHAINS[pi % 26];
        const resSeq = String(pi + 1).padStart(4);
        (pocket.alpha_spheres || []).forEach(sphere => {
            const sn = String(serial++).padStart(5);
            const x = sphere[0].toFixed(3).padStart(8);
            const y = sphere[1].toFixed(3).padStart(8);
            const z = sphere[2].toFixed(3).padStart(8);
            lines.push(`HETATM${sn}  X   PKT ${chain}${resSeq}    ${x}${y}${z}  1.00  0.00           X`);
        });
    });
    lines.push('END');
    return lines.join('\n');
}

/**
 * 显示口袋。每个口袋一个 gaussian-surface，颜色来自 PocketHexColors。
 */
export async function showPockets(plugin: PluginContext, pockets: Pocket[]): Promise<PocketHandle> {
    let dataNode: any;
    const refs = new Map<number | string, string>();

    const emptyHandle: PocketHandle = {
        isEmpty: true,
        async dispose() { /* nothing */ },
        setPocketVisible() { /* nothing */ },
    };

    if (!pockets || pockets.length === 0) return emptyHandle;

    try {
        dataNode = await plugin.builders.data.rawData({ data: formatPocketPdb(pockets), label: '__pockets__' });
        const traj = await plugin.builders.structure.parseTrajectory(dataNode, 'pdb');
        const preset = await plugin.builders.structure.hierarchy.applyPreset(traj, 'default');
        if (!preset || !preset.structure) return emptyHandle;

        const reprs = preset.representation?.representations ?? {};
        for (const r of Object.values(reprs)) {
            if (r) { try { await plugin.build().delete(r).commit(); } catch { /* ignore */ } }
        }

        for (let pi = 0; pi < pockets.length; pi++) {
            const pocket = pockets[pi];
            const chain = CHAINS[pi % 26];
            const expr = MS.struct.generator.atomGroups({
                'chain-test': MS.core.rel.eq([MS.struct.atomProperty.macromolecular.label_asym_id(), chain])
            });
            const comp = await plugin.builders.structure.tryCreateComponentFromExpression(
                preset.structure, expr, `pkt-${chain}`, { label: `Pocket ${pi + 1}` }
            );
            if (!comp) continue;

            const repr = await plugin.builders.structure.representation.addRepresentation(comp, {
                type: 'gaussian-surface',
                color: 'uniform',
                colorParams: { value: Color(PocketHexColors[pi % PocketHexColors.length]) },
                typeParams: { alpha: 0.42, quality: 'medium', radiusOffset: 0.5 }
            });
            if (repr) refs.set(pocket.pocket_id, repr.ref);
        }
    } catch (e) {
        console.error('EasyViewer: pocket rendering failed', e);
    }

    return {
        isEmpty: refs.size === 0,
        async dispose() {
            if (dataNode) {
                try { await plugin.build().delete(dataNode).commit(); } catch { /* ignore */ }
                dataNode = undefined;
            }
            refs.clear();
        },
        setPocketVisible(id, visible) {
            const ref = refs.get(id);
            if (ref) plugin.state.data.updateCellState(ref, { isHidden: !visible });
        },
    };
}

function projectPoint(plugin: PluginContext, x: number, y: number, z: number, width: number, height: number): [number, number] | null {
    try {
        const camera = plugin.canvas3d?.camera;
        if (!camera) return null;
        const p = camera.projectionView;
        const cx = p[0] * x + p[4] * y + p[8] * z + p[12];
        const cy = p[1] * x + p[5] * y + p[9] * z + p[13];
        const cw = p[3] * x + p[7] * y + p[11] * z + p[15];
        if (Math.abs(cw) < 1e-9) return null;
        return [(cx / cw + 1) * 0.5 * width, (1 - cy / cw) * 0.5 * height];
    } catch {
        return null;
    }
}

/** 把口袋编号 + 坐标画到 2D canvas 覆盖层（跟随相机） */
export function drawPocketLabels(canvas: HTMLCanvasElement, pockets: Pocket[], plugin: PluginContext, hidden?: Set<number | string>) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    if (W === 0 || H === 0) return;
    if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
    }
    ctx.clearRect(0, 0, W, H);

    for (let pi = 0; pi < pockets.length; pi++) {
        const pocket = pockets[pi];
        if (hidden?.has(pocket.pocket_id)) continue;
        const css = PocketCssColors[pi % PocketCssColors.length];
        const proj = projectPoint(plugin, pocket.center[0], pocket.center[1], pocket.center[2], W, H);
        if (!proj) continue;
        const [px, py] = proj;

        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.fillStyle = css + 'dd';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(pi + 1), px, py);

        const coordStr = `(${pocket.center[0].toFixed(1)}, ${pocket.center[1].toFixed(1)}, ${pocket.center[2].toFixed(1)})`;
        ctx.font = '9px monospace';
        const tw = ctx.measureText(coordStr).width;
        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        ctx.beginPath();
        ctx.roundRect(px - tw / 2 - 3, py + 19, tw + 6, 13, 3);
        ctx.fill();
        ctx.fillStyle = css;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(coordStr, px, py + 20);
    }
}
