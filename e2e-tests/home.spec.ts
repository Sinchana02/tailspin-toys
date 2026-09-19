import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the correct title', async ({ page }) => {
    // Check that the page title is correct
    await expect(page).toHaveTitle('Tailspin Toys - Crowdfunding your new favorite game!');
  });

  test('should display the main heading', async ({ page }) => {
    // Check that the main page heading is present
    await expect(page.getByRole('heading', { name: 'Welcome to Tailspin Toys', exact: true })).toBeVisible();
  });

  test('should display the site branding in header', async ({ page }) => {
    // Check that the site branding is present in the header (no longer an h1)
    await expect(page.getByText('Tailspin Toys').first()).toBeVisible();
  });

  test('should display the welcome message', async ({ page }) => {
    // Check that the welcome message is present using more specific locator
    await expect(page.getByText('Find your next game! And maybe even back one! Explore our collection!')).toBeVisible();
  });

  test('should filter games by category and publisher together', async ({ page }) => {
    const strategyCheckbox = page.getByTestId('category-filter-1');
    const publisherSelect = page.getByTestId('publisher-filter');
    const applyButton = page.getByTestId('apply-filters-button');

    await expect(strategyCheckbox).toBeVisible();
    await expect(publisherSelect).toBeVisible();

    await strategyCheckbox.check();
    await publisherSelect.selectOption({ label: 'GitHub Games' });
    await applyButton.click();

    await expect(page).toHaveURL(/\/\?category=1&publisher=3/);
    await expect(page.getByTestId('games-count')).toContainText('Showing 1 game');
    await expect(page.getByRole('heading', { name: 'Server Siege' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pipeline Conquest' })).not.toBeVisible();
  });

  test('should allow users to clear selected filters', async ({ page }) => {
    await page.getByTestId('category-filter-1').check();
    await page.getByTestId('publisher-filter').selectOption({ label: 'GitHub Games' });
    await page.getByTestId('apply-filters-button').click();

    await page.getByTestId('clear-filters-link').click();
    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('games-count')).toContainText('Showing');
  });
});
