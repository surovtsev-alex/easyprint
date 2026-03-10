import { test, expect, type Page } from "@playwright/test";

// Helpers
async function waitForApp(page: Page) {
  // Wait for the main layout to render with plugin buttons
  await page.waitForSelector("text=EasyPrint", { timeout: 15000 });
  // Wait for plugins to register (they load in useEffect)
  await page.waitForSelector('button[title="Sketch"]', { timeout: 10000 });
}

async function getCanvasCount(page: Page): Promise<number> {
  return page.locator("canvas").count();
}

// ─── Basic App Loading ───

test.describe("App Loading", () => {
  test("should load the app and display toolbar", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    // EasyPrint branding
    await expect(page.locator("text=EasyPrint")).toBeVisible();

    // Plugin buttons should be present
    await expect(page.locator('button[title="Sketch"]')).toBeVisible();
    await expect(page.locator('button[title="Extrude"]')).toBeVisible();
    await expect(page.locator('button[title="Hole"]')).toBeVisible();
  });

  test("should have a canvas in single view", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    const canvasCount = await getCanvasCount(page);
    expect(canvasCount).toBe(1);
  });

  test("should have sidebar with Bodies and Sketches sections", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    // Use .first() since labels may appear in multiple places
    await expect(page.locator("text=No bodies yet").first()).toBeVisible();
    await expect(page.locator("text=No sketches yet").first()).toBeVisible();
  });
});

// ─── View Switching ───

test.describe("View Switching", () => {
  test("should switch from single to quad view", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    // Single view: 1 canvas
    expect(await getCanvasCount(page)).toBe(1);

    // Click quad toggle
    await page.click("text=Quad");

    // Quad view: 4 canvases
    await page.waitForTimeout(500); // let R3F mount
    expect(await getCanvasCount(page)).toBe(4);

    // Labels should be visible
    await expect(page.locator("text=Perspective")).toBeVisible();
    await expect(page.locator("text=Top")).toBeVisible();
    await expect(page.locator("text=Front")).toBeVisible();
    await expect(page.locator("text=Right")).toBeVisible();
  });

  test("should switch back from quad to single", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    await page.click("text=Quad");
    await page.waitForTimeout(500);
    expect(await getCanvasCount(page)).toBe(4);

    await page.click("text=Single");
    await page.waitForTimeout(500);
    expect(await getCanvasCount(page)).toBe(1);
  });
});

// ─── Sketch Plugin ───

