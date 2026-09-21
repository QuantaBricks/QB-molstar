/**
 * Copyright (c) 2026 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author QB-molstar contributors
 *
 * 友好面板：全局修改 + 逐个 ID 修改，参考 chemOrchestra 的布局。
 * UI 只调动作层，逻辑不在这里。
 */

import * as React from 'react';
import { PluginReactContext, PluginUIComponent } from '../../mol-plugin-ui/base';
import { Button, ToggleButton } from '../../mol-plugin-ui/controls/common';
import { ScreenshotPreview } from '../../mol-plugin-ui/controls/screenshot';
import { useBehavior } from '../../mol-plugin-ui/hooks/use-behavior';
import { ViewportControls, Viewport } from '../../mol-plugin-ui/viewport';
import { AnimationViewportControls, TrajectoryViewportControls, StateSnapshotViewportControls, SelectionViewportControls, ViewportSnapshotDescription, LociLabels } from '../../mol-plugin-ui/controls';
import { Toasts } from '../../mol-plugin-ui/toast';
import { BackgroundTaskProgress } from '../../mol-plugin-ui/task';
import { TuneSvg, AutorenewSvg, SelectionModeSvg, CameraOutlinedSvg, CropFreeSvg, CropOrginalSvg, CropSvg } from '../../mol-plugin-ui/controls/icons';
import { Color } from '../../mol-util/color';
import { ColorNames } from '../../mol-util/color/names';
import * as Actions from './easy-actions';
import * as I18n from './i18n';
import { StructureElement, StructureProperties } from '../../mol-model/structure';
import { ChainPalettes, RainbowPalettes, PharmacophoreHexColors, PocketCssColors } from './palettes';
import { ChainPresentation, EasyColorTheme, EasyRepresentationType, EasyViewerColorOptions, RepresentationLayer } from './types';

const Representations: EasyRepresentationType[] = [
    'cartoon',
    'backbone',
    'ball-and-stick',
    'spacefill',
    'molecular-surface',
    'gaussian-surface',
    'line',
    'point',
];

const ChainColors: EasyColorTheme[] = [
    'chain-id',
    'sequence-id',
    'element-symbol',
    'hydrophobicity',
    'secondary-structure',
    'uniform',
];

const Backgrounds: [string, Color][] = [
    ['white', ColorNames.white],
    ['gray', Color(0xdddddd)],
    ['dark', Color(0x222222)],
    ['black', ColorNames.black],
    ['blue', Color(0x1e3a5f)],
];

const UniformSwatches = [0x94a3b8, 0x3b82f6, 0xef4444, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899, 0x111827];

const selectedButtonStyle: React.CSSProperties = {
    background: '#e0edff',
    border: '1px solid #3b82f6',
    color: '#1d4ed8',
    fontWeight: 600,
};

const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 };
const grid3Style: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 };
const rowStyle: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' };
const fontFamily = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif';

const selectArrow = "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='9' viewBox='0 0 10 6'%3E%3Cpath fill='%236b7280' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E\")";

const StructureFileAccept = '.pdb,.ent,.cif,.mmcif,.bcif,.pdbqt,.sdf,.mol,.mol2,.xyz,.gro,.molj,.molx';

const selectStyle: React.CSSProperties = {
    width: '100%',
    height: 32,
    boxSizing: 'border-box',
    padding: '0 26px 0 10px',
    fontSize: 14,
    color: '#374151',
    background: `#ffffff ${selectArrow} no-repeat right 9px center`,
    border: '1px solid #e2e5ea',
    borderRadius: 8,
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    cursor: 'pointer',
    outline: 'none',
};
const swatchStyle = (active: boolean): React.CSSProperties => ({
    width: 22, height: 22, borderRadius: '50%', cursor: 'pointer',
    border: active ? '2px solid #3b82f6' : '1px solid #d5d9e0', padding: 0,
    boxShadow: active ? '0 0 0 2px #dbeafe' : 'none',
});
const colorInputStyle: React.CSSProperties = { width: 30, height: 26, border: '1px solid #e2e5ea', borderRadius: 6, padding: 0, cursor: 'pointer', background: 'transparent', flexShrink: 0 };
const numStyle: React.CSSProperties = { minWidth: 44, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#374151', background: '#fff', border: '1px solid #e2e5ea', borderRadius: 6, flexShrink: 0 };

const layerBoxStyle: React.CSSProperties = { marginTop: 4, padding: '6px 8px', border: '1px solid #eceef2', borderRadius: 10, background: '#ffffff' };
const fileRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, height: 32, padding: '0 6px 0 10px', borderRadius: 8, border: '1px solid #eceef2', background: '#ffffff', cursor: 'pointer' };
const fileRowActiveStyle: React.CSSProperties = { borderColor: '#3b82f6', background: '#e0edff' };
const fileNameStyle: React.CSSProperties = { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 };
const removeButtonStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af', borderRadius: 6, padding: 0 };
const collapseButtonStyle: React.CSSProperties = { border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280', fontSize: 16, lineHeight: 1, padding: '0 2px' };

/** 视口：与默认视口一致，但没有多帧（trajectory）时隐藏动画控件 */
export function EasyViewport() {
    const plugin = React.useContext(PluginReactContext);
    const [multiFrame, setMultiFrame] = React.useState(false);

    React.useEffect(() => {
        const update = () => {
            let multi = false;
            for (const s of plugin.managers.structure.hierarchy.current.structures) {
                const models = s.cell.obj?.data?.models;
                if (models && models.length > 1) { multi = true; break; }
            }
            setMultiFrame(multi);
        };
        update();
        const sub = plugin.state.data.events.changed.subscribe(update);
        return () => sub.unsubscribe();
    }, [plugin]);

    const VPControls = plugin.spec.components?.viewport?.controls || ViewportControls;
    const SVPControls = plugin.spec.components?.selectionTools?.controls || SelectionViewportControls;
    const SnapshotDescription = plugin.spec.components?.viewport?.snapshotDescription || ViewportSnapshotDescription;

    return <>
        <Viewport />
        <div className='msp-viewport-top-left-controls'>
            {multiFrame && <AnimationViewportControls />}
            <TrajectoryViewportControls />
            <StateSnapshotViewportControls />
            <SnapshotDescription />
        </div>
        <SVPControls />
        <VPControls />
        <BackgroundTaskProgress />
        <div className='msp-highlight-toast-wrapper'>
            <LociLabels />
            <Toasts />
        </div>
    </>;
}

/** 视口控件：默认控件 + 仅传统界面下保留一个「简易界面」返回按钮 */
const SeqSvg = () => <svg viewBox='0 0 24 24'><text x='12' y='16.5' textAnchor='middle' fontSize='8.5' fontWeight='700' fill='currentColor' fontFamily='Inter, sans-serif'>SEQ</text></svg>;
const InfoSvg = () => <svg viewBox='0 0 24 24'><path fill='currentColor' d='M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z' /></svg>;
const FileSvg = () => <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' /><polyline points='14 2 14 8 20 8' /></svg>;
const EyeSvg = () => <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z' /><circle cx='12' cy='12' r='3' /></svg>;
const EyeOffSvg = () => <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24' /><line x1='1' y1='1' x2='23' y2='23' /></svg>;
const TrashSvg = () => <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='3 6 5 6 21 6' /><path d='M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6' /><path d='M10 11v6M14 11v6' /><path d='M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2' /></svg>;
const ChevronSvg = ({ collapsed }: { collapsed: boolean }) =>
        <svg width='14' height='9' viewBox='0 0 10 6' style={{ flexShrink: 0, transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.12s' }}>
        <path fill='currentColor' d='M0 0l5 6 5-6z' />
    </svg>;

/** 分段控件（Flat / 3D、High / Normal / Preview） */
function Segmented({ value, options, onChange, disabled }: {
    value: string, options: [string, React.ReactNode][], onChange: (v: string) => void, disabled?: boolean
}) {
    return <div className='easy-segmented'>
        {options.map(([v, label]) =>
            <button key={v} type='button' disabled={disabled}
                className={'easy-seg' + (value === v ? ' easy-seg-active' : '')}
                onClick={() => onChange(v)}>{label}</button>)}
    </div>;
}

/** 可折叠的属性行（表示卡片内的 Color / Opacity 等） */
function PropRow({ id, label, collapsed, onToggle, children }: {
    id: string, label: React.ReactNode, collapsed: boolean, onToggle: (id: string) => void, children: React.ReactNode
}) {
    return <div className='easy-prop'>
        <button type='button' className='easy-prop-head' onClick={() => onToggle(id)}>
            <ChevronSvg collapsed={collapsed} />
            <span className='easy-prop-label'>{label}</span>
        </button>
        {!collapsed && <div className='easy-prop-body'>{children}</div>}
    </div>;
}

/** 打开文件询问框：新建（清空当前场景）或添加（追加） */
function OpenFileDialog({ onPick, onClose }: { onPick: (mode: 'new' | 'add') => void, onClose: () => void }) {
    return <div className='easy-modal-overlay' onClick={onClose}>
        <div className='easy-modal' onClick={e => e.stopPropagation()}>
            <div className='easy-print-header'>
                <b>{I18n.t('openFile')}</b>
                <button className='easy-print-close' onClick={onClose} title='×'>×</button>
            </div>
            <div style={{ display: 'flex', gap: 12, padding: 18 }}>
                <Button style={{ flex: 1 }} onClick={() => onPick('new')}>{I18n.t('newFile')}</Button>
                <Button style={{ flex: 1 }} onClick={() => onPick('add')}>{I18n.t('addFile')}</Button>
            </div>
        </div>
    </div>;
}

/** 自定义导出面板：已翻译，去掉 Illumination / State */
function EasyScreenshotPanel() {
    const plugin = React.useContext(PluginReactContext);
    const helper = plugin.helpers.viewportScreenshot as any;
    const [values, setValues] = React.useState<any>(() => helper?.values);

    React.useEffect(() => {
        if (!helper) return;
        const sub = helper.behaviors.values.subscribe((v: any) => setValues({ ...v }));
        return () => sub.unsubscribe();
    }, [plugin]);

    const cropParams = useBehavior(helper?.behaviors.cropParams);
    useBehavior(helper?.behaviors.relativeCrop);

    if (!helper || !values) return null;

    const set = (patch: any) => helper.behaviors.values.next({ ...helper.values, ...patch });
    const labelCss: React.CSSProperties = { minWidth: 84, fontSize: 15, color: '#374151', fontWeight: 600 };
    const selStyle: React.CSSProperties = { ...selectStyle, marginTop: 0, flex: 1 };
    const checkStyle: React.CSSProperties = { width: 18, height: 18, cursor: 'pointer' };
    const rowCss: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 };

    return <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '2px 2px 4px' }}>
        <div className='msp-image-preview'>
            <ScreenshotPreview plugin={plugin} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ToggleButton icon={CropOrginalSvg} title={I18n.t('autoCrop')} inline isSelected={!!cropParams?.auto}
                style={{ background: 'transparent', width: 'auto' }}
                toggle={() => helper.toggleAutocrop()}
                label={`${I18n.t('autoCrop')}${cropParams?.auto ? ' ✓' : ''}`} />
            {!cropParams?.auto && <Button icon={CropSvg} title={I18n.t('crop')} onClick={() => helper.autocrop()} />}
            {!cropParams?.auto && !helper.isFullFrame && <Button icon={CropFreeSvg} title={I18n.t('resetCrop')} onClick={() => helper.resetCrop()} />}
        </div>
        <div style={rowCss}>
            <span style={labelCss}>{I18n.t('resolution')}</span>
            <select style={selStyle} value={values.resolution.name}
                onChange={e => set({ resolution: { name: e.target.value, params: {} } })}>
                <option value='viewport'>{I18n.t('resViewport')}</option>
                <option value='hd'>HD (1280 x 720)</option>
                <option value='full-hd'>Full HD (1920 x 1080)</option>
                <option value='ultra-hd'>Ultra HD (3840 x 2160)</option>
                <option value='8k-ultra-hd'>8K (7680 x 4320)</option>
            </select>
        </div>
        <div style={rowCss}>
            <span style={labelCss}>{I18n.t('format')}</span>
            <select style={selStyle} value={values.format.name}
                onChange={e => set({ format: { name: e.target.value, params: e.target.value === 'png' ? {} : { quality: 0.9 } } })}>
                <option value='png'>PNG</option>
                <option value='jpeg'>JPEG</option>
                <option value='webp'>WebP</option>
            </select>
        </div>
        <label style={{ ...rowCss, cursor: 'pointer' }}>
            <input type='checkbox' style={checkStyle} checked={!!values.transparent} onChange={e => set({ transparent: e.target.checked })} />
            <span style={{ fontSize: 15, color: '#374151' }}>{I18n.t('transparent')}</span>
        </label>
        <label style={{ ...rowCss, cursor: 'pointer' }}>
            <input type='checkbox' style={checkStyle} checked={values.axes.name === 'on'} onChange={e => set({ axes: { name: e.target.checked ? 'on' : 'off', params: {} } })} />
            <span style={{ fontSize: 15, color: '#374151' }}>{I18n.t('axes')}</span>
        </label>
        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            <Button style={{ flex: 1 }} onClick={() => helper.copyToClipboard()}>{I18n.t('copy')}</Button>
            <Button style={{ flex: 1 }} onClick={() => helper.download()}>{I18n.t('download')}</Button>
        </div>
        <Button style={{ marginTop: 2 }} onClick={() => Actions.exportGlb(plugin)}>{I18n.t('exportGlb')}</Button>
    </div>;
}

export function EasyViewportControls() {
    const plugin = React.useContext(PluginReactContext);
    const classic = React.useSyncExternalStore(Actions.subscribeClassicMode, Actions.isClassicMode);
    const locale = React.useSyncExternalStore(I18n.subscribeLocale, I18n.getLocale);
    const [panelVisible, setPanelVisible] = React.useState(() => Actions.isPanelVisible(plugin));
    const [sequenceVisible, setSequenceVisible] = React.useState(() => Actions.isSequenceVisible(plugin));
    const [selectionMode, setSelectionMode] = React.useState(() => plugin.selectionMode);
    const [printExpanded, setPrintExpanded] = React.useState(false);
    const [infoOpen, setInfoOpen] = React.useState(false);
    const openFileInput = React.useRef<HTMLInputElement>(null);
    const openFileMode = React.useRef<'new' | 'add'>('new');
    const [openDialog, setOpenDialog] = React.useState(false);
    const targetedChain = React.useSyncExternalStore(Actions.subscribeTargetedChain, Actions.getTargetedChain);

    const openFile = (mode: 'new' | 'add') => {
        openFileMode.current = mode;
        openFileInput.current?.click();
    };
    const onOpenClick = () => {
        if (Actions.hasContent(plugin)) setOpenDialog(true);
        else openFile('new');
    };
    const onOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) Actions.loadStructureFile(plugin, f, openFileMode.current);
        e.target.value = '';
    };

    React.useEffect(() => {
        const update = () => {
            setPanelVisible(Actions.isPanelVisible(plugin));
            setSequenceVisible(Actions.isSequenceVisible(plugin));
            setSelectionMode(plugin.selectionMode);
        };
        update();
        const subs = [
            plugin.layout.events.updated.subscribe(update),
            plugin.behaviors.interaction.selectionMode.subscribe(update),
        ];
        return () => { for (const s of subs) s.unsubscribe(); };
    }, [plugin]);

    const button = (svg: React.ReactNode, title: string, onClick: () => void, active = false) =>
        <button className={'easy-vp-btn' + (active ? ' easy-vp-btn-active' : '')} title={title} onClick={onClick}>{svg}</button>;

    return <>
        {!panelVisible && <div className='easy-viewport-controls'>
            {button(<FileSvg />, I18n.t('openFile'), onOpenClick)}
            {button(<CameraOutlinedSvg />, I18n.t('exportImage'), () => setPrintExpanded(v => !v), printExpanded)}
            {button(<TuneSvg />, I18n.t('setting'), () => Actions.setPanelVisible(plugin, true))}
            {button(<SeqSvg />, I18n.t('sequence'), () => Actions.setSequenceVisible(plugin, !sequenceVisible), sequenceVisible)}
            {button(<SelectionModeSvg />, I18n.t('selection'), () => { plugin.selectionMode = !plugin.selectionMode; }, selectionMode)}
            {button(<AutorenewSvg />, I18n.t('reset'), () => Actions.resetCamera(plugin))}
            {button(<InfoSvg />, I18n.t('about'), () => setInfoOpen(v => !v), infoOpen)}
            {classic && <button className='easy-vp-btn easy-vp-btn-text'
                title={locale === 'zh' ? '切换回简易界面' : locale === 'ja' ? 'シンプルUIに戻る' : 'Switch back to simple UI'}
                onClick={() => Actions.toggleClassicMode(plugin)}>{I18n.t('simple')}</button>}
        </div>}
        <input ref={openFileInput} type='file' accept={StructureFileAccept} style={{ display: 'none' }} onChange={onOpenFile} />
        {openDialog && <OpenFileDialog onPick={mode => { setOpenDialog(false); openFile(mode); }} onClose={() => setOpenDialog(false)} />}
        {targetedChain && <button className='easy-cancel-selection'
            onClick={() => Actions.setTargetedChain(plugin, null)}>{I18n.t('cancelSelection')}</button>}
        {infoOpen && <div className='easy-print-panel'>
            <div className='easy-print-header'>
                <b>{I18n.t('about')}</b>
                <button className='easy-print-close' onClick={() => setInfoOpen(false)} title='×'>×</button>
            </div>
            <div className='easy-print-body easy-about'>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Mol*</div>
                <div style={{ marginBottom: 8, lineHeight: 1.5 }}>
                    {I18n.t('aboutOriginal')}: David Sehnal, Alexander Rose &amp; Mol* contributors<br />
                    <a href='https://molstar.org' target='_blank' rel='noreferrer'>molstar.org</a>
                    {' · '}
                    <a href='https://github.com/molstar/molstar' target='_blank' rel='noreferrer'>github.com/molstar/molstar</a>
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>QuantaBricks</div>
                <div style={{ lineHeight: 1.5 }}>
                    {I18n.t('aboutModified')}: easy-viewer (localized UI, style/color controls, representation layers, labels, export).
                </div>
            </div>
        </div>}
        {printExpanded && <div className='easy-print-panel'>
            <div className='easy-print-header'>
                <b>{I18n.t('exportImage')}</b>
                <button className='easy-print-close' onClick={() => setPrintExpanded(false)} title='×'>×</button>
            </div>
            <div className='easy-print-body'>
                <EasyScreenshotPanel />
            </div>
        </div>}
    </>;
}

function Section({ title, children }: { title: React.ReactNode, children: React.ReactNode }) {
    const [collapsed, setCollapsed] = React.useState(true);
    return <div className='easy-section'>
        <button type='button' className='easy-section-title' onClick={() => setCollapsed(v => !v)}>
            <ChevronSvg collapsed={collapsed} />
            <span>{title}</span>
        </button>
        {!collapsed && <div className='easy-section-body'>{children}</div>}
    </div>;
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
    let handle: any;
    return (...args: Parameters<T>) => {
        clearTimeout(handle);
        handle = setTimeout(() => fn(...args), ms);
    };
}

export class EasyControls extends PluginUIComponent<{}, {
    busy: boolean,
    chainPalette: string,
    rainbowPalette: string,
    uniformColor: number,
    waterVisible: boolean,
    hMode: Actions.HydrogenMode,
    pharmacophoreVisible: boolean,
    pharmacophoreScale: number,
    chains: string[],
    chainTypes: { [chain: string]: string },
    chainPres: { [chain: string]: ChainPresentation },
    perChainActive: boolean,
    chainTarget: string,
    illustrative: boolean,
    baseStyle: Actions.BaseStyle | null,
    labelColor: number,
    labelBgColor: number,
    labelBgOpacity: number,
    labelScale: number,
    renderQuality: Actions.RenderQuality,
    langOpen: boolean,
    collapsed: { [key: string]: boolean },
    bgColor: number,
    lightIntensity: number,
}> {
    state = {
        busy: false,
        chainPalette: 'default',
        rainbowPalette: 'blue',
        uniformColor: 0x94a3b8,
        waterVisible: true,
        hMode: 'polar' as Actions.HydrogenMode,
        pharmacophoreVisible: true,
        pharmacophoreScale: 1,
        chains: [] as string[],
        chainTypes: {} as { [chain: string]: string },
        chainPres: {} as { [chain: string]: ChainPresentation },
        perChainActive: false,
        chainTarget: 'all',
        illustrative: false,
        baseStyle: '3d' as Actions.BaseStyle | null,
        labelColor: 0x000000,
        labelBgColor: 0xffffff,
        labelBgOpacity: 0,
        labelScale: 0.65,
        renderQuality: 'high' as Actions.RenderQuality,
        langOpen: false,
        collapsed: {} as { [key: string]: boolean },
        bgColor: 0xffffff,
        lightIntensity: 0.6,
    };

    private pendingUpdate = false;
    private stateFileInput = React.createRef<HTMLInputElement>();

    /** 用 requestAnimationFrame 合并同一帧内的多次状态变化，避免频繁重渲染 */
    private scheduleUpdate = () => {
        if (this.pendingUpdate) return;
        this.pendingUpdate = true;
        requestAnimationFrame(() => {
            this.pendingUpdate = false;
            this.refreshChains();
        this.setState({
            lightIntensity: Actions.getLightIntensity(this.plugin),
            labelColor: Actions.getLabelStyle().color,
            bgColor: (this.plugin.canvas3d?.props.renderer.backgroundColor as number) ?? 0xffffff,
        });
        });
    };

    componentDidMount() {
        this.injectStyle();
        this.refreshChains();
        this.setState({ lightIntensity: Actions.getLightIntensity(this.plugin) });
        this.activeSub = Actions.subscribeActiveStructure(this.scheduleUpdate);
        this.subscribe(this.plugin.state.data.events.changed, this.scheduleUpdate);
        this.subscribe(this.plugin.state.data.events.cell.stateUpdated, this.scheduleUpdate);
        this.subscribe(this.plugin.events.canvas3d.settingsUpdated, this.scheduleUpdate);
        this.targetedSub = Actions.subscribeTargetedChain(() => {
            const target = Actions.getTargetedChain() ?? 'all';
            if (this.state.chainTarget !== target) this.setState({ chainTarget: target });
        });
        // 画布上选中/聚焦某条链时，Polymer 目标自动切到该链（不整链高亮，保留用户点选的残基）
        const switchToLoci = (loci: any) => {
            if (!loci || !StructureElement.Loci.is(loci) || StructureElement.Loci.isEmpty(loci)) return;
            const loc = StructureElement.Loci.getFirstLocation(loci);
            if (!loc || StructureProperties.entity.type(loc) !== 'polymer') return;
            const chain = StructureProperties.chain.label_asym_id(loc);
            if (chain && chain !== this.state.chainTarget && this.state.chains.indexOf(chain) >= 0) {
                this.setState({ chainTarget: chain });
                Actions.setTargetedChain(this.plugin, chain, false);
            }
        };
        this.subscribe(this.plugin.managers.structure.focus.behaviors.current, (focus: any) => { switchToLoci(focus?.loci); this.scheduleUpdate(); });
        this.subscribe(this.plugin.managers.structure.selection.events.changed, () => {
            this.plugin.managers.structure.selection.entries.forEach((entry: any) => switchToLoci(entry.selection));
        });
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        this.targetedSub?.();
        this.activeSub?.();
    }

    private targetedSub?: () => void;
    private activeSub?: () => void;
    private activeStructureKey = '';
    private lastActiveRef: string | null = null;
    private chainPresCache = new Map<string, { [chain: string]: ChainPresentation }>();

    /** 放大侧栏字号（给老人看），只作用于本面板 */
    private injectStyle() {
        if (document.getElementById('easy-viewer-style')) return;
        const style = document.createElement('style');
        style.id = 'easy-viewer-style';
        style.textContent = `
            .easy-panel { font-size: 14px; background: #f6f7f9; color: #374151; }
            .easy-panel .msp-btn {
                height: 32px; font-size: 14px; line-height: 1; padding: 0 10px;
                background: #f3f4f6; border: 1px solid #e6e8ec; border-radius: 8px; color: #374151;
            }
            .easy-panel .msp-btn:hover { background: #e9ecf1; }
            .easy-panel .msp-btn:disabled { opacity: 0.5; }
            .easy-panel small { font-size: 13px; font-weight: 600; color: #6b7280; line-height: 1.2; }
            .easy-section { margin-top: 12px; }
            .easy-section-title {
                display: flex; align-items: center; gap: 6px; width: 100%; text-align: left;
                border: none; border-bottom: 1px solid #e8ebf0; background: transparent; cursor: pointer;
                font-size: 16px; font-weight: 600; color: #1f2937; letter-spacing: 0.01em;
                padding: 0 0 4px; margin: 0 0 6px;
            }
            .easy-section-title:hover { color: #1d4ed8; }
            .easy-section-body { display: flex; flex-direction: column; gap: 4px; }
            .easy-prop { border-top: 1px solid #f0f2f5; }
            .easy-prop-head { display: flex; align-items: center; gap: 4px; width: 100%; border: none; background: transparent; cursor: pointer; padding: 3px 0; color: #6b7280; font-size: 13px; font-weight: 600; }
            .easy-section-title svg { color: #6b7280; }
            .easy-prop-head svg { color: #9ca3af; }
            .easy-prop-body { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 2px 0 4px 14px; }
            .easy-segmented { display: flex; gap: 2px; padding: 2px; background: #eef1f5; border-radius: 9px; }
            .easy-seg {
                flex: 1; height: 28px; border: none; background: transparent; border-radius: 7px;
                font-size: 14px; color: #4b5563; cursor: pointer; padding: 0 8px; white-space: nowrap;
            }
            .easy-seg:hover { background: #e3e8ef; }
            .easy-seg-active { background: #ffffff; color: #1d4ed8; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,0.12); }
            .easy-seg-active:hover { background: #ffffff; }
            .easy-icon-btn svg { width: 18px; height: 18px; }
            .easy-icon-btn:hover { background: #eef1f5; color: #374151; }
            .easy-file-row:hover { background: #f3f4f6; }
            .easy-viewport-controls {
                position: absolute; top: 8px; left: 8px; z-index: 30;
                display: flex; flex-direction: column; gap: 6px;
            }
            .easy-vp-btn {
                display: flex; align-items: center; justify-content: center;
                width: 44px; height: 44px; padding: 0; cursor: pointer;
                border: 1px solid #d1d5db; border-radius: 8px;
                background: rgba(255,255,255,0.92); color: #374151;
            }
            .easy-vp-btn:hover { background: #eef2f7; }
            .easy-vp-btn-active { box-shadow: inset 0 0 0 2px #3b82f6; color: #1d4ed8; }
            .easy-vp-btn svg { width: 28px; height: 28px; }
            .easy-vp-btn-text { width: auto; height: 36px; padding: 0 10px; font-size: 13px; }
            .easy-cancel-selection {
                position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
                z-index: 30; padding: 6px 16px; font-size: 15px; cursor: pointer;
                border: 1px solid #d1d5db; border-radius: 8px;
                background: rgba(255,255,255,0.95); color: #374151;
                box-shadow: 0 2px 8px rgba(0,0,0,0.12);
            }
            .easy-cancel-selection:hover { background: #eef2f7; }
            .easy-lang-btn {
                display: flex; align-items: center; justify-content: space-between; gap: 6px;
                width: auto; padding: 4px 8px; font-size: 14px; color: #374151;
                background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer;
                white-space: nowrap; overflow: hidden;
            }
            .easy-lang-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .easy-lang-menu {
                position: absolute; bottom: 100%; left: 0; margin-bottom: 4px;
                min-width: 100%; width: max-content;
                background: #fff; border: 1px solid #b8bec9; border-radius: 8px;
                box-shadow: 0 4px 14px rgba(0,0,0,0.16); z-index: 40; overflow: hidden;
            }
            .easy-lang-item { padding: 6px 10px; font-size: 15px; color: #374151; cursor: pointer; }
            .easy-lang-item:hover { background: #f3f4f6; }
            .easy-lang-item-active { background: #eff6ff; color: #1d4ed8; font-weight: 700; }
            .easy-print-panel {
                position: absolute;
                top: 8px; left: 60px;
                width: 340px;
                border-radius: 12px;
                border: 1px solid #b8bec9;
                background: #ffffff;
                box-shadow: 0 4px 18px rgba(0,0,0,0.14);
                overflow: hidden;
            }
            .easy-print-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 8px 12px;
                border-bottom: 1px solid #e5e7eb;
            }
            .easy-print-header b { font-size: 16px; color: #1f2937; }
            .easy-print-close {
                border: none; background: transparent; cursor: pointer;
                font-size: 30px; line-height: 1; color: #6b7280; padding: 0 4px;
            }
            .easy-print-close:hover { color: #111827; }
            .easy-print-body { padding: 10px 12px; }
            .easy-modal-overlay {
                position: fixed; inset: 0; z-index: 100;
                background: rgba(0,0,0,0.32);
                display: flex; align-items: center; justify-content: center;
            }
            .easy-modal {
                width: 460px;
                max-width: calc(100vw - 40px);
                border-radius: 14px;
                border: 1px solid #b8bec9;
                background: #ffffff;
                box-shadow: 0 8px 30px rgba(0,0,0,0.24);
                overflow: hidden;
            }
            .easy-modal .easy-print-header { padding: 14px 18px; }
            .easy-modal .easy-print-header b { font-size: 20px; }
            .easy-modal .msp-btn {
                font-size: 18px;
                height: auto;
                line-height: 1.4;
                padding: 12px 8px;
                background: #f3f4f6 !important;
                color: #1f2937 !important;
                border: 1px solid #d1d5db;
            }
            .easy-modal .msp-btn:hover { background: #e5e7eb !important; }
            .easy-print-panel .msp-image-preview { background: #ffffff !important; }
            .easy-print-panel .msp-btn {
                font-size: 15px;
                height: auto;
                line-height: 1.35;
                padding: 5px 8px;
                background: #f3f4f6 !important;
                color: #1f2937 !important;
                border: 1px solid #d1d5db;
            }
            .easy-print-panel .msp-btn:hover { background: #e5e7eb !important; }
            .msp-viewport-top-left-controls { left: 60px !important; }
            .msp-sequence-wrapper { padding-bottom: 2px !important; }
            .msp-sequence-wrapper-non-empty { font-size: 180% !important; line-height: 200% !important; }
            .msp-sequence-wrapper .msp-sequence-residue { letter-spacing: 0.28em; }
            .msp-highlight-info { font-size: 300% !important; color: #1e3a8a !important; }
            @media (orientation: landscape), (min-width: 1000px) {
                .msp-layout-standard-reactive .msp-layout-left:has(.easy-panel) {
                    width: 330px !important;
                    background: transparent !important;
                    border-right: none !important;
                    pointer-events: none;
                    z-index: 20;
                }
                .msp-layout-standard-reactive:has(.easy-panel) .msp-layout-main,
                .msp-layout-standard-reactive:has(.easy-panel) .msp-layout-top,
                .msp-layout-standard-reactive:has(.easy-panel) .msp-layout-bottom { left: 0 !important; }
                .msp-layout-standard-reactive .msp-layout-left:has(.easy-panel) .msp-layout-static { background: transparent !important; }
                .msp-layout-standard-reactive .msp-layout-left .easy-panel {
                    top: 2px !important; left: 6px !important; right: 6px !important; bottom: 2px !important;
                    border-radius: 14px;
                    background: rgba(246,247,249,0.94);
                    -webkit-backdrop-filter: blur(8px);
                    backdrop-filter: blur(8px);
                    border: 1px solid #e8ebf0;
                    pointer-events: auto;
                }
            }
        `;
        document.head.appendChild(style);
    }

    private refreshChains() {
        const all = Actions.getAllStructures(this.plugin);
        const idx = Actions.getActiveStructureIndex(this.plugin);
        const ref = all[idx]?.cell.transform.ref ?? '';
        const key = ref + ':' + all.length;
        const chains = Actions.getAvailableChains(this.plugin);
        const same = key === this.activeStructureKey && chains.length === this.state.chains.length && chains.every((c, i) => c === this.state.chains[i]);
        if (same) return;
        // 切换结构：保存上一个结构的链设置，恢复目标结构的链设置
        if (this.lastActiveRef && this.lastActiveRef !== ref) {
            this.chainPresCache.set(this.lastActiveRef, this.state.chainPres);
        }
        this.lastActiveRef = ref;
        this.activeStructureKey = key;
        const chainTypes = Actions.getChainTypes(this.plugin);
        const chainPres = { ...(this.chainPresCache.get(ref) ?? {}) };
        for (const c of chains) {
            if (!chainPres[c]) chainPres[c] = { chain: c, layers: [{ type: 'cartoon', color: 'sequence-id', colorOptions: { rainbowPalette: 'blue' } }] };
        }
        // 结构变化（重新加载）时退出逐链模式
        this.setState({ chains, chainTypes, chainPres, perChainActive: false, chainTarget: 'all' });
        Actions.setTargetedChain(this.plugin, null);
    }

    private chainLabel(c: string) {
        const t = this.state.chainTypes[c];
        return t ? `Chain ${c}(${t})` : `Chain ${c}`;
    }

    private toggleCollapse = (key: string) => {
        this.setState({ collapsed: { ...this.state.collapsed, [key]: !this.state.collapsed[key] } });
    };

    private targetChains(): string[] {
        return this.state.chainTarget === 'all' ? this.state.chains : [this.state.chainTarget];
    }

    private colorOptions(): EasyViewerColorOptions {
        return {
            chainPalette: this.state.chainPalette,
            rainbowPalette: this.state.rainbowPalette,
            uniformColor: this.state.uniformColor,
        };
    }

    /** 目标各链的层集合一致则返回，否则 null（混合） */
    private targetLayers(): RepresentationLayer[] | null {
        const chains = this.targetChains();
        if (chains.length === 0) return [];
        const lists = chains.map(c => Actions.getLayers(this.state.chainPres[c] ?? { chain: c, layers: [] }));
        const first = lists[0];
        const same = lists.every(l => l.length === first.length && l.every((v, i) => v.type === first[i].type));
        return same ? first : null;
    }

    private commitLayers(mutate: (chain: string, layers: RepresentationLayer[]) => RepresentationLayer[]) {
        const chainPres = { ...this.state.chainPres };
        for (const c of this.targetChains()) {
            const base = Actions.getLayers(chainPres[c] ?? { chain: c, layers: [] }).map(l => ({ ...l }));
            chainPres[c] = { ...chainPres[c], chain: c, layers: mutate(c, base) };
        }
        this.setState({ chainPres, perChainActive: true });
        this.run(() => Actions.setChainPresentations(this.plugin, Object.values(chainPres)));
    }

    private addLayer(type: EasyRepresentationType) {
        this.commitLayers((_c, layers) => layers.some(l => l.type === type) ? layers : [...layers, { type, color: 'chain-id' }]);
    }

    private removeLayer(type: EasyRepresentationType) {
        this.commitLayers((_c, layers) => layers.filter(l => l.type !== type));
    }

    private setLayerColor(type: EasyRepresentationType, color: EasyColorTheme, uniformColor?: number) {
        const colorOptions: EasyViewerColorOptions = { ...this.colorOptions(), ...(uniformColor !== undefined ? { uniformColor } : {}) };
        const chainPres = { ...this.state.chainPres };
        for (const c of this.targetChains()) {
            const layers = Actions.getLayers(chainPres[c] ?? { chain: c, layers: [] }).map(l => l.type === type ? { ...l, color, colorOptions } : l);
            chainPres[c] = { ...chainPres[c], chain: c, layers };
        }
        const wasActive = this.state.perChainActive;
        this.setState({ chainPres, perChainActive: true });
        if (!wasActive) {
            // 首次：先构建逐链表示，再谈改颜色
            this.run(() => Actions.setChainPresentations(this.plugin, Object.values(chainPres)));
        } else {
            // 颜色原地更新，不重算几何
            this.run(async () => {
                for (const c of this.targetChains()) await Actions.updateLayerColor(this.plugin, c, type, color, colorOptions);
            });
        }
    }

    private setLayerVisible(type: EasyRepresentationType, visible: boolean) {
        const chainPres = { ...this.state.chainPres };
        for (const c of this.targetChains()) {
            const layers = Actions.getLayers(chainPres[c] ?? { chain: c, layers: [] }).map(l => l.type === type ? { ...l, visible } : l);
            chainPres[c] = { ...chainPres[c], chain: c, layers };
        }
        const wasActive = this.state.perChainActive;
        this.setState({ chainPres, perChainActive: true });
        if (!wasActive) {
            this.run(() => Actions.setChainPresentations(this.plugin, Object.values(chainPres)));
        } else {
            for (const c of this.targetChains()) Actions.setLayerVisible(this.plugin, c, type, visible);
        }
    }

    private setLayerAlpha(type: EasyRepresentationType, alpha: number) {
        const chainPres = { ...this.state.chainPres };
        for (const c of this.targetChains()) {
            const layers = Actions.getLayers(chainPres[c] ?? { chain: c, layers: [] }).map(l => l.type === type ? { ...l, alpha } : l);
            chainPres[c] = { ...chainPres[c], chain: c, layers };
        }
        const wasActive = this.state.perChainActive;
        this.setState({ chainPres, perChainActive: true });
        if (!wasActive) {
            this.run(() => Actions.setChainPresentations(this.plugin, Object.values(chainPres)));
        } else {
            // 原地改 alpha，不重建几何（chemOrchestra 的做法）
            this.setLayerAlphaDebounced(type, alpha);
        }
    }

    private setLayerAlphaDebounced = debounce((type: EasyRepresentationType, alpha: number) => {
        this.run(async () => {
            for (const c of this.targetChains()) await Actions.updateLayerAlpha(this.plugin, c, type, alpha);
        });
    }, 60);

    private setLigandAlphaDebounced = debounce((type: EasyRepresentationType, alpha: number) => {
        this.run(async () => { await Actions.updateLigandLayerAlpha(this.plugin, type, alpha); });
    }, 60);

    private setLabelScaleDebounced = debounce((scale: number) => {
        this.run(async () => { await Actions.setLabelScale(this.plugin, scale); });
    }, 80);

    private setLabelBgOpacityDebounced = debounce((opacity: number) => {
        this.run(async () => { await Actions.setLabelBackgroundOpacity(this.plugin, opacity); });
    }, 80);

    private async run(action: () => Promise<any> | void) {
        if (this.state.busy) return;
        this.setState({ busy: true });
        try {
            await action();
        } catch (e) {
            console.error('EasyViewer:', e);
        } finally {
            this.setState({ busy: false });
        }
    }

    private refreshPharmacophore = debounce((scale: number) => {
        const points = Actions.getPharmacophorePoints(this.plugin);
        if (points.length > 0) Actions.setPharmacophore(this.plugin, points, scale);
    }, 150);

    private setLayerUniform(type: EasyRepresentationType, color: number) {
        this.setState({ uniformColor: color });
        this.setLayerColor(type, 'uniform', color);
    }

    /** 表示层卡片（聚合物 / 配体共用） */
    private renderLayer(layer: RepresentationLayer, index: number, collapseKey: string, onVisible: (v: boolean) => void, onRemove: () => void, onAlpha: (a: number) => void, onSize?: (s: number) => void) {
        const isSurface = layer.type === 'molecular-surface' || layer.type === 'gaussian-surface';
        const collapsed = !!this.state.collapsed[collapseKey];
        return <div key={layer.type} style={layerBoxStyle}>
            <div style={rowStyle}>
                <button title='收起/展开' onClick={() => this.toggleCollapse(collapseKey)} style={collapseButtonStyle}>{collapsed ? '▸' : '▾'}</button>
                <span style={{ fontWeight: 700, color: '#9ca3af', fontSize: 12 }}>{index + 1}</span>
                <i style={{ flex: 1, fontWeight: 600 }}>{I18n.reprName(layer.type)}</i>
                <button className='easy-icon-btn' title={I18n.t('visible')} style={removeButtonStyle}
                    onClick={() => onVisible(layer.visible === false)}>
                    {layer.visible === false ? <EyeOffSvg /> : <EyeSvg />}
                </button>
                <button className='easy-icon-btn' title={I18n.t('remove')} onClick={onRemove} style={removeButtonStyle}><TrashSvg /></button>
            </div>
            {!collapsed && isSurface && <PropRow id={collapseKey + ':opacity'} label={I18n.t('opacity')} collapsed={!!this.state.collapsed[collapseKey + ':opacity']} onToggle={this.toggleCollapse}>
                <input type="range" min={0.1} max={1} step={0.05} value={layer.alpha ?? 1}
                    style={{ flex: 1 }}
                    onChange={e => onAlpha(parseFloat(e.target.value))} />
                <span style={numStyle}>{(layer.alpha ?? 1).toFixed(2)}</span>
            </PropRow>}
            {!collapsed && onSize && <div style={{ ...rowStyle, marginTop: 2 }}>
                <small style={{ minWidth: 40 }}>Size</small>
                <input type="range" min={0.2} max={3} step={0.05} value={layer.size ?? 1}
                    style={{ flex: 1 }}
                    onChange={e => onSize(parseFloat(e.target.value))} />
                <span style={numStyle}>{(layer.size ?? 1).toFixed(2)}</span>
            </div>}
        </div>;
    }

    render() {
        const p = this.plugin;
        const hasStructure = Actions.getStructures(p).length > 0;
        const disabled = this.state.busy || !hasStructure;
        const pockets = Actions.getPocketData(p);
        const hidden = Actions.getHiddenPockets(p);
        const phPoints = Actions.getPharmacophorePoints(p);
        const phTypes = Array.from(new Set(phPoints.map(pt => pt.type)));

        return <div className='msp-scrollable-container easy-panel' style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily }}>
            <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', padding: '2px 4px 0' }}>
                <button title={I18n.t('close')} onClick={() => this.run(() => Actions.setPanelVisible(p, false))}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 24, lineHeight: 1, color: '#6b7280', padding: '0 8px' }}>×</button>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 12px 12px' }}>
            {Actions.getAllStructures(p).length > 0 && <Section title={I18n.t('files')}>
                {Actions.getAllStructures(p).map((_, i) => {
                    const active = Actions.getActiveStructureIndex(p) === i;
                    const visible = Actions.isStructureVisible(p, i);
                    return <div key={i} className='easy-file-row' style={{ ...fileRowStyle, ...(active ? fileRowActiveStyle : null) }}
                        onClick={() => Actions.setActiveStructure(p, i)}>
                        <span style={fileNameStyle}>{Actions.getStructureLabel(p, i)}</span>
                        <button className='easy-icon-btn' title={I18n.t('visible')} style={removeButtonStyle}
                            onClick={e => { e.stopPropagation(); Actions.setStructureVisible(p, i, !visible); }}>
                            {visible ? <EyeSvg /> : <EyeOffSvg />}
                        </button>
                    </div>;
                })}
            </Section>}
            <Section title={I18n.t('style')}>
                <Segmented value={this.state.baseStyle ?? ''} disabled={disabled}
                    options={[['cartoon', I18n.t('flat')], ['3d', I18n.t('threeD')], ['reflective', I18n.t('reflective')]]}
                    onChange={v => this.run(async () => {
                        this.setState({ baseStyle: v as Actions.BaseStyle, illustrative: v === 'cartoon' });
                        await Actions.setBaseStyle(p, v as Actions.BaseStyle);
                    })} />
            </Section>

            <Section title={I18n.t('polymer')}>
                {this.state.chains.length > 0 ? <>
                    <div style={rowStyle}>
                        <small style={{ minWidth: 32 }}>{I18n.t('target')}</small>
                        <select style={{ ...selectStyle, marginTop: 0, flex: 1 }} value={this.state.chainTarget}
                            onChange={e => { const v = e.target.value; this.setState({ chainTarget: v }); Actions.setTargetedChain(p, v === 'all' ? null : v); }}>
                            <option value="all">{I18n.t('allChains')}</option>
                            {this.state.chains.map(c => <option key={c} value={c}>{this.chainLabel(c)}</option>)}
                        </select>
                    </div>
                    <div style={{ ...rowStyle, marginTop: 4 }}>
                        <small style={{ minWidth: 32 }}>{I18n.t('add')}</small>
                        <select style={{ ...selectStyle, marginTop: 0, flex: 1 }} value=''
                            onChange={e => { if (e.target.value) this.addLayer(e.target.value as EasyRepresentationType); }}>
                            <option value=''>{I18n.t('addRepr')}</option>
                            {Representations.map(v => <option key={v} value={v}>{I18n.reprName(v)}</option>)}
                        </select>
                    </div>
                    {(() => {
                        const layers = this.targetLayers();
                        if (layers === null) return <div style={{ marginTop: 4 }}><small style={{ color: '#888' }}>{I18n.t('chainsDiffer')}</small></div>;
                        if (layers.length === 0) return <div style={{ marginTop: 4 }}><small style={{ color: '#888' }}>{I18n.t('noRepr')}</small></div>;
                        return layers.map((layer, i) => {
                            const color = layer.color ?? 'chain-id';
                            const collapseKey = 'poly:' + layer.type;
                            const collapsed = !!this.state.collapsed[collapseKey];
                            return <div key={layer.type} style={layerBoxStyle}>
                                <div style={rowStyle}>
                                    <button title='收起/展开' onClick={() => this.toggleCollapse(collapseKey)} style={collapseButtonStyle}>{collapsed ? '▸' : '▾'}</button>
                                    <span style={{ fontWeight: 700, color: '#9ca3af', fontSize: 12 }}>{i + 1}</span>
                                    <i style={{ flex: 1, fontWeight: 600 }}>{I18n.reprName(layer.type)}</i>
                                    <button className='easy-icon-btn' title={I18n.t('visible')} style={removeButtonStyle}
                                        onClick={() => this.setLayerVisible(layer.type, layer.visible === false)}>
                                        {layer.visible === false ? <EyeOffSvg /> : <EyeSvg />}
                                    </button>
                                    <button className='easy-icon-btn' title={I18n.t('remove')} onClick={() => this.removeLayer(layer.type)} style={removeButtonStyle}><TrashSvg /></button>
                                </div>
                                {!collapsed && <>
                                    <div style={{ ...rowStyle, marginTop: 4 }}>
                                        <select style={{ ...selectStyle, marginTop: 0, flex: 1 }} value={color}
                                            onChange={e => this.setLayerColor(layer.type, e.target.value as EasyColorTheme)}>
                                            {ChainColors.map(v => <option key={v} value={v}>{I18n.themeName(v)}</option>)}
                                        </select>
                                        {color === 'chain-id' &&
                                            <select style={{ ...selectStyle, marginTop: 0, flex: 1 }} value={this.state.chainPalette}
                                                onChange={e => this.setState({ chainPalette: e.target.value }, () => this.setLayerColor(layer.type, 'chain-id'))}>
                                                {Object.entries(ChainPalettes).map(([key, v]) => <option key={key} value={key}>{I18n.paletteName(key, v.label)}</option>)}
                                            </select>}
                                        {color === 'sequence-id' &&
                                            <select style={{ ...selectStyle, marginTop: 0, flex: 1 }} value={this.state.rainbowPalette}
                                                onChange={e => this.setState({ rainbowPalette: e.target.value }, () => this.setLayerColor(layer.type, 'sequence-id'))}>
                                                {Object.entries(RainbowPalettes).map(([key, v]) => <option key={key} value={key}>{I18n.paletteName(key, v.label)}</option>)}
                                            </select>}
                                    </div>
                                    {color === 'uniform' &&
                                        <div style={{ ...rowStyle, marginTop: 4 }}>
                                            <input type="color" value={'#' + this.state.uniformColor.toString(16).padStart(6, '0')}
                                                onChange={e => this.setLayerUniform(layer.type, parseInt(e.target.value.slice(1), 16))}
                                                style={{ ...colorInputStyle, width: 30, height: 24, borderRadius: 4 }} />
                                            {UniformSwatches.map(c =>
                                                <button key={c} title={'#' + c.toString(16).padStart(6, '0')}
                                                    style={{ ...swatchStyle(this.state.uniformColor === c), background: '#' + c.toString(16).padStart(6, '0') }}
                                                    onClick={() => this.setLayerUniform(layer.type, c)} />)}
                                        </div>}
                                    <div style={{ ...rowStyle, marginTop: 4, flexWrap: 'nowrap' }}>
                                        <small style={{ minWidth: 32 }}>{I18n.t('opacity')}</small>
                                        <input type="range" min={0.1} max={1} step={0.05} value={layer.alpha ?? 1}
                                            style={{ flex: 1 }}
                                            onChange={e => this.setLayerAlpha(layer.type, parseFloat(e.target.value))} />
                                        <span style={numStyle}>{(layer.alpha ?? 1).toFixed(2)}</span>
                                    </div>
                                </>}
                            </div>;
                        });
                    })()}
                </> : <small style={{ color: '#888' }}>{I18n.t('noChains')}</small>}
            </Section>

            {Actions.hasLigands(p) && <Section title={I18n.t('ligand')}>
                <div style={rowStyle}>
                    <small style={{ minWidth: 32 }}>{I18n.t('add')}</small>
                    <select style={{ ...selectStyle, marginTop: 0, flex: 1 }} value=''
                        onChange={e => { if (e.target.value) this.run(() => Actions.addLigandLayer(p, e.target.value as EasyRepresentationType)); }}>
                        <option value=''>{I18n.t('addRepr')}</option>
                        {Representations.map(v => <option key={v} value={v}>{I18n.reprName(v)}</option>)}
                    </select>
                </div>
                {(() => {
                    const layers = Actions.getLigandLayers(p);
                    if (layers.length === 0) return <div style={{ marginTop: 4 }}><small style={{ color: '#888' }}>{I18n.t('noRepr')}</small></div>;
                    return layers.map((layer, i) => this.renderLayer(
                        layer, i, 'ligand:' + layer.type,
                        v => this.run(() => Actions.setLigandLayerVisible(p, layer.type, v)),
                        () => this.run(() => Actions.removeLigandLayer(p, layer.type)),
                        a => this.setLigandAlphaDebounced(layer.type, a),
                        s => this.run(() => Actions.updateLigandLayerSize(p, layer.type, s)),
                    ));
                })()}
            </Section>}

            {Actions.hasFocusHighlight(p) && <Section title='Interaction'>
                <Segmented value={Actions.getHighlightMode()} disabled={disabled}
                    options={[['ball-and-stick', 'Ball & Stick'], ['line', 'Line']]}
                    onChange={v => this.run(async () => { await Actions.setHighlightMode(p, v as any); this.forceUpdate(); })} />
            </Section>}
            <Section title={I18n.t('display')}>
                <div style={gridStyle}>
                    <Button disabled={disabled} style={this.state.waterVisible ? selectedButtonStyle : undefined}
                        onClick={() => { const v = !this.state.waterVisible; this.setState({ waterVisible: v }); Actions.setWaterVisible(p, v); }}>
                        {I18n.t('water')}{this.state.waterVisible ? ' ✓' : ''}
                    </Button>
                    <select style={{ ...selectStyle, marginTop: 0 }} value={this.state.hMode}
                        onChange={e => { const mode = e.target.value as Actions.HydrogenMode; this.setState({ hMode: mode }); Actions.setHydrogens(p, mode); }}>
                        <option value="none">{I18n.t('noHydrogen')}</option>
                        <option value="polar">{I18n.t('polarHydrogen')}</option>
                        <option value="all">{I18n.t('allHydrogen')}</option>
                    </select>
                </div>
                <div style={grid3Style}>
                    <Button disabled={disabled} style={Actions.isOutlineOn(p) ? selectedButtonStyle : undefined}
                        onClick={() => Actions.setOutline(p, !Actions.isOutlineOn(p))}>{I18n.t('outline')}</Button>
                    <Button disabled={disabled} style={Actions.isShadowOn(p) ? selectedButtonStyle : undefined}
                        onClick={() => Actions.setShadow(p, !Actions.isShadowOn(p))}>{I18n.t('shadow')}</Button>
                    <Button disabled={disabled} style={Actions.isOcclusionOn(p) ? selectedButtonStyle : undefined}
                        onClick={() => Actions.setOcclusion(p, !Actions.isOcclusionOn(p))}>{I18n.t('occlusion')}</Button>
                </div>
            </Section>

            <Section title={I18n.t('label')}>
                <div style={{ ...rowStyle, marginTop: 0 }}>
                    <small style={{ minWidth: 48 }}>{I18n.t('labelSize')}</small>
                    <input type="range" min={0.3} max={1.5} step={0.05} value={this.state.labelScale}
                        style={{ flex: 1 }}
                        onChange={e => { const s = parseFloat(e.target.value); this.setState({ labelScale: s }); this.setLabelScaleDebounced(s); }} />
                    <span style={numStyle}>{this.state.labelScale.toFixed(2)}</span>
                </div>
                <div style={{ ...rowStyle, marginTop: 2 }}>
                    <small style={{ minWidth: 48 }}>{I18n.t('labelTextColor')}</small>
                    <input type="color" value={'#' + this.state.labelColor.toString(16).padStart(6, '0')}
                        onChange={e => { const c = parseInt(e.target.value.slice(1), 16); this.setState({ labelColor: c }); this.run(() => Actions.setLabelColor(p, c)); }}
                        style={colorInputStyle} />
                    <small style={{ minWidth: 48 }}>{I18n.t('labelBgColor')}</small>
                    <input type="color" value={'#' + this.state.labelBgColor.toString(16).padStart(6, '0')}
                        onChange={e => { const c = parseInt(e.target.value.slice(1), 16); this.setState({ labelBgColor: c }); this.run(() => Actions.setLabelBackgroundColor(p, c)); }}
                        style={colorInputStyle} />
                </div>
                <div style={{ ...rowStyle, marginTop: 2 }}>
                    <small style={{ minWidth: 48 }}>{I18n.t('labelBgOpacity')}</small>
                    <input type="range" min={0} max={1} step={0.05} value={this.state.labelBgOpacity}
                        style={{ flex: 1 }}
                        onChange={e => { const v = parseFloat(e.target.value); this.setState({ labelBgOpacity: v }); this.setLabelBgOpacityDebounced(v); }} />
                    <span style={numStyle}>{this.state.labelBgOpacity.toFixed(2)}</span>
                </div>
            </Section>

            {phPoints.length > 0 && <Section title={`${I18n.t('pharmacophore')} (${phPoints.length})`}>
                <div style={rowStyle}>
                    <Button disabled={disabled} style={this.state.pharmacophoreVisible ? selectedButtonStyle : undefined}
                        onClick={() => {
                            const v = !this.state.pharmacophoreVisible;
                            this.setState({ pharmacophoreVisible: v });
                            if (v) Actions.setPharmacophore(p, phPoints, this.state.pharmacophoreScale);
                            else Actions.clearPharmacophore(p);
                        }}>{I18n.t('show')}{this.state.pharmacophoreVisible ? ' ✓' : ''}</Button>
                    {phTypes.map(t =>
                        <span key={t} style={{ ...rowStyle, gap: 3 }}>
                            <span style={{ width: 12, height: 12, borderRadius: 3, background: '#' + (PharmacophoreHexColors[t] ?? 0x999999).toString(16).padStart(6, '0') }} />
                            <small>{t}</small>
                        </span>)}
                </div>
                <div style={{ ...rowStyle, marginTop: 2 }}>
                    <small>{I18n.t('radius')}</small>
                    <input type="range" min={0.3} max={2} step={0.1} value={this.state.pharmacophoreScale}
                        style={{ flex: 1 }}
                        onChange={e => {
                            const scale = parseFloat(e.target.value);
                            this.setState({ pharmacophoreScale: scale });
                            if (this.state.pharmacophoreVisible) this.refreshPharmacophore(scale);
                        }} />
                    <span style={numStyle}>{this.state.pharmacophoreScale.toFixed(1)}</span>
                </div>
            </Section>}

            {pockets.length > 0 && <Section title={`${I18n.t('pocket')} (${pockets.length})`}>
                {pockets.map((pocket, i) => {
                    const shown = !hidden.has(pocket.pocket_id);
                    return <label key={String(pocket.pocket_id)} style={{ ...rowStyle, gap: 6, marginTop: 2 }}>
                        <input type="checkbox" checked={shown}
                            onChange={e => Actions.setPocketVisible(p, pocket.pocket_id, e.target.checked)} />
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: PocketCssColors[i % PocketCssColors.length] }} />
                        <small>Pocket {pocket.pocket_id}{pocket.score !== undefined ? ` (${pocket.score.toFixed(2)})` : ''}</small>
                    </label>;
                })}
                <Button disabled={disabled} onClick={() => this.run(() => Actions.clearPockets(p))}>{I18n.t('clearPockets')}</Button>
            </Section>}

            <Section title={I18n.t('view')}>
                <div style={gridStyle}>
                    <Button onClick={() => Actions.resetCamera(p)}>{I18n.t('resetView')}</Button>
                    <Button style={p.canvas3d?.props.trackball.animate.name === 'spin' ? selectedButtonStyle : undefined}
                        onClick={() => Actions.setSpin(p, p.canvas3d?.props.trackball.animate.name !== 'spin')}>{I18n.t('spin')}</Button>
                </div>
                <Segmented value={this.state.renderQuality}
                    options={[['high', I18n.t('qualityHigh')], ['normal', I18n.t('qualityNormal')], ['preview', I18n.t('qualityPreview')]]}
                    onChange={v => { this.setState({ renderQuality: v as Actions.RenderQuality }); this.run(() => Actions.setRenderQuality(p, v as Actions.RenderQuality)); }} />
                <div style={{ ...rowStyle, flexWrap: 'nowrap' }}>
                    <small style={{ minWidth: 48 }}>{I18n.t('lighting')}</small>
                    <input type="range" min={0} max={3} step={0.05} value={this.state.lightIntensity}
                        style={{ flex: 1 }}
                        onChange={e => { const v = parseFloat(e.target.value); this.setState({ lightIntensity: v }); Actions.setLightIntensity(p, v); }} />
                    <span style={numStyle}>{this.state.lightIntensity.toFixed(2)}</span>
                </div>
                <div style={{ ...rowStyle, flexWrap: 'nowrap' }}>
                    <small style={{ minWidth: 48 }}>{I18n.t('bgColor')}</small>
                    <input type="color" value={'#' + this.state.bgColor.toString(16).padStart(6, '0')}
                        onChange={e => { const c = parseInt(e.target.value.slice(1), 16); Actions.setBackground(p, Color(c)); this.setState({ bgColor: c, labelColor: Actions.getLabelStyle().color }); }}
                        style={{ ...colorInputStyle, width: 28, height: 28, borderRadius: '50%' }} />
                    {Backgrounds.map(([label, color]) =>
                        <button key={label} title={I18n.bgName(label)} onClick={() => { Actions.setBackground(p, color); this.setState({ bgColor: color, labelColor: Actions.getLabelStyle().color }); }}
                            style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #d5d9e0', cursor: 'pointer', background: Color.toStyle(color), flexShrink: 0 }} />)}
                </div>
            </Section>
            </div>

            <div style={{ padding: '10px 12px', background: '#f6f7f9', borderTop: '1px solid #e8ebf0' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'nowrap' }}>
                    <div style={{ position: 'relative', flex: '0 1 auto', minWidth: 0 }}>
                        <button className='easy-lang-btn' onClick={() => this.setState({ langOpen: !this.state.langOpen })}>
                            <span className='easy-lang-label'>{I18n.Locales.find(([v]) => v === I18n.getLocale())?.[1]}</span>
                            <span>▾</span>
                        </button>
                        {this.state.langOpen && <div className='easy-lang-menu'>
                            {I18n.Locales.map(([v, l]) =>
                                <div key={v} className={'easy-lang-item' + (I18n.getLocale() === v ? ' easy-lang-item-active' : '')}
                                    onClick={() => { I18n.setLocale(v); this.setState({ langOpen: false }); this.forceUpdate(); }}>{l}</div>)}
                        </div>}
                    </div>
                    <Button style={{ flex: 1, whiteSpace: 'nowrap' }} onClick={() => Actions.toggleClassicMode(p)}>{I18n.t('classic')}</Button>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <Button style={{ flex: 1 }} onClick={() => Actions.exportState(p)}>{I18n.t('exportState')}</Button>
                    <Button style={{ flex: 1 }} onClick={() => this.stateFileInput.current?.click()}>{I18n.t('loadState')}</Button>
                    <input ref={this.stateFileInput} type='file' accept='.molj,.molx,.json,.zip' style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) Actions.loadStateFile(p, f); e.target.value = ''; }} />
                </div>
            </div>
        </div>;
    }
}
