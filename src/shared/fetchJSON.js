// @ts-check

/**
 * @param {string} url
 * @param {Object} [options]
 * @param {Record<string, string>} [options.headers]
 */
export async function fetchJSON(url, options) {
    const { hostname, pathname, search } = new URL(url);

    const res = await fetch(url, {
        headers: options?.headers,
    }).catch((error) => {
        return new Response(null, {
            status: 555,
            statusText: "Request failed",
        });
    });

    if (!res.ok) {
        const errorEvent = new CustomEvent("fetchjsonerror", {
            detail: {
                message: `Virhe ${hostname} API:ssa: ${res.status}, parametrit: ${pathname}${search}`,
            },
        });
        document.dispatchEvent(errorEvent);
        return;
    }

    return await res.json();
}
