import { eq, asc, and, inArray } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Category, Game, Publisher } from '../types/game';

export interface GameFilters {
    categoryIds?: number[];
    publisherIds?: number[];
}

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function normalizeFilterIds(ids?: number[]): number[] | undefined {
    if (!ids || ids.length === 0) {
        return undefined;
    }

    const uniqueIds = [...new Set(ids.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))];

    return uniqueIds.length > 0 ? uniqueIds : undefined;
}

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database, filters?: GameFilters) {
    const categoryIds = normalizeFilterIds(filters?.categoryIds);
    const publisherIds = normalizeFilterIds(filters?.publisherIds);
    const conditions = [];

    if (categoryIds) {
        conditions.push(inArray(games.categoryId, categoryIds));
    }

    if (publisherIds) {
        conditions.push(inArray(games.publisherId, publisherIds));
    }

    const query = db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));

    return conditions.length > 0 ? query.where(and(...conditions)) : query;
}

/** Returns all games, optionally narrowed to the supplied category or publisher filters. */
export async function getAllGames(db: Database, filters?: GameFilters): Promise<Game[]> {
    const rows = await baseGamesQuery(db, filters).orderBy(asc(games.title));
    return rows.map(mapGame);
}

/** Returns games in the selected categories. */
export async function getGamesByCategory(db: Database, categoryIds: number[]): Promise<Game[]> {
    return getAllGames(db, { categoryIds });
}

/** Returns games from the selected publishers. */
export async function getGamesByPublisher(db: Database, publisherIds: number[]): Promise<Game[]> {
    return getAllGames(db, { publisherIds });
}

/** Returns all available categories ordered by name. */
export async function getAllCategories(db: Database): Promise<Category[]> {
    const rows = await db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.name));
    return rows.map((row) => ({ id: row.id, name: row.name }));
}

/** Returns all available publishers ordered by name. */
export async function getAllPublishers(db: Database): Promise<Publisher[]> {
    const rows = await db.select({ id: publishers.id, name: publishers.name }).from(publishers).orderBy(asc(publishers.name));
    return rows.map((row) => ({ id: row.id, name: row.name }));
}

/** All game ids ordered by title. */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/** A single game by id, or null when it does not exist. */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const rows = await baseGamesQuery(db).all();
    const row = rows.find((entry) => entry.id === id);
    return row ? mapGame(row) : null;
}
