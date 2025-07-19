declare global {
  interface ImportMeta {
    env: {
      TEST_DATABASE_URL: string;
    };
  }
}

export {};
