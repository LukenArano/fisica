#!/usr/bin/env python3
"""Iturri-fitxategiak index.html bakar batean biltzen ditu (offline eta Artifact gisa erabiltzeko)."""
from pathlib import Path
src = Path(__file__).parent / 'src'
html = (src / 'shell.html').read_text()
views = ''.join((src / f'v-{n}.html').read_text() for n in
                ['hasiera', 'zinematika', 'oinarriak', 'dinamika', 'oszilazioak', 'praktika',
                 'ariketak', 'teoria', 'formulak'])
for key, val in [('/*@STYLE*/', (src / 'style.css').read_text()), ('<!--@VIEWS-->', views),
                 ('/*@DATA*/', (src / 'data.js').read_text()), ('/*@SIMS*/', (src / 'sims.js').read_text()),
                 ('/*@APP*/', (src / 'app.js').read_text()), ('/*@PRACTICE*/', (src / 'practice.js').read_text())]:
    assert key in html, key
    html = html.replace(key, val)
out = Path(__file__).parent / 'index.html'
out.write_text(html)
print(out, len(html) // 1024, 'KB')
