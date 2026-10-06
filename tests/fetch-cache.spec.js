import { test, expect } from "@playwright/test";

const prefix = "hyppykeli:response:v1:";

async function openCacheHarness(page) {
    await page.route("**/cache-test", (route) =>
        route.fulfill({
            contentType: "text/html",
            body: '<script type="importmap">{"imports":{"#app/":"/src/"}}</script>',
        }),
    );
    await page.goto("/cache-test");
    await page.evaluate(async () => {
        const { fetchCached } = await import("#app/shared/fetchCached.js");
        window.cacheFetch = (policy, extra = {}) =>
            fetchCached("/cache-api", {
                format: "json",
                cache: { key: "test", ...policy },
                ...extra,
            });
    });
}

const observations = {
    measurementMaxAgeMs: 60_000,
    minFetchIntervalMs: 60_000,
};
const forecasts = {
    maxFetchAgeMs: 10 * 60_000,
    minFetchIntervalMs: 60_000,
};

async function observationFetch(page) {
    return page.evaluate(
        (policy) =>
            window.cacheFetch({
                ...policy,
                measurementTime: (data) => data.time,
            }),
        observations,
    );
}

test("old measurements are refreshed at most once per minute; fresh measurements are reused", async ({
    page,
}) => {
    await page.clock.install();
    let requests = 0;
    let old = true;
    await page.route("**/cache-api", async (route) => {
        requests++;
        const time = old ? 0 : await page.evaluate(() => Date.now());
        return route.fulfill({ json: { time, value: requests } });
    });
    await openCacheHarness(page);
    expect((await observationFetch(page)).fromCache).toBe(false);
    expect((await observationFetch(page)).stale).toBe(true);
    expect(requests).toBe(1);
    await page.clock.runFor(60_000);
    old = false;
    await observationFetch(page);
    expect(requests).toBe(2);
    expect((await observationFetch(page)).stale).toBe(false);
    expect(requests).toBe(2);
});

test("forecast TTL controls refreshes; failures retain data and throttle retries until recovery", async ({
    page,
}) => {
    await page.clock.install();
    let requests = 0;
    let failed = false;
    await page.route("**/cache-api", (route) => {
        requests++;
        return failed
            ? route.fulfill({ status: 503 })
            : route.fulfill({ json: { value: requests } });
    });
    await openCacheHarness(page);
    await page.evaluate(() => {
        window.cacheFailures = [];
        document.addEventListener("apicacheerror", (event) =>
            window.cacheFailures.push(event.detail),
        );
    });
    const fetch = () =>
        page.evaluate((policy) => window.cacheFetch(policy), forecasts);
    await fetch();
    await page.clock.runFor(9 * 60_000);
    expect((await fetch()).fromCache).toBe(true);
    expect(requests).toBe(1);
    await page.clock.runFor(60_000);
    failed = true;
    const fallback = await fetch();
    expect(fallback).toMatchObject({
        data: { value: 1 },
        fromCache: true,
        stale: true,
    });
    expect(fallback.error).toContain("503");
    await fetch();
    expect(requests).toBe(2);
    expect(
        await page.evaluate(() => window.cacheFailures.at(-1)),
    ).toMatchObject({ cached: true });
    await page.clock.runFor(60_000);
    failed = false;
    expect(await fetch()).toMatchObject({
        data: { value: 3 },
        fromCache: false,
        stale: false,
    });
    expect((await fetch()).error).toBeUndefined();
    expect(requests).toBe(3);
});

test("concurrent callers share a fetch and a cold failure is throttled", async ({
    page,
}) => {
    let requests = 0;
    await page.route("**/cache-api", (route) => {
        requests++;
        return route.fulfill({ status: 503 });
    });
    await openCacheHarness(page);
    const results = await page.evaluate(async (policy) => {
        return Promise.allSettled([
            window.cacheFetch(policy),
            window.cacheFetch(policy),
        ]);
    }, forecasts);
    expect(results.every((result) => result.status === "rejected")).toBe(true);
    expect(requests).toBe(1);
    await page.evaluate(
        (policy) => window.cacheFetch(policy).catch(() => undefined),
        forecasts,
    );
    expect(requests).toBe(1);
});

