/**
 * Copyright (c) 2026 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author QB-molstar contributors
 *
 * 药效团渲染：把药效团特征点画成半透明球体网格。
 * 参考 chemOrchestra 的 pharmacophore.js，整理为通用实现。
 */

import { PluginContext } from '../../mol-plugin/context';
import { addSphere } from '../../mol-geo/geometry/lines/builder/sphere';
import { Lines } from '../../mol-geo/geometry/lines/lines';
import { LinesBuilder } from '../../mol-geo/geometry/lines/lines-builder';
import { Mat4, Vec3 } from '../../mol-math/linear-algebra';
import { Shape } from '../../mol-model/shape';
import { ShapeRepresentation } from '../../mol-repr/shape/representation';
import { Color } from '../../mol-util/color';
import { PharmacophoreFeatureType, PharmacophorePoint } from './types';
import { PharmacophoreHexColors } from './palettes';

type PharmacophoreRepr = ReturnType<typeof ShapeRepresentation>;

export interface PharmacophoreHandle {
    /** 移除药效团渲染 */
    dispose(): void;
}

async function createMesh(plugin: PluginContext, points: PharmacophorePoint[], color: number, scale: number, label: string) {
    const builder = LinesBuilder.create(Math.max(256, points.length * 384), 256);
    const transform = Mat4.identity();
    const center = Vec3();

    // 点越多，细分越低，避免大量药效团点卡顿
    const segments = points.length > 200 ? 12 : points.length > 50 ? 24 : 40;
    const circlesPerDimension = points.length > 200 ? 2 : 3;

    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        Vec3.set(center, point.center[0], point.center[1], point.center[2]);
        Mat4.setTranslation(transform, center);
        const radius = Math.max(0.2, Number(point.radius) || 1) * Math.max(0.1, scale) * 4;
        addSphere(builder, radius, transform, i, { segments, circlesPerDimension });
    }

    const lines = builder.getLines();
    const source = { points, label };
    const representation = ShapeRepresentation(
        () => Shape.create(`${label} Pharmacophore`, source, lines, () => Color(color), () => 1, () => label),
        Lines.Utils,
        { modifyState: state => ({ ...state, pickable: false }) }
    );

    await plugin.runTask(representation.createOrUpdate({
        alpha: 0.68,
        sizeFactor: 0.04,
        lineSizeAttenuation: true,
    }, source));
    plugin.canvas3d?.add(representation);
    return representation;
}

/**
 * 显示药效团。按特征类型分组，每组一个渲染对象（性能友好）。
 * @param points 药效团特征点
 * @param scale 半径缩放，默认 1
 */
export async function showPharmacophore(plugin: PluginContext, points: PharmacophorePoint[], scale = 1): Promise<PharmacophoreHandle> {
    const byType = new Map<PharmacophoreFeatureType, PharmacophorePoint[]>();
    for (const point of points) {
        const list = byType.get(point.type);
        if (list) list.push(point);
        else byType.set(point.type, [point]);
    }

    const reprs: PharmacophoreRepr[] = [];
    for (const [type, pts] of byType) {
        const repr = await createMesh(plugin, pts, PharmacophoreHexColors[type] ?? 0x999999, scale, type);
        reprs.push(repr);
    }

    return {
        dispose() {
            for (const repr of reprs) {
                plugin.canvas3d?.remove(repr);
                repr.destroy();
            }
            reprs.length = 0;
        }
    };
}
