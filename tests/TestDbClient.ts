import { Pool } from 'pg';

export default class TestDbClient {
  #db: Pool;

  constructor(connectionString: string) {
    this.#db = new Pool({ connectionString });
  }

  query(text: string, params?: any[]) {
    return this.#db.query(text, params);
  }
}
