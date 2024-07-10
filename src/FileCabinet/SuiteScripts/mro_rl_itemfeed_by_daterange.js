/**
 * @NApiVersion 2.x
 * @NScriptType Restlet 
 */

define(['N/record', 'N/search', 'N/log', 'N/cache', 'N/format', 'SuiteScripts/Modules/mro/mro_serverside'],


    function (record, search, log, cache, format, mross) {
        var brands = {};
        var categories = {};
        function doValidation(args, argNames) {
            for (var i = 0; i < args.length; i++)
                if (!args[i] && args[i] !== 0)
                    throw error.create({
                        name: 'MISSING_REQ_ARG',
                        message: 'Missing a required argument: [' + argNames[i] + ']'
                    }); /*  */
        }

        /**
         * Function called upon sending a GET request to the RESTlet.
         *
         * @param {Object} params - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)         
         * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
         * @since 2015.1
         */
        function doGet(params) {            
            var startDate = params.start;
            var endDate = params.end;            
            if (!isNullOrEmpty(startDate)) {
                startDate = new Date(startDate);
                if (!isNullOrEmpty(endDate)) {
                    endDate = new Date(endDate);
                } else {
                    endDate = new Date();
                }
            } else {
                var curr = new Date();
                curr = new Date(curr.getTime() - 60 * 60 * 24 * 7 * 1000);
                var day = curr.getDay();
                startDate = new Date(curr.getTime() - 60 * 60 * 24 * day * 1000); //will return firstday (ie sunday) of the week
                endDate = new Date(startDate.getTime() + 60 * 60 * 24 * 6 * 1000); //adding (60*60*6*24*1000) means adding six days to the firstday which results in lastday (saturday) of the week                
            }

            startDate = format.format({ value: startDate, type: format.Type.DATE });
            endDate = format.format({ value: endDate, type: format.Type.DATE });
            log.debug("startDate", startDate);
            log.debug("endDate", endDate);

            var page = params.page;
            if (isNullOrEmpty(page)) {
                page = 0;
            }

            // loadBrands();
            // loadCategories();

            return getNewItems(startDate, endDate, page);
        }

        /**
         * Load all brands
         */
        function loadBrands() {
            var brandSearch = search.create({
                type: 'customrecord_mro_brand',
                columns: ['name']
            });
            var results = getResults(brandSearch);
            for (var i = 0; i < results.length; i ++) {
                brands[results[i].id] = results[i].getValue({name: 'name'});
            }            
        }

        /**
         * Load all categories
         */
        function loadCategories() {
            var categorySearch = search.create({
                type: 'customrecord_mro_prod_category',
                columns: ['name']
            });
            var results = getResults(categorySearch);
            for (var i = 0; i < results.length; i ++) {
                categories[results[i].id] = results[i].getValue({name: 'name'});
            }
        }

        /**
         * Get all of updated items in date range.
         * @param {*} startDate 
         * @param {*} endDate
         * @param {*} page
         * @returns item's array
         */
        function getNewItems(startDate, endDate, page) {
            var itemSearch = search.create({
                type: "inventoryitem",
                columns: [
                    "internalid",
                    "mpn",
                    "itemid",
                    "custitem_mro_item_prodcategory.name",
                    "custitem_mro_brand.name",
                    "salesdescription",
                    "storedescription",
                    "saleunit",
                    "minimumquantity",
                    "weight",
                    "custitem_mro_returnable",
                    "custitem_mro_obsolete",
                    "custitem_mro_madetoorder",
                    "onlineprice",
                    "custitem_mro_item_attributes",
                    "custitem_mro_typicallyships",
                    "custitem_mro_additional_description",
                    "custitem_mro_ecommerce_mainimage",
                ],
                filters: [
                    ['modified', 'within', [startDate, endDate]]
                ]
            });
            var myFilter = search.createFilter({
                name: 'formulanumeric',
                operator: 'equalto',
                values: [
                    "0"
                ],
                formula: "trunc({created} - {modified}, 3)"
            });
            // itemSearch.filters.push(myFilter);

            // var myColumn = search.createColumn({
            //     name: "formulanumeric",                
            //     type: "float",
            //     formula: "trunc({modified} - {created}, 3)"
            // });
            // itemSearch.columns.push(myColumn);
            return getItemResults(itemSearch, page);
        }

        /**
         * Get items results by search object
         * @param {*} itemSearch 
         * @returns search resultset
         */
        function getItemResults(itemSearch, page) {            
            var results = getResultsByPage(itemSearch, page);
            var items = [];
            for (var i = 0; i < results.length; i++) {
                var result = results[i];                
                var internalid = result.getValue("internalid");
                var brand = result.getValue({name: "name", join: "custitem_mro_brand"});
                var category = result.getValue({name: "name", join: "custitem_mro_item_prodcategory"});
                // var brand = result.getValue("custitem_mro_brand");
                // if (brand) {
                //     brand = brands[brand];                    
                // }
                // var category = result.getValue("custitem_mro_item_prodcategory");
                // if (category) {
                //     category = categories[category];
                // }

                items.push({
                    "Product ID": internalid,
                    "SKU": result.getValue("mpn"),
                    "Name": result.getValue("itemid"),
                    "Product URL": "https://sca.mrosupply.com/product/" + internalid,
                    "Category": category,
                    "Brand": brand,
                    "Description": mross.twoBeforeOne(result.getValue("salesdescription"), result.getValue("storedescription")),
                    "Search Keywords": "",
                    "Unit of Measure": mross.getUnitOfMeasure(result.getValue("saleunit")),
                    "Minimum Order Quantity": result.getValue("minimumquantity"),
                    "Weight": result.getValue("weight"),
                    "Returnable": result.getValue("custitem_mro_returnable"),
                    "Obsolete": result.getValue("custitem_mro_obsolete"),
                    "Made to Order": result.getValue("custitem_mro_madetoorder"),
                    "Price": result.getValue("onlineprice"),
                    "Thumbnail URL": result.getValue("custitem_mro_ecommerce_mainimage"),
                    "Additional Description": result.getValue("custitem_mro_additional_description"),
                    "Attributes": result.getValue("custitem_mro_item_attributes"),                    
                    // "formula": result.getValue("formulanumeric")
                });
            }
            return items;

        }

        /**
         * Get all of datas for Search Object
         * 
         * @param {*} searchObj 
         */
        function getResults(searchObj) {
            var results = [];
            var count = 0;
            var pageSize = 1000;
            var start = 0;

            do {
                var subresults = searchObj.run().getRange({
                    start: start,
                    end: start + pageSize
                });

                results = results.concat(subresults);
                count = subresults.length;
                start += pageSize;
            } while (count == pageSize);

            log.debug('result count', results.length);
            return results;
        }

        /**
         * Get all of datas for Search Object
         * 
         * @param {*} searchObj 
         */
        function getResultsByPage(searchObj, page) {            
            var count = 0;
            var pageSize = 1000;
            var start = page * pageSize;

            var results = searchObj.run().getRange({
                start: start,
                end: start + pageSize
            });

            return results;
        }

        /**
         * Check Null or Empty
         * 
         * @param {*} val 
         */
        function isNullOrEmpty(val) {

            return (val == null || val == '' || val == undefined);
        }

        return {
            post: doGet
        };

    });