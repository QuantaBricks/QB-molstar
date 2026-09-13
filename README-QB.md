# QB-molstar · QuantaBricks Easy Viewer

基于 [Mol\*](https://github.com/molstar/molstar)（MolStar）二次开发的三维分子可视化组件。
在保留 Mol\* 全部能力的基础上，新增一层**面向普通用户的易用界面（`easy-viewer`）**：
内置好看的中文默认配色、点选即改的侧边面板、多语言、药效团/口袋叠加、残基标签、高清导出等。

> 本仓库 fork 自 Mol\*，核心代码未改动，所有新增内容都在 `src/apps/easy-viewer/`。

---

## 来源与致谢

- **原版项目**：**Mol\*** (MolStar)
  - 开发者：David Sehnal、Alexander Rose 及 Mol\* contributors
  - 官网：<https://molstar.org>
  - 源码：<https://github.com/molstar/molstar>
  - 许可：MIT
- **本版本修改**：**QuantaBricks** —— 新增 `easy-viewer` 易用层（本地化 UI、样式/配色控制、表示层叠加、标签、导出等）。

---

## 本版本新增内容（`easy-viewer`）

| 模块 | 说明 |
| --- | --- |
| 默认样式 | 卡通 + 蓝色序列渐变；配体/水/离子按元素配色 |
| 简易面板 | 「风格 / Polymer样式 / 配体样式 / 显示 / 标签 / 药效团 / 口袋 / 视图」分区，点选即改 |
| 增量表示层 | 每条链、每个配体可叠加多个 representation（Ribbon、球棍、表面…），可单独改色/透明度/显隐 |
| 目标链 | 选链高亮，画布点选自动切换目标 |
| 药效团 / 口袋 | 输入数据即可 3D 叠加显示 |
| 残基标签 | 点击配体显示附近氨基酸标签；标签大小/文字色/背景色可调 |
| 多语言 | 简体中文 / 繁體中文 / English / 日本語 / 한국어 / Español |
| 渲染质量 | 高清 / 普通 / 预览（影响表面多面体数、分辨率、多重采样） |
| 导出 | 图片（PNG/JPEG/WebP，可选分辨率/裁剪）、GLB 几何、状态文件（.molj/.molx） |
| 传统界面 | 一键切到 Mol\* 原生 Structure 工具面板 |

---

## 构建

```bash
npm install

# 开发（watch，默认 http://localhost:1338/build/easy-viewer/index.html）
node ./scripts/build.mjs -a easy-viewer

# 生产构建
node ./scripts/build.mjs -a easy-viewer --prd
```

产物位于 `build/easy-viewer/`：

```
build/easy-viewer/
├── index.html
├── molstar.js      # 全局名 molstar
├── molstar.css
└── images/
```

---

## 快速接入（`<script>` 标签）

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
      await viewer.loadPdb('1hsg');       // 或 loadStructureFromData / loadStructureFromUrl
      await viewer.present('polymer-and-ligand', 'sequence-id');
    });
  </script>
</body>
</html>
```

---

## 模块化接入（打包器）

```ts
import { EasyViewer } from './src/apps/easy-viewer';

const viewer = await EasyViewer.create('app', {
  // 透传 Mol* Viewer 选项
  layoutShowLog: false,
  layoutShowSequence: false,
});

await viewer.loadInputs({
  structure: { data: cifText, format: 'mmcif', label: 'my-protein' },
  pharmacophore: [
    { center: [12.3, 4.5, 6.7], radius: 1.5, type: 'Donor' },
    { center: [13.0, 5.1, 6.2], radius: 1.5, type: 'Acceptor' },
  ],
  pockets: [
    { pocket_id: 1, center: [10, 10, 10], score: 0.82, alpha_spheres: [[10, 10, 10]] },
  ],
});
```

---

## 多配体输入

- **一个结构里的多个配体**：天然支持。配体的所有 representation 由「配体样式」区统一管理，
  可逐个叠加（球棍 / VDW / 表面…），每个配体层可单独改色、透明度、显隐。
- **多个独立的配体文件 / 多个对接 pose**：支持一次传入多个结构，会依次加载为独立结构：

```ts
await viewer.loadInputs({
  structures: [
    { data: sdf1, format: 'sdf', label: 'pose-1' },
    { data: sdf2, format: 'sdf', label: 'pose-2' },
    { data: pdbLigand, format: 'pdb', label: 'ligand-A' },
  ],
});
```

也可以多次调用底层加载方法：

```ts
await viewer.loadStructureFromData(pose1, 'sdf', { dataLabel: 'pose-1' });
await viewer.loadStructureFromData(pose2, 'sdf', { dataLabel: 'pose-2' });
```

> 说明：`structure` 与 `structures` 可同时使用；`structures` 先加载，`structure` 后加载。

---

## API 摘要

`EasyViewer` 继承自 Mol\* `Viewer`，因此 `loadPdb`、`loadStructureFromData`、
`loadStructureFromUrl`、`loadAllModelsOrAssemblyFromUrl`、`loadFiles`、
`loadSnapshotFromUrl`、`loadMvsData` 等方法全部可用。

### 样式 / 配色

```ts
viewer.setStyle('polymer-and-ligand');     // 预设样式
viewer.setBaseStyle('cartoon' | '3d');     // 扁平插画 / 3D
viewer.setColorTheme('sequence-id');       // 一键配色
viewer.present(style, color?, opts?);      // 样式 + 配色一次完成
```

### 按链定制（增量叠加）

```ts
viewer.setChainPresentations([
  { chain: 'A', layers: [{ type: 'cartoon', color: 'sequence-id' }] },
  { chain: 'B', layers: [
      { type: 'cartoon', color: 'chain-id' },
      { type: 'molecular-surface', color: 'hydrophobicity', alpha: 0.5 },
  ] },
]);
viewer.addChainPresentation({ chain: 'C', layers: [{ type: 'ball-and-stick' }] });
```

### 配体 / 水 / 氢

```ts
viewer.showLigands();
viewer.hideLigands();
viewer.toggleLigands();

