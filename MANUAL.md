# QB-molstar 使用手册

<!-- ============================================================ -->
<!--  ⬇️⬇️⬇️  用户补充区：放在手册最前面  ⬇️⬇️⬇️                  -->
<!-- ============================================================ -->

> **【待补充】** 在这里写你补充的内容与示例。
>
> 建议：项目背景、快速上手截图、典型工作流、给同事的注意事项、和现有产品的对接方式……

<!-- ============================================================ -->
<!--  ⬆️⬆️⬆️  用户补充区结束  ⬆️⬆️⬆️                              -->
<!-- ============================================================ -->

---

## 目录

1. [简介](#1-简介)
2. [来源与致谢](#2-来源与致谢)
3. [构建与运行](#3-构建与运行)
4. [快速开始](#4-快速开始)
5. [界面说明](#5-界面说明)
6. [功能详解](#6-功能详解)
7. [API 手册](#7-api-手册)
8. [示例](#8-示例)
9. [常见问题](#9-常见问题)
10. [目录结构](#10-目录结构)
11. [许可](#11-许可)

---

## 1. 简介

QB-molstar 是基于 [Mol\*](https://github.com/molstar/molstar)（MolStar）二次开发的三维分子可视化组件，
在保留 Mol\* 全部能力的基础上，新增一层面向普通用户的易用界面 **`easy-viewer`**：

- 好看的中文默认配色（卡通 + 蓝色序列渐变；配体/水/离子按元素配色）
- 点选即改的侧边面板，按「风格 / Polymer样式 / 配体样式 / 显示 / 标签 / 药效团 / 口袋 / 视图」分区
- 增量表示层：每条链、每类配体可叠加多个 representation，各自改色/透明度/显隐
- 目标链高亮、画布点选自动切换
- 药效团 / 口袋 3D 叠加
- 残基标签（点击配体显示附近氨基酸）
- 多语言（简中 / 繁中 / English / 日本語 / 한국어 / Español）
- 渲染质量三档（高清 / 普通 / 预览）
- 导出图片 / GLB / 状态文件
- 一键切到 Mol\* 原生界面

---

## 2. 来源与致谢

- **原版项目**：**Mol\*** (MolStar)
  - 开发者：David Sehnal、Alexander Rose 及 Mol\* contributors
  - 官网：<https://molstar.org>
  - 源码：<https://github.com/molstar/molstar>
  - 许可：MIT
- **本版本修改**：**QuantaBricks** —— 新增 `easy-viewer` 易用层。

---

## 3. 构建与运行

```bash
npm install

# 开发（watch）
node ./scripts/build.mjs -a easy-viewer
# → http://localhost:1338/build/easy-viewer/index.html

# 生产构建
node ./scripts/build.mjs -a easy-viewer --prd
```

产物目录：

```
build/easy-viewer/
├── index.html
├── molstar.js      # 全局变量名 molstar
├── molstar.css
└── images/
```

代码检查：

```bash
npx eslint src/apps/easy-viewer
```

URL 参数：

| 参数 | 说明 |
| --- | --- |
| `?pdb=1hsg` | 按 PDB ID 加载 |
| `?url=<url>&format=mmcif` | 按 URL 加载（`binary=1` 表示二进制） |
| `?mvs-data=<...>&mvs-format=mvsj` | 加载 MolViewSpec |
| `?demo=multi-ligand` | 多配体演示（1HSG + 3 个独立配体） |

---

## 4. 快速开始

### 4.1 `<script>` 标签

```html
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="./molstar.css" />
  <style>
    html, body { margin: 0; width: 100%; height: 100%; }
    #app { position: absolute; inset: 0; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script src="./molstar.js"></script>
  <script>
    molstar.EasyViewer.create('app').then(async (viewer) => {
      await viewer.loadPdb('1hsg');
      await viewer.present('polymer-and-ligand', 'sequence-id');
    });
  </script>
</body>
</html>
```

### 4.2 模块化（打包器）

```ts
import { EasyViewer } from './src/apps/easy-viewer';

const viewer = await EasyViewer.create('app', {
  layoutShowLog: false,
  layoutShowSequence: false,
});

await viewer.loadInputs({
  structure: { data: cifText, format: 'mmcif', label: 'my-protein' },
  pharmacophore: [
    { center: [12.3, 4.5, 6.7], radius: 1.5, type: 'Donor' },
  ],
  pockets: [
    { pocket_id: 1, center: [10, 10, 10], score: 0.82, alpha_spheres: [[10, 10, 10]] },
  ],
});
```

---

## 5. 界面说明

### 5.1 左侧图标栏

| 图标 | 作用 |
| --- | --- |
| 相机 | **导出图片**（分辨率/格式/透明/坐标轴/裁剪 + 复制/下载 + GLB） |
| 齿轮 | **设置**（打开/关闭简易面板） |
| SEQ | **序列**（显示/隐藏顶部序列） |
| 光标 | **选择**（选择模式开关） |
| 刷新 | **重置视角** |
| (i) | **关于**（原版信息 + QuantaBricks 修改说明） |

> 面板打开时这排图标会隐藏；关闭面板用面板右上角 ×。

### 5.2 简易面板分区

| 分区 | 内容 |
| --- | --- |
| **风格** | 扁平插画 / 3D |
| **Polymer样式** | 目标链选择、添加表示、每个表示层（配色/调色板/单色/透明度/显隐/收起/删除） |
| **配体样式** | 添加配体表示（球棍/VDW/表面…），每个层可收起 |
| **显示** | 水、氢原子、描边 / 阴影 / 明暗 |
| **标签** | 标签大小、文字颜色、背景颜色、背景透明度 |
| **药效团** | 显示开关、类型图例、半径 |
| **口袋** | 逐个显隐、清除 |
| **视图** | 重置视角、自旋、渲染质量、背景颜色（自选 + 预设） |

### 5.3 底部

- **语言**：简体中文 / 繁體中文 / English / 日本語 / 한국어 / Español
- **Classic**：切到 Mol\* 原生 Structure 工具面板
- **导出状态 / 加载状态**：`.molj` / `.molx` 状态文件

---

## 6. 功能详解

### 6.1 增量表示层

每条链、每类配体都可以叠加多个 representation。例如一条链同时显示卡通 + 分子表面：

```ts
viewer.setChainPresentations([
  { chain: 'A', layers: [
      { type: 'cartoon', color: 'sequence-id' },
      { type: 'molecular-surface', color: 'hydrophobicity', alpha: 0.5 },
  ] },
]);
```

### 6.2 目标链

在「Polymer样式 → 目标」里选某条链，会高亮该链并把后续修改应用到它；
在画布上点选/选择某条链，目标会自动切换。点画布底部「取消选择」可退回全部链。

### 6.3 渲染质量

| 档位 | 表面多面体 | 分辨率 | 多重采样 |
| --- | --- | --- | --- |
| 高清 | high | 1× | 开 |
| 普通 | medium | 1× | 关 |
| 预览 | low | 0.75× | 关 |

> 交互拖动时会临时隐藏表面以保证流畅；**导出始终走独立高清通道**。

### 6.4 外部切换显示（不重新加载）

所有显隐都是**原地更新**，不会重建结构、不会重新加载：

```ts
viewer.setLigandsVisible(true);        viewer.areLigandsVisible();
viewer.setChainVisible('A', false);
viewer.setWaterVisible(false);
viewer.setPocketsVisible(false);       viewer.setPocketVisible(1, true);
viewer.setPharmacophoreVisible(false);
Actions.setLayerVisible(plugin, 'A', 'molecular-surface', false);
Actions.setLigandLayerVisible(plugin, 'ball-and-stick', false);
```

> 原理：状态树里的表示用 `updateCellState(ref, { isHidden })` / `toggleVisibility`；
> 药效团这类直接加到 `canvas3d` 的覆盖物用 `repr.setState({ visible })`。

---

## 7. API 手册

`EasyViewer` 继承自 Mol\* `Viewer`，`loadPdb`、`loadStructureFromData`、
`loadStructureFromUrl`、`loadAllModelsOrAssemblyFromUrl`、`loadFiles`、
`loadSnapshotFromUrl`、`loadMvsData` 等方法全部可用。

### 7.1 创建

```ts
EasyViewer.create(elementOrId: string | HTMLElement, options?: Partial<ViewerOptions>): Promise<EasyViewer>
```

### 7.2 样式 / 配色

| 方法 | 说明 |
| --- | --- |
| `setStyle(name)` | 预设样式：`auto` / `polymer-and-ligand` / `atomic-detail` / `molecular-surface` / `illustrative` / `coarse-surface` |
| `setBaseStyle('cartoon' \| '3d')` | 扁平插画 / 3D |
| `setColorTheme(name, opts?)` | 一键配色：`element-symbol` / `chain-id` / `sequence-id` / `secondary-structure` / `hydrophobicity` / `uniform` |
| `present(style, color?, opts?)` | 样式 + 配色一次完成 |
| `setIllustrative(on)` | 平光 + 描边 |

### 7.3 按链定制

| 方法 | 说明 |
| --- | --- |
| `setChainPresentations(presentations)` | 清空后按链设置（每链可多层） |
| `addChainPresentation(presentation)` | 追加一条链的表示 |
| `setChainVisible(chain, visible)` | 单链显隐（不重建） |

`ChainPresentation`：

```ts
{
  chain: 'A',
  layers?: [{ type, color?, colorOptions?, alpha?, visible? }],
  // 兼容简写：
  representation?, color?, colorOptions?, alpha?, visible?
}
```

### 7.4 配体 / 水 / 氢

| 方法 | 说明 |
| --- | --- |
| `showLigands()` / `hideLigands()` / `toggleLigands()` | 配体显隐（切换可见性，不重建） |
| `setLigandsVisible(visible)` / `areLigandsVisible()` | 显隐 / 查询 |
| `addLigandLayer(type)` / `getLigandLayers()` / `hasLigands()` | 配体增量层 |
| `setWaterVisible(visible)` | 水显隐 |
| `setHydrogens('none' \| 'polar' \| 'all')` | 氢原子模式 |

### 7.5 药效团 / 口袋

| 方法 | 说明 |
| --- | --- |
| `setPharmacophore(points, scale?)` | 设置药效团点 |
| `setPharmacophoreVisible(visible)` | 显隐（不重建） |
| `clearPharmacophore()` | 清除 |
| `setPockets(pockets)` | 设置口袋 |
| `setPocketVisible(id, visible)` / `setPocketsVisible(visible)` | 显隐 |
| `clearPockets()` | 清除 |

### 7.6 视图 / 导出

| 方法 | 说明 |
| --- | --- |
| `resetCamera()` | 重置视角 |
| `setSpin(on)` | 自旋 |
| `setBackground(color)` | 背景色 |
| `screenshot(resolution?)` | 导出图片：`viewport` / `hd` / `full-hd` / `ultra-hd` / `8k-ultra-hd` |

### 7.7 底层动作（`easy-actions`）

```ts
import * as Actions from './src/apps/easy-viewer/easy-actions';

Actions.setRenderQuality(plugin, 'high');   // 高清 / 普通 / 预览
Actions.setOutline(plugin, true);
Actions.setShadow(plugin, false);
Actions.setOcclusion(plugin, true);
Actions.highlightChain(plugin, 'A');
Actions.exportGlb(plugin);
Actions.exportState(plugin);
Actions.loadStateFile(plugin, file);
Actions.setLabelScale(plugin, 0.8);
Actions.setLabelColor(plugin, 0x1e3a8a);
Actions.setLabelBackgroundColor(plugin, 0xffffff);
```

### 7.8 类型

```ts
interface StructureInput { data: string | Uint8Array | number[]; format: string; label?: string; isBinary?: boolean; }

interface EasyViewerInputs {
  structure?: StructureInput;          // 单个结构（可含多个配体）
  structures?: StructureInput[];       // 多个结构（多配体文件 / 多 pose）
  pharmacophore?: PharmacophorePoint[];
  pockets?: Pocket[];
}

interface PharmacophorePoint { center: [number, number, number]; radius: number; type: PharmacophoreFeatureType; }
interface Pocket { pocket_id: number | string; center: [number, number, number]; alpha_spheres?: [number, number, number][]; score?: number; /* ... */ }
```

---

## 8. 示例

### 8.1 多配体输入

```ts
await viewer.loadPdb('1hsg');
await viewer.loadInputs({
  structures: [
    { data: ligandPdb1, format: 'pdb', label: 'Ligand-1' },
    { data: ligandPdb2, format: 'pdb', label: 'Ligand-2' },
    { data: ligandPdb3, format: 'pdb', label: 'Ligand-3' },
  ],
});
```

- 运行示例：`http://localhost:1338/build/easy-viewer/index.html?demo=multi-ligand`
- 独立文件：[`examples/multi-ligands.html`](./examples/multi-ligands.html)

> 一个结构里的多个配体天然支持（「配体样式」统一管理）；
> 多个独立配体文件 / 多 pose 用 `structures: [...]`。

### 8.2 按链不同样式

```ts
viewer.setChainPresentations([
  { chain: 'A', layers: [{ type: 'cartoon', color: 'sequence-id' }] },
  { chain: 'B', layers: [
      { type: 'cartoon', color: 'chain-id' },
      { type: 'molecular-surface', color: 'hydrophobicity', alpha: 0.5 },
  ] },
]);
```

### 8.3 药效团 + 口袋

```ts
await viewer.setPharmacophore([
  { center: [12.3, 4.5, 6.7], radius: 1.5, type: 'Donor' },
  { center: [13.0, 5.1, 6.2], radius: 1.5, type: 'Acceptor' },
]);
await viewer.setPockets([
  { pocket_id: 1, center: [10, 10, 10], score: 0.82, alpha_spheres: [[10, 10, 10]] },
]);
```

### 8.4 导出

```ts
await viewer.screenshot('ultra-hd');    // 图片
Actions.exportGlb(viewer.plugin);       // GLB 几何
Actions.exportState(viewer.plugin);     // 状态文件
```

---

## 9. 常见问题

**Q：能外部切换显示而不重新加载吗？**
可以。所有显隐都用 `updateCellState` / `toggleVisibility` / `repr.setState({ visible })`，不重建几何。见 §6.4。

**Q：支持多个配体吗？**
支持。① 一个结构里的多个配体天然支持；② 多个独立配体文件/多 pose 用 `loadInputs({ structures: [...] })`。

**Q：导出图片为什么很清晰，但交互时不卡？**
交互时表面隐藏、多重采样关闭；导出走独立高清通道（multiSample 开、遮蔽高采样、表面临时 high）。

**Q：怎么切回 Mol\* 原生界面？**
面板底部「Classic」按钮；右上角「简易界面」按钮切回。

---

## 10. 目录结构

```
src/apps/easy-viewer/
├── app.ts                 # EasyViewer（继承 Viewer）
├── easy-actions.ts        # 动作层
├── easy-controls.tsx      # 简易面板 + 视口控件
├── easy-default-preset.ts # 默认表示预设
├── i18n.ts                # 多语言
├── residue-labels.ts      # 残基/配体邻域标签
├── overlay-pharmacophore.ts
├── overlay-pocket.ts
├── palettes.ts            # 配色方案
├── types.ts
├── index.ts
└── index.html
```

---

## 11. 许可

MIT，继承自 [Mol\*](https://github.com/molstar/molstar)。
