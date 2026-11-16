import { ScrapingBeeClient } from "scrapingbee";
import { scrapSingleUrl } from "../../../providers/WebScraper/single_url";
import { attemptScrapWithRequests } from "../../../providers/WebScraper/utils/utils";

const originalScrapingBeeApiKey = process.env.SCRAPING_BEE_API_KEY;

jest.mock("scrapingbee", () => ({
  ScrapingBeeClient: jest.fn(),
}));

jest.mock("../../../providers/WebScraper/utils/utils", () => ({
  attemptScrapWithRequests: jest.fn(),
  sanitizeText: jest.fn((text: string) => text),
}));

jest.mock("../../../providers/WebScraper/utils/metadata", () => ({
  extractMetadata: jest.fn(() => ({
    title: "Test title",
    description: "Test description",
    language: null,
  })),
}));

const scrapingBeeClientMock = ScrapingBeeClient as unknown as jest.Mock;
const attemptScrapWithRequestsMock = attemptScrapWithRequests as jest.Mock;

const fallbackHtml =
  "<html><body><h1>Fallback</h1><p>Fallback content</p></body></html>";
const providerHtml =
  "<html><body><h1>Provider</h1><p>Provider content</p></body></html>";

let getMock: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.SCRAPING_BEE_API_KEY;
  getMock = jest.fn();
  scrapingBeeClientMock.mockImplementation(() => ({ get: getMock }));
  attemptScrapWithRequestsMock.mockResolvedValue(fallbackHtml);
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  if (originalScrapingBeeApiKey === undefined) {
    delete process.env.SCRAPING_BEE_API_KEY;
  } else {
    process.env.SCRAPING_BEE_API_KEY = originalScrapingBeeApiKey;
  }
});

test("skips ScrapingBee and uses the requests fallback when no API key is set", async () => {
  const document = await scrapSingleUrl("https://example.com/missing-key");

  expect(scrapingBeeClientMock).not.toHaveBeenCalled();
  expect(getMock).not.toHaveBeenCalled();
  expect(console.warn).not.toHaveBeenCalled();
  expect(console.error).not.toHaveBeenCalled();
  expect(attemptScrapWithRequestsMock).toHaveBeenCalledWith(
    "https://example.com/missing-key"
  );
  expect(document.content).toContain("Fallback content");
  expect(document.metadata.sourceURL).toBe("https://example.com/missing-key");
});

test("warns and falls back to requests when ScrapingBee returns an error status", async () => {
  process.env.SCRAPING_BEE_API_KEY = "test-api-key";
  getMock.mockResolvedValue({ status: 500, data: new Uint8Array() });

  const document = await scrapSingleUrl("https://example.com/provider-status");

  expect(scrapingBeeClientMock).toHaveBeenCalledWith("test-api-key");
  expect(getMock).toHaveBeenCalledTimes(1);
  expect(console.warn).toHaveBeenCalledWith(
    expect.stringContaining("Scraping bee error")
  );
  expect(console.error).not.toHaveBeenCalled();
  expect(attemptScrapWithRequestsMock).toHaveBeenCalledTimes(1);
  expect(document.content).toContain("Fallback content");
});

test("warns and falls back to requests when ScrapingBee throws", async () => {
  process.env.SCRAPING_BEE_API_KEY = "test-api-key";
  getMock.mockRejectedValue(new Error("scrapingbee unreachable"));

  const document = await scrapSingleUrl("https://example.com/provider-throw");

  expect(scrapingBeeClientMock).toHaveBeenCalledWith("test-api-key");
  expect(console.warn).toHaveBeenCalledWith(
    expect.stringContaining("Error scraping with Scraping Bee")
  );
  expect(console.error).not.toHaveBeenCalled();
  expect(attemptScrapWithRequestsMock).toHaveBeenCalledTimes(1);
  expect(document.content).toContain("Fallback content");
});

test("uses ScrapingBee content without falling back when the provider succeeds", async () => {
  process.env.SCRAPING_BEE_API_KEY = "test-api-key";
  getMock.mockResolvedValue({
    status: 200,
    data: new TextEncoder().encode(providerHtml),
  });

  const document = await scrapSingleUrl("https://example.com/provider-success");

  expect(scrapingBeeClientMock).toHaveBeenCalledWith("test-api-key");
  expect(getMock).toHaveBeenCalledTimes(1);
  expect(attemptScrapWithRequestsMock).not.toHaveBeenCalled();
  expect(console.warn).not.toHaveBeenCalled();
  expect(console.error).not.toHaveBeenCalled();
  expect(document.content).toContain("Provider content");
  expect(document.content).not.toContain("Fallback content");
});
