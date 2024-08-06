/* To protect against version incompatibility, this script includes the @NApiVersion tag.
* mro_serverside.js
* @NApiVersion 2.x
*/

define(['N/record', 'N/search', 'N/log', 'N/crypto', 'N/encode', 'N/cache'], function (_record, _search, _log, _crypto, _encode, _cache) {

    function isNullOrEmpty(val) {
        return (val == null || val == '' || val == undefined);
    }

    function brandLoader() {
        var cache = _cache.getCache({
            name: "brand_cache",
            scope: _cache.Scope.PROTECTED
        });
        var search = _search.create({
                type: "customrecord_mro_brand",
                columns: [
                    "internalid",
                    "externalid",
                    "name",
                    "custrecord_mro_brand_logoimage",
                    "custrecord_mro_brand_techsprt_phone",
                    // "custrecord_mro_brand_detaileddescription",
                    "custrecord_mro_brand_warrantyinformation",
                    "custrecord_mro_brand_returnpolicy"
                ]
            }
        );
        search.run().each(function (result) {
            var value = {
                "id": result.getValue("internalid"),
                "externalid": result.getValue("externalid"),
                "name": result.getValue("name"),
                "logo": result.getValue("custrecord_mro_brand_logoimage"),
                "tech_support_phone": result.getValue("custrecord_mro_brand_techsprt_phone"),
                // "detail_description": result.getValue("custrecord_mro_brand_detaileddescription"),
                "warranty_information": result.getValue("custrecord_mro_brand_warrantyinformation"),
                "return_policy": result.getValue("custrecord_mro_brand_returnpolicy")
            };
            _log.audit({title: 'brandLoader', details: value});

            cache.put({
                key: result.getValue("internalid"),
                value: value,
                ttl: (8 * 60 * 60)
            });

            return true;
        });
    }

    function categoryLoader() {
        var cache = _cache.getCache({
            name: "category_cache",
            scope: _cache.Scope.PROTECTED
        });
        var search = _search.create({
                type: "customrecord_mro_prod_category",
                columns: [
                    "internalid",
                    "externalid",
                    "name",
                    "custrecord_mro_prod_category_prodcount",
                    "custrecord_mro_prod_category_image",
                    "custrecord_mro_prod_category_leaf",
                ]
            }
        );
        search.run().each(function (result) {
            var value = {
                "id": result.getValue("internalid"),
                "externalid": result.getValue("externalid"),
                "name": result.getValue("name"),
                "image": result.getValue("custrecord_mro_prod_category_image"),
                "leaf": result.getValue("custrecord_mro_prod_category_leaf"),
                "product_count": result.getValue("custrecord_mro_prod_category_prodcount")
            };
            _log.audit({title: 'categoryLoader', details: value});
            cache.put({
                key: result.getValue("internalid"),
                value: value,
                ttl: (8 * 60 * 60)
            });

            return true;
        });
    }

    function uomLoader() {
        var sublist = "uom";
        var cache = _cache.getCache({
            name: "uom_cache",
            scope: _cache.Scope.PROTECTED
        });
        var search = _search.create({type: "unitstype", columns: ["internalid"]});
        search.run().each(function (result) {

            var unittype = _record.load({type: "unitstype", id: result.id});
            var lines = unittype.getLineCount({sublistId: sublist});

            for (var line = 0; line < lines; line++) {
                var key = unittype.getSublistValue({sublistId: sublist, fieldId: "internalid", line: line});
                var value = unittype.getSublistValue({sublistId: sublist, fieldId: "abbreviation", line: line})

                cache.put({
                    key: key,
                    value: value,
                    ttl: (8 * 60 * 60)
                });
            }
            return true;
        });
    }

    function getUnitOfMeasure(id) {
        var cache = _cache.getCache({
            name: "uom_cache",
            scope: _cache.Scope.PROTECTED
        });
        var result = cache.get({
            key: id,
            loader: uomLoader
        });
        return result;
    }

    function getBrand(id) {
        var cache = _cache.getCache({
            name: "brand_cache",
            scope: _cache.Scope.PROTECTED
        });
        return JSON.parse(cache.get({
            key: id,
            // loader: brandLoader
        }));
    }

    function getCategory(id) {
        var cache = _cache.getCache({
            name: "category_cache",
            scope: _cache.Scope.PROTECTED
        });
        return JSON.parse(cache.get({
            key: id,
            // loader: categoryLoader
        }));
    }

    function twoBeforeOne(one, two) {
        if (two) {
            return two;
        }
        return one;
    }

    function create_hash(toHash) {
        var hashObj = _crypto.createHash({algorithm: _crypto.HashAlg.SHA256});
        hashObj.update({input: toHash});
        return hashObj.digest({outputEncoding: _encode.Encoding.HEX});
    }

    function concat_searchresults(results) {
        /*
         * Takes a large search result set, runs the search page and returns a consolidated set
         */
        var index = 0;
        var search_length = 1000;
        var all_results = [];
        do {
            var start = index;
            var end = start + index;
            var result_subset = results.getRange(start, end);
            if (isEmpty(result_subset)) {
                break;
            }
            all_results = all_results.concat(result_subset);
            index = index + result_subset.length;
        } while (true);
        return all_results;

    }

    /**
     * Find item by id
     * @param {*} internalId, externalId
     * @returns item (record inventoryitem)
     * @notes find a item by externalId or internalId, function first tries to locate the recrod by
     * externalId if not found it attempts internalId and if not found returns null value
     */
    function load_item(internalId, externalId) {
        var item_id;
        _log.audit({title: 'internalId', details: internalId});
        if (!isNullOrEmpty(internalId)) {
            _log.audit({title: 'internalId', details: internalId});
            item = _record.load({type: 'inventoryitem', id: internalId, isDynamic: false});
            _log.audit({title: 'item', details: item});
            if (!isNullOrEmpty(item)) {
                return item;
            }
        }

        if (!isNullOrEmpty(externalId)) {
            item = get_item_by_externalid(externalId);
            if (!isNullOrEmpty(item)) {
                return item;
            }

        }

        return null;
    }

    function get_item_by_externalid(externalid) {
        var nsrecord;
        var search = _search.create({
            type: "inventoryitem",
            filters:
                [
                    ["externalid", "is", externalid],
                ],
            columns: ["internalid"]
        });
        if (search.runPaged().count == 1) {
            var results = search.run();
            var subset = results.getRange(0, 1);
            nsrecord = _record.load({type: 'inventoryitem', id: subset[0].id});
        }
        return nsrecord;
    }

    /*
     * Updates a suppliers cost for a item
     */
    function updateItemSupplierCost(item, vendor, preferred, cost) {
        var sublist = "itemvendor";
        var vendorcurrencyid = "1";
        var subsidiary = "2";
        /*
         * sublist "itemvendor" fields: ["vendor", "vendorcurrencyid", "vendorcode", "subsidiary", "purchaseprice", "schedule", "preferredvendor", "_id", "_sequence"]
         */
        var sublist_line = item.findSublistLineWithValue({sublistId: sublist, fieldId: "vendor", value: vendor});
        if (sublist_line >= 0) {
            item.setSublistValue({sublistId: sublist, line: line, fieldId: "purchaseprice", value: cost});
        } else {
            var new_line_number = record.selectNewLine({sublistId: sublist});
            item.setSublistValue({
                sublistId: sublist,
                line: line,
                fieldId: "vendorcurrencyid",
                value: vendorcurrencyid
            });
            item.setSublistValue({sublistId: sublist, line: line, fieldId: "subsidiary", value: subsidiary});
            item.setSublistValue({sublistId: sublist, line: line, fieldId: "vendor", value: vendor});
            item.setSublistValue({sublistId: sublist, line: line, fieldId: "purchaseprice", value: cost});
            item.setSublistValue({sublistId: sublist, line: line, fieldId: "preferredvendor", value: preferred});
        }
        item.commitLine({sublistId: sublist});
    }

    function updateItemPriceLevelPrice(item, price, pricelevel_id) {
        var sublist = "price";
        var field = "price";
        var line = item.findSublistLineWithValue({sublistId: sublist, fieldId: "pricelevel", value: pricelevel_id});
        if (line >= 0 && price >= 0) {
            item.setMatrixSublistValue({
                sublistId: sublist,
                fieldId: field,
                column: 0,
                line: line,
                value: price,
            });
            return true;
        }
        return false;
    }


    /*
     * retrieves the preferred vendors cost
     */
    function getItemVendorPreferredCost(item) {
        var sublist = "itemvendor";
        var lines = item.getLineCount({sublistId: sublist});
        for (var line = 0; line < lines; line++) {
            if (item.getSublistValue({sublistId: sublist, fieldId: "preferredvendor", line: line})) {
                return item.getSublistValue({sublistId: sublist, fieldId: "purchaseprice", line: line});
            }
        }
        return -1;
    }

    /*
     * retreives a specific price level on a item
     */
    function getItemPriceLevelPrice(item, pricelevel_id) {
        var sublist = "price";
        var field = "price";
        var line = item.findSublistLineWithValue({sublistId: sublist, fieldId: "pricelevel", value: pricelevel_id});
        if (line >= 0) {
            return item.getMatrixSublistValue({sublistId: "price", fieldId: "price", line: line, column: 0});
        }
        return -1;
    }

    function getItemDefaultPriceMatrixLevel(item) {
        var pricematrixgroup_id = item.getValue({fieldId: "custitem_mro_pricematrixgroup"});
        if (pricematrixgroup_id) {
            var cost = getItemPriceLevelPrice(item, 1);
            var search = _search.create({
                type: "customrecord_mro_item_pricematrix",
                filters:
                    [
                        ["custrecord_mro_pricing_pm_pmgroup", "anyof", pricematrixgroup_id],
                        "AND",
                        ["custrecord_mro_pricing_pm_mincost", "lessthanorequalto", cost],
                        "AND",
                        ["custrecord_mro_pricing_pm_maxcost", "greaterthanorequalto", cost]
                    ],
                columns: ["custrecord_mro_pm_defaultprc_formula"]
            });

            var result_count = search.runPaged().count;

            if (result_count == 0) {
                var pricematrixgroup = _record.load({
                    type: "customrecord_mro_item_pricematrixgroup",
                    id: pricematrixgroup_id
                });
                return pricematrixgroup.getValue("custrecord_pmg_defaultprc_formula");
            }
            //There should only be one, we need to enforce rule set using a UserEvent Script on price matrix to ensure that cost ranges do not overlap
            if (result_count == 1) {
                var resultSet = search.run();
                var range = resultSet.getRange({start: 0, end: result_count});
                return range[0].getValue({name: "custrecord_mro_pm_defaultprc_formula"});
            }
        }
        return -1;
    }

    function getItemAmazonPriceMatrixLevel(item) {
        var pricematrixgroup_id = item.getValue({fieldId: "custitem_mro_pricematrixgroup"});
        if (pricematrixgroup_id) {
            var cost = getItemPriceLevelPrice(item, 1);
            var search = _search.create({
                type: "customrecord_mro_item_pricematrix",
                filters:
                    [
                        ["custrecord_mro_pricing_pm_pmgroup", "anyof", pricematrixgroup_id],
                        "AND",
                        ["custrecord_mro_pricing_pm_mincost", "lessthan", cost],
                        "AND",
                        ["custrecord_mro_pricing_pm_maxcost", "greaterthanorequalto", cost]
                    ],
                columns: ["custrecord_mro_pm_amazonprc_formula"]
            });

            var result_count = search.runPaged().count;

            if (result_count == 0) {
                var pricematrixgroup = _record.load({
                    type: "customrecord_mro_item_pricematrixgroup",
                    id: pricematrixgroup_id
                });
                return pricematrixgroup.getValue("custrecord_pmg_amazonprc_formula");
            }
            //There should only be one, we need to enforce rule set using a UserEvent Script on price matrix to ensure that cost ranges do not overlap

            if (result_count == 1) {
                var resultSet = search.run();
                var range = resultSet.getRange({start: 0, end: result_count});
                return range[0].getValue({name: "custrecord_mro_pm_amazonprc_formula"});
            }

        }
        return -1;
    }

    function getUnitTypeConversion(unittype, sub_id) {

        var sublist = "uom";
        var lines = unittype.getLineCount({sublistId: sublist});

        for (var line = 0; line < lines; line++) {
            var id = unittype.getSublistValue({sublistId: sublist, fieldId: "internalid", line: line});
            if (id == sub_id) {
                return unittype.getSublistValue({sublistId: sublist, fieldId: "conversionrate", line: line});
            }
        }
        return -1;
    }

    function convertCostToPrice(item) {
        var unittype = _record.load({type: "unitstype", id: item.getValue("unitstype")});
        var purchase_conv = getUnitTypeConversion(unittype, item.getValue("purchaseunit"));
        var sale_conv = getUnitTypeConversion(unittype, item.getValue("saleunit"));
        var cost = getItemVendorPreferredCost(item);
        if (cost > 0 && purchase_conv > 0 && sale_conv > 0) {
            return (cost / purchase_conv) * sale_conv;
        }
        return -1;
    }

    function updateItemCostPrice(item) {
        var price = convertCostToPrice(item);
        updateItemPriceLevelPrice(item, price, 1);
    }

    function updateItemDefaultPrice(item) {
        var pricelevel_id = getItemDefaultPriceMatrixLevel(item);
        var price = getItemPriceLevelPrice(item, pricelevel_id);
        updateItemPriceLevelPrice(item, price, 5);
        return price;
    }

    return {
        twoBeforeOne: twoBeforeOne,
        create_hash: create_hash,
        get_item_by_externalid: get_item_by_externalid,
        load_item: load_item,
        convertCostToPrice: convertCostToPrice,
        getItemVendorPreferredCost: getItemVendorPreferredCost,
        getItemPriceLevelPrice: getItemPriceLevelPrice,
        getItemDefaultPriceMatrixLevel: getItemDefaultPriceMatrixLevel,
        getItemAmazonPriceMatrixLevel: getItemAmazonPriceMatrixLevel,
        updateItemSupplierCost: updateItemSupplierCost,
        updateItemPriceLevelPrice: updateItemPriceLevelPrice,
        updateItemDefaultPrice: updateItemDefaultPrice,
        updateItemCostPrice: updateItemCostPrice,
        getUnitOfMeasure: getUnitOfMeasure,
        getBrand: getBrand,
        getCategory: getCategory
    };

});
