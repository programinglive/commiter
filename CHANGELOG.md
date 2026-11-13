# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.6.1](https://github.com/programinglive/commiter/compare/v1.6.0...v1.6.1) (2026-11-13)


### 🐛 Bug Fixes

* **release:** report path escapes before allowlist misses ([80811b1](https://github.com/programinglive/commiter/commit/80811b14529dd4e15d05d7c63e683bb752e4a36b))

## [1.6.0](https://github.com/programinglive/commiter/compare/v1.5.1...v1.6.0) (2026-11-13)


### ✨ Features

* **release:** support validated additional release files ([f87ce93](https://github.com/programinglive/commiter/commit/f87ce93aef24ace8c4d086c04c832556726399f8))


### 📝 Documentation

* **plan:** record the 1.5.1 engine and the ERP contract test ([f610e2b](https://github.com/programinglive/commiter/commit/f610e2bca2371cc8682d380e250d04e1d81b0580))
* **release:** add the first production release checklist ([73b82b2](https://github.com/programinglive/commiter/commit/73b82b2e470323c9cd232b4474350e5a207c51ca))
* **release:** document recovery and configuration ([5eadcee](https://github.com/programinglive/commiter/commit/5eadcee55f968ee2c7ceb50972259b68105f7e9b))


### 🐛 Bug Fixes

* **release:** classify concurrent publication failures safely ([c78bceb](https://github.com/programinglive/commiter/commit/c78bcebc2f108cf90afc5e7b004422cef923dd59))
* **release:** keep transport failures UNKNOWN and revalidate staged paths ([32ca277](https://github.com/programinglive/commiter/commit/32ca27749c2e4b0b1cbd3beee5acd05188696a39))


### ✅ Tests

* **release:** cover failure classification and path safety ([0d8daf3](https://github.com/programinglive/commiter/commit/0d8daf3020e3e2afd2d47d6ac0dc0625cf9e26af))
* **release:** cover transport failure and post-preflight symlink ([0621ddb](https://github.com/programinglive/commiter/commit/0621ddbc29524edd10eacdc64670dd45e179d5fd))

### [1.5.1](https://github.com/programinglive/commiter/compare/v1.5.0...v1.5.1) (2026-11-12)


### 📝 Documentation

* **plan:** migrate the eight repos to release v2 ([ad0457f](https://github.com/programinglive/commiter/commit/ad0457fe390a99ae010a8a1ac9f777ef0bc10376))
* **web:** show v1.5.0 and the atomic release flow ([17478c9](https://github.com/programinglive/commiter/commit/17478c9fc0741f5c683df410cdae0c20cb075c96))


### ♻️ Refactors

* **release:** translate engine messages to English ([e110be5](https://github.com/programinglive/commiter/commit/e110be52131c250d560d50098b88eafa3e144e5d))

## [1.5.0](https://github.com/programinglive/commiter/compare/v1.4.0...v1.5.0) (2026-11-12)


### 👷 Continuous Integration

* **release:** create the GitHub Release and deploy the site from one tag ([#1](https://github.com/programinglive/commiter/issues/1)) ([ecaa6a6](https://github.com/programinglive/commiter/commit/ecaa6a68a9218eb47d5878abe0dc7e549a40c195))
* **release:** skip npm publish when the version already exists ([#2](https://github.com/programinglive/commiter/issues/2)) ([0086d9b](https://github.com/programinglive/commiter/commit/0086d9b9f03aa8debae2e83195da5f4cd4416086))


### 🐛 Bug Fixes

* **release:** gate every release and keep the tag annotated ([584299e](https://github.com/programinglive/commiter/commit/584299e7504b127858ef04fd2fb3db4fa40fdcae))


### ✨ Features

* **release:** adopt the v2 engine with atomic publication ([91fcd59](https://github.com/programinglive/commiter/commit/91fcd59f3fe1cb889dc8dd9ed4099d98bd519c3d))


### ✅ Tests

* **release:** prove concurrency and per-phase failure handling ([4cfc0d4](https://github.com/programinglive/commiter/commit/4cfc0d4408fe631a89734b5102099bd4cbe1ab2f))


### 📝 Documentation

* audit the release v2 overlay before adopting it ([#5](https://github.com/programinglive/commiter/issues/5)) ([57c84b1](https://github.com/programinglive/commiter/commit/57c84b14740631a3c36be6ae58508afee2294cb3))
* compact session handover and the plan to adopt release v2 ([#6](https://github.com/programinglive/commiter/issues/6)) ([639d9c0](https://github.com/programinglive/commiter/commit/639d9c08ce71490fcb662a31cab655d8bfa2d143))
* explain how commiter works, and correct the README ([#4](https://github.com/programinglive/commiter/issues/4)) ([1479737](https://github.com/programinglive/commiter/commit/1479737dc3ffd28bdcada78f51f8e0b7030c6e1a))
* **release:** describe the v2 flow and the recovery path ([fc7ac39](https://github.com/programinglive/commiter/commit/fc7ac39109d64e1fd143a024eb1178cd88e77170))
* **web:** show 1.4.0 and document the release command ([#3](https://github.com/programinglive/commiter/issues/3)) ([2cbefe6](https://github.com/programinglive/commiter/commit/2cbefe6fc803fb0c6d5d7496d11744166be1827d))

## [1.4.0](https://github.com/programinglive/commiter/compare/v1.3.0...v1.4.0) (2026-11-12)


### 📝 Documentation

* update release notes for v1.3.0 ([957719d](https://github.com/programinglive/commiter/commit/957719ddbe6f19aa112829fdcd1da675f78471b4))
* **web:** update website and release notes for v1.3.0 ([7e52719](https://github.com/programinglive/commiter/commit/7e527196762444ad3d0104c36cf60b70538d99d4))


### 🐛 Bug Fixes

* **release:** run standard-version via node, fail closed, roll back rejected tags ([226b105](https://github.com/programinglive/commiter/commit/226b1058685cffd570966a26797f56e401ac08de))
* **verify-tests:** add python pytest detection and windows shell spawn ([b247551](https://github.com/programinglive/commiter/commit/b247551e3e4ebe3bee169cfc3344a6729ca66c0b))


### ✨ Features

* **cli:** add 'commiter release' as the single release entry point ([e119ac4](https://github.com/programinglive/commiter/commit/e119ac4d7981712081462ab404b78b2b2680f300))
* **release:** push the release tag and prove it reached origin ([0bb9df9](https://github.com/programinglive/commiter/commit/0bb9df9ae1ac786f057885831b0e6d23bf32bf62))

## [1.3.0](https://github.com/programinglive/commiter/compare/v1.2.20...v1.3.0) (2026-11-06)


### 📝 Documentation

* add missing npm run release command to website ([47475a3](https://github.com/programinglive/commiter/commit/47475a3c4fc834be9b31cf6724f4015ad222ba58))
* update release notes for v1.2.20 📋 ([8b3abcb](https://github.com/programinglive/commiter/commit/8b3abcb12a263951b2fba09d59a5830d22352155))
* update web, README, and PRD with enhanced release process features ([73f7c02](https://github.com/programinglive/commiter/commit/73f7c02fb952018b0bc98f683149bbd5947fd7e2))


### 👷 Continuous Integration

* **publish:** gunakan Node 24 agar npm@latest kompatibel ([43447af](https://github.com/programinglive/commiter/commit/43447afd302413a4ccd50a8339eeede9f5f773d9))


### ✨ Features

* **pre-commit:** enforce test cases presence and execution before commit ([89f0122](https://github.com/programinglive/commiter/commit/89f012240c8604125157be317f48b05ac3e50c98))

### [1.2.20](https://github.com/programinglive/commiter/compare/v1.2.19...v1.2.20) (2026-01-01)


### 📝 Documentation

* update release notes for v1.2.19 📋 ([87759c1](https://github.com/programinglive/commiter/commit/87759c13f3c2f76b8e381c0b2f3ab3338f07f422))


### ✅ Tests

* add comment for complete release test ([b87d0f5](https://github.com/programinglive/commiter/commit/b87d0f5c12e1d2ff18ec791d3f7acbfa121a26a8))

### [1.2.19](https://github.com/programinglive/commiter/compare/v1.2.18...v1.2.19) (2026-01-01)


### 📝 Documentation

* finalize v1.2.18 release notes and website update ([034faa5](https://github.com/programinglive/commiter/commit/034faa5dcae1294b57fbaf2773ce14a085259724))
* update README, restore PRD, and enhance website features ([451ef7b](https://github.com/programinglive/commiter/commit/451ef7bf0fff925e3589fa7a6c7dbe8e76c3e93d))


### ✨ Features

* enhance release process with clear git operation guidance and auto-commit option ([91171e2](https://github.com/programinglive/commiter/commit/91171e2d426650a2e74250b6b9a3c9a9b8bb875e))

### [1.2.18](https://github.com/programinglive/commiter/compare/v1.2.17...v1.2.18) (2026-01-01)


### 📝 Documentation

* **release-notes:** add 1.2.17 entry ([0a79779](https://github.com/programinglive/commiter/commit/0a7977964e9231a53d7d006cec5e847daeee2033))
* **web:** refresh homepage content for v1.2.17 ([2fc6666](https://github.com/programinglive/commiter/commit/2fc6666369e18a0dbda9488d9ed0ac6a09298f95))


### ✨ Features

* add usage warning and MCP dev-workflow tip ([df7bc00](https://github.com/programinglive/commiter/commit/df7bc0078f75780f3daaeb703b6fe2b248910446))


### ✅ Tests

* add automated tests for usage warnings ([af6283e](https://github.com/programinglive/commiter/commit/af6283edfa4e1e677fc20bfc5e6b243db192867f))

### [1.2.17](https://github.com/programinglive/commiter/compare/v1.2.16...v1.2.17) (2025-12-26)


### 📝 Documentation

* **web:** update homepage for v1.2.16 release ([c4ba36e](https://github.com/programinglive/commiter/commit/c4ba36ed3b9ec50f16df92b4cc37094f3173fc3a))


### ✨ Features

* **release:** enforce PRD presence warning ([227e237](https://github.com/programinglive/commiter/commit/227e237012cb56f9b570e69f96dc4bd2e836b319))

### [1.2.16](https://github.com/programinglive/commiter/compare/v1.2.15...v1.2.16) (2025-12-13)


### 👷 Continuous Integration

* upgrade to node 20 and update npm for OIDC ([5f7d9a0](https://github.com/programinglive/commiter/commit/5f7d9a0d668ab5702879841de2f9d0818fa8f6bd))

### [1.2.15](https://github.com/programinglive/commiter/compare/v1.2.14...v1.2.15) (2025-12-13)


### 👷 Continuous Integration

* remove registry-url to fix OIDC auth conflict ([c49b6e8](https://github.com/programinglive/commiter/commit/c49b6e81195c5b9dc40611ee87fd22d45c33e3a9))

### [1.2.14](https://github.com/programinglive/commiter/compare/v1.2.13...v1.2.14) (2025-12-13)


### 👷 Continuous Integration

* remove legacy auth token env ([8508deb](https://github.com/programinglive/commiter/commit/8508deb5ee725519848588780d897f03fdb725eb))

### [1.2.13](https://github.com/programinglive/commiter/compare/v1.2.12...v1.2.13) (2025-12-13)


### 👷 Continuous Integration

* enable npm trusted publishing (OIDC) with provenance ([5e1e852](https://github.com/programinglive/commiter/commit/5e1e852abfa6860e7e1533895ebf3f2996a11bfb))

### [1.2.12](https://github.com/programinglive/commiter/compare/v1.2.10...v1.2.12) (2025-12-13)


### 🧹 Chores

* cleanup and add deployment scripts ([4124b5f](https://github.com/programinglive/commiter/commit/4124b5fc25f2975a62cccbfb3fa168c54e0058bf))
* **release:** 1.2.11 🚀 ([2bbf62a](https://github.com/programinglive/commiter/commit/2bbf62a569546e06a7c27f0a2ecae838493161c6))


### 🐛 Bug Fixes

* resolve npm pkg warnings ([6d7a193](https://github.com/programinglive/commiter/commit/6d7a1937d70e6cf2f69edd6c7def8deba7a732d7))
* **setup:** surface first release commands ([8701e9a](https://github.com/programinglive/commiter/commit/8701e9ae75fde65f55ab956e0636bcff6c0672a9))

### [1.2.11](https://github.com/programinglive/commiter/compare/v1.2.10...v1.2.11) (2025-12-11)


### 🧹 Chores

* cleanup and add deployment scripts ([4124b5f](https://github.com/programinglive/commiter/commit/4124b5fc25f2975a62cccbfb3fa168c54e0058bf))


### 🐛 Bug Fixes

* **setup:** surface first release commands ([8701e9a](https://github.com/programinglive/commiter/commit/8701e9ae75fde65f55ab956e0636bcff6c0672a9))

### [1.2.10](https://github.com/programinglive/commiter/compare/v1.2.9...v1.2.10) (2025-12-11)


### ✨ Features

* enhance release workflow with first release support and patch defaults ([d5f1334](https://github.com/programinglive/commiter/commit/d5f133425718eab44fd9d8cdc4fc50641697efd0))

### [1.2.9](https://github.com/programinglive/commiter/compare/v1.2.8...v1.2.9) (2025-12-05)


### 🧹 Chores

* add release:first script ([0240fce](https://github.com/programinglive/commiter/commit/0240fceaaad231074f1525b9d5208697cfa9d5fa))
* update gitignore and release notes ([c12f935](https://github.com/programinglive/commiter/commit/c12f935aaeb56b412fdefdc888acea544bc83e3b))


### 📝 Documentation

* document release:first command and update tests ([876a208](https://github.com/programinglive/commiter/commit/876a20893a6a1fd3433992ba62d62ed6bd09c0b0))

### [1.2.8](https://github.com/programinglive/commiter/compare/v1.2.6...v1.2.8) (2025-12-02)


### ♻️ Refactors

* remove website auto updates ([c6f2498](https://github.com/programinglive/commiter/commit/c6f24986dd657d7eae91ac84e821a6dbbb492e37))


### 🧹 Chores

* **release:** 1.2.7 🚀 ([cb97edc](https://github.com/programinglive/commiter/commit/cb97edca4bccbccaf2e2b1228e0b0b6eef71dbb6))


### 🏗️ Build System

* add netlify.toml for static site deployment ([2f70ec7](https://github.com/programinglive/commiter/commit/2f70ec7be08970d7a51b6fe186ef3fac9a9cef9e))

### [1.2.7](https://github.com/programinglive/commiter/compare/v1.2.6...v1.2.7) (2025-12-02)


### ♻️ Refactors

* remove website auto updates ([c6f2498](https://github.com/programinglive/commiter/commit/c6f24986dd657d7eae91ac84e821a6dbbb492e37))

### [1.2.6](https://github.com/programinglive/commiter/compare/v1.2.5...v1.2.6) (2025-11-30)


### 🐛 Bug Fixes

* tests only run during release, not on commit ([15600a0](https://github.com/programinglive/commiter/commit/15600a0a558ea9fd38a77afd2c11f5e954d87c51))

### [1.2.5](https://github.com/programinglive/commiter/compare/v1.2.4...v1.2.5) (2025-11-29)


### 🧹 Chores

* **release:** v1.2.4 🚀 ([23e546a](https://github.com/programinglive/commiter/commit/23e546a070ef4ddc403f7d3a89750c501ec84f08))


### ✅ Tests

* add integration tests to verify web updates are only for commiter ([8b2b1ad](https://github.com/programinglive/commiter/commit/8b2b1ad045f088db03d9ccfea4dad54cb5278926))

### [1.2.4](https://github.com/programinglive/commiter/compare/v1.2.3...v1.2.4) (2025-11-27)


### 🧹 Chores

* **release:** 1.2.3 ([9d12f7e](https://github.com/programinglive/commiter/commit/9d12f7e7f9ec5d64b4f7a6d30a4c046e760d73bb))


### 🐛 Bug Fixes

* **web:** improve terminal layout and animation ([6d196f4](https://github.com/programinglive/commiter/commit/6d196f4f922e72ad32e9cb570046ff7bf82c398e))

### [1.2.3](https://github.com/programinglive/commiter/compare/v1.2.2...v1.2.3) (2025-11-27)


### ✨ Features

* automate website releases timeline updates from release notes ([5abf788](https://github.com/programinglive/commiter/commit/5abf788afd90dde0b8a52dc3658720044f40b2ee))

### [1.2.2](https://github.com/programinglive/commiter/compare/v1.2.1...v1.2.2) (2025-11-27)


### 🧹 Chores

* update homepage url ([556b173](https://github.com/programinglive/commiter/commit/556b173db74c99e0d0b20045139f415736389727))

### [1.2.1](https://github.com/programinglive/commiter/compare/v1.2.0...v1.2.1) (2025-11-26)


### 🐛 Bug Fixes

* **release:** improve website version update reliability ([18f5ace](https://github.com/programinglive/commiter/commit/18f5acea973d49af07f2d41ebf035529d825429c))


### ✨ Features

* **website:** read version from git tags instead of package.json ([8fe8af8](https://github.com/programinglive/commiter/commit/8fe8af8098816713f5ad6a08f3a548173f89d57d))

## [1.2.0](https://github.com/programinglive/commiter/compare/v1.1.11...v1.2.0) (2025-11-26)


### 🧹 Chores

* **project:** update documentation and release scripts ([88d02c6](https://github.com/programinglive/commiter/commit/88d02c6f527cd4dc63bcecfca4538867fe8d5c96))

### [1.1.11](https://github.com/programinglive/commiter/compare/v1.1.10...v1.1.11) (2025-11-26)


### 📝 Documentation

* **website:** add open graph social media preview ([7a2f911](https://github.com/programinglive/commiter/commit/7a2f91156bcef6f351d4e914efc53776741baf69))

### [1.1.10](https://github.com/programinglive/commiter/compare/v1.1.9...v1.1.10) (2025-11-26)


### ✨ Features

* **website:** add professional landing page and release tools ([ec53e2d](https://github.com/programinglive/commiter/commit/ec53e2d5d2d1d61d899ba0349cb6771bb9e57385))

### [1.1.9](https://github.com/programinglive/commiter/compare/v1.1.8...v1.1.9) (2025-11-24)


### 🐛 Bug Fixes

* convert release scripts to CJS to support ESM projects ([842da02](https://github.com/programinglive/commiter/commit/842da0298f1c4df7aa93b43ca8698e3669ef6450))

### [1.1.8](https://github.com/programinglive/commiter/compare/v1.1.7...v1.1.8) (2025-11-22)


### 🐛 Bug Fixes

* update installation script to copy missing files and update gitignore ([5d56259](https://github.com/programinglive/commiter/commit/5d562592fe35b684fa12bd89748b24551ae28a66))

### [1.1.7](https://github.com/programinglive/commiter/compare/v1.1.6...v1.1.7) (2025-11-11)


### 📝 Documentation

* recommend dev workflow mcp server ([58a5054](https://github.com/programinglive/commiter/commit/58a5054fafd627ef23c448fd93b1383518590ad2))

### [1.1.6](https://github.com/programinglive/commiter/compare/v1.1.5...v1.1.6) (2025-11-05)


### 🐛 Bug Fixes

* revert to simple release notes staging to avoid git ref conflicts ([2f6a40e](https://github.com/programinglive/commiter/commit/2f6a40ed7259cffdb0b1de1633af3e43df475044))

### [1.1.5](https://github.com/programinglive/commiter/compare/v1.1.4...v1.1.5) (2025-11-05)


### ✨ Features

* include release notes in release commit via amendment ([3f2afa8](https://github.com/programinglive/commiter/commit/3f2afa8bd0bd264d047df06ae791384e74dc827e))


### 📝 Documentation

* update release notes for v1.1.5 ([cb3dbe6](https://github.com/programinglive/commiter/commit/cb3dbe62a85a174bfb074e3d2526a005fc83d0d7))

### [1.1.4](https://github.com/programinglive/commiter/compare/v1.1.3...v1.1.4) (2025-11-05)


### 🐛 Bug Fixes

* simplify release notes staging to avoid git ref conflicts ([d4077aa](https://github.com/programinglive/commiter/commit/d4077aa1544e07cb64d089a440cf9461da42c413))

### [1.1.3](https://github.com/programinglive/commiter/compare/v1.1.2...v1.1.3) (2025-11-05)

### [1.1.2](https://github.com/programinglive/commiter/compare/v1.1.1...v1.1.2) (2025-11-05)


### 🧹 Chores

* auto-update release notes during release ([99d1043](https://github.com/programinglive/commiter/commit/99d104374794a6a46dc34e8a91fa8b30ae9b297b))

### [1.1.1](https://github.com/programinglive/commiter/compare/v1.1.0...v1.1.1) (2025-11-05)


### 🐛 Bug Fixes

* remove fs.F_OK deprecation warning ([1b0652b](https://github.com/programinglive/commiter/commit/1b0652b88d1b095e1045994948f75ce8194f9d3a))

## [1.1.0](https://github.com/programinglive/commiter/compare/v1.0.12...v1.1.0) (2025-10-29)


### 📝 Documentation

* clarify release automation flow ([1cf7aa2](https://github.com/programinglive/commiter/commit/1cf7aa2432f371eac69d6931c8a497991686bfc6))

### [1.0.12](https://github.com/programinglive/commiter/compare/v1.0.11...v1.0.12) (2025-10-29)


### ✨ Features

* auto-detect test command during release ([602e30e](https://github.com/programinglive/commiter/commit/602e30e94ff7c58b35f8c54bd495c0334352c72c))

### [1.0.11](https://github.com/programinglive/commiter/compare/v1.0.10...v1.0.11) (2025-10-29)


### 📝 Documentation

* add status and download badges ([407edd4](https://github.com/programinglive/commiter/commit/407edd48d5cf88bfcd3c9e272f83b90ed648b6ce))

### [1.0.10](https://github.com/programinglive/commiter/compare/v1.0.9...v1.0.10) (2025-10-29)

### [1.0.9](https://github.com/programinglive/commiter/compare/v1.0.8...v1.0.9) (2025-10-29)


### ✨ Features

* add new feature ([e1603c1](https://github.com/programinglive/commiter/commit/e1603c144823dd54f077de3f16c5c764d2066fe7))

### [1.0.8](https://github.com/programinglive/commiter/compare/v1.0.7...v1.0.8) (2025-10-29)


### ✨ Features

* add release helper script and tests ([085af63](https://github.com/programinglive/commiter/commit/085af631d2c53725f125d0f48b1221bc81830288))

### [1.0.7](https://github.com/programinglive/commiter/compare/v1.0.6...v1.0.7) (2025-10-29)


### ✨ Features

* add release helper script and tests ([93f4235](https://github.com/programinglive/commiter/commit/93f4235c3cf2e34b77b78ba51c0337cf89e564df))

### [1.0.6](https://github.com/programinglive/commiter/compare/v1.0.5...v1.0.6) (2025-10-19)

### [1.0.5](https://github.com/programinglive/commiter/compare/v1.0.4...v1.0.5) (2025-10-19)


### 🐛 Bug Fixes

* allow release commits with emoji ([26c4afa](https://github.com/programinglive/commiter/commit/26c4afa26fc7c11c91ac576dcba197cba5d3d98a))

### [1.0.4](https://github.com/programinglive/commiter/compare/v1.0.3...v1.0.4) (2025-10-19)


### 🐛 Bug Fixes

* ensure safe test default for initial release ([27d2ee3](https://github.com/programinglive/commiter/commit/27d2ee35d1e558ef459a61e41627305997621392))

### [1.0.3](https://github.com/programinglive/commiter/compare/v1.0.2...v1.0.3) (2025-10-19)

### [1.0.2](https://github.com/programinglive/commiter/compare/v1.0.1...v1.0.2) (2025-10-19)

### [1.0.1](https://github.com/programinglive/commiter/compare/v1.0.0...v1.0.1) (2025-10-18)


### 🐛 Bug Fixes

* align commitlint config with project module type ([d051eac](https://github.com/programinglive/commiter/commit/d051eace5471d0c54fd8de6a3bede6a0df020dad))

## 1.0.0 (2025-10-17)


### ✨ Features

* initial project setup with standard-version and conventional commits ([0accf6d](https://github.com/programinglive/commiter/commit/0accf6dba678c1946629aa3f1b691bea7e20cd95))


### 📝 Documentation

* add community health files and apply package tooling ([0fa802b](https://github.com/programinglive/commiter/commit/0fa802b6129053d3f32030cec561e5926dd09c42))


### 🧹 Chores

* update package metadata ([7c112f3](https://github.com/programinglive/commiter/commit/7c112f3d82e2c92ed31fa3e60fafd5ca0429184d))
