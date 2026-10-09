import { readFile } from "node:fs/promises";
import { mapQueryKeys } from "../src/map/mapQuery.js";
export { readMapQuery, writeMapQuery } from "../src/map/mapQuery.js";

export function mapQuerySnapshot(params, key) {
    const values = mapQueryKeys(key).map((field) => params.get(field));
    if (values.every((value) => value === null)) return null;
    if (values.every((value) => value === "null")) return "null";
    return values.join(",");
}

/** Install the same pure query helpers for browser-side test calculations. */
export async function installMapQueryHelpers(page) {
    const source =
        (
            await readFile(
                new URL("../src/map/mapQuery.js", import.meta.url),
                "utf8",
            )
        ).replaceAll("export ", "") +
        "\n" +
        mapQuerySnapshot.toString() +
        "\nObject.assign(globalThis, { readMapQuery, writeMapQuery, mapQuerySnapshot });";
    await page.addInitScript({ content: source });
    await page.evaluate(source);
}
