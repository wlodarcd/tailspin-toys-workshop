import { test, expect } from '@playwright/test';

test.describe('Filtrowanie katalogu gier', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('łączy wiele kategorii zgodnie z logiką AND i ogłasza brak wyników', async ({ page }) => {
    const categoryFilters = page.getByRole('checkbox');
    const firstCategory = categoryFilters.nth(0);
    const secondCategory = categoryFilters.nth(1);
    const visibleGames = page.getByTestId('game-card').filter({ visible: true });

    await expect(firstCategory).toHaveAccessibleName(/.+/);
    await firstCategory.focus();
    await firstCategory.press('Space');
    await expect(firstCategory).toBeChecked();
    await expect(visibleGames.first()).toBeVisible();

    await secondCategory.check();

    await expect(page.getByTestId('filtered-empty-state')).toBeVisible();
    await expect(visibleGames).toHaveCount(0);
  });

  test('filtruje gry po wydawcy', async ({ page }) => {
    const gameCards = page.getByTestId('game-card');
    const publisherId = await gameCards.first().getAttribute('data-game-publisher-id');

    if (!publisherId) {
      throw new Error('Pierwsza gra nie ma wydawcy.');
    }

    const expectedCount = await gameCards.evaluateAll(
      (cards, selectedPublisherId) =>
        cards.filter((card) => card.getAttribute('data-game-publisher-id') === selectedPublisherId)
          .length,
      publisherId,
    );

    await page.getByLabel('Wydawca').selectOption(publisherId);

    const visibleGames = gameCards.filter({ visible: true });
    await expect(visibleGames).toHaveCount(expectedCount);
    for (let index = 0; index < expectedCount; index++) {
      await expect(visibleGames.nth(index)).toHaveAttribute('data-game-publisher-id', publisherId);
    }
  });

  test('łączy kategorię z wydawcą', async ({ page }) => {
    const firstGame = page.getByTestId('game-card').first();
    const categoryId = await firstGame.getAttribute('data-game-category-id');
    const publisherId = await firstGame.getAttribute('data-game-publisher-id');

    if (!categoryId || !publisherId) {
      throw new Error('Pierwsza gra nie ma kategorii lub wydawcy.');
    }

    await page.getByTestId(`filter-category-${categoryId}`).check();
    await page.getByLabel('Wydawca').selectOption(publisherId);

    const visibleGames = page.getByTestId('game-card').filter({ visible: true });
    await expect(visibleGames.first()).toHaveAttribute('data-game-category-id', categoryId);
    await expect(visibleGames.first()).toHaveAttribute('data-game-publisher-id', publisherId);
  });

  test('czyści filtry i ponownie pokazuje cały katalog', async ({ page }) => {
    const gameCards = page.getByTestId('game-card');
    const totalGames = await gameCards.count();
    const firstCategory = page.getByRole('checkbox').first();
    const firstPublisherId = await gameCards.first().getAttribute('data-game-publisher-id');

    if (!firstPublisherId) {
      throw new Error('Pierwsza gra nie ma wydawcy.');
    }

    await firstCategory.check();
    await page.getByLabel('Wydawca').selectOption(firstPublisherId);
    await page.getByRole('button', { name: 'Wyczyść filtry' }).click();

    await expect(firstCategory).not.toBeChecked();
    await expect(page.getByLabel('Wydawca')).toHaveValue('');
    await expect(gameCards.filter({ visible: true })).toHaveCount(totalGames);
    await expect(page.getByTestId('filtered-empty-state')).toBeHidden();
  });
});
