/**
 * Copyright (c) 2026 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author QB-molstar contributors
 *
 * 通用易用层入口：EasyViewer。
 * 继承 viewer 的 Viewer，保留全部加载能力，并叠加一层易用 API。
 */

import { createPluginUI } from '../../mol-plugin-ui';
import { renderReact18 } from '../../mol-plugin-ui/react18';
import { decodeColor } from '../../mol-util/color/utils';
import { Color } from '../../mol-util/color';
import { Viewer } from '../viewer/app';
import { DefaultViewerOptions, ViewerOptions } from '../viewer/options';
import { createViewerSpec } from '../viewer/plugin-spec';
import { ViewerAutoPreset } from '../viewer/presets';
import { PluginConfig } from '../../mol-plugin/config';
import { StructureFocusRepresentation } from '../../mol-plugin/behavior/dynamic/selection/structure-focus-representation';
import { EasyDefaultPreset } from './easy-default-preset';
import { EasyControls, EasyViewport, EasyViewportControls } from './easy-controls';
import * as Actions from './easy-actions';
import { applyDefaultColors } from './palettes';
import { ChainPresentation, EasyViewerColorOptions, EasyViewerInputs, PharmacophoreFeatureType, PharmacophorePoint, Pocket } from './types';

export type { BaseStyle, EasyColorTheme, EasyStyle, HydrogenMode } from './easy-actions';
export type { ChainPresentation, EasyRepresentationType, EasyViewerColorOptions, EasyViewerInputs, PharmacophorePoint, Pocket } from './types';

export class EasyViewer extends Viewer {
    // ---- 加载 ----

    /**
     * 默认只显示一个 protomer（而不是 Mol* 默认展开的第一个生物组装体）。
     * 对称蛋白（如 1gtb/4lpk）不会因为对称操作多出拷贝链。需要时调用 useAssembly()/toggleSymmetry()。
     */
    private async _useModelAfterLoad<T>(p: Promise<T>): Promise<T> {
        const r = await p;
        await Actions.useProtomerStructure(this.plugin);
        Actions.resetSymmetryExpanded();
        // 新加载的结构套用当前全局外观（材质/平光）并保持球棍类立体明暗
        await Actions.reapplyStyle(this.plugin);
        return r;
    }

    loadStructureFromData(...args: Parameters<Viewer['loadStructureFromData']>) {
        return this._useModelAfterLoad(super.loadStructureFromData(...args));
    }

    loadStructureFromUrl(...args: Parameters<Viewer['loadStructureFromUrl']>) {
        return this._useModelAfterLoad(super.loadStructureFromUrl(...args));
    }

    loadPdb(...args: Parameters<Viewer['loadPdb']>) {
        return this._useModelAfterLoad(super.loadPdb(...args));
    }

    /** 切换当前结构为生物组装体（id 为空则用第一个组装体） */
    useAssembly(id = '') {
        return Actions.useAssemblyStructure(this.plugin, id);
    }

    /** 切换当前结构为模型（不对称单元） */
    useModel() {
        return Actions.useModelStructure(this.plugin);
    }

    /** 在「单个 protomer」与「对称展开」之间切换 */
    toggleSymmetry() {
        return Actions.toggleSymmetry(this.plugin);
    }

    // ---- 样式与配色 ----

    /** 一键样式：'auto' | 'polymer-and-ligand' | 'atomic-detail' | 'molecular-surface' | ... */
    setStyle(name: Actions.EasyStyle) {
        return Actions.setStyle(this.plugin, name);
    }

    /** 二选一基础表示：'cartoon'（卡通）| '3d'（原子 3D） */
    setBaseStyle(mode: Actions.BaseStyle) {
        return Actions.setBaseStyle(this.plugin, mode);
    }

    /** 一键配色：'element-symbol' | 'chain-id' | 'sequence-id' | ... */
    setColorTheme(name: Actions.EasyColorTheme, opts?: EasyViewerColorOptions) {
        return Actions.setColorTheme(this.plugin, name, opts);
    }

    // ---- 按链定制表示 ----

    /**
     * 清空现有表示，按链分别设置表示/风格/颜色。
     * @example
     * viewer.setChainPresentations([
     *   { chain: 'A', representation: 'cartoon', color: 'sequence-id', colorOptions: { rainbowPalette: 'blue' } },
     *   { chain: 'B', representation: 'molecular-surface', color: 'hydrophobicity', alpha: 0.6 },
     *   { chain: 'C', representation: 'ball-and-stick', color: 'element-symbol' },
     * ]);
     */
    setChainPresentations(presentations: ChainPresentation[]) {
        return Actions.setChainPresentations(this.plugin, presentations);
    }

