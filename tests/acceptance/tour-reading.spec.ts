import { createHash } from 'node:crypto';
import { readFileSync, renameSync, rmSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { MAP_PATH, PROJECT_DIR, PROJECT_ID, ensureProject, writeLongTourMap, writeReadingMap } from './fixtures';

const TOUR = "A ticket's life";

test.beforeAll(async ({ request }) => {
  await ensureProject(request);
});

test.beforeEach(() => {
  writeReadingMap();
});

async function openReading(page: Page, tour = 't-read', step = 0): Promise<void> {
  await page.goto(`/p/${PROJECT_ID}/main.tour.json?tour=${tour}&step=${step}`);
  await expect(page.locator('[data-region="canvas"]')).toBeVisible();
}

function reading(page: Page, name = TOUR) {
  return page.getByRole('region', { name: `Tour text: ${name}` });
}

test.describe('US1 a stop carries its own words', () => {
  test('shows the position, the type, the label and the narration', async ({ page }) => {
    await openReading(page);
    const card = reading(page);
    await expect(card).toBeVisible();
    await expect(card.getByText('Stop 1 of 4')).toBeVisible();
    await expect(card.getByText('User Need')).toBeVisible();
    await expect(card.getByText('A ticket arrives')).toBeVisible();
    await expect(card.getByText('Every ticket starts in one queue.')).toBeVisible();
  });

  test('puts the description under its own heading, never in place of the narration', async ({ page }) => {
    await openReading(page);
    const card = reading(page);
    await expect(card.getByRole('heading', { name: 'About this waypoint' })).toBeVisible();
    await expect(card.getByText('A person writes in and expects an answer.')).toBeVisible();
    await expect(card.getByText('Every ticket starts in one queue.')).toBeVisible();
  });

  test('swaps the words in place and never stacks a second card', async ({ page }) => {
    await openReading(page);
    const card = reading(page);
    await page.getByRole('button', { name: 'Next stop' }).click();
    await expect(card.getByText('Stop 2 of 4')).toBeVisible();
    await expect(card.getByText('The queue holds it')).toBeVisible();
    await expect(page.locator('[role="region"][aria-label^="Tour text"]')).toHaveCount(1);
    await expect(card.getByText('Every ticket starts in one queue.')).toHaveCount(0);
  });

  test('says so when a stop carries no narration', async ({ page }) => {
    await openReading(page);
    await page.getByRole('button', { name: 'Next stop' }).click();
    const card = reading(page);
    await expect(card.getByText('This stop has no narration yet.')).toBeVisible();
    await expect(card.getByText('The queue holds it')).toBeVisible();
  });

  test('keeps the card clear of the focused stop at every step', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openReading(page);
    for (const [index, waypointId] of ['w-1', 'w-2', 'w-3', 'w-4'].entries()) {
      if (index > 0) {
        await page.getByRole('button', { name: 'Next stop' }).click();
      }
      await expect(reading(page).getByText(`Stop ${index + 1} of 4`)).toBeVisible();
      await expect
        .poll(async () =>
          page.evaluate(id => {
            const card = document.querySelector('[role="region"][aria-label^="Tour text"]');
            const node = document.querySelector(`.react-flow__node[data-id="${id}"]`);
            if (!card || !node) {
              return null;
            }
            const a = card.getBoundingClientRect();
            const b = node.getBoundingClientRect();
            return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
          }, waypointId)
        )
        .toBe(false);
    }
  });

  test('dismisses without losing the walk and comes back from the top row', async ({ page }) => {
    await openReading(page);
    const card = reading(page);
    await card.getByRole('button', { name: 'Hide the tour text' }).click();
    await expect(card).toBeHidden();
    await expect(page.getByText('Step 1 of 4')).toBeVisible();
    await expect(page.locator('[role="group"][aria-label="Map"]')).toBeVisible();

    await page.getByRole('button', { name: 'Next stop' }).click();
    await expect(card).toBeHidden();

    await page.getByRole('button', { name: 'Show the tour text' }).click();
    await expect(card).toBeVisible();
    await expect(card.getByText('Stop 2 of 4')).toBeVisible();
  });

  test('opens again for another tour after a dismissal', async ({ page }) => {
    await openReading(page);
    await reading(page).getByRole('button', { name: 'Hide the tour text' }).click();
    await expect(reading(page)).toBeHidden();

    await page.getByRole('combobox', { name: 'Current tour' }).click();
    await page.getByRole('option', { name: 'No words' }).click();
    await expect(reading(page, 'No words')).toBeVisible();
    await expect(reading(page, 'No words').getByText('Stop 1 of 2')).toBeVisible();
  });

  test('steps the walk with the arrow keys', async ({ page }) => {
    await openReading(page);
    const card = reading(page);
    await page.locator('[role="group"][aria-label="Map"]').focus();

    await page.keyboard.press('ArrowRight');
    await expect(card.getByText('Stop 2 of 4')).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(card.getByText('Stop 3 of 4')).toBeVisible();
    await expect(card.getByText('Triage is where the queue turns into work.')).toBeVisible();

    await page.keyboard.press('ArrowLeft');
    await expect(card.getByText('Stop 2 of 4')).toBeVisible();

    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(card.getByText('Stop 1 of 4')).toBeVisible();
  });
});

