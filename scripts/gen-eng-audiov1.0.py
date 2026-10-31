#!/usr/bin/env python3
"""Pre-render the English game's spoken strings to MP3 (British female neural voice).

Usage:  python3 scripts/gen-eng-audiov1.0.py [--prune] [--force]
  - Strings + file keys come from games/englishv1.0.js (engine.audioStrings()), dumped via node,
    so the key rule lives only in the JS module.
  - Writes assets/eng-audio/<key>.mp3; existing files are skipped (use --force to redo all).
  - --prune deletes mp3s no longer referenced by the module.
  - Voice: en-GB-SoniaNeural, rate -12% (Microsoft Edge neural TTS via edge-tts).
  - Proxy helper: if /tmp/ttsv1.py exists it is imported first (patches aiohttp for the sandbox proxy).
"""
import asyncio, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'assets', 'eng-audio')
VOICE, RATE = 'en-GB-SoniaNeural', '-12%'

if os.path.exists('/tmp/ttsv1.py'):
    sys.path.insert(0, '/tmp')
    import ttsv1  # noqa: F401  (patches proxy before any request)
import edge_tts

DUMP = ("global.window={};require(process.argv[1]);"
        "process.stdout.write(JSON.stringify(window.TZGAMES.english._engine.audioStrings()))")


def strings():
    js = os.path.join(ROOT, 'games', 'englishv1.0.js')
    return json.loads(subprocess.check_output(['node', '-e', DUMP, js]))


async def render(item):
    out = os.path.join(OUT, item['key'] + '.mp3')
    tmp = out + '.part'
    for attempt in range(4):
        try:
            await edge_tts.Communicate(item['tts'], VOICE, rate=RATE).save(tmp)
            if os.path.getsize(tmp) > 500:
                os.replace(tmp, out)
                return True
        except Exception as e:  # network hiccup: retry
            err = e
            await asyncio.sleep(1.5 * (attempt + 1))
    print('FAILED', item['key'], item['text'], file=sys.stderr)
    if os.path.exists(tmp):
        os.remove(tmp)
    return False


async def main():
    os.makedirs(OUT, exist_ok=True)
    force, prune = '--force' in sys.argv, '--prune' in sys.argv
    items = strings()
    todo = [it for it in items if force or not os.path.exists(os.path.join(OUT, it['key'] + '.mp3'))]
    print(f'{len(items)} spoken strings, {len(todo)} to render')
    ok = 0
    for i in range(0, len(todo), 8):
        res = await asyncio.gather(*(render(it) for it in todo[i:i + 8]))
        ok += sum(res)
        print(f'  {min(i + 8, len(todo))}/{len(todo)}', flush=True)
    if prune:
        keep = {it['key'] + '.mp3' for it in items}
        for f in os.listdir(OUT):
            if f.endswith('.mp3') and f not in keep:
                os.remove(os.path.join(OUT, f)); print('pruned', f)
    files = [f for f in os.listdir(OUT) if f.endswith('.mp3')]
    size = sum(os.path.getsize(os.path.join(OUT, f)) for f in files)
    print(f'rendered {ok}/{len(todo)}; {len(files)} mp3 files, {size / 1048576:.2f} MB')
    return 0 if ok == len(todo) else 1


if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
