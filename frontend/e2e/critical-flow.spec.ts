import { expect, test, type Page } from "@playwright/test";

const stamp = Date.now().toString();
const clientName = `A E2E School ${stamp}`;
const issueTitle = `A E2E issue ${stamp}`;
const releaseTitle = `E2E release ${stamp}`;

test("login through operational closure", { timeout: 120_000 }, async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept("Client confirmed."));

  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.ADMIN_EMAIL || "admin@example.com");
  await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD || "local-e2e-admin-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.getByRole("link", { name: "clients" }).click();
  await page.getByRole("button", { name: "New client" }).click();
  const clientForm = page.getByRole("form", { name: "Create client" });
  await clientForm.getByLabel("Code").fill(`A-E2E-${stamp}`);
  await clientForm.getByLabel("Name").fill(clientName);
  await clientForm.getByLabel("Type").selectOption({ index: 1 });
  await clientForm.getByLabel("Primary owner").selectOption({ index: 1 });
  await clientForm.getByRole("button", { name: "Create client" }).click();
  await expect(record(page, clientName)).toBeVisible();

  await page.getByRole("link", { name: "issues" }).click();
  await expect(page.getByRole("heading", { name: "Issues" })).toBeVisible();
  await page.getByRole("button", { name: "New issue" }).click();
  const issueForm = page.getByRole("form", { name: "Create issue" });
  await issueForm.getByLabel("Client").selectOption({ label: `${clientName} (A-E2E-${stamp})` });
  await issueForm.getByLabel("Title").fill(issueTitle);
  await issueForm.getByLabel("Description").fill("Browser critical-flow regression.");
  await issueForm.getByRole("button", { name: "Create issue" }).click();
  await record(page, issueTitle).click();

  await transition(page, "assign", "Assignee");
  await transition(page, "triage", "Category", "Regression");
  await transition(page, "start investigation");
  await transition(page, "start development");
  await transition(page, "mark qa");

  await page.getByRole("link", { name: "releases" }).click();
  await page.getByRole("button", { name: "New release" }).click();
  const releaseForm = page.getByRole("form", { name: "Create release" });
  await releaseForm.getByLabel("Version").fill(`e2e-${stamp}`);
  await releaseForm.getByLabel("Title").fill(releaseTitle);
  await releaseForm.getByLabel("Summary").fill("Critical flow release.");
  await releaseForm.getByRole("button", { name: "Create release" }).click();
  await record(page, releaseTitle).click();
  const itemForm = page.getByRole("form", { name: "Add release item" });
  await itemForm.getByLabel("Title").fill("E2E fix");
  await itemForm.getByLabel("Description").fill("Critical flow fix.");
  await selectOptionContaining(itemForm.getByLabel("Related issues"), issueTitle);
  await itemForm.getByRole("button", { name: "Add item" }).click();
  const impactForm = page.getByRole("form", { name: "Add client impact" });
  await selectOptionContaining(impactForm.getByLabel("Client"), clientName);
  await impactForm.getByLabel("Follow-up").check();
  await impactForm.getByRole("button", { name: "Add impact" }).click();
  await page.getByRole("button", { name: "Mark ready" }).click();
  await page.getByRole("button", { name: "Publish release" }).click();
  const publishDialog = page.getByRole("alertdialog");
  await publishDialog.getByRole("button", { name: "Publish release" }).click();
  await expect(publishDialog).toBeHidden();

  await page.getByRole("link", { name: "issues" }).click();
  await record(page, issueTitle).click();
  await transition(page, "mark released", "Release", releaseTitle);
  await expect(page.getByRole("button", { name: "mark released" })).toBeHidden();

  await page.getByRole("link", { name: "handoffs" }).click();
  await record(page, clientName).click();
  await page.getByRole("button", { name: "Acknowledge" }).click();
  await expect(page.getByRole("button", { name: "Acknowledge" })).toBeHidden();

  await page.getByRole("link", { name: "follow ups" }).click();
  await page.getByRole("button", { name: "New follow-up" }).click();
  const followUpForm = page.getByRole("form", { name: "Create follow-up" });
  await selectOptionContaining(followUpForm.getByLabel("Client"), clientName);
  await followUpForm.getByLabel("Handoff").selectOption({ index: 1 });
  await followUpForm.getByLabel("Owner").selectOption({ index: 1 });
  await followUpForm.getByLabel("Reason").fill("Confirm client received release.");
  await followUpForm.getByLabel("Due at").fill("2030-01-01T12:00");
  await followUpForm.getByRole("button", { name: "Create follow-up" }).click();
  const followUp = page.getByRole("listitem").filter({ hasText: clientName }).filter({ hasText: "Confirm client received release." });
  await followUp.getByRole("button", { name: "Start" }).click();
  await followUp.getByRole("button", { name: "Complete" }).click();
  const completeDialog = page.getByRole("alertdialog");
  await completeDialog.getByLabel("Follow-up result").fill("Client confirmed.");
  await completeDialog.getByRole("button", { name: "Complete" }).click();
  await expect(completeDialog).toBeHidden();

  await page.getByRole("link", { name: "documentation" }).click();
  await page.getByRole("button", { name: "New document" }).click();
  const documentationForm = page.locator("form.card.create");
  await documentationForm.getByLabel("Title").fill(`E2E notes ${stamp}`);
  await documentationForm.getByLabel("Summary").fill("Release instructions.");
  await documentationForm.getByLabel("Content").fill("Client follow-up instructions.");
  await documentationForm.getByRole("button", { name: "Create draft" }).click();
  await record(page, `E2E notes ${stamp}`).click();
  await page.getByRole("button", { name: "Link release" }).click();
  await selectOptionContaining(page.getByLabel("Release"), releaseTitle);
  await page.getByRole("button", { name: "Link release" }).last().click();
  await page.getByRole("button", { name: "submit review" }).click();
  await page.getByRole("button", { name: "publish" }).click();

  await page.getByRole("link", { name: "handoffs" }).click();
  await record(page, clientName).click();
  await page.getByRole("button", { name: "Complete handoff" }).click();
  await expect(page.getByText("COMPLETED", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "issues" }).click();
  await record(page, issueTitle).click();
  await transition(page, "start follow up");
  await transition(page, "close", "Resolution summary", "Client confirmed resolution.");
  await expect(page.getByText(/^CLOSED\s+·/)).toBeVisible();
});

async function transition(page: Page, action: string, label?: string, value?: string) {
  await page.getByRole("button", { name: action }).click();
  if (label) {
    const control = label === "Assignee" ? page.locator('[name="assignee_id"]') : label === "Release" ? page.locator('[name="release_id"]') : page.getByLabel(label);
    if (label === "Assignee" || label === "Release") await control.selectOption(value ? { label: value } : { index: 1 });
    else await control.fill(value || "E2E");
  }
  await page.getByRole("button", { name: "Confirm action" }).click();
}

async function selectOptionContaining(select: ReturnType<Page["getByLabel"]>, text: string) {
  const value = await select.getByRole("option", { name: new RegExp(text) }).getAttribute("value");
  if (!value) throw new Error(`Option not found: ${text}`);
  await select.selectOption(value);
}

function record(page: Page, text: string) {
  return page.getByRole("listitem").filter({ hasText: text });
}