test.describe('US2 the map actions leave the map', () => {
  test('keeps the corner free and both actions in the top row', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openReading(page, 't-empty');
    await expect(page.locator('[data-region="map-actions"]')).toHaveCount(0);
    const canvas = page.locator('[data-region="canvas"]');
    await expect(canvas.getByRole('button', { name: 'Save a copy' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Export all maps' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'More map actions' })).toBeHidden();
  });

  test('keeps both actions one control away on a narrow window', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 760 });
    await openReading(page, 't-empty');
    await expect(page.getByRole('button', { name: 'Save a copy' })).toBeHidden();
    await page.getByRole('button', { name: 'More map actions' }).click();
    await expect(page.getByRole('menuitem', { name: 'Save a copy' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Export all maps' })).toBeVisible();
  });

  test('opens the save dialog from the top row', async ({ page }) => {
    await openReading(page);
    await page.getByRole('button', { name: 'Save a copy' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

test.describe('US3 a tour reads end to end', () => {
  test('lists every stop beside a map that stays visible', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openReading(page);
    await page.getByRole('button', { name: 'Whole tour' }).click();
    const panel = reading(page);
    await expect(panel).toBeVisible();
    await expect(panel.getByText(TOUR)).toBeVisible();
    await expect(panel.getByText('Every ticket starts in one queue.')).toBeVisible();
    await expect(panel.getByText('Triage is where the queue turns into work.')).toBeVisible();
    await expect(panel.getByText('The answer is the point of the whole trip.')).toBeVisible();
    await expect(page.locator('[role="group"][aria-label="Map"]')).toBeVisible();
  });

  test('moves the walk to a stop chosen from the panel and returns to the card', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openReading(page);
    await page.getByRole('button', { name: 'Whole tour' }).click();
    await reading(page)
      .getByRole('button', { name: /Stop 3 of 4/ })
      .click();
    const card = reading(page);
    await expect(card.getByText('Stop 3 of 4')).toBeVisible();
    await expect(card.getByText('Triage is where the queue turns into work.')).toBeVisible();
  });

  test('closing the panel returns to the card at the stop being read', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openReading(page);
    await page.getByRole('button', { name: 'Next stop' }).click();
    await page.getByRole('button', { name: 'Whole tour' }).click();
    await reading(page).getByRole('button', { name: 'Hide the tour text' }).click();
    const card = reading(page);
    await expect(card.getByText('Stop 2 of 4')).toBeVisible();
    await expect(card.getByText('The queue holds it')).toBeVisible();
  });

  test('says once that a tour has no narration anywhere', async ({ page }) => {
    await openReading(page, 't-dry');
    await page.getByRole('button', { name: 'Whole tour' }).click();
    const panel = reading(page, 'No words');
    await expect(panel.getByText('This tour has no narration yet.')).toHaveCount(1);
    await expect(panel.getByText('A ticket arrives')).toBeVisible();
    await expect(panel.getByText('The queue holds it')).toBeVisible();
  });

  test('shows a tour that has no stops instead of silence', async ({ page }) => {
    await openReading(page, 't-empty');
    const card = reading(page, 'Not written yet');
    await expect(card).toBeVisible();
    await expect(card.getByText('This tour has no stops yet.')).toBeVisible();
    await expect(card.getByText('Add stops with Edit tour.')).toBeVisible();
  });

  test('reads a forty-stop tour in one panel', async ({ page }) => {
    writeLongTourMap();
    await page.setViewportSize({ width: 1280, height: 900 });
    await openReading(page, 't-long');
    await page.getByRole('button', { name: 'Whole tour' }).click();
    const panel = reading(page, 'Forty stops');
    await expect(panel.getByText('Stop 40 of 40')).toBeVisible();
    await expect(panel.getByText('Narration for stop 40.')).toBeVisible();
    expect(await panel.locator('li').count()).toBe(40);
  });
});

test.describe('reading changes nothing', () => {
  test('leaves the map file untouched and the undo history empty', async ({ page }) => {
    const before = createHash('sha256').update(readFileSync(MAP_PATH)).digest('hex');
    await openReading(page);
    await page.locator('[role="group"][aria-label="Map"]').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.getByRole('button', { name: 'Whole tour' }).click();
    await reading(page)
      .getByRole('button', { name: /Stop 2 of 4/ })
      .click();
    await page.getByRole('button', { name: 'Hide the tour text' }).click();
    await page.getByRole('button', { name: 'Show the tour text' }).click();
    await expect(reading(page).getByText('Stop 2 of 4')).toBeVisible();
    await page.waitForTimeout(1200);
    const after = createHash('sha256').update(readFileSync(MAP_PATH)).digest('hex');
    expect(after).toBe(before);
    await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });

  test('stays legible in the dark theme', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
    await openReading(page);
    await expect(page.locator('html')).toHaveClass(/dark/);
    const card = reading(page);
    await expect(card).toBeVisible();
    await expect(card.getByText('Every ticket starts in one queue.')).toBeVisible();
  });

  test('reads a travelled copy without editing controls', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openReading(page);
    const moved = `${PROJECT_DIR}-reading`;
    rmSync(moved, { recursive: true, force: true });
    renameSync(PROJECT_DIR, moved);
    try {
      await page.reload();
      await expect(page.getByRole('status')).toContainText('read only');
      const card = reading(page);
      await expect(card).toBeVisible();
      await expect(card.getByText('Every ticket starts in one queue.')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Edit tour' })).toBeDisabled();
      expect(await card.getByRole('button', { name: 'Save a copy' }).count()).toBe(0);
    } finally {
      rmSync(PROJECT_DIR, { recursive: true, force: true });
      renameSync(moved, PROJECT_DIR);
    }
  });
});