viewer.addLigandLayer('ball-and-stick');   // 增量叠加配体表示
viewer.getLigandLayers();
viewer.hasLigands();

viewer.setWaterVisible(false);
viewer.setHydrogens('polar');              // 'none' | 'polar' | 'all'
```

### 药效团 / 口袋

```ts
viewer.setPharmacophore(points, 1.2);      // points: { center, radius, type }[]
viewer.clearPharmacophore();

viewer.setPockets(pockets);
viewer.setPocketVisible(1, false);
viewer.clearPockets();
```

### 视图 / 导出

```ts
viewer.resetCamera();
viewer.setSpin(true);
viewer.setBackground(Color(0xffffff));
viewer.setIllustrative(false);             // 平光 + 描边

viewer.screenshot('full-hd');              // 'viewport'|'hd'|'full-hd'|'ultra-hd'|'8k-ultra-hd'
```

### 外部切换显示（不重新加载）

所有显隐切换都是**原地更新**（`updateCellState` / `canvas3d` 可见性），不会重建结构、不会重新加载：

```ts
viewer.setLigandsVisible(true);        // 配体显隐（不重建）
viewer.areLigandsVisible();

viewer.setChainVisible('A', false);    // 单条链显隐
viewer.setWaterVisible(false);
viewer.setHydrogens('polar');          // 氢原子模式

viewer.setPocketsVisible(false);       // 全部口袋显隐（不重建）
viewer.setPocketVisible(1, true);      // 单个口袋

viewer.setPharmacophoreVisible(false); // 药效团显隐（不重建）

// 单个表示层显隐
Actions.setLayerVisible(plugin, 'A', 'molecular-surface', false);
Actions.setLigandLayerVisible(plugin, 'ball-and-stick', false);
```

> 原理：状态树里的表示用 `updateCellState(ref, { isHidden })` / `toggleVisibility`；
> 药效团这类直接加到 `canvas3d` 的覆盖物用 `repr.setState({ visible })`。二者都不触发几何重建。

### 底层动作（`easy-actions`）

面板里用到的动作同样可直接调用，例如：

```ts
import * as Actions from './src/apps/easy-viewer/easy-actions';

Actions.setRenderQuality(plugin, 'high');      // 高清 / 普通 / 预览
Actions.setOutline(plugin, true);
Actions.setShadow(plugin, false);
Actions.setOcclusion(plugin, true);
Actions.highlightChain(plugin, 'A');
Actions.exportGlb(plugin);
Actions.exportState(plugin);
Actions.setLabelScale(plugin, 0.8);
```

---

## 开发调试

```bash
node ./scripts/build.mjs -a easy-viewer   # watch 模式
# 打开 http://localhost:1338/build/easy-viewer/index.html
# 支持 URL 参数：?pdb=1hsg  ?url=...&format=mmcif  ?mvs-data=...&mvs-format=mvsj
# 多配体示例：http://localhost:1338/build/easy-viewer/index.html?demo=multi-ligand
```

另附独立示例文件：[`examples/multi-ligands.html`](./examples/multi-ligands.html)（1HSG + 3 个独立配体）。

代码检查：

```bash
npx eslint src/apps/easy-viewer
```

---

## 目录结构（新增部分）

```
src/apps/easy-viewer/
├── app.ts                 # EasyViewer（继承 Viewer）
├── easy-actions.ts        # 所有「点一下就改」的动作层
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

## License

MIT，继承自 [Mol\*](https://github.com/molstar/molstar)。
