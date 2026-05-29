'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  canUseFloatingBubble,
  collapsedFloatingBubbleBounds,
  expandedFloatingBubbleBounds,
  floatingBubbleCollapsePlan,
  floatingBubbleNativeGlassEnabled,
  moveFloatingBubbleBounds
} = require('../../src/electron/floatingBubble');

const workArea = { x: 0, y: 24, width: 1440, height: 876 };
const stylesPath = path.join(__dirname, '..', '..', 'src', 'electron', 'renderer', 'styles.css');

function cssBlock(css, selectorPattern) {
  const match = css.match(new RegExp(`${selectorPattern}\\s*\\{([\\s\\S]*?)\\}`));
  return match?.[1] || '';
}

test('floating bubble is available only for enabled movable window modes', () => {
  assert.equal(canUseFloatingBubble({ floatingBubbleEnabled: true, windowBehavior: 'floating', trayMode: false }), true);
  assert.equal(canUseFloatingBubble({ floatingBubbleEnabled: true, windowBehavior: 'normal', trayMode: false }), true);
  assert.equal(canUseFloatingBubble({ floatingBubbleEnabled: false, windowBehavior: 'floating', trayMode: false }), false);
  assert.equal(canUseFloatingBubble({ floatingBubbleEnabled: true, windowBehavior: 'desktop', trayMode: false }), false);
  assert.equal(canUseFloatingBubble({ floatingBubbleEnabled: true, windowBehavior: 'floating', trayMode: true }), false);
});

test('floating bubble disables native system glass while collapsed', () => {
  assert.equal(floatingBubbleNativeGlassEnabled({ systemGlass: true }, { collapsed: false }), true);
  assert.equal(floatingBubbleNativeGlassEnabled({ systemGlass: true }, { collapsed: true }), false);
  assert.equal(floatingBubbleNativeGlassEnabled({ systemGlass: false }, { collapsed: false }), false);
});

test('collapsedFloatingBubbleBounds keeps the current narrow mini-window shape without requiring an edge', () => {
  const bounds = { x: 120, y: 80, width: 360, height: 520 };
  assert.deepEqual(collapsedFloatingBubbleBounds(bounds, workArea), {
    x: 120,
    y: 323,
    width: 18,
    height: 34
  });
  assert.deepEqual(collapsedFloatingBubbleBounds({ x: 1000, y: 80, width: 360, height: 520 }, workArea), {
    x: 1342,
    y: 323,
    width: 18,
    height: 34
  });
});

test('floatingBubbleCollapsePlan can collapse from the current position without edge docking', () => {
  assert.equal(
    floatingBubbleCollapsePlan(
      { x: 120, y: 120, width: 360, height: 520 },
      workArea,
      { floatingBubbleEnabled: true, windowBehavior: 'floating' },
      { suppressNextCollapse: true }
    ),
    null
  );
  assert.deepEqual(
    floatingBubbleCollapsePlan(
      { x: 120, y: 120, width: 360, height: 520 },
      workArea,
      { floatingBubbleEnabled: true, windowBehavior: 'floating' }
    ),
    {
      side: 'left',
      expandedBounds: { x: 120, y: 120, width: 360, height: 520 },
      collapsedBounds: { x: 120, y: 363, width: 18, height: 34 }
    }
  );
});

