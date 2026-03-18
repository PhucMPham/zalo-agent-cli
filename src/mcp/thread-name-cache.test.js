import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ThreadNameCache } from "./thread-name-cache.js";

/** Create a mock API that returns predictable group/friend data */
function createMockApi(groups = {}, friends = []) {
    return {
        getAllGroups: async () => ({
            gridVerMap: Object.fromEntries(Object.keys(groups).map((id) => [id, 1])),
        }),
        getGroupInfo: async (ids) => ({
            gridInfoMap: Object.fromEntries(ids.filter((id) => groups[id]).map((id) => [id, groups[id]])),
        }),
        getAllFriends: async () => friends,
    };
}

describe("ThreadNameCache", () => {
    let cache;

    beforeEach(() => {
        cache = new ThreadNameCache();
    });

    it("starts empty and not ready", () => {
        assert.equal(cache.ready, false);
        assert.equal(cache.size, 0);
        assert.equal(cache.get("any"), null);
        assert.equal(cache.getName("any"), null);
    });

    it("loads groups and friends on init", async () => {
        const api = createMockApi(
            {
                g1: { name: "Nhóm Chờ Báo Giá", totalMember: 20 },
                g2: { name: "Soạn hàng Q. Vũ", totalMember: 15 },
            },
            [
                { userId: "u1", displayName: "Viet Anh", zaloName: "VA" },
                { userId: "u2", zaloName: "Bob" },
            ],
        );

        await cache.init(api);

        assert.equal(cache.ready, true);
        assert.equal(cache.size, 4);
        assert.deepEqual(cache.get("g1"), { name: "Nhóm Chờ Báo Giá", type: "group", memberCount: 20 });
        assert.equal(cache.getName("g2"), "Soạn hàng Q. Vũ");
        assert.deepEqual(cache.get("u1"), { name: "Viet Anh", type: "dm" });
        assert.equal(cache.getName("u2"), "Bob");
    });

    it("handles API failures gracefully", async () => {
        const api = {
            getAllGroups: async () => {
                throw new Error("network error");
            },
            getAllFriends: async () => {
                throw new Error("network error");
            },
        };

        await cache.init(api);

        assert.equal(cache.ready, true);
        assert.equal(cache.size, 0);
    });

    describe("search", () => {
        beforeEach(async () => {
            const api = createMockApi(
                {
                    g1: { name: "Nhóm Chờ Báo Giá", totalMember: 20 },
                    g2: { name: "Soạn hàng Q. Vũ - QV", totalMember: 15 },
                    g3: { name: "Soạn hàng kho 2", totalMember: 8 },
                    g4: { name: "Admin Team", totalMember: 5 },
                },
                [{ userId: "u1", displayName: "Soạn Văn", zaloName: "SV" }],
            );
            await cache.init(api);
        });

        it("finds groups by Vietnamese name (accent-insensitive)", () => {
            const results = cache.search("soan hang");
            assert.equal(results.length, 2);
            assert.equal(results[0].name, "Soạn hàng kho 2");
            assert.equal(results[1].name, "Soạn hàng Q. Vũ - QV");
        });

        it("finds with exact Vietnamese diacritics", () => {
            const results = cache.search("Soạn hàng");
            assert.equal(results.length, 2);
            assert.ok(results.every((r) => r.type === "group"));
        });

        it("filters by type", () => {
            const groups = cache.search("Soạn", "group");
            assert.equal(groups.length, 2);
            assert.ok(groups.every((r) => r.type === "group"));

            const dms = cache.search("Soạn", "dm");
            assert.equal(dms.length, 1);
            assert.equal(dms[0].name, "Soạn Văn");
        });

        it("respects limit parameter", () => {
            const results = cache.search("Soạn", "all", 1);
            assert.equal(results.length, 1);
        });

        it("returns empty for no match", () => {
            const results = cache.search("xyz_nonexistent");
            assert.equal(results.length, 0);
        });

        it("prioritizes prefix matches", () => {
            const results = cache.search("Admin");
            assert.equal(results[0].name, "Admin Team");
        });
    });

    describe("set (update)", () => {
        it("updates existing entry", async () => {
            const api = createMockApi({ g1: { name: "Old Name", totalMember: 5 } }, []);
            await cache.init(api);

            cache.set("g1", { name: "New Name" });
            assert.equal(cache.getName("g1"), "New Name");
            assert.equal(cache.get("g1").type, "group");
            assert.equal(cache.get("g1").memberCount, 5);
        });

        it("adds new entry", () => {
            cache.set("new1", { name: "New Group", type: "group", memberCount: 3 });
            assert.deepEqual(cache.get("new1"), { name: "New Group", type: "group", memberCount: 3 });
        });
    });
});
