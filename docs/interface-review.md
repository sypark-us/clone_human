# Independent interface review

Reviewed `js/app.js`, `js/map.js`, `js/audio.js`, `js/storage.js`, `index.html`, and `styles.css` against `docs/product-plan.md`. The reviewer did not author those files and did not edit production source during review. The review excludes the engine, which this reviewer authored.

## Verdict and findings

**P2 — Mobile save failures have no visible in-game warning. Open at this review checkpoint.**

`js/app.js:35` updates `#save-status` and `#welcome-save-note` after a failed save. `styles.css:13` hides `.save-status` at widths up to 850px, and the note belongs to the hidden welcome screen during play. A player whose browser storage becomes unavailable or full can continue playing without knowing refresh will lose progress.

Reproduction: at 375×812, restore a battle, make the storage adapter throw `QuotaExceededError`, and click “한 턴 진행”. Executed in the isolated review browser:

```js
await page.addInitScript(() => {
  Storage.prototype.setItem = function () {
    throw new DOMException('test quota', 'QuotaExceededError');
  };
});
await page.reload({waitUntil:'networkidle'});
await page.locator('#resume-button').click();
await page.locator('#step-button').click();
return {
  statusText:await page.locator('#save-status').textContent(),
  statusVisible:await page.locator('#save-status').isVisible(),
  noteText:await page.locator('#welcome-save-note').textContent(),
  noteVisible:await page.locator('#welcome-save-note').isVisible(),
  toastText:await page.locator('#toast').textContent(),
  toastVisible:await page.locator('#toast').isVisible()
};
```

Actual output:

```json
{"statusText":"저장 불가","statusVisible":false,"noteText":"저장 공간이 부족하거나 저장소를 사용할 수 없습니다. 현재 탭에서는 계속 플레이할 수 있습니다.","noteVisible":false,"toastText":"저장된 전투를 불러왔습니다. ‘전투 계속’을 누르면 재개됩니다.","toastVisible":true}
```

Recommended fix: show a persistent, accessible in-game save warning regardless of viewport, while leaving play available.

**P2 — Muting music did not silence existing voices. Fixed and independently rechecked.**

Original `js/audio.js` stopped its scheduling interval but connected every existing oscillator directly to the destination through its envelope. The four voices from the first chord continued for up to 2.82 seconds after `configure({music:false,sfx:true})`.

An executed Node AudioContext probe returned:

```json
{"music":false,"musicTimer":null,"pendingVoices":4,"scheduledStops":[1.42,1.52,2.82,2.82],"muteAddedStops":0}
```

The author added separate music and effects gain buses. Reviewed `nl -ba js/audio.js`: lines 15–19 create both buses, lines 28–29 set their mute values, line 42 routes every voice through its channel, and lines 55–59 explicitly select music for the score. Existing voices now traverse the muted gain bus. Executed `node --test tests/audio.test.js` after the change:

```text
music mute silences already scheduled music without muting effects: pass
effects mute silences scheduled effects while music remains enabled: pass
audio stays dormant before interaction and suspends while hidden: pass
tests 3; pass 3; fail 0
```

Actual sound quality remains **unverified**; these checks establish graph routing and mute behavior, not a listening review.

**P3 — Report displays implementation enums to the player. Open at this checkpoint.**

`nl -ba js/app.js` showed `$('report-reason').textContent = report.reason` in `renderReport`; the enum is `core-destroyed` or `turn-limit`. The Korean result screen should say why the battle ended in Korean. Recommended fix: map these two stable IDs to player-facing explanations. Live report rendering was reached in the browser, but the report-reason text itself was not read back; the specific visible string is **source-verified, browser-unverified**.

## Falsification attempts that passed

All browser commands used `playwright-cli -s=interface-critic-1010` from `/tmp`. The fresh named session was opened with `open http://127.0.0.1:4187`. Trusted Playwright clicks and keyboard input drove interactions; `run-code` returned semantic state from the DOM. Storage failure and XSS probes were explicit fixtures in this isolated browser only.

1. **Pause and single step:** choose a route and module, select 0.5×, click start and pause, wait 2400ms, then click single step. Command body:

