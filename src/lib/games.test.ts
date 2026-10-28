import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getGamesByFilters,
} from './games';

/** Identyfikatory relacji utworzonych do testów filtrowania gier. */
interface FilterFixtureIds {
    strategyId: number;
    partyId: number;
    publisherOneId: number;
    publisherTwoId: number;
}

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategia', description: 'kat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Wydawca Jeden', description: 'wyd' })
        .returning({ id: publishers.id });

    // Wstawiamy tytuły w odwrotnej kolejności alfabetycznej, żeby sprawdzić sortowanie.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Gra ${String(i).padStart(2, '0')}`,
            description: `Opis ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

/** Wstawia gry o zróżnicowanych kategoriach i wydawcach do testów filtrów. */
async function seedFilterableGames(db: Database): Promise<FilterFixtureIds> {
    const [strategy] = await db
        .insert(categories)
        .values({ name: 'Strategia', description: 'kat' })
        .returning({ id: categories.id });
    const [party] = await db
        .insert(categories)
        .values({ name: 'Imprezowa', description: 'kat' })
        .returning({ id: categories.id });
    const [publisherOne] = await db
        .insert(publishers)
        .values({ name: 'Wydawca Jeden', description: 'wyd' })
        .returning({ id: publishers.id });
    const [publisherTwo] = await db
        .insert(publishers)
        .values({ name: 'Wydawca Dwa', description: 'wyd' })
        .returning({ id: publishers.id });

    await db.insert(games).values([
        {
            title: 'Gra A',
            description: 'Opis A',
            categoryId: strategy.id,
            publisherId: publisherOne.id,
        },
        {
            title: 'Gra B',
            description: 'Opis B',
            categoryId: party.id,
            publisherId: publisherOne.id,
        },
        {
            title: 'Gra C',
            description: 'Opis C',
            categoryId: strategy.id,
            publisherId: publisherTwo.id,
        },
    ]);

    return {
        strategyId: strategy.id,
        partyId: party.id,
        publisherOneId: publisherOne.id,
        publisherTwoId: publisherTwo.id,
    };
}

describe('helpery dostępu do danych o grach', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('zwraca wszystkie gry posortowane po tytule', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Gra 01', 'Gra 02', 'Gra 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategia' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Wydawca Jeden' });
    });

    it('zwraca identyfikatory wszystkich gier posortowane po tytule', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('pobiera pojedynczą grę po id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Gra 01');
    });

    it('zwraca null dla nieistniejącej gry', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('łączy filtr kategorii z filtrem wydawcy', async () => {
        const fixture = await seedFilterableGames(db);

        const filtered = await getGamesByFilters(db, {
            categoryIds: [fixture.strategyId],
            publisherId: fixture.publisherOneId,
        });

        expect(filtered.map((game) => game.title)).toEqual(['Gra A']);
    });

    it('wymaga zgodności ze wszystkimi wybranymi kategoriami', async () => {
        const fixture = await seedFilterableGames(db);

        const filtered = await getGamesByFilters(db, {
            categoryIds: [fixture.strategyId, fixture.partyId],
        });

        expect(filtered).toEqual([]);
    });

    it('zwraca wszystkie gry, gdy filtry nie są wybrane', async () => {
        await seedFilterableGames(db);

        const filtered = await getGamesByFilters(db, { categoryIds: [] });

        expect(filtered.map((game) => game.title)).toEqual(['Gra A', 'Gra B', 'Gra C']);
    });
});
