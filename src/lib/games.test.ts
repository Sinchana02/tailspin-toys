import { eq } from 'drizzle-orm';
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getAllCategories,
    getAllPublishers,
    getGameById,
    getGamesByCategory,
    getGamesByPublisher,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('filters games by category and publisher together', async () => {
        const [strategy] = await db.insert(categories).values({ name: 'Strategy', description: 'cat' }).returning({ id: categories.id });
        const [puzzle] = await db.insert(categories).values({ name: 'Puzzle', description: 'cat' }).returning({ id: categories.id });
        const [pubOne] = await db.insert(publishers).values({ name: 'Pub One', description: 'pub' }).returning({ id: publishers.id });
        const [pubTwo] = await db.insert(publishers).values({ name: 'Pub Two', description: 'pub' }).returning({ id: publishers.id });

        await db.insert(games).values([
            { title: 'Alpha Strategy', description: 'One', starRating: 4.0, categoryId: strategy.id, publisherId: pubOne.id },
            { title: 'Beta Strategy', description: 'Two', starRating: 4.1, categoryId: strategy.id, publisherId: pubTwo.id },
            { title: 'Gamma Puzzle', description: 'Three', starRating: 4.2, categoryId: puzzle.id, publisherId: pubOne.id },
        ]);

        const filtered = await getAllGames(db, {
            categoryIds: [strategy.id, puzzle.id],
            publisherIds: [pubOne.id],
        });

        expect(filtered.map((game) => game.title)).toEqual(['Alpha Strategy', 'Gamma Puzzle']);
    });

    it('returns games matching a category and publisher helper', async () => {
        await seedGames(db, 3);
        const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.name, 'Strategy'));
        const [publisher] = await db.select({ id: publishers.id }).from(publishers).where(eq(publishers.name, 'Pub One'));

        const byCategory = await getGamesByCategory(db, [category.id]);
        const byPublisher = await getGamesByPublisher(db, [publisher.id]);

        expect(byCategory.length).toBe(3);
        expect(byPublisher.length).toBe(3);
        expect(byCategory.every((game) => game.category?.name === 'Strategy')).toBe(true);
        expect(byPublisher.every((game) => game.publisher?.name === 'Pub One')).toBe(true);
    });

    it('returns all available categories and publishers', async () => {
        await db.insert(categories).values([
            { name: 'Strategy', description: 'cat' },
            { name: 'Puzzle', description: 'cat' },
        ]);
        await db.insert(publishers).values([
            { name: 'Pub One', description: 'pub' },
            { name: 'Pub Two', description: 'pub' },
        ]);

        const categoriesList = await getAllCategories(db);
        const publishersList = await getAllPublishers(db);

        expect(categoriesList.map((category) => category.name)).toEqual(['Puzzle', 'Strategy']);
        expect(publishersList.map((publisher) => publisher.name)).toEqual(['Pub One', 'Pub Two']);
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });
});