test("cache-only hydration survives reload, and invalid responses cannot replace valid cached data", async ({
    page,
}) => {
    let requests = 0;
    let malformed = false;
    await page.route("**/cache-api", (route) => {
        requests++;
        return route.fulfill({
            contentType: "application/json",
            body: malformed ? "invalid json" : '{"value":1}',
        });
    });
    await openCacheHarness(page);
    await page.evaluate((policy) => window.cacheFetch(policy), forecasts);
    await page.evaluate((key) => {
        const entry = JSON.parse(localStorage.getItem(key));
        entry.fetchedAt -= 20 * 60_000;
        entry.lastAttemptAt -= 20 * 60_000;
        localStorage.setItem(key, JSON.stringify(entry));
    }, prefix + "test");
    await openCacheHarness(page);
    expect(
        await page.evaluate(
            (policy) => window.cacheFetch(policy, { cacheOnly: true }),
            forecasts,
        ),
    ).toMatchObject({ data: { value: 1 }, fromCache: true, stale: true });
    expect(requests).toBe(1);
    malformed = true;
    expect(
        await page.evaluate((policy) => window.cacheFetch(policy), forecasts),
    ).toMatchObject({ data: { value: 1 }, fromCache: true, stale: true });
    expect(requests).toBe(2);
});

test("XML text is cached and storage failures still allow fetching and reuse", async ({
    page,
}) => {
    let requests = 0;
    await page.route("**/cache-api", (route) => {
        requests++;
        return route.fulfill({
            contentType: "application/xml",
            body: "<weather><gust>7</gust></weather>",
        });
    });
    await openCacheHarness(page);
    await page.evaluate(() => {
        Storage.prototype.setItem = () => {
            throw new Error("Storage full");
        };
        Storage.prototype.getItem = () => {
            throw new Error("Storage blocked");
        };
    });
    const result = await page.evaluate(async (policy) => {
        const first = await window.cacheFetch(policy, { format: "text" });
        const second = await window.cacheFetch(policy, { format: "text" });
        return [first, second];
    }, forecasts);
    expect(result[0].data).toContain("<gust>7</gust>");
    expect(result[1].fromCache).toBe(true);
    expect(requests).toBe(1);
});

for (const warm of [false, true]) {
    test(`cancellation permits an immediate replacement fetch and preserves cached data (warm: ${warm})`, async ({
        page,
    }) => {
        await openCacheHarness(page);
        const result = await page.evaluate(
            async ({ policy, prefix, warm }) => {
                const key = prefix + "test";
                const previous = {
                    data: { value: 1 },
                    hasData: true,
                    fetchedAt: Date.now() - 20 * 60_000,
                    lastAttemptAt: Date.now() - 20 * 60_000,
                    measurementAt: null,
                };
                if (warm) localStorage.setItem(key, JSON.stringify(previous));
                let failures = 0;
                document.addEventListener("apicacheerror", () => failures++);
                // Ignore cancellation in the transport to also exercise late results.
                const responses = [];
                window.fetch = () =>
                    new Promise((resolve) => responses.push(resolve));
                const controller = new AbortController();
                const first = window
                    .cacheFetch(policy, { signal: controller.signal })
                    .catch((error) => error.name);
                await Promise.resolve();
                controller.abort();
                const restored = JSON.parse(localStorage.getItem(key));
                const second = window.cacheFetch(policy);
                await Promise.resolve();
                responses[0](new Response('{"value":99}'));
                const cancelled = await first;
                // The old request's cleanup must not remove the new pending request.
                const shared = window.cacheFetch(policy);
                responses[1](new Response('{"value":2}'));
                const replacement = await second;
                return {
                    restored,
                    cancelled,
                    replacement,
                    shared: await shared,
                    requests: responses.length,
                    cached: JSON.parse(localStorage.getItem(key)).data,
                    failures,
                };
            },
            { policy: forecasts, prefix, warm },
        );
        if (warm) expect(result.restored.data).toEqual({ value: 1 });
        else expect(result.restored).toBeNull();
        expect(result.cancelled).toBe("AbortError");
        expect(result.requests).toBe(2);
        expect(result.replacement.data).toEqual({ value: 2 });
        expect(result.shared.data).toEqual({ value: 2 });
        expect(result.cached).toEqual({ value: 2 });
        expect(result.failures).toBe(0);
    });
}