test.describe("Sketch Plugin", () => {
  test("should activate sketch and show plane selector", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    // Click Sketch button
    await page.click('button[title="Sketch"]');

    // Plane selector should appear
    await expect(page.locator("text=XY")).toBeVisible({ timeout: 3000 });
    await expect(page.locator("text=XZ")).toBeVisible();
    await expect(page.locator("text=YZ")).toBeVisible();
  });

  test("should show sketch toolbar after selecting plane", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    await page.click('button[title="Sketch"]');
    await page.waitForSelector("text=XY", { timeout: 3000 });

    // Select XY plane
    await page.click("text=XY");

    // Sketch toolbar should appear with drawing tools
    // Use button-specific locators to avoid matching other elements
    await expect(page.locator('button[title*="line"]').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('button[title*="rectangle"]')).toBeVisible();
    await expect(page.locator('button[title*="circle"]')).toBeVisible();
    await expect(page.locator('button[title*="arc"]')).toBeVisible();
    await expect(page.locator('button[title*="ellipse"]')).toBeVisible();

    // Finish / Cancel buttons
    await expect(page.locator("button", { hasText: "Finish" })).toBeVisible();
    await expect(page.locator("button", { hasText: "Cancel" })).toBeVisible();
  });

  test("should draw a rectangle on the canvas", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    // Enter sketch mode
    await page.click('button[title="Sketch"]');
    await page.waitForSelector("text=XY", { timeout: 3000 });
    await page.click("text=XY");
    await page.waitForSelector("text=Rect", { timeout: 3000 });

    // Select rectangle tool
    await page.click("text=Rect");

    // Draw rectangle by dragging on canvas
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx - 50, cy - 30);
    await page.mouse.down();
    await page.mouse.move(cx + 50, cy + 30, { steps: 5 });
    await page.mouse.up();

    // Finish sketch
    await page.click("text=Finish");

    // Sketch should appear in sidebar
    await expect(page.locator("text=No sketches yet").first()).not.toBeVisible();
    await expect(page.getByText(/Sketch \(XY\)/).first()).toBeVisible({ timeout: 3000 });
  });

  test("should cancel sketch and not save", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    await page.click('button[title="Sketch"]');
    await page.waitForSelector("text=XY", { timeout: 3000 });
    await page.click("text=XY");
    await page.waitForSelector("text=Cancel", { timeout: 3000 });

    await page.click("text=Cancel");

    // No sketch should appear
    await expect(page.locator("text=No sketches yet")).toBeVisible();
  });

  test("should switch tools via keyboard shortcuts", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    await page.click('button[title="Sketch"]');
    await page.waitForSelector("text=XY", { timeout: 3000 });
    await page.click("text=XY");
    await page.waitForSelector("text=Line", { timeout: 3000 });

    // Line should be active by default (first tool)
    // Press R for rectangle
    await page.keyboard.press("r");
    // Rect button should now have active styling (bg-blue-600)
    const rectBtn = page.locator('button[title*="rectangle" i]');
    await expect(rectBtn).toHaveClass(/bg-blue-600/);

    // Press C for circle
    await page.keyboard.press("c");
    const circleBtn = page.locator('button[title*="circle" i]');
    await expect(circleBtn).toHaveClass(/bg-blue-600/);

    // Press S for select
    await page.keyboard.press("s");
    const selectBtn = page.locator('button[title*="select" i]');
    await expect(selectBtn).toHaveClass(/bg-blue-600/);
  });
});

// ─── Extrude Plugin ───

test.describe("Extrude Plugin", () => {
  test("should show extrude dialog with sketch picker", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    // First create a sketch with a rectangle
    await page.click('button[title="Sketch"]');
    await page.waitForSelector("text=XY", { timeout: 3000 });
    await page.click("text=XY");
    await page.waitForSelector("text=Rect", { timeout: 3000 });
    await page.click("text=Rect");

    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx - 40, cy - 25);
    await page.mouse.down();
    await page.mouse.move(cx + 40, cy + 25, { steps: 5 });
    await page.mouse.up();

    await page.click("text=Finish");
    await page.waitForTimeout(300);

    // Now click Extrude
    await page.click('button[title="Extrude"]');

    // Extrude dialog should appear
    await expect(page.locator("text=Extrude").nth(1)).toBeVisible({ timeout: 3000 });
    await expect(page.locator("text=Distance")).toBeVisible();
  });

  test("should extrude a rectangle and create a body", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    // Create sketch
    await page.click('button[title="Sketch"]');
    await page.waitForSelector("text=XY", { timeout: 3000 });
    await page.click("text=XY");
    await page.waitForSelector("text=Rect", { timeout: 3000 });
    await page.click("text=Rect");

    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx - 40, cy - 25);
    await page.mouse.down();
    await page.mouse.move(cx + 40, cy + 25, { steps: 5 });
    await page.mouse.up();

    await page.click("text=Finish");
    await page.waitForTimeout(300);

    // Extrude
    await page.click('button[title="Extrude"]');
    await page.waitForSelector("text=Distance", { timeout: 3000 });

    // Click the Extrude button in dialog (not the toolbar button)
    const extrudeBtn = page.locator("button", { hasText: "Extrude" }).last();
    await extrudeBtn.click();

    // Body should appear in sidebar
    await expect(page.locator("text=No bodies yet")).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Body 1")).toBeVisible();
  });
});

// ─── Scene Persistence ───

