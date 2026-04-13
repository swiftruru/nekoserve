# -*- mode: python ; coding: utf-8 -*-
#
# NekoServe Simulator — PyInstaller Spec
#
# Build with:
#   cd simulator-python
#   pyinstaller simulator.spec
#
# Output: dist/simulator/   (one-folder mode — stable, fast startup)

import sys
from pathlib import Path

block_cipher = None

a = Analysis(
    ['simulator/__main__.py'],
    pathex=[str(Path.cwd())],
    binaries=[],
    datas=[],
    hiddenimports=[
        'simpy',
        'simpy.core',
        'simpy.events',
        'simpy.resources',
        'simpy.resources.resource',
        'simpy.resources.container',
        'simpy.resources.store',
        'simpy.util',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'matplotlib',
        'numpy',
        'pandas',
        'scipy',
        'PIL',
        'cv2',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='simulator',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,      # console=True required: we use stdin/stdout
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='simulator',
)
