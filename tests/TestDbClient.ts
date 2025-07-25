import { Pool } from 'pg';

const TABLE_NAMES = ['adventures'] as const;

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
    const result = await this.query('SELECT id, description FROM adventure_types;');
    return result.rows;
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
      await this.query(`TRUNCATE TABLE ${table}`);
    }
  }
}
