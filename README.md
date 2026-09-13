# QB-molstar · QuantaBricks Easy Viewer

A fork of [Mol\*](https://github.com/molstar/molstar) that adds a friendly, localized
**`easy-viewer`** layer on top of the original Mol\* viewer.

Mol\* core is **not modified**; everything new lives in `src/apps/easy-viewer/`
(plus one registry line in `scripts/build.mjs`).

## Origin & Credits

- **Original project:** **Mol\*** (MolStar) — developed by David Sehnal, Alexander Rose and Mol\* contributors.
  - Website: <https://molstar.org> · Source: <https://github.com/molstar/molstar> · License: MIT
- **This fork:** **QuantaBricks** — adds the `easy-viewer` layer.

## What's added (`easy-viewer`)

| Area | Description |
| --- | --- |
| Default look | Cartoon + blue sequence gradient; ligands/water/ions colored by element |
| Friendly panel | Sections: Style / Polymer / Ligand / Display / Label / Pharmacophore / Pocket / View |
| Additive layers | Multiple representations per chain and per ligand (cartoon, ball-and-stick, surface, …), each with its own color/opacity/visibility |
| Chain targeting | Highlight a chain; auto-switch target when selecting on the canvas |
| Pharmacophore / pockets | 3D overlays from input data |
| Residue labels | Click a ligand to label nearby residues; size/color/background adjustable |
| i18n | 简体中文 / 繁體中文 / English / 日本語 / 한국어 / Español |
| Render quality | High / Normal / Preview (surface polygon count, resolution, multisampling) |
| Export | Image (PNG/JPEG/WebP), GLB geometry, state file (.molj/.molx) |
| Classic UI | One-click switch to the native Mol\* Structure tools panel |

## Build & Run

```bash
npm install

# dev (watch) → http://localhost:1338/build/easy-viewer/index.html
node ./scripts/build.mjs -a easy-viewer

# production
node ./scripts/build.mjs -a easy-viewer --prd
```

Output: `build/easy-viewer/` (`index.html`, `molstar.js` with global `molstar`, `molstar.css`).

URL params: `?pdb=1hsg`, `?url=...&format=mmcif`, `?mvs-data=...&mvs-format=mvsj`,
`?demo=multi-ligand`.

## Quick start

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="./molstar.css" />
  <style>html,body{margin:0;width:100%;height:100%}#app{position:absolute;inset:0}</style>
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

Module usage:

```ts
import { EasyViewer } from './src/apps/easy-viewer';

const viewer = await EasyViewer.create('app');
await viewer.loadInputs({
  structure: { data: cifText, format: 'mmcif', label: 'my-protein' },
  pharmacophore: [{ center: [12.3, 4.5, 6.7], radius: 1.5, type: 'Donor' }],
  pockets: [{ pocket_id: 1, center: [10, 10, 10], score: 0.82, alpha_spheres: [[10, 10, 10]] }],
});
```

## Multiple ligand inputs

- Multiple ligands **inside one structure** are supported natively (managed by the *Ligand* section).
- Multiple **separate ligand files / docking poses**: pass `structures: [...]`:

```ts
await viewer.loadInputs({
  structures: [
    { data: ligandPdb1, format: 'pdb', label: 'Ligand-1' },
    { data: ligandPdb2, format: 'pdb', label: 'Ligand-2' },
    { data: ligandPdb3, format: 'pdb', label: 'Ligand-3' },
  ],
});
```

Demo: `?demo=multi-ligand` or [`examples/multi-ligands.html`](./examples/multi-ligands.html).

## Toggle visibility without reloading

All visibility toggles update in place (no geometry rebuild, no reload):

```ts
viewer.setLigandsVisible(true);   viewer.areLigandsVisible();
viewer.setChainVisible('A', false);
viewer.setWaterVisible(false);
viewer.setPocketsVisible(false);  viewer.setPocketVisible(1, true);
viewer.setPharmacophoreVisible(false);
Actions.setLayerVisible(plugin, 'A', 'molecular-surface', false);
Actions.setLigandLayerVisible(plugin, 'ball-and-stick', false);
```

## API (highlights)

`EasyViewer extends Viewer`, so `loadPdb`, `loadStructureFromData`, `loadStructureFromUrl`,
`loadAllModelsOrAssemblyFromUrl`, `loadFiles`, `loadSnapshotFromUrl`, `loadMvsData`, … are available.

```ts
viewer.setStyle('polymer-and-ligand');
viewer.setBaseStyle('cartoon' | '3d');
viewer.setColorTheme('sequence-id');
viewer.setChainPresentations([{ chain: 'A', layers: [{ type: 'cartoon', color: 'sequence-id' }] }]);
viewer.addChainPresentation({ chain: 'B', layers: [{ type: 'ball-and-stick' }] });
viewer.addLigandLayer('ball-and-stick');
viewer.setHydrogens('polar');
viewer.setPharmacophore(points, 1.2);
viewer.setPockets(pockets);
viewer.resetCamera(); viewer.setSpin(true); viewer.setBackground(color);
viewer.screenshot('ultra-hd');
```

Full manual: [`MANUAL.md`](./MANUAL.md).

---

> The original Mol\* README follows.

---

[![License](http://img.shields.io/badge/license-MIT-blue.svg?style=flat)](./LICENSE)
[![npm version](https://badge.fury.io/js/molstar.svg)](https://www.npmjs.com/package/molstar)
[![Build](https://github.com/molstar/molstar/actions/workflows/node.yml/badge.svg)](https://github.com/molstar/molstar/actions/workflows/node.yml)
[![Gitter](https://badges.gitter.im/molstar/Lobby.svg)](https://gitter.im/molstar/Lobby)

# Mol*

The goal of **Mol\*** (*/'mol-star/*) is to provide a technology stack that serves as a basis for the next-generation data delivery and analysis tools for (not only) macromolecular structure data. Mol* development was jointly initiated by PDBe and RCSB PDB to combine and build on the strengths of [LiteMol](https://litemol.org) (developed by PDBe) and [NGL](https://nglviewer.org) (developed by RCSB PDB) viewers.

When using Mol*, please cite:

David Sehnal, Sebastian Bittrich, Mandar Deshpande, Radka Svobodová, Karel Berka, Václav Bazgier, Sameer Velankar, Stephen K Burley, Jaroslav Koča, Alexander S Rose: [Mol* Viewer: modern web app for 3D visualization and analysis of large biomolecular structures](https://doi.org/10.1093/nar/gkab314), *Nucleic Acids Research*, 2021; https://doi.org/10.1093/nar/gkab314.

### Protein Data Bank Integrations

- The [pdbe-molstar](https://github.com/molstar/pdbe-molstar) library is the Mol* implementation used by EMBL-EBI data resources such as [PDBe](https://pdbe.org/), [PDBe-KB](https://pdbe-kb.org/) and [AlphaFold DB](https://alphafold.ebi.ac.uk/). This implementation can be used as a JS plugin and a Web component and supports property/attribute-based easy customisation. It provides helper methods to facilitate programmatic interactions between the web application and the 3D viewer. It also provides a superposition view for overlaying all the observed ligand molecules on representative protein conformations.

- [rcsb-molstar](https://github.com/molstar/rcsb-molstar) is the Mol* plugin used by [RCSB PDB](https://www.rcsb.org). The project provides additional presets for the visualization of structure alignments and structure motifs such as ligand binding sites. Furthermore, [rcsb-molstar](https://github.com/molstar/rcsb-molstar) allows to interactively add or hide of (parts of) chains, as seen in the [3D Protein Feature View](https://www.rcsb.org/3d-sequence/4hhb).


## Project Structure Overview

The core of Mol* consists of these modules (see under `src/`):

- `mol-task` Computation abstraction with progress tracking and cancellation support.
- `mol-data` Collections (integer-based sets, interface to columns/tables, etc.)
- `mol-math` Math related (loosely) algorithms and data structures.
- `mol-io` Parsing library. Each format is parsed into an interface that corresponds to the data stored by it. Support for common coordinate, experimental/map, and annotation data formats.
- `mol-model` Data structures and algorithms (such as querying) for representing molecular data (including coordinate, experimental/map, and annotation data).
- `mol-model-formats` Data format parsers for `mol-model`.
- `mol-model-props` Common "custom properties".
- `mol-script` A scripting language for creating representations/scenes and querying (includes the [MolQL query language](https://molql.github.io)).
- `mol-geo` Creating (molecular) geometries.
- `mol-theme` Theming for structure, volume and shape representations.
- `mol-repr` Molecular representations for structures, volumes and shapes.
- `mol-gl` A wrapper around WebGL.
- `mol-canvas3d` A low-level 3d view component. Uses `mol-geo` to generate geometries.
- `mol-state` State representation tree with state saving and automatic updates.
- `mol-plugin` Allow to define modular Mol* plugin instances utilizing `mol-state` and `mol-canvas3d`.
- `mol-plugin-state` State transformations, builders, and managers.
- `mol-plugin-ui` React-based user interface for the Mol* plugin. Some components of the UI are usable outside the main plugin and can be integrated into 3rd party solutions.
- `mol-util` Useful things that do not fit elsewhere.

Moreover, the project contains the implementation of `servers`, including

- `servers/model` A tool for accessing coordinate and annotation data of molecular structures.
- `servers/volume` A tool for accessing volumetric experimental data related to molecular structures.
- `servers/plugin-state` A basic server to store Mol* Plugin states.

The project also contains performance tests (`perf-tests`), `examples`, and `cli` apps (CIF to BinaryCIF converter and JSON domain annotation to CIF converter).

## Previous Work
This project builds on experience from previous solutions:
- [LiteMol Suite](https://www.litemol.org)
- [WebChemistry](https://webchem.ncbr.muni.cz)
- [NGL Viewer](http://nglviewer.org)
- [MMTF](http://mmtf.rcsb.org)
- [MolQL](http://molql.org)
- [PDB Component Library](https://www.ebi.ac.uk/pdbe/pdb-component-library/)
- And many others (list will be continuously expanded).

## Building & Running

### Build:
    npm install
    npm run build

### Build automatically on file save:
    npm run watch

If working on just the viewer, ``npm run watch-viewer`` will provide shorter compile times.

### Build with debug mode enabled:
    DEBUG=molstar npm run watch

Debug/production mode in browsers can be turned on/off during runtime by calling ``setMolStarDebugMode(true/false, true/false)`` from the dev console.

### Cleaning and forcing a full rebuild
    npm run clean

Wipes the `build` and `lib` directories and `.tsbuildinfo` files.

    npm run rebuild

Runs the cleanup script prior to building the project, forcing a full rebuild of the project.

Use these commands to resolve occasional build failures which may arise after some dependency updates. Once done, `npm run build` should work again. Note that full rebuilds take more time to complete.

### Develop with `esbuild`

Experimental support for faster builds with `esbuild`
- `npm run dev:all` - watch mode for all apps and examples
- `npm run dev:viewer` - watch mode for viewer
- `npm run dev:apps` - watch mode for all apps
- `npm run dev:examples` - watch mode for all examples
- `npm run dev -- -a <app name 1> <app name 2> -e <example name 1> ...` - watch mode for specified apps/examples. `-a`/`-e` with without any names will build everything.

### Build for production:
    NODE_ENV=production npm run build

**Run**

If not installed previously:

    npm install -g http-server

...or a similar solution.

From the root of the project:

    http-server -p PORT-NUMBER

and navigate to `build/viewer`

### Code generation
**CIF schemas**

    node ./lib/commonjs/cli/cifschema -mip ../../../../mol-data -o src/mol-io/reader/cif/schema/mmcif.ts -p mmCIF
    node ./lib/commonjs/cli/cifschema -mip ../../../../mol-data -o src/mol-io/reader/cif/schema/ccd.ts -p CCD
    node ./lib/commonjs/cli/cifschema -mip ../../../../mol-data -o src/mol-io/reader/cif/schema/bird.ts -p BIRD
    node ./lib/commonjs/cli/cifschema -mip ../../../../mol-data -o src/mol-io/reader/cif/schema/sf.ts -p SF
    node ./lib/commonjs/cli/cifschema -mip ../../../../mol-data -o src/mol-io/reader/cif/schema/cif-core.ts -p CifCore -aa

**Lipid names**

    node lib/commonjs/cli/lipid-params -o src/mol-model/structure/model/types/lipids.ts

**Ion names**

    node --max-old-space-size=8192 lib/commonjs/cli/chem-comp-dict/create-ions.js src/mol-model/structure/model/types/ions.ts

**Saccharide names**

    node --max-old-space-size=8192 lib/commonjs/cli/chem-comp-dict/create-saccharides.js src/mol-model/structure/model/types/saccharides.ts

**Syminfo**

    node lib/commonjs/cli/syminfo

### Other scripts
**Create chem comp bond table**

    node --max-old-space-size=8192 lib/commonjs/cli/chem-comp-dict/create-table.js build/data/ccb.bcif -b

**Test model server**

    export NODE_PATH="lib"; node build/src/servers/model/test.js

**State Transformer Docs**

    export NODE_PATH="lib"; node build/state-docs

**Convert any CIF to BinaryCIF (or vice versa)**

    node lib/commonjs/servers/model/preprocess -i file.cif -ob file.bcif

To see all available commands, use ``node lib/commonjs/servers/model/preprocess -h``.

Or

    node lib/commonjs/cli/cif2bcif

E.g.

    node lib/commonjs/cli/cif2bcif src.cif out.bcif.gz
    node lib/commonjs/cli/cif2bcif src.bcif.gz out.cif

## Development

### Installation

If node complains about a missing acorn peer dependency, run the following commands

    npm update acorn --depth 20
    npm dedupe

### Editor

To get syntax highlighting for shader files add the following to Visual Code's settings files and make sure relevant extensions are installed in the editor.

    "files.associations": {
        "*.glsl.ts": "glsl",
        "*.frag.ts": "glsl",
        "*.vert.ts": "glsl"
    },

## Publish

### Prerelease
    npm version prerelease # assumes the current version ends with '-dev.X'
    npm publish --tag next

### Release
    npm version 0.X.0 # provide valid semver string
    npm publish

## Deploy
To prepare apps and demos for https://molstar.org deploy, run:

    npm run test
    npm run deploy:local

To commit these changes remotely to the `molstar/molstar.github.io` repo:

    npm run deploy:remote

## Contributing
Just open an issue or make a pull request. All contributions are welcome.

## Funding
Funding sources include but are not limited to:
* [RCSB PDB](https://www.rcsb.org) funding by a grant [DBI-1338415; PI: SK Burley] from the NSF, the NIH, and the US DoE
* [PDBe, EMBL-EBI](https://pdbe.org)
* [CEITEC](https://www.ceitec.eu/)
* [EntosAI](https://www.entos.ai)
