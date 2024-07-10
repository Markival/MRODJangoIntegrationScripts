/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @author      Milan
 * @version     1.0
 */

define(['N/record', 'N/error', 'N/search', 'N/format', 'N/log'],

    function (record, error, search, format, log) {
        /**
         * Post function for http request
         * @param {*} params - Params for Http objects
         * @returns results
         */
        function doPost(params) {
            var result = null;
            var itemInfo = params.item;
            var result = {};
            if (isNullOrEmpty(itemInfo)) {
                return {
                    success: false,
                    message: 'Please input correct item information!'
                }
            }

            try {
                var itemRec = record.create({
                    type: record.Type.INVENTORY_ITEM,
                    isDynamic: true
                });
                itemRec.setValue('itemid', itemInfo.itemId);
                itemRec.setValue('externalid', itemInfo.externalId);
                itemRec.setValue('subsidiary', 2);
                itemRec.setValue('custitem_mro_brand', 137);
                itemRec.setValue('taxschedule', 2);
                itemRec.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });
                result = {
                    success: true,
                    item: itemRec
                }
            } catch (err) {
                log.audit({ title: 'POST', details: JSON.stringify(err) });
                result = {
                    success: false,
                    message: err
                }
                return result;
            }

            return result;
        }

        /**
         * Get Current Date object for Netsuite system.
         */
        function getCurrentDate() {
            var dateNow = new Date();
            var tempDateNowX = format.format({ value: dateNow, type: format.Type.DATETIME });
            var curDate = new Date(tempDateNowX);
            return curDate;
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