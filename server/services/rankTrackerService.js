import Browserbase from '@browserbasehq/sdk';
import { chromium } from 'playwright-core';

const bb = new Browserbase({
  apiKey: process.env.BROWSERBASE_API_KEY,
});

export async function rankTracker(keyword, targetDomain) {
  let browser;

  try {
    const session = await bb.sessions.create({
      browserSettings: { blockAds: true },
    });

    browser = await chromium.connectOverCDP(session.connectUrl);

    const page = browser.contexts()[0].pages()[0];

    page.setDefaultNavigationTimeout(45000);

    // Open Google
    await page.goto('https://www.google.com', {
      waitUntil: 'networkidle',
    });

    // Handle consent popup
    try {
      const btn = await page.$(
        'button[id="L2AGLb"], form[action*="consent"] button',
      );

      if (btn) {
        await btn.click();
        await page.waitForTimeout(1500);
      }
    } catch {}

    let found = null;
    let allResults = [];

    const cleanTarget = targetDomain.replace('www.', '').toLowerCase();

    // Scan first 5 Google pages
    for (let gPage = 0; gPage < 5; gPage++) {
      await page.goto(
        `https://www.google.com/search?q=${encodeURIComponent(
          keyword,
        )}&start=${gPage * 10}&num=10&hl=en&gl=us`,
        {
          waitUntil: 'networkidle',
        },
      );

      let pageResults = [];

      // Retry extraction
      for (let retry = 0; retry < 3; retry++) {
        try {
          await page.waitForSelector('h3', {
            timeout: 8000,
          });

          await page.waitForTimeout(1500);

          pageResults = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('h3'))
              .map((h3) => {
                let a = h3.closest('a');

                if (!a) {
                  let parent = h3.parentElement;

                  for (
                    let i = 0;
                    i < 5 && parent;
                    i++, parent = parent.parentElement
                  ) {
                    if (parent.tagName === 'A') {
                      a = parent;
                      break;
                    }

                    const link = parent.querySelector('a[href]');

                    if (link && link.contains(h3)) {
                      a = link;
                      break;
                    }
                  }
                }

                if (
                  !a ||
                  !a.href.startsWith('http') ||
                  a.href.includes('google.')
                ) {
                  return null;
                }

                let snippet = '';
                let container = a.parentElement;

                for (
                  let i = 0;
                  i < 6 && container;
                  i++, container = container.parentElement
                ) {
                  const text = container.innerText || '';

                  if (text.length > h3.innerText.length + 50) {
                    snippet = (
                      text
                        .split('\n')
                        .find(
                          (line) =>
                            line.length > 30 &&
                            !line.includes(h3.innerText.substring(0, 20)),
                        ) || ''
                    )
                      .trim()
                      .substring(0, 300);

                    if (snippet) break;
                  }
                }

                return {
                  url: a.href,
                  domain: new URL(a.href).hostname
                    .replace('www.', '')
                    .toLowerCase(),
                  title: h3.innerText.trim(),
                  snippet,
                };
              })
              .filter(Boolean);
          });

          if (pageResults.length > 0) break;

          await page.reload({
            waitUntil: 'networkidle',
          });
        } catch {
          if (retry === 2) break;

          await page.reload({
            waitUntil: 'networkidle',
          });
        }
      }

      if (!pageResults.length) break;

      // Store results
      for (const result of pageResults) {
        result.position = allResults.length + 1;

        allResults.push(result);

        if (!found && result.domain.includes(cleanTarget)) {
          found = {
            ...result,
            page: gPage + 1,
          };
        }
      }

      // Wait before next page
      await page.waitForTimeout(2000 + Math.random() * 2000);
    }

    await browser.close();

    // Extract competitors
    const competitors = allResults
      .filter((result) => result.domain !== cleanTarget)
      .slice(0, 10);

    return {
      success: true,
      data: {
        keyword,
        targetDomain,

        position: found ? found.position : null,

        page: found ? found.page : null,

        competitors,

        title: found ? found.title : '',

        snippet: found ? found.snippet : '',

        totalResultsScanned: allResults.length,
      },
    };
  } catch (error) {
    console.error('Rank check error:', error.message);

    if (browser) {
      await browser.close().catch(() => {});
    }

    return {
      success: false,
      error: error.message,
    };
  }
}
