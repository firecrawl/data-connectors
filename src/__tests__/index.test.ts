import { Nango } from "@nangohq/node";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test";
  delete process.env.NANGO_SECRET_KEY;
});

afterEach(() => {
  process.env = { ...originalEnv };
  jest.restoreAllMocks();
});

test("importing and constructing providers does not require a Nango secret key", async () => {
  await jest.isolateModulesAsync(async () => {
    const { providers } = await import("../providers/providers");

    expect(providers["google-drive"]).toBeDefined();
    expect(providers["one-drive"]).toBeDefined();
  });
});

test("direct authorization does not require a Nango secret key", async () => {
  process.env.GOOGLE_DRIVE_CLIENT_ID = "client-id";
  process.env.GOOGLE_DRIVE_CLIENT_SECRET = "client-secret";
  process.env.GOOGLE_DRIVE_REDIRECT_URI = "http://localhost";

  const { createDataConnector } = await import("../DataConnector");

  const googleDrive = createDataConnector({ provider: "google-drive" });
  await expect(
    googleDrive.authorize({ access_token: "token" })
  ).resolves.toBeUndefined();

  const oneDrive = createDataConnector({ provider: "one-drive" });
  await expect(
    oneDrive.authorize({ accessToken: "token" })
  ).resolves.toBeUndefined();
});

test("Nango authorization without a secret key fails before requesting a connection", async () => {
  const getConnection = jest.spyOn(Nango.prototype, "getConnection");

  const { createDataConnector } = await import("../DataConnector");

  const googleDrive = createDataConnector({ provider: "google-drive" });
  await expect(
    googleDrive.authorizeNango({ nango_connection_id: "connection-id" })
  ).rejects.toThrow("Nango secret key is required");
  expect(getConnection).not.toHaveBeenCalled();

  const oneDrive = createDataConnector({ provider: "one-drive" });
  await expect(
    oneDrive.authorizeNango({ nango_connection_id: "connection-id" })
  ).rejects.toThrow("Nango secret key is required");
  expect(getConnection).not.toHaveBeenCalled();
});
