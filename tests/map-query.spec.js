import { test, expect } from "@playwright/test";
import { readMapQuery, writeMapQuery } from "./map-query-helpers.js";

test("jumper URLs use labeled values without percent encoding", () => {
    const group = [
        { speedKmh: 180, openingHeight: 800 },
        { speedKmh: 95.5, openingHeight: 1200.5 },
    ];
    const params = new URLSearchParams(writeMapQuery("map_jumpers", group));
    expect(params.toString()).toBe("map_jumpers=s180h800_s95.5h1200.5");
    expect(readMapQuery(Object.fromEntries(params), "map_jumpers")).toEqual(
        group,
    );
});

test("jumper URLs preserve an empty group and an omitted parameter", () => {
    expect(writeMapQuery("map_jumpers", [])).toEqual({ map_jumpers: "" });
    expect(readMapQuery({ map_jumpers: "" }, "map_jumpers")).toEqual([]);
    expect(readMapQuery({}, "map_jumpers")).toBeUndefined();
});

test("jumper URLs reject unlabeled and malformed values", () => {
    for (const value of [
        "180,800;180,800",
        "180h800",
        "s180",
        "s180h800h900",
    ]) {
        expect(readMapQuery({ map_jumpers: value }, "map_jumpers")).toEqual([
            { speedKmh: NaN, openingHeight: NaN },
        ]);
    }
});
