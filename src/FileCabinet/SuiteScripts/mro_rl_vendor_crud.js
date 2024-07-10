/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @author      Milan
 * @version     1.0
 * @description This restlet to CRUD for Vendor record
 */

define(['N/record', 'N/error', 'N/search', 'N/format', 'N/log'],

    function (record, error, search, format, log) {

        var recordType = record.Type.VENDOR;
        var fieldNames = {
            'companyName' : 'companyname',
            'email': 'email',
            'phone': 'phone',
            'fax': 'fax',
            'creditlimt': 'creditlimit',
            'temrs': 'terms',
        };

        var defaultValues = {
            'isperson': 'F',
            'subsidiary': '2',            
        };

        function doValidation(args, argNames, methodName) {
            for (var i = 0; i < args.length; i++) {
                if (!args[i] && args[i] !== 0) {
                    throw error.create({
                        name: 'MISSING_REQ_ARG',
                        message: 'Missing a required argument: [' + argNames[i] + '] for method: ' + methodName
                    });
                }
            }
        }

        /**
         * Get Vendor Record by Id
         * @param {*} context 
         * @returns 
         */
        function doGet(context) {
            var result = {};
            try {
                doValidation([context.id], ['id'], 'GET');
                var objRecord = record.load({
                    type: recordType,
                    id: context.id
                });

                result['id'] = objRecord.id;
                for (var fldName in fieldNames) {
                    result[fldName] = objRecord.getValue(fieldNames[fldName]);
                }                
            } catch (e) {                
                log.debug('error', e.message);
                result = {
                    success: false,
                    message: e.message
                }
            }

            return result;
        }

        /**
         * Post function for http request - Create Vendor record
         * @param {*} context - Params for Http objects
         * @returns results
         */
         function doPost(context) {
            var result = null;
            try {                
                doValidation([context.companyName], ['companyName'], 'POST');

                // Create Vendor Record
                var objRecord = record.create({
                    type: recordType
                });

                // Set default value
                for (var fldName in defaultValues) {
                    objRecord.setValue(fldName, defaultValues[fldName]);
                }

                // Set Field Values
                for (var fldName in context) {
                    if (context.hasOwnProperty(fldName) && !isNullOrEmpty(fieldNames[fldName])) {
                        objRecord.setValue(fieldNames[fldName], context[fldName]);
                    }
                }
                log.debug('objRecord', objRecord);
                var id = objRecord.save();

                result = {
                    success: true,
                    message: 'Vendor created successfully!',
                    data: {
                        id: id,                     
                    }                    
                };
            } catch (err) {
                log.debug({ title: 'POST', details: JSON.stringify(err) });
                result = {
                    success: false,
                    message: err.message
                }
                return result;
            }

            return result;
        }

        /**
         * Delete Vendor record by id
         * @param {*} context 
         * @returns 
         */
        function doDelete(context) {
            var result = null;
            try {
                doValidation([context.id], ['id'], 'DELETE');
                // record.delete({
                //     type: recordType,
                //     id: context.id
                // });
                var updatefields = record.submitFields({
                    type: recordType,
                    id: context.id,
                    values: {
                        'isinactive': true
                    }
                });
                result = {
                    success: true,
                    message: "Vendor Record deleted successfully!"
                }
            } catch (e) {
                log.debug('error', e.message);
                result = {
                    success: false,
                    message: e.message
                }
            }
            return result;
        }
        
        /**
         * Update Vendor Record
         * @param {*} context 
         * @returns 
         */
        function doPut(context) {
            var result = null;
            try {            
                doValidation([context.id], ['id'], 'PUT');
                var objRecord = record.load({
                    type: recordType,
                    id: context.id
                });                
                for (var fldName in context) {
                    if (context.hasOwnProperty(fldName) && !isNullOrEmpty(fieldNames[fldName])) {
                        objRecord.setValue(fieldNames[fldName], context[fldName]);
                    }
                }
                objRecord.save();
                result = {
                    success: true,
                    message: "Vendor Record Updated successfully!"
                };
            } catch (e) {
                log.debug('error', e.message);
                result = {
                    success: false,
                    message: e.message
                }
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
            post: doPost,
            get: doGet,
            delete: doDelete,
            put: doPut,
        };

    });