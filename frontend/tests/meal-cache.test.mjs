import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createServer } from "vite";

let server;
let queries;
let keys;

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true, ws: false, watch: null },
    appType: "custom",
  });
  queries = await server.ssrLoadModule("/src/api/queries.ts");
  ({ keys } = await server.ssrLoadModule("/src/api/keys.ts"));
});

after(async () => { await server?.close(); });

for (const operation of ["rename", "delete"]) {
  test(`${operation} refreshes the journal and recipe meal history`, async (t) => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });
    t.after(() => client.clear());
    const previous = [{ id: 1, recipe_id: 7, recipe_title: "Ancien titre" }];
    const updated = operation === "delete" ? [] : [{ ...previous[0], recipe_title: "Nouveau titre" }];
    const mealKeys = [keys.mealList("alice"), keys.mealList("alice", 7)];
    for (const key of mealKeys) client.setQueryData(key, previous);

    t.mock.method(globalThis, "fetch", async (url, options) => {
      assert.equal(url, "/api/recipes/7");
      assert.equal(options.method, operation === "delete" ? "DELETE" : "PUT");
      return operation === "delete"
        ? new Response(null, { status: 204 })
        : Response.json({ id: 7, title: "Nouveau titre" });
    });

    let mutation;
    function Probe() {
      mutation = operation === "delete" ? queries.useDeleteRecipe() : queries.useSaveRecipe();
      return null;
    }
    renderToString(createElement(QueryClientProvider, { client }, createElement(Probe)));
    await mutation.mutateAsync(operation === "delete" ? 7 : { id: 7, input: { title: "Nouveau titre" } });

    // A return to either screen must fetch fresh data despite the 30s staleTime.
    for (const key of mealKeys) {
      let requests = 0;
      const result = await client.fetchQuery({
        queryKey: key,
        queryFn: async () => { requests++; return updated; },
      });
      assert.equal(requests, 1);
      assert.deepEqual(result, updated);
    }
  });
}

test("switching accounts never reuses another user's fresh meal history", async (t) => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });
  t.after(() => client.clear());
  for (const recipeId of [undefined, 7]) {
    const privateMeals = [{ id: 1, comment: "Commentaire privé d'Alice" }];
    client.setQueryData(keys.mealList("alice", recipeId), privateMeals);
    assert.equal(client.getQueryData(keys.mealList(null, recipeId)), undefined);
    assert.equal(client.getQueryData(keys.mealList("bob", recipeId)), undefined);
    let requests = 0;
    const meals = await client.fetchQuery({
      queryKey: keys.mealList("bob", recipeId),
      queryFn: async () => { requests++; return []; },
    });
    assert.equal(requests, 1);
    assert.deepEqual(meals, []);
    assert.deepEqual(client.getQueryData(keys.mealList("alice", recipeId)), privateMeals);
  }
});