test('floatingBubbleCollapsePlan reuses the last dragged mini-window position', () => {
  assert.deepEqual(
    floatingBubbleCollapsePlan(
      { x: 120, y: 120, width: 360, height: 520 },
      workArea,
      { floatingBubbleEnabled: true, windowBehavior: 'normal' },
      { collapsedBounds: { x: 640, y: 220, width: 18, height: 34 } }
    ),
    {
      side: 'left',
      expandedBounds: { x: 120, y: 120, width: 360, height: 520 },
      collapsedBounds: { x: 640, y: 220, width: 18, height: 34 }
    }
  );
  assert.deepEqual(
    floatingBubbleCollapsePlan(
      { x: 120, y: 120, width: 360, height: 520 },
      workArea,
      { floatingBubbleEnabled: true, windowBehavior: 'normal' },
      { collapsedBounds: { x: 1414, y: 220, width: 18, height: 34 } }
    ),
    {
      side: 'right',
      expandedBounds: { x: 120, y: 120, width: 360, height: 520 },
      collapsedBounds: { x: 1422, y: 220, width: 18, height: 34 }
    }
  );
  assert.deepEqual(
    floatingBubbleCollapsePlan(
      { x: 120, y: 120, width: 360, height: 520 },
      workArea,
      { floatingBubbleEnabled: true, windowBehavior: 'normal' },
      { collapsedBounds: { x: 2000, y: 220, width: 18, height: 34 } }
    ),
    {
      side: 'right',
      expandedBounds: { x: 120, y: 120, width: 360, height: 520 },
      collapsedBounds: { x: 1422, y: 220, width: 18, height: 34 }
    }
  );
});

test('expandedFloatingBubbleBounds opens near the mini-window and stays inside the work area', () => {
  assert.deepEqual(expandedFloatingBubbleBounds({ x: 1100, y: 500, width: 18, height: 34 }, workArea, { width: 360, height: 520 }), {
    x: 758,
    y: 257,
    width: 360,
    height: 520
  });
  assert.deepEqual(expandedFloatingBubbleBounds({ x: 8, y: 8, width: 18, height: 34 }, workArea, { width: 360, height: 520 }), {
    x: 8,
    y: 32,
    width: 360,
    height: 520
  });
});

test('moveFloatingBubbleBounds drags the mini-window while clamping it inside the work area', () => {
  assert.deepEqual(moveFloatingBubbleBounds({ x: 640, y: 220, width: 18, height: 34 }, workArea, { dx: 40, dy: -30 }), {
    x: 680,
    y: 190,
    width: 18,
    height: 34
  });
  assert.deepEqual(moveFloatingBubbleBounds({ x: 8, y: 30, width: 18, height: 34 }, workArea, { dx: -80, dy: -80 }), {
    x: 0,
    y: 32,
    width: 18,
    height: 34
  });
  assert.deepEqual(moveFloatingBubbleBounds({ x: 1420, y: 220, width: 18, height: 34 }, workArea, { dx: 80, dy: 0 }), {
    x: 1422,
    y: 220,
    width: 18,
    height: 34
  });
  assert.deepEqual(moveFloatingBubbleBounds({ x: 1414, y: 220, width: 18, height: 34 }, workArea, { dx: 0, dy: 0 }), {
    x: 1422,
    y: 220,
    width: 18,
    height: 34
  });
});

test('floating bubble collapsed styles fill the mini window with app glass styling', () => {
  const css = fs.readFileSync(stylesPath, 'utf8');
  assert.match(css, /html\.floating-bubble-collapsed-left,\s*body\.floating-bubble-collapsed-left/);
  assert.match(css, /html\.floating-bubble-collapsed-right,\s*body\.floating-bubble-collapsed-right/);
  const collapsedBlock = cssBlock(css, 'html\\.floating-bubble-collapsed-left,\\s*body\\.floating-bubble-collapsed-left,\\s*html\\.floating-bubble-collapsed-right,\\s*body\\.floating-bubble-collapsed-right');
  const tabBlock = cssBlock(css, '\\.floating-bubble-tab');
  assert.match(collapsedBlock, /rgb\(var\(--glass-rgb\)\);/);
  assert.match(tabBlock, /appearance:\s*none;/);
  assert.match(tabBlock, /border:\s*0;/);
  assert.match(tabBlock, /background:\s*transparent;/);
  assert.match(tabBlock, /box-shadow:\s*none;/);
  assert.match(tabBlock, /backdrop-filter:\s*none;/);
  assert.match(css, /html\.floating-bubble-collapsed-left,\s*body\.floating-bubble-collapsed-left\s*\{[\s\S]*border-radius:\s*0;/);
});
