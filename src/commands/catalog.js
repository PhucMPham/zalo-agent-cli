/**
 * Catalog commands — manage Zalo Shop catalogs and products.
 */

import { resolve } from "path";
import { getApi } from "../core/zalo-client.js";
import { success, error, info, output } from "../utils/output.js";

export function registerCatalogCommands(program) {
    const catalog = program.command("catalog").description("Manage Zalo Shop catalogs and products");

    catalog
        .command("list")
        .description("List all catalogs")
        .option("-l, --limit <n>", "Items per page", parseInt, 20)
        .option("-p, --page <n>", "Page number", parseInt, 0)
        .action(async (opts) => {
            try {
                const result = await getApi().getCatalogList({ limit: opts.limit, page: opts.page });
                output(result, program.opts().json);
            } catch (e) {
                error(`Get catalogs failed: ${e.message}`);
            }
        });

    catalog
        .command("create <name>")
        .description("Create a new catalog")
        .action(async (name) => {
            try {
                const result = await getApi().createCatalog(name);
                output(result, program.opts().json, () => success(`Catalog "${name}" created`));
            } catch (e) {
                error(`Create catalog failed: ${e.message}`);
            }
        });

    catalog
        .command("rename <catalogId> <name>")
        .description("Rename a catalog")
        .action(async (catalogId, name) => {
            try {
                const result = await getApi().updateCatalog({ catalogId, catalogName: name });
                output(result, program.opts().json, () => success(`Catalog renamed to "${name}"`));
            } catch (e) {
                error(`Rename catalog failed: ${e.message}`);
            }
        });

    catalog
        .command("delete <catalogId>")
        .description("Delete a catalog")
        .action(async (catalogId) => {
            try {
                const result = await getApi().deleteCatalog(catalogId);
                output(result, program.opts().json, () => success(`Catalog ${catalogId} deleted`));
            } catch (e) {
                error(`Delete catalog failed: ${e.message}`);
            }
        });

    catalog
        .command("products <catalogId>")
        .description("List products in a catalog")
        .option("-l, --limit <n>", "Items per page", parseInt, 100)
        .option("-p, --page <n>", "Page number", parseInt, 0)
        .action(async (catalogId, opts) => {
            try {
                const result = await getApi().getProductCatalogList({
                    catalogId,
                    limit: opts.limit,
                    page: opts.page,
                });
                output(result, program.opts().json);
            } catch (e) {
                error(`Get products failed: ${e.message}`);
            }
        });

    catalog
        .command("add-product <catalogId> <name> <price> <description>")
        .description("Add a product to a catalog")
        .option("--photos <urls...>", "Product photo URLs (up to 5)")
        .action(async (catalogId, name, price, description, opts) => {
            try {
                const payload = { catalogId, productName: name, price, description };
                if (opts.photos) payload.product_photos = opts.photos;
                const result = await getApi().createProductCatalog(payload);
                output(result, program.opts().json, () => success(`Product "${name}" added to catalog`));
            } catch (e) {
                error(`Add product failed: ${e.message}`);
            }
        });

    catalog
        .command("update-product <catalogId> <productId> <name> <price> <description>")
        .description("Update a product in a catalog")
        .option("--photos <urls...>", "Product photo URLs (up to 5)")
        .action(async (catalogId, productId, name, price, description, opts) => {
            try {
                const payload = {
                    catalogId,
                    productId,
                    productName: name,
                    price,
                    description,
                    createTime: Date.now(),
                };
                if (opts.photos) payload.product_photos = opts.photos;
                const result = await getApi().updateProductCatalog(payload);
                output(result, program.opts().json, () => success(`Product ${productId} updated`));
            } catch (e) {
                error(`Update product failed: ${e.message}`);
            }
        });

    catalog
        .command("delete-product <catalogId> <productIds...>")
        .description("Delete product(s) from a catalog")
        .action(async (catalogId, productIds) => {
            try {
                const result = await getApi().deleteProductCatalog({ catalogId, productIds });
                output(result, program.opts().json, () => success(`Deleted ${productIds.length} product(s)`));
            } catch (e) {
                error(`Delete product failed: ${e.message}`);
            }
        });

    catalog
        .command("upload-photo <filePath>")
        .description("Upload a product photo (returns URL for use with add-product --photos)")
        .action(async (filePath) => {
            try {
                const absPath = resolve(filePath);
                const result = await getApi().uploadProductPhoto({ file: absPath });
                output(result, program.opts().json, () => {
                    info("Photo uploaded. Use the URL with: catalog add-product --photos <url>");
                });
            } catch (e) {
                error(`Upload photo failed: ${e.message}`);
            }
        });
}