```js
await page.locator('[data-route]').first().click();
await page.locator('[data-install]').first().click();
await page.locator('#speed-select').selectOption('0.5');
await page.locator('#primary-button').click();
await page.locator('#primary-button').click();
const before = await page.locator('#turn-label').textContent();
await page.waitForTimeout(2400);
const after = await page.locator('#turn-label').textContent();
await page.locator('#step-button').click();
return {before, after, stepped:await page.locator('#turn-label').textContent(),phase:await page.locator('#battle-phase').textContent()};
```

Output: `{"before":"턴 0 / 12","after":"턴 0 / 12","stepped":"턴 1 / 12","phase":"코어 격파"}`. Pause prevented automatic advancement; the single step advanced exactly one turn and completed the wave.

2. **Reload during active battle:** advance to wave 2, choose route/module, start, immediately reload, resume the saved game, and wait 2400ms. Command body:

```js
await page.locator('#primary-button').click();
await page.locator('[data-route]').first().click();
await page.locator('[data-install]').first().click();
await page.locator('#primary-button').click();
await page.reload({waitUntil:'networkidle'});
await page.locator('#resume-button').click();
const before = await page.locator('#turn-label').textContent();
await page.waitForTimeout(2400);
return {before,after:await page.locator('#turn-label').textContent(),phase:await page.locator('#battle-phase').textContent(),button:await page.locator('#primary-button').textContent()};
```

Output: `{"before":"턴 0 / 8","after":"턴 0 / 8","phase":"일시정지","button":"전투 계속→"}`. Restored battles require explicit continuation.

3. **Cancel destructive restart:** click new game, launch a new factory, inspect the confirmation, cancel, then resume. Output: `{"confirmShown":true,"resumedVisible":true,"wave":"2 / 8","phase":"일시정지"}`. The executed selectors were `#new-game-button`, `#launch-button`, `[data-close=confirm-dialog]`, `#resume-button`; the readback was `#confirm-dialog.open`, `#resume-button` visibility, `#wave-label`, and `#battle-phase`. Cancel preserved progress.

4. **Keyboard map relocation:** in a fresh preparation state, select rack slot 1, activate “지도에서 이동”, focus the first map tile, then issue trusted `ArrowRight`, `ArrowDown`, `Enter`. Output:

```json
{"before":"슬롯 1 · 채굴기 · 2,3 · 발전소 · 채굴 +3","after":"슬롯 1 · 채굴기 · 2,2 · 발전소 · 채굴 +3","moving":"false","focus":"슬롯 1 · 채굴기 · 2,2 · 발전소 · 채굴 +3"}
```

The slot moved, move mode exited, and focus stayed on the selected destination. One initial test command used invalid CSS `[data-slot=0]`; it failed in the test driver, was corrected to `[data-slot]` plus `.first()`, and the successful output above came from the corrected command.

5. **Saved-log XSS:** a fixture created by the real engine put `<img src=x onerror=window.__reviewXss=1>` in its log. An init script installed the validated JSON record before application startup, then the browser resumed it. Readback returned:

```json
{"renderedText":"<img src=x onerror=window.__reviewXss=1>","images":0,"executed":false}
```

The payload rendered as literal text. `js/app.js` creates log entries with `textContent`; other saved text also uses text setters or explicit escaping. An initial fixture attempt wrote storage before reload and was overwritten by the old page's normal `pagehide` save; that attempt did not establish XSS coverage and was replaced by the init-script fixture.

6. **Mobile dimensions:** `page.setViewportSize({width:375,height:812})` plus DOM dimensions returned `{"viewport":375,"pageWidth":375,"saveStatusDisplay":"none","factoryWidth":349,"mapWidth":570}`. At 320×740, output was `{"viewport":320,"pageWidth":320,"headerWidth":320}`. No page-wide horizontal overflow occurred at either width; the larger factory map scrolls within its viewport. Touch gestures themselves remain **unverified**.

## Runtime and evidence limits

