/**
 * Integration tests must opt in to a separately named test database. They must
 * never inherit DATABASE_URL or read .env.local, which may point at real data.
 */
export function getReadOnlyTestDatabaseUrl(): string {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("Set TEST_DATABASE_URL to run PostgreSQL integration tests.");
  const url = new URL(value);
  if (!/(?:^|[_-])test(?:[_-]|$)/i.test(url.pathname)) {
    throw new Error("TEST_DATABASE_URL must use a database name containing 'test'.");
  }
  return value;
}
