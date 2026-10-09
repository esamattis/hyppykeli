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

test("canopy settings round-trip in shared URLs and old URLs use supplied defaults", () => {
    const defaults = {
        direction: 0,
        speedKmh: 157,
        separationSeconds: 5,
        exitHeight: 4000,
        canopyGlideRatio: 3,
        canopyDescentRateMps: 5,
    };
    const configured = {
        ...defaults,
        canopyGlideRatio: 2.7,
        canopyDescentRateMps: 4.2,
    };
    const params = writeMapQuery("map_run_settings", configured);
    expect(params.map_canopy_glide_ratio).toBe("2.7");
    expect(params.map_canopy_descent_rate).toBe("4.2");
    expect(readMapQuery(params, "map_run_settings", defaults)).toEqual(
        configured,
    );
    expect(
        readMapQuery(
            { map_run_direction: "180" },
            "map_run_settings",
            defaults,
        ),
    ).toEqual({
        ...defaults,
        direction: 180,
    });
});