- `curl -sfI http://127.0.0.1:4187` returned HTTP 200 and served the current source directory. This is a static server with no build or service worker.
- `ps` before/after showed the same server PID, `1201886`, running `python3 -m http.server 4187 --bind 127.0.0.1`; no restart observed. There is no supervisor crash counter in this setup.
- `playwright-cli -s=interface-critic-1010 console error` returned `Total messages: 0 (Errors: 0, Warnings: 0)`.
- A response listener followed by `page.reload({waitUntil:'networkidle'})` returned `{"bad":[],"ready":true}` for HTTP status codes ≥400 and the launch-button readiness check. The installed CLI has `requests`, not the skill's older `network` command; the unsupported command was replaced with the response listener.
- `playwright-cli -s=interface-critic-1010 close` returned `Browser 'interface-critic-1010' closed`.
- Real browser visibility/background transitions, a physical touch device, screen-reader announcement quality, and subjective audio quality remain **unverified by this review**.

## Independent fix verification — all reported findings resolved

This section supersedes the earlier open statuses. No production source was edited by the reviewer.

**Mobile save warning: resolved.** Source inspection (`rg -n 'save-warning' js/app.js index.html styles.css`) confirmed that `#save-warning` is outside both hidden screens, has `role="status"`, and remains styled at mobile widths. `save()` shows the warning on failure, announces the first failure with a toast, and hides it after a successful save.

**Report reason enums: resolved.** `rg -n 'core-destroyed|turn-limit' js/app.js` returned a Korean message mapping for both outcomes in `renderReport`. The full eight-wave browser test now reaches and verifies the final victory report.

Independently executed:

```sh
npm run test:browser -- --grep 'save failure|eight-wave|music'
```

Actual output:

```text
save failure is visible during gameplay on a phone: passed
music creates running audio after opt-in and both controls persist independently: passed
eight-wave campaign completes through real controls and renders a Korean victory report: passed
3 passed (9.5s)
```

The tests assert no page errors or HTTP responses ≥400. The runner emitted two environment warnings that `NO_COLOR` was ignored because `FORCE_COLOR` was set; these were not application errors.

`node --test tests/audio.test.js` independently returned `tests 3; pass 3; fail 0`, confirming the earlier audio resolution remained intact.

An additional fresh browser session, `playwright-cli -s=interface-fix-1010 open http://127.0.0.1:4187`, tested recovery at 375×812. A reversible storage fixture threw `QuotaExceededError` while `window.__failSave` was true. The real launch flow showed the warning and first-failure toast; turning off the fixture and installing a module triggered a successful save. Executed interaction/readback:

```js
await page.setViewportSize({width:375,height:812});
await page.addInitScript(() => {
  const original=Storage.prototype.setItem;
  window.__failSave=true;
  Storage.prototype.setItem=function(...args) {
    if(window.__failSave) throw new DOMException('test quota','QuotaExceededError');
    return original.apply(this,args);
  };
});
await page.reload({waitUntil:'networkidle'});
await page.locator('#launch-button').click();
await page.getByRole('button',{name:'알겠습니다',exact:true}).click();
const failure={
  warningVisible:await page.locator('#save-warning').isVisible(),
  warning:await page.locator('#save-warning').textContent(),
  toast:await page.locator('#toast').textContent(),
  gameVisible:await page.locator('#game').isVisible()
};
await page.evaluate(() => { window.__failSave=false; });
await page.locator('[data-install]').first().click();
return {
  failure,
  recoveredWarningVisible:await page.locator('#save-warning').isVisible(),
  recoveredStatus:await page.locator('#save-status').textContent(),
  savedRunPresent:await page.evaluate(() => !!JSON.parse(localStorage.getItem('clone-human:save')).run)
};
```

Actual output:

```json
{"failure":{"warningVisible":true,"warning":"진행 상황을 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인하세요. 현재 탭에서는 계속 플레이할 수 있지만, 닫으면 최근 진행이 사라집니다.","toast":"자동 저장에 실패했습니다. 상단의 저장 안내를 확인하세요.","gameVisible":true},"recoveredWarningVisible":false,"recoveredStatus":"자동 저장됨","savedRunPresent":true}
```

`playwright-cli -s=interface-fix-1010 console error` returned `Total messages: 0 (Errors: 0, Warnings: 0)`; `close` returned `Browser 'interface-fix-1010' closed`.

No open findings remain from this review. Physical devices, subjective audio listening, and real browser visibility/background transitions remain **unverified by this reviewer**.