    /** 追加一条链的表示，不清空其他 */
    addChainPresentation(presentation: ChainPresentation) {
        return Actions.addChainPresentation(this.plugin, presentation);
    }

    // ---- 配体 / 水 / 氢 ----

    showLigands() { return Actions.showLigands(this.plugin); }
    hideLigands() { return Actions.hideLigands(this.plugin); }

    /** 显示/隐藏配体（不重建） */
    setLigandsVisible(visible: boolean) { Actions.setLigandsVisible(this.plugin, visible); }
    areLigandsVisible() { return Actions.areLigandsVisible(this.plugin); }

    /** 显示/隐藏某条链（不重建） */
    setChainVisible(chain: string, visible: boolean) { Actions.setChainVisible(this.plugin, chain, visible); }

    /** 追加一个配体表示（球棍/填充/分子表面/...），增量叠加 */
    addLigandLayer(type: Actions.EasyRepresentationType) { return Actions.addLigandLayer(this.plugin, type); }
    /** 当前配体上的表示层 */
    getLigandLayers() { return Actions.getLigandLayers(this.plugin); }
    hasLigands() { return Actions.hasLigands(this.plugin); }

    async toggleLigands() {
        const shown = Actions.areLigandsVisible(this.plugin);
        await (shown ? this.hideLigands() : this.showLigands());
        return !shown;
    }

    setWaterVisible(visible: boolean) { Actions.setWaterVisible(this.plugin, visible); }
    setHydrogens(mode: Actions.HydrogenMode) { Actions.setHydrogens(this.plugin, mode); }

    // ---- 药效团 / 口袋 ----

    setPharmacophore(points: PharmacophorePoint[], scale = 1) { return Actions.setPharmacophore(this.plugin, points, scale); }
    clearPharmacophore() { Actions.clearPharmacophore(this.plugin); }
    /** 显示/隐藏药效团（不重建） */
    setPharmacophoreVisible(visible: boolean) { Actions.setPharmacophoreVisible(this.plugin, visible); }
    isPharmacophoreVisible() { return Actions.isPharmacophoreVisible(this.plugin); }
    /** 显示/隐藏某一类药效团特征（不重建，不丢失点数据） */
    setPharmacophoreTypeVisible(type: PharmacophoreFeatureType, visible: boolean) { Actions.setPharmacophoreTypeVisible(this.plugin, type, visible); }
    setPockets(pockets: Pocket[]) { return Actions.setPockets(this.plugin, pockets); }
    clearPockets() { return Actions.clearPockets(this.plugin); }
    setPocketVisible(id: number | string, visible: boolean) { Actions.setPocketVisible(this.plugin, id, visible); }
    /** 显示/隐藏全部口袋（不重建） */
    setPocketsVisible(visible: boolean) { Actions.setPocketsVisible(this.plugin, visible); }

    // ---- 视图 ----

    resetCamera() { Actions.resetCamera(this.plugin); }
    setBackground(color: Color) { Actions.setBackground(this.plugin, color); }
    setSpin(on: boolean) { Actions.setSpin(this.plugin, on); }
    /** 插画风：平光 + 描边/遮蔽 */
    setIllustrative(on: boolean) { Actions.setIllustrative(this.plugin, on); }

    /** 导出图片（默认 Full HD，高清，不受交互分辨率影响） */
    screenshot(resolution: Actions.ScreenshotResolution = 'full-hd') {
        return Actions.screenshot(this.plugin, resolution);
    }

    /** 一次调用完成常用展示：样式 + 配色 */
    async present(style: Actions.EasyStyle, color?: Actions.EasyColorTheme, opts?: EasyViewerColorOptions) {
        await this.setStyle(style);
        if (color) await this.setColorTheme(color, opts);
    }

    /** 一次喂入结构 + 药效团 + 口袋（支持多结构/多配体） */
    async loadInputs(inputs: EasyViewerInputs) {
        const list = [...(inputs.structures ?? []), ...(inputs.structure ? [inputs.structure] : [])];
        for (const s of list) {
            await this.loadStructureFromData(s.data as any, s.format as any, { dataLabel: s.label });
        }
        await Actions.reapplyHydrogens(this.plugin);
        if (inputs.pharmacophore) await this.setPharmacophore(inputs.pharmacophore);
        if (inputs.pockets) await this.setPockets(inputs.pockets);
    }

