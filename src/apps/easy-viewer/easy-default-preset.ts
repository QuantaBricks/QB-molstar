/**
 * Copyright (c) 2026 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author QB-molstar contributors
 *
 * 默认友好的表示预设，对齐 chemOrchestra 的默认：
 * - 聚合物：卡通 + 蓝色序列渐变
 * - 配体/水/离子/脂质：球棍 + 元素配色（碳也按元素）
 * - 糖：3D-SNFG + 球棍
 */

import { StructureRepresentationPresetProvider, PresetStructureRepresentations } from '../../mol-plugin-state/builder/structure/representation-preset';
import { StateObjectSelector } from '../../mol-state';
import { Color } from '../../mol-util/color';
import { RainbowPalettes } from './palettes';

const SequencePalette = RainbowPalettes.blue.colors.map(c => Color(c));
const ElementSymbolParams = { carbonColor: { name: 'element-symbol', params: {} } };

export const EasyDefaultPreset = StructureRepresentationPresetProvider({
    id: 'preset-structure-representation-easy-default',
    display: {
        name: 'Easy Default',
        group: 'Easy',
        description: '卡通 + 蓝色序列渐变，配体/水球棍，元素配色。'
    },
    params: () => StructureRepresentationPresetProvider.CommonParams,
    async apply(ref, params, plugin) {
        const result = await PresetStructureRepresentations['polymer-and-ligand'].apply(ref, params, plugin);
        const reprs = (result.representations ?? {}) as { [k: string]: StateObjectSelector | undefined };

        const update = plugin.build();
        const setColor = (sel: StateObjectSelector | undefined, name: string, colorParams: any) => {
            if (sel) update.to(sel).update(old => { old.colorTheme = { name, params: colorParams } as any; });
        };

        setColor(reprs.polymer, 'sequence-id', { list: { kind: 'interpolate', colors: SequencePalette } });
        setColor(reprs.ligand, 'element-symbol', ElementSymbolParams);
        setColor(reprs.nonStandard, 'element-symbol', ElementSymbolParams);
        setColor(reprs.water, 'element-symbol', ElementSymbolParams);
        setColor(reprs.ion, 'element-symbol', ElementSymbolParams);
        setColor(reprs.lipid, 'element-symbol', ElementSymbolParams);
        await update.commit({ revertOnError: false });

        return result;
    }
});
