/**
 * @NApiVersion 2.x
 * @NScriptType Restlet 
 */

define(['N/record', 'N/error', 'N/search', 'N/email', 'N/format', 'N/log', 'N/config', 'N/url', 'N/file', 'N/runtime', 'N/render', 'N/https', 'N/sftp', 'N/query', 'N/cache'],


    function (record, error, search, email, format, log, config, url, file, runtime, render, https, sftp, query, cache) {
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
        function doPost(params) {
            var soRec = record.load({
                type: record.Type.INVENTORY_ITEM,
                id: 2089023
            });
            return soRec;
            var myCache = cache.getCache({
                name: "brand_cache",
                scope: cache.Scope.PROTECTED
            });
            var mySearch = search.create({
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

            var results = getResults(mySearch);
            for (var i = 0; i < results.length; i ++) {
                var result = results[i];
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
                log.audit({ title: 'brandLoader', details: value });
    
                myCache.put({
                    key: result.getValue("internalid"),
                    value: value,
                    ttl: (8 * 60 * 60)
                });
            }
            log.debug("length", results.length);
            
            myCache = cache.getCache({
                name: "category_cache",
                scope: cache.Scope.PROTECTED
            });
            mySearch = search.create({
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
            results = getResults(mySearch);
            for (var i = 0; i < results.length; i ++) {
                var result = results[i];
                var value = {
                    "id": result.getValue("internalid"),
                    "externalid": result.getValue("externalid"),
                    "name": result.getValue("name"),
                    "image": result.getValue("custrecord_mro_prod_category_image"),
                    "leaf": result.getValue("custrecord_mro_prod_category_leaf"),
                    "product_count": result.getValue("custrecord_mro_prod_category_prodcount")
                };
                log.audit({ title: 'categoryLoader', details: value });
                myCache.put({
                    key: result.getValue("internalid"),
                    value: value,
                    ttl: (8 * 60 * 60)
                });    
            }
            log.debug("length", results.length);

            myCache = cache.getCache({
                name: "uom_cache",
                scope: cache.Scope.PROTECTED
            });
            var sublist = "uom";
            var mySearch = search.create({ type: "unitstype", columns: ["internalid"] });
            mySearch.run().each(function (result) {
    
                var unittype = record.load({ type: "unitstype", id: result.id });
                var lines = unittype.getLineCount({ sublistId: sublist });
    
                for (var line = 0; line < lines; line++) {
                    var key = unittype.getSublistValue({ sublistId: sublist, fieldId: "internalid", line: line });
                    var value = unittype.getSublistValue({ sublistId: sublist, fieldId: "abbreviation", line: line })
    
                    myCache.put({
                        key: key,
                        value: value,
                        ttl: (8 * 60 * 60)
                    });
                }
                return true;
            });

            return true;
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
         * Check Null or Empty
         * 
         * @param {*} val 
         */
        function isNullOrEmpty(val) {

            return (val == null || val == '' || val == undefined);
        }

        return {
            post: doPost
        };

    });