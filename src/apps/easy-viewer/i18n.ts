/**
 * Copyright (c) 2026 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author QB-molstar contributors
 *
 * 极简多语言层：中文 / English / 日本語。
 * 语言存在模块级 store 里，面板和视口控件都能读到并响应切换。
 */

import { EasyColorTheme, EasyRepresentationType } from './types';

export type Locale = 'zh' | 'zhHant' | 'en' | 'ja' | 'ko' | 'es';

export const Locales: [Locale, string][] = [
    ['zh', '简体中文'],
    ['zhHant', '繁體中文'],
    ['en', 'English'],
    ['ja', '日本語'],
    ['ko', '한국어'],
    ['es', 'Español'],
];

interface Dict {
    language: string;
    classic: string;
    simple: string;
    classicTitle: string;
    close: string;
    openPanel: string;
    print: string;
    setting: string;
    sequence: string;
    selection: string;
    reset: string;
    cancelSelection: string;

    style: string;
    flat: string;
    threeD: string;
    reflective: string;

    polymer: string;
    ligand: string;
    display: string;
    pharmacophore: string;
    pocket: string;
    view: string;

    target: string;
    allChains: string;
    add: string;
    addRepr: string;
    chainsDiffer: string;
    noRepr: string;
    visible: string;
    remove: string;
    color: string;
    opacity: string;
    noChains: string;

    water: string;
    symmetry: string;
    residues: string;
    noHydrogen: string;
    polarHydrogen: string;
    allHydrogen: string;
    outline: string;
    shadow: string;
    occlusion: string;

    show: string;
    radius: string;
    clearPockets: string;
    label: string;
    labelSize: string;
    labelTextColor: string;
    labelBgColor: string;
    labelBgOpacity: string;

    resetView: string;
    spin: string;
    exportImage: string;
    qualityHigh: string;
    qualityNormal: string;
    qualityPreview: string;
    resolution: string;
    resViewport: string;
    format: string;
    transparent: string;
    axes: string;
    bgColor: string;
    lighting: string;
    about: string;
    aboutOriginal: string;
    aboutModified: string;
    copy: string;
    download: string;
    exportGlb: string;
    exportState: string;
    loadState: string;
    openFile: string;
    newFile: string;
    addFile: string;
    files: string;
    autoCrop: string;
    crop: string;
    resetCrop: string;

    repr: { [K in EasyRepresentationType]: string };
    theme: { [K in EasyColorTheme]: string };
    bg: { [key: string]: string };
    palette: { [key: string]: string };
}

const zh: Dict = {
    language: '语言',
    classic: '传统',
    simple: '简易',
    classicTitle: '切换传统 Mol* 界面 / 简易界面',
    close: '关闭面板',
    openPanel: '打开面板',
    print: '打印',
    setting: '设置',
    sequence: '序列',
    selection: '选择',
    reset: '重置',
    cancelSelection: '取消选择',
    style: '风格',
    flat: '扁平插画',
    threeD: '哑光3D',
    reflective: '高反光',
    polymer: 'Polymer样式',
    ligand: '配体样式',
    display: '显示',
    pharmacophore: '药效团',
    pocket: '口袋',
    view: '视图',
    target: '目标',
    allChains: '全部链',
    add: '添加',
    addRepr: '+ 添加表示',
    chainsDiffer: '各链表示不同（-）',
    noRepr: '（无表示）',
    visible: '可见',
    remove: '删除',
    color: '配色',
    opacity: '透明',
    noChains: '未检测到链',
    water: '水',
    symmetry: '对称',
    residues: '残基',
    noHydrogen: '无氢',
    polarHydrogen: '极性氢',
    allHydrogen: '全部氢',
    outline: '描边',
    shadow: '阴影',
    occlusion: '明暗',
    show: '显示',
    radius: '半径',
    clearPockets: '清除口袋',
    label: '标签',
    labelSize: '标签大小',
    labelTextColor: '文字颜色',
    labelBgColor: '背景颜色',
    labelBgOpacity: '背景透明度',
    resetView: '重置视角',
    spin: '自旋',
    exportImage: '导出图片',
    qualityHigh: '高清',
    qualityNormal: '普通',
    qualityPreview: '预览',
    resolution: '分辨率',
    resViewport: '视口',
    format: '格式',
    transparent: '透明背景',
    axes: '坐标轴',
    bgColor: '背景颜色',
    lighting: '光照',
    about: '关于',
    aboutOriginal: '原版开发',
    aboutModified: '本版本修改',
    copy: '复制',
    download: '下载',
    exportGlb: '导出 GLB',
    exportState: '导出状态',
    loadState: '加载状态',
    openFile: '打开文件',
    newFile: '新建',
    addFile: '添加',
    files: 'Files',
    autoCrop: '自动裁剪',
    crop: '裁剪',
    resetCrop: '重置裁剪',
    repr: {
        cartoon: 'Ribbon',
        backbone: 'Tube',
        'ball-and-stick': '球棍',
        spacefill: '填充',
        'molecular-surface': '分子表面',
        'gaussian-surface': '高斯表面',
        line: '线',
        point: '点',
    },
    theme: {
        'element-symbol': '元素',
        'chain-id': '链',
        'sequence-id': '序列',
        'secondary-structure': '二级结构',
        hydrophobicity: '疏水',
        'residue-charge': '残基电荷',
        'molecule-type': '分子类型',
        'residue-name': '残基',
        uniform: '单色',
    },
    bg: { white: '白', gray: '灰', dark: '深', black: '黑', blue: '蓝' },
    palette: {
        default: '标准', pastel: '柔和', warm: '暖色', cool: '冷色',
        rainbow: '彩虹 (蓝→红)', blue: '蓝色渐变', sunset: '日落', ocean: '海洋', forest: '森林',
    },
};

const en: Dict = {
    language: 'Language',
    classic: 'Classic',
    simple: 'Simple',
    classicTitle: 'Switch classic Mol* / simple UI',
    close: 'Close panel',
    openPanel: 'Open panel',
    print: 'Print',
    setting: 'Setting',
    sequence: 'Sequence',
    selection: 'Selection',
    reset: 'Reset',
    cancelSelection: 'Cancel selection',
    style: 'Style',
    flat: 'Flat',
    threeD: 'Matte 3D',
    reflective: 'Reflective',
    polymer: 'Polymer Style',
    ligand: 'Ligand Style',
    display: 'Display',
    pharmacophore: 'Pharmacophore',
    pocket: 'Pocket',
    view: 'View',
    target: 'Target',
    allChains: 'All chains',
    add: 'Add',
    addRepr: '+ Add representation',
    chainsDiffer: 'Chains differ (-)',
    noRepr: '(no representation)',
    visible: 'Visible',
    remove: 'Remove',
    color: 'Color',
    opacity: 'Opacity',
    noChains: 'No chains detected',
    water: 'Water',
    symmetry: 'Symmetry',
    residues: 'Residues',
    noHydrogen: 'No H',
    polarHydrogen: 'Polar H',
    allHydrogen: 'All H',
    outline: 'Outline',
    shadow: 'Shadow',
    occlusion: 'Occlusion',
    show: 'Show',
    radius: 'Radius',
    clearPockets: 'Clear pockets',
    label: 'Label',
    labelSize: 'Label size',
    labelTextColor: 'Text color',
    labelBgColor: 'Background',
    labelBgOpacity: 'Bg opacity',
    resetView: 'Reset view',
    spin: 'Spin',
    exportImage: 'Export image',
    qualityHigh: 'High',
    qualityNormal: 'Normal',
    qualityPreview: 'Preview',
    resolution: 'Resolution',
    resViewport: 'Viewport',
    format: 'Format',
    transparent: 'Transparent',
    axes: 'Axes',
    bgColor: 'Background',
    lighting: 'Lighting',
    about: 'About',
    aboutOriginal: 'Original project',
    aboutModified: 'Modifications',
    copy: 'Copy',
    download: 'Download',
    exportGlb: 'Export GLB',
    exportState: 'Export state',
    loadState: 'Load state',
    openFile: 'Open file',
    newFile: 'New',
    addFile: 'Add',
    files: 'Files',
    autoCrop: 'Auto-crop',
    crop: 'Crop',
    resetCrop: 'Reset crop',
    repr: {
        cartoon: 'Ribbon',
        backbone: 'Tube',
        'ball-and-stick': 'Ball & Stick',
        spacefill: 'Spacefill',
        'molecular-surface': 'Molecular Surface',
        'gaussian-surface': 'Gaussian Surface',
        line: 'Line',
        point: 'Point',
    },
    theme: {
        'element-symbol': 'Element',
        'chain-id': 'Chain',
        'sequence-id': 'Sequence',
        'secondary-structure': 'Secondary Structure',
        hydrophobicity: 'Hydrophobic',
        'residue-charge': 'Residue charge',
        'molecule-type': 'Molecule Type',
        'residue-name': 'Residue',
        uniform: 'Uniform',
    },
    bg: { white: 'White', gray: 'Gray', dark: 'Dark', black: 'Black', blue: 'Blue' },
    palette: {
        default: 'Standard', pastel: 'Pastel', warm: 'Warm', cool: 'Cool',
        rainbow: 'Rainbow (blue→red)', blue: 'Blue gradient', sunset: 'Sunset', ocean: 'Ocean', forest: 'Forest',
    },
};

const ja: Dict = {
    language: '言語',
    classic: 'クラシック',
    simple: 'シンプル',
    classicTitle: 'クラシック Mol* / シンプル UI を切替',
    close: 'パネルを閉じる',
    openPanel: 'パネルを開く',
    print: '印刷',
    setting: '設定',
    sequence: '配列',
    selection: '選択',
    reset: 'リセット',
    cancelSelection: '選択解除',
    style: 'スタイル',
    flat: 'フラット',
    threeD: 'マット3D',
    reflective: '高反射',
    polymer: 'ポリマースタイル',
    ligand: 'リガンドスタイル',
    display: '表示',
    pharmacophore: 'ファーマコフォア',
    pocket: 'ポケット',
    view: 'ビュー',
    target: '対象',
    allChains: '全チェーン',
    add: '追加',
    addRepr: '+ 表現を追加',
    chainsDiffer: 'チェーンごとに異なる（-）',
    noRepr: '（表現なし）',
    visible: '表示',
    remove: '削除',
    color: '配色',
    opacity: '透明度',
    noChains: 'チェーンがありません',
    water: '水',
    symmetry: '対称',
    residues: '残基',
    noHydrogen: '水素なし',
    polarHydrogen: '極性水素',
    allHydrogen: '全水素',
    outline: '輪郭',
    shadow: '影',
    occlusion: '陰影',
    show: '表示',
    radius: '半径',
    clearPockets: 'ポケットを消去',
    label: 'ラベル',
    labelSize: 'ラベルサイズ',
    labelTextColor: '文字色',
    labelBgColor: '背景色',
    labelBgOpacity: '背景の不透明度',
    resetView: '視点リセット',
    spin: '回転',
    exportImage: '画像を書き出す',
    qualityHigh: '高',
    qualityNormal: '標準',
    qualityPreview: 'プレビュー',
    resolution: '解像度',
    resViewport: 'ビューポート',
    format: '形式',
    transparent: '透過背景',
    axes: '軸',
    bgColor: '背景色',
    lighting: '照明',
    about: '情報',
    aboutOriginal: 'オリジナル',
    aboutModified: '改変',
    copy: 'コピー',
    download: 'ダウンロード',
    exportGlb: 'GLB を書き出す',
    exportState: '状態を書き出す',
    loadState: '状態を読み込む',
    openFile: 'ファイルを開く',
    newFile: '新規',
    addFile: '追加',
    files: 'Files',
    autoCrop: '自動クロップ',
    crop: 'クロップ',
    resetCrop: 'クロップ解除',
    repr: {
        cartoon: 'Ribbon',
        backbone: 'Tube',
        'ball-and-stick': 'ボール＆スティック',
        spacefill: '空間充填',
        'molecular-surface': '分子表面',
        'gaussian-surface': 'ガウス表面',
        line: 'ライン',
        point: 'ポイント',
    },
    theme: {
        'element-symbol': '元素',
        'chain-id': 'チェーン',
        'sequence-id': '配列',
        'secondary-structure': '二次構造',
        hydrophobicity: '疎水性',
        'residue-charge': '残基電荷',
        'molecule-type': '分子種',
        'residue-name': '残基',
        uniform: '単色',
    },
    bg: { white: '白', gray: '灰', dark: '濃', black: '黒', blue: '青' },
    palette: {
        default: '標準', pastel: 'パステル', warm: '暖色', cool: '寒色',
        rainbow: 'レインボー (青→赤)', blue: '青グラデーション', sunset: '夕焼け', ocean: '海', forest: '森',
    },
};

const zhHant: Dict = {
    language: '語言',
    classic: '傳統',
    simple: '簡易',
    classicTitle: '切換傳統 Mol* 介面 / 簡易介面',
    close: '關閉面板',
    openPanel: '開啟面板',
    print: '列印',
    setting: '設定',
    sequence: '序列',
    selection: '選擇',
    reset: '重置',
    cancelSelection: '取消選擇',
    style: '風格',
    flat: '扁平插畫',
    threeD: '啞光3D',
    reflective: '高反光',
    polymer: 'Polymer樣式',
    ligand: '配體樣式',
    display: '顯示',
    pharmacophore: '藥效團',
    pocket: '口袋',
    view: '視圖',
    target: '目標',
    allChains: '全部鏈',
    add: '新增',
    addRepr: '+ 新增表示',
    chainsDiffer: '各鏈表示不同（-）',
    noRepr: '（無表示）',
    visible: '可見',
    remove: '刪除',
    color: '配色',
    opacity: '透明',
    noChains: '未偵測到鏈',
    water: '水',
    symmetry: '對稱',
    residues: '殘基',
    noHydrogen: '無氫',
    polarHydrogen: '極性氫',
    allHydrogen: '全部氫',
    outline: '描邊',
    shadow: '陰影',
    occlusion: '明暗',
    show: '顯示',
    radius: '半徑',
    clearPockets: '清除口袋',
    label: '標籤',
    labelSize: '標籤大小',
    labelTextColor: '文字顏色',
    labelBgColor: '背景顏色',
    labelBgOpacity: '背景透明度',
    resetView: '重置視角',
    spin: '自旋',
    exportImage: '匯出圖片',
    qualityHigh: '高畫質',
    qualityNormal: '普通',
    qualityPreview: '預覽',
    resolution: '解析度',
    resViewport: '視埠',
    format: '格式',
    transparent: '透明背景',
    axes: '座標軸',
    bgColor: '背景顏色',
    lighting: '光照',
    about: '關於',
    aboutOriginal: '原版專案',
    aboutModified: '本版本修改',
    copy: '複製',
    download: '下載',
    exportGlb: '匯出 GLB',
    exportState: '匯出狀態',
    loadState: '載入狀態',
    openFile: '開啟檔案',
    newFile: '新建',
    addFile: '新增',
    files: 'Files',
    autoCrop: '自動裁剪',
    crop: '裁剪',
    resetCrop: '重置裁剪',
    repr: {
        cartoon: 'Ribbon',
        backbone: 'Tube',
        'ball-and-stick': '球棍',
        spacefill: '填充',
        'molecular-surface': '分子表面',
        'gaussian-surface': '高斯表面',
        line: '線',
        point: '點',
    },
    theme: {
        'element-symbol': '元素',
        'chain-id': '鏈',
        'sequence-id': '序列',
        'secondary-structure': '二級結構',
        hydrophobicity: '疏水',
        'residue-charge': '残基电荷',
        'molecule-type': '分子類型',
        'residue-name': '殘基',
        uniform: '單色',
    },
    bg: { white: '白', gray: '灰', dark: '深', black: '黑', blue: '藍' },
    palette: {
        default: '標準', pastel: '柔和', warm: '暖色', cool: '冷色',
        rainbow: '彩虹 (藍→紅)', blue: '藍色漸層', sunset: '日落', ocean: '海洋', forest: '森林',
    },
};

const ko: Dict = {
    language: '언어',
    classic: '클래식',
    simple: '심플',
    classicTitle: '클래식 Mol* / 심플 UI 전환',
    close: '패널 닫기',
    openPanel: '패널 열기',
    print: '인쇄',
    setting: '설정',
    sequence: '서열',
    selection: '선택',
    reset: '초기화',
    cancelSelection: '선택 취소',
    style: '스타일',
    flat: '플랫',
    threeD: '매트 3D',
    reflective: '고반사',
    polymer: '폴리머 스타일',
    ligand: '리간드 스타일',
    display: '표시',
    pharmacophore: '파마코포어',
    pocket: '포켓',
    view: '보기',
    target: '대상',
    allChains: '모든 체인',
    add: '추가',
    addRepr: '+ 표현 추가',
    chainsDiffer: '체인마다 다름 (-)',
    noRepr: '(표현 없음)',
    visible: '표시',
    remove: '삭제',
    color: '색상',
    opacity: '투명도',
    noChains: '체인 없음',
    water: '물',
    symmetry: '대칭',
    residues: '잔기',
    noHydrogen: '수소 없음',
    polarHydrogen: '극성 수소',
    allHydrogen: '모든 수소',
    outline: '윤곽선',
    shadow: '그림자',
    occlusion: '음영',
    show: '표시',
    radius: '반지름',
    clearPockets: '포켓 지우기',
    label: '라벨',
    labelSize: '라벨 크기',
    labelTextColor: '글자색',
    labelBgColor: '배경색',
    labelBgOpacity: '배경 투명도',
    resetView: '시점 초기화',
    spin: '회전',
    exportImage: '이미지 내보내기',
    qualityHigh: '고화질',
    qualityNormal: '보통',
    qualityPreview: '미리보기',
    resolution: '해상도',
    resViewport: '뷰포트',
    format: '형식',
    transparent: '투명 배경',
    axes: '축',
    bgColor: '배경색',
    lighting: '조명',
    about: '정보',
    aboutOriginal: '원본 프로젝트',
    aboutModified: '수정 사항',
    copy: '복사',
    download: '다운로드',
    exportGlb: 'GLB 내보내기',
    exportState: '상태 내보내기',
    loadState: '상태 불러오기',
    openFile: '파일 열기',
    newFile: '새로 만들기',
    addFile: '추가',
    files: 'Files',
    autoCrop: '자동 자르기',
    crop: '자르기',
    resetCrop: '자르기 초기화',
    repr: {
        cartoon: 'Ribbon',
        backbone: 'Tube',
        'ball-and-stick': '볼 앤 스틱',
        spacefill: '공간 채움',
        'molecular-surface': '분자 표면',
        'gaussian-surface': '가우시안 표면',
        line: '선',
        point: '점',
    },
    theme: {
        'element-symbol': '원소',
        'chain-id': '체인',
        'sequence-id': '서열',
        'secondary-structure': '2차 구조',
        hydrophobicity: '소수성',
        'residue-charge': '잔기 전하',
        'molecule-type': '분자 유형',
        'residue-name': '잔기',
        uniform: '단색',
    },
    bg: { white: '흰색', gray: '회색', dark: '어두움', black: '검정', blue: '파랑' },
    palette: {
        default: '표준', pastel: '파스텔', warm: '난색', cool: '한색',
        rainbow: '무지개 (파랑→빨강)', blue: '파랑 그라데이션', sunset: '노을', ocean: '바다', forest: '숲',
    },
};

const es: Dict = {
    language: 'Idioma',
    classic: 'Clásica',
    simple: 'Simple',
    classicTitle: 'Cambiar interfaz clásica / simple',
    close: 'Cerrar panel',
    openPanel: 'Abrir panel',
    print: 'Imprimir',
    setting: 'Ajustes',
    sequence: 'Secuencia',
    selection: 'Selección',
    reset: 'Restablecer',
    cancelSelection: 'Cancelar selección',
    style: 'Estilo',
    flat: 'Plano',
    threeD: '3D mate',
    reflective: 'Reflectante',
    polymer: 'Estilo polímero',
    ligand: 'Estilo ligando',
    display: 'Visualización',
    pharmacophore: 'Farmacóforo',
    pocket: 'Bolsa',
    view: 'Vista',
    target: 'Objetivo',
    allChains: 'Todas las cadenas',
    add: 'Añadir',
    addRepr: '+ Añadir representación',
    chainsDiffer: 'Cadenas diferentes (-)',
    noRepr: '(sin representación)',
    visible: 'Visible',
    remove: 'Eliminar',
    color: 'Color',
    opacity: 'Opacidad',
    noChains: 'No se detectaron cadenas',
    water: 'Agua',
    symmetry: 'Simetría',
    residues: 'Residuos',
    noHydrogen: 'Sin H',
    polarHydrogen: 'H polares',
    allHydrogen: 'Todo H',
    outline: 'Contorno',
    shadow: 'Sombra',
    occlusion: 'Oclusión',
    show: 'Mostrar',
    radius: 'Radio',
    clearPockets: 'Borrar bolsas',
    label: 'Etiqueta',
    labelSize: 'Tamaño',
    labelTextColor: 'Color texto',
    labelBgColor: 'Fondo',
    labelBgOpacity: 'Opacidad fondo',
    resetView: 'Restablecer vista',
    spin: 'Girar',
    exportImage: 'Exportar imagen',
    qualityHigh: 'Alta',
    qualityNormal: 'Normal',
    qualityPreview: 'Vista previa',
    resolution: 'Resolución',
    resViewport: 'Ventana',
    format: 'Formato',
    transparent: 'Fondo transparente',
    axes: 'Ejes',
    bgColor: 'Fondo',
    lighting: 'Iluminación',
    about: 'Acerca de',
    aboutOriginal: 'Proyecto original',
    aboutModified: 'Modificaciones',
    copy: 'Copiar',
    download: 'Descargar',
    exportGlb: 'Exportar GLB',
    exportState: 'Exportar estado',
    loadState: 'Cargar estado',
    openFile: 'Abrir archivo',
    newFile: 'Nuevo',
    addFile: 'Añadir',
    files: 'Files',
    autoCrop: 'Recorte automático',
    crop: 'Recortar',
    resetCrop: 'Restablecer recorte',
    repr: {
        cartoon: 'Cinta',
        backbone: 'Tube',
        'ball-and-stick': 'Bolas y varillas',
        spacefill: 'Esferas',
        'molecular-surface': 'Superficie molecular',
        'gaussian-surface': 'Superficie gaussiana',
        line: 'Línea',
        point: 'Punto',
    },
    theme: {
        'element-symbol': 'Elemento',
        'chain-id': 'Cadena',
        'sequence-id': 'Secuencia',
        'secondary-structure': 'Estructura secundaria',
        hydrophobicity: 'Hidrofobicidad',
        'residue-charge': 'Carga del residuo',
        'molecule-type': 'Tipo de molécula',
        'residue-name': 'Residuo',
        uniform: 'Uniforme',
    },
    bg: { white: 'Blanco', gray: 'Gris', dark: 'Oscuro', black: 'Negro', blue: 'Azul' },
    palette: {
        default: 'Estándar', pastel: 'Pastel', warm: 'Cálido', cool: 'Frío',
        rainbow: 'Arcoíris (azul→rojo)', blue: 'Degradado azul', sunset: 'Atardecer', ocean: 'Océano', forest: 'Bosque',
    },
};

const Dicts: { [K in Locale]: Dict } = { zh, zhHant, en, ja, ko, es };

const STORAGE_KEY = 'easy-viewer-locale';

function initialLocale(): Locale {
    try {
        const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
        if (saved && Dicts[saved]) return saved;
    } catch { /* ignore */ }
    return 'zh';
}

let currentLocale: Locale = initialLocale();
const listeners = new Set<() => void>();

export function getLocale(): Locale {
    return currentLocale;
}

export function setLocale(locale: Locale) {
    if (!Dicts[locale] || locale === currentLocale) return;
    currentLocale = locale;
    try { localStorage.setItem(STORAGE_KEY, locale); } catch { /* ignore */ }
    for (const fn of listeners) fn();
}

export function subscribeLocale(fn: () => void) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}

/** 取当前语言下的词条 */
export function t(key: keyof Dict): string {
    return Dicts[currentLocale][key] as string;
}

/** 取当前语言下某表示的显示名 */
export function reprName(type: EasyRepresentationType): string {
    return Dicts[currentLocale].repr[type] ?? type;
}

/** 取当前语言下某配色主题的显示名 */
export function themeName(theme: EasyColorTheme): string {
    return Dicts[currentLocale].theme[theme] ?? theme;
}

/** 取当前语言下调色板的显示名，找不到时回退到默认 label */
export function paletteName(key: string, fallback: string): string {
    return Dicts[currentLocale].palette[key] ?? fallback;
}

/** 取当前语言下背景色的显示名 */
export function bgName(key: string): string {
    return Dicts[currentLocale].bg[key] ?? key;
}