test.describe("Scene Persistence", () => {
  test("sketch should remain visible after finishing", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    // Create sketch with circle
    await page.click('button[title="Sketch"]');
    await page.waitForSelector("text=XY", { timeout: 3000 });
    await page.click("text=XY");
    await page.waitForSelector('button[title*="circle" i]', { timeout: 3000 });
    await page.click('button[title*="circle" i]');

    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 40, cy, { steps: 5 });
    await page.mouse.up();

    await page.click("text=Finish");
    await page.waitForTimeout(300);

    // Sketch should be in sidebar
    await expect(page.getByText(/Sketch \(XY\)/).first()).toBeVisible();

    // Click another tool and come back — sketch data still in sidebar
    await page.click('button[title="Hole"]');
    await page.waitForTimeout(200);

    await expect(page.getByText(/Sketch \(XY\)/).first()).toBeVisible();
  });

  test("objects should survive view mode toggle", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    // Create a sketch
    await page.click('button[title="Sketch"]');
    await page.waitForSelector("text=XY", { timeout: 3000 });
    await page.click("text=XY");
    await page.waitForSelector("text=Rect", { timeout: 3000 });
    await page.click("text=Rect");

    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx - 30, cy - 20);
    await page.mouse.down();
    await page.mouse.move(cx + 30, cy + 20, { steps: 5 });
    await page.mouse.up();

    await page.click("text=Finish");
    await page.waitForTimeout(300);

    // Sketch in sidebar
    await expect(page.getByText(/Sketch \(XY\)/).first()).toBeVisible();

    // Switch to quad view
    await page.click("text=Quad");
    await page.waitForTimeout(500);

    // Sketch should still be in sidebar
    await expect(page.getByText(/Sketch \(XY\)/).first()).toBeVisible();

    // Switch back to single
    await page.click("text=Single");
    await page.waitForTimeout(500);

    // Still there
    await expect(page.getByText(/Sketch \(XY\)/).first()).toBeVisible();
  });

  test("body should survive view mode toggle after extrude", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    // Create sketch + extrude
    await page.click('button[title="Sketch"]');
    await page.waitForSelector("text=XY", { timeout: 3000 });
    await page.click("text=XY");
    await page.waitForSelector("text=Rect", { timeout: 3000 });
    await page.click("text=Rect");

    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx - 40, cy - 25);
    await page.mouse.down();
    await page.mouse.move(cx + 40, cy + 25, { steps: 5 });
    await page.mouse.up();

    await page.click("text=Finish");
    await page.waitForTimeout(300);

    await page.click('button[title="Extrude"]');
    await page.waitForSelector("text=Distance", { timeout: 3000 });
    await page.locator("button", { hasText: "Extrude" }).last().click();
    await page.waitForTimeout(300);

    await expect(page.locator("text=Body 1")).toBeVisible({ timeout: 3000 });

    // Toggle views
    await page.click("text=Quad");
    await page.waitForTimeout(500);
    await expect(page.locator("text=Body 1")).toBeVisible();

    await page.click("text=Single");
    await page.waitForTimeout(500);
    await expect(page.locator("text=Body 1")).toBeVisible();
  });
});

// ─── Sketch Editing ───

test.describe("Sketch Editing", () => {
  test("should re-enter sketch edit mode on double-click in sidebar", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    // Create a sketch
    await page.click('button[title="Sketch"]');
    await page.waitForSelector("text=XY", { timeout: 3000 });
    await page.click("text=XY");
    await page.waitForSelector("text=Rect", { timeout: 3000 });
    await page.click("text=Rect");

    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx - 30, cy - 20);
    await page.mouse.down();
    await page.mouse.move(cx + 30, cy + 20, { steps: 5 });
    await page.mouse.up();

    await page.click("text=Finish");
    await page.waitForTimeout(300);

    // Double-click sketch in sidebar to re-edit
    // Double-click the sketch entry in sidebar (use the one with "elements" text)
    const sketchEntry = page.getByText(/Sketch \(XY\) - \d+ elements/).first();
    await sketchEntry.dblclick();

    // Sketch toolbar should reappear
    await expect(page.locator('button[title*="Draw a line"]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator("button", { hasText: "Finish" })).toBeVisible();
  });
});
