import { Pool } from 'pg';

const TABLE_NAMES = ['adventures', 'chapters', 'chapter_choices'] as const;

type TableNames = (typeof TABLE_NAMES)[number];

export default class TestDbClient {
  #db: Pool;

  constructor(connectionString: string) {
    this.#db = new Pool({ connectionString });
  }

  async close() {
    await this.#db.end();
  }

  async query(text: string, params?: any[]) {
    return await this.#db.query(text, params);
  }

  async queryAdventureTypes() {
    const result = await this.query('SELECT id, description, setting FROM adventure_types;');
    return result.rows;
  }

  async createAdventure(adventureType: string, isActive: boolean) {
    const text =
      'INSERT INTO adventures (adventure_type_id, active, created) VALUES ($1, $2, $3) RETURNING *';
    const values = [adventureType, isActive, new Date()];
    const result = await this.query(text, values);

    return result.rows[0];
  }

  async createChapter(adventureId: string, chapterNumber: number, narrative: string) {
    const text =
      'INSERT INTO chapters (adventure_id, number, narrative, created) VALUES ($1, $2, $3, $4) RETURNING *';
    const values = [adventureId, chapterNumber, narrative, new Date()];
    const result = await this.query(text, values);

    return result.rows[0];
  }

  async createChapterChoice(chapterId: string, action: string, chosen: boolean) {
    const text =
      'INSERT INTO chapter_choices (chapter_id, action, chosen) VALUES ($1, $2, $3) RETURNING *';
    const values = [chapterId, action, chosen];
    const result = await this.query(text, values);

    return result.rows[0];
  }

  async getAdventure(adventureId: string) {
    const text =
      'SELECT id, active, created, last_modified, adventure_type_id FROM adventures WHERE id = $1';
    const result = await this.query(text, [adventureId]);

    return result.rows[0];
  }

  async getChapterChoice(chapterId: string) {
    const text = 'SELECT id, action, chosen, chapter_id FROM chapter_choices WHERE id = $1';
    const result = await this.query(text, [chapterId]);

    return result.rows[0];
  }

  async cleanupTables(tables: TableNames[]) {
    /* 
        Only allow valid table names for execution as we cannot use
        parameterized queries for identifiers without more dependencies
    */
    if (!tables.every((table) => TABLE_NAMES.includes(table))) {
      throw new Error('Invalid table name supplied for cleanup');
    }

    for (const table of tables) {
      await this.query(`DELETE FROM ${table}`);
    }
  }
}