    static async create(elementOrId: string | HTMLElement, options: Partial<ViewerOptions> = {}) {
        applyDefaultColors();

        const merged: Partial<ViewerOptions> = {
            layoutIsExpanded: false,
            layoutShowControls: true,
            layoutShowLeftPanel: true,
            layoutShowLog: false,
            layoutShowSequence: false,
            collapseLeftPanel: false,
            ...options,
        };

        const spec = createViewerSpec(merged);
        spec.components = {
            ...spec.components,
            controls: {
                ...spec.components?.controls,
                left: EasyControls,
                top: 'none',
                right: 'none',
                bottom: 'none',
            },
            viewport: {
                ...spec.components?.viewport,
                view: EasyViewport,
                controls: EasyViewportControls,
            },
        };

        // 精简视口控件：去掉 VR、光照(illumination)、全屏/展开
        spec.config = [
            ...(spec.config ?? []),
            [PluginConfig.Viewport.ShowXR, 'never'],
            [PluginConfig.Viewport.ShowIllumination, false],
            [PluginConfig.Viewport.ShowSettings, false],
            [PluginConfig.Viewport.ShowExpand, false],
            [PluginConfig.Viewport.ShowToggleFullscreen, false],
            [PluginConfig.Structure.DefaultRepresentationPreset, EasyDefaultPreset.id],
            // 满分辨率预览（不再按 DPR 缩，保证清晰）；靠多重采样/遮蔽/拖动隐藏表面省 GPU
            [PluginConfig.General.ResolutionMode, 'auto'],
            [PluginConfig.General.PixelScale, 1],
            [PluginConfig.General.DisableAntialiasing, false],
        ];

        const element = typeof elementOrId === 'string'
            ? document.getElementById(elementOrId)
            : elementOrId;
        if (!element) throw new Error(`Could not get element with id '${elementOrId}'`);

        const plugin = await createPluginUI({
            target: element,
            spec,
            render: renderReact18,
            onBeforeUIRender: p => {
                p.builders.structure.representation.registerPreset(ViewerAutoPreset);
                p.builders.structure.representation.registerPreset(EasyDefaultPreset);
            }
        });

        // chemOrchestra 风格默认：白底、正常光照、焦点表示元素配色
        plugin.canvas3d?.setProps({
            renderer: { backgroundColor: Color(0xffffff) },
            illumination: { enabled: options.illumination ?? DefaultViewerOptions.illumination },
        });

        // 交互时关闭多重采样（temporal AA），转动更流畅；导出通道仍会开启
        if (plugin.canvas3d) {
            plugin.canvas3d.setProps({ multiSample: { ...plugin.canvas3d.props.multiSample, mode: 'off' } });
        }
        // 拖动时临时关后处理
        Actions.enableAdaptivePerformance(plugin);

        // 导出图片默认 Full HD（正常分辨率；面板里可改更高）
        Actions.setScreenshotResolution(plugin, 'full-hd');
        // 内置截图面板的复制/下载也临时提升表面质量
        Actions.wrapScreenshotQuality(plugin);

        // 首次加载默认关闭简易面板（用左侧 Setting 按钮打开）
        Actions.setPanelVisible(plugin, false);

        // 悬停信息精简：蛋白质名 + 链 + 残基序号
        Actions.setupLociLabels(plugin);

        // 点击配体显示附近残基标签 + 悬停残基标签
        Actions.setupResidueLabels(plugin);

        // focus 时高亮周边残基 + 配体-残基相互作用（不显示残基-残基）
        Actions.setupFocusVisuals(plugin);

        // 默认只显示极性氢（与面板默认一致）
        void Actions.setHydrogens(plugin, 'polar');

        // 默认外观：高反光
        await Actions.setBaseStyle(plugin, 'reflective');

        plugin.state.updateBehavior(StructureFocusRepresentation, p => {
            p.expandRadius = 3;
            // 高亮/相互作用由 easy-viewer 自己控制（focus-visuals），内置组件全关
            p.components = [];
            p.surroundingsParams.colorTheme = { name: 'element-symbol', params: { carbonColor: { name: 'element-symbol', params: {} } } };
            p.surroundingsParams.sizeTheme = {
                ...p.surroundingsParams.sizeTheme,
                params: { ...p.surroundingsParams.sizeTheme?.params, scale: 0.5 }
            };
            p.targetParams.colorTheme = { name: 'element-symbol', params: { carbonColor: { name: 'element-symbol', params: {} } } };
        });

        const bg = options.viewportBackgroundColor ?? DefaultViewerOptions.viewportBackgroundColor;
        if (bg) {
            const color = decodeColor(bg);
            if (typeof color === 'number') plugin.canvas3d?.setProps({ renderer: { backgroundColor: color } });
        }

        return new EasyViewer(plugin);
    }
}
