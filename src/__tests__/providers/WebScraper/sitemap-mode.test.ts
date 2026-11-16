import { WebScraperDataProvider } from "../../../providers/WebScraper";
import { scrapSingleUrl } from "../../../providers/WebScraper/single_url";
import { getLinksFromSitemap } from "../../../providers/WebScraper/sitemap";
import { WebCrawler } from "../../../providers/WebScraper/crawler";

jest.mock("../../../providers/WebScraper/single_url", () => ({
  scrapSingleUrl: jest.fn(),
}));

jest.mock("../../../providers/WebScraper/sitemap", () => ({
  getLinksFromSitemap: jest.fn(),
}));

jest.mock("../../../providers/WebScraper/crawler", () => ({
  WebCrawler: jest.fn(),
}));

const scrapSingleUrlMock = scrapSingleUrl as jest.Mock;
const getLinksFromSitemapMock = getLinksFromSitemap as jest.Mock;
const webCrawlerMock = WebCrawler as unknown as jest.Mock;

async function runSitemapMode(url: string): Promise<string> {
  const provider = new WebScraperDataProvider();
  provider.setOptions({ urls: [url], mode: "sitemap" });
  await provider.getDocuments();
  return getLinksFromSitemapMock.mock.calls[0][0];
}

beforeEach(() => {
  jest.clearAllMocks();
  getLinksFromSitemapMock.mockResolvedValue([]);
  scrapSingleUrlMock.mockResolvedValue({
    content: "scraped content",
    provider: "web-scraper",
    metadata: { sourceURL: "https://example.com/page" },
  });
});

test("sitemap mode resolves a base origin url to sitemap.xml", async () => {
  await expect(runSitemapMode("https://example.com")).resolves.toBe(
    "https://example.com/sitemap.xml"
  );
});

test("sitemap mode resolves a base origin url with a trailing slash to sitemap.xml", async () => {
  await expect(runSitemapMode("https://example.com/")).resolves.toBe(
    "https://example.com/sitemap.xml"
  );
});

test("sitemap mode resolves an http base origin url to sitemap.xml", async () => {
  await expect(runSitemapMode("http://example.com")).resolves.toBe(
    "http://example.com/sitemap.xml"
  );
});

test("sitemap mode keeps the port of a base origin url", async () => {
  await expect(runSitemapMode("http://localhost:3000")).resolves.toBe(
    "http://localhost:3000/sitemap.xml"
  );
});

test("sitemap mode trims a base origin url before resolving it", async () => {
  await expect(runSitemapMode("  https://example.com  ")).resolves.toBe(
    "https://example.com/sitemap.xml"
  );
});

test("sitemap mode preserves an explicit sitemap file url", async () => {
  await expect(runSitemapMode("https://example.com/sitemap.xml")).resolves.toBe(
    "https://example.com/sitemap.xml"
  );
});

test("sitemap mode preserves a sitemap file url with a query string", async () => {
  await expect(
    runSitemapMode("https://example.com/sitemap.xml?page=2")
  ).resolves.toBe("https://example.com/sitemap.xml?page=2");
});

test("sitemap mode preserves a sitemap file url with a nested path", async () => {
  await expect(
    runSitemapMode("https://example.com/nested/sitemap.xml")
  ).resolves.toBe("https://example.com/nested/sitemap.xml");
});

test("sitemap mode preserves a non root path url", async () => {
  await expect(runSitemapMode("https://example.com/docs/sitemap")).resolves.toBe(
    "https://example.com/docs/sitemap"
  );
});

test("sitemap mode converts the resolved sitemap links into documents", async () => {
  getLinksFromSitemapMock.mockResolvedValue([
    "https://example.com/a",
    "https://example.com/b",
  ]);

  const provider = new WebScraperDataProvider();
  provider.setOptions({ urls: ["https://example.com"], mode: "sitemap" });
  const documents = await provider.getDocuments();

  expect(getLinksFromSitemapMock).toHaveBeenCalledTimes(1);
  expect(getLinksFromSitemapMock).toHaveBeenCalledWith(
    "https://example.com/sitemap.xml"
  );
  expect(scrapSingleUrlMock).toHaveBeenCalledTimes(2);
  expect(documents).toHaveLength(2);
  expect(webCrawlerMock).not.toHaveBeenCalled();
});
