/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @author      Milan
 * @version     1.0
 */

define(['N/record', 'N/error', 'N/search', 'N/format', 'N/log', 'N/runtime'],

    function (record, error, search, format, log, runtime) {

        var fieldNames = {
            'email': 'email',
            'firstName': 'firstname',
            'lastName': 'lastname',
            'phone': 'phone',
            'creditlimit': 'creditlimit',
            'terms': 'terms',
            'companyName': 'companyname'
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
        function addJsonToRecord(jsonData, type, recordType) {
            //add try catch block
            try {
                var logLevel = runtime.getCurrentScript().logLevel;
                log.debug('logLevel', logLevel);
                if (logLevel === 'DEBUG') {
                    var requestsRecord = record.create({
                        type: 'customrecord_mrk_json_incoming_requests'
                    });
                    requestsRecord.setValue('custrecord_mrk_json_request', JSON.stringify(jsonData));
                    requestsRecord.setValue('custrecord_mrk_request_type', type);
                    requestsRecord.setValue('custrecord_mrk_request_record_type', recordType);

                    requestsRecord.save({ ignoreMandatoryFields: true });
                }
            }
            catch (e) {
                log.error('Error', e);
            }
        }


        /**
         * Get Customer Record by Id
         * @param {*} context
         * @returns
         */
        function doGet(context) {
            var result = {};
            try {
                addJsonToRecord(context, 'GET', 'CUSTOMER');
                doValidation([context.id], ['id'], 'GET');
                var objRecord = record.load({
                    type: record.Type.CUSTOMER,
                    id: context.id
                });

                result['id'] = objRecord.id;
                result['externalId'] = objRecord.getValue('externalid');

                for (var fldName in fieldNames) {
                    result[fldName] = objRecord.getValue(fieldNames[fldName]);
                }

            } catch (e) {
                log.debug('error', e.message);
                result = {
                    success: false,
                    message: e.message
                };
            }
            return result;
        }

        /**
         * Post function for http request - Create customer record
         * @param {*} context - Params for Http objects
         * @returns results
         */
        function doPost(context) {
            log.debug('context', context);
            try {
                addJsonToRecord(context, 'POST', 'CUSTOMER');
                doValidation([context.email, context.externalId], ['email', 'externalid'], 'GET');
                // check whether there is already a customer with such email
                var customerEmail = context.email;
                if (!isNullOrEmpty(customerEmail)) {
                    var customerSearch = search.create({
                        type: search.Type.CUSTOMER,
                        columns: [
                            { 'name': 'entityId' },
                            { 'name': 'email' },
                            { 'name': 'companyname' },
                            { 'name': 'firstname' },
                            { 'name': 'lastname' },
                            { 'name': 'phone' },
                            { 'name': 'externalid' }
                        ],
                        filters: [
                            ['email', 'is', customerEmail]
                        ]
                    }).run().getRange(0, 1);
                    if (customerSearch.length) {
                        var savedCustomer = customerSearch[0];
                        return {
                            success: true,
                            message: 'Customer already present',
                            data: {
                                id: savedCustomer.id,
                                firstName: savedCustomer.getValue('firstname'),
                                lastName: savedCustomer.getValue('lastname'),
                                companyName: savedCustomer.getValue('companyname') || '',
                                email: savedCustomer.getValue("email"),
                                phone: savedCustomer.getValue('phone'),
                                externalId: savedCustomer.getValue('externalid')
                            }
                        };
                    }
                }

                // there is no such customer so create a new record
                var custRec = createCustomer(context);
                return {
                    success: true,
                    message: 'Customer added successfully!',
                    data: {
                        id: custRec.id,
                        firstName: custRec.getValue('firstname'),
                        lastName: custRec.getValue('lastname'),
                        companyName: custRec.getValue('companyname') || '',
                        email: custRec.getValue("email"),
                        phone: custRec.getValue('phone'),
                        mroId: custRec.getValue('custentity_mro_ecom_id'),
                        externalId: custRec.getValue('externalid'),
                        eclipseId: custRec.getValue('custentity_eclipseid')
                    }
                };
            } catch (err) {
                log.debug({ title: 'POST', details: JSON.stringify(err) });
                return {
                    success: false,
                    message: err.message
                };
            }
        }

        /**
         * Delete customer record by id
         * @param {*} context
         * @returns
         */
        function doDelete(context) {
            var result = null;
            try {
                addJsonToRecord(context, 'DELETE', 'CUSTOMER');
                doValidation([context.id], ['id'], 'DELETE');
                // record.delete({
                //     type: record.Type.CUSTOMER,
                //     id: context.id
                // });
                var updatefields = record.submitFields({
                    type: record.Type.CUSTOMER,
                    id: context.id,
                    values: {
                        'isinactive': true
                    }
                });
                result = {
                    success: true,
                    message: "Customer Record deleted successfully!"
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
         * Update Customer Record
         * @param {*} context
         * @returns
         */
        function doPut(context) {
            var result = null;
            try {
                addJsonToRecord(context, 'PUT', 'CUSTOMER');
                doValidation([context.id], ['id'], 'PUT');
                var objRecord = record.load({
                    type: record.Type.CUSTOMER,
                    id: context.id
                });
                var companyName = context["companyName"];
                if (isNullOrEmpty(companyName)) {
                    objRecord.setValue('isperson', "T");
                } else {
                    objRecord.setValue('isperson', "F");
                }
                for (var fldName in context) {
                    if (context.hasOwnProperty(fldName) && !isNullOrEmpty(fieldNames[fldName]) && !isNullOrEmpty(context[fldName])) {
                        objRecord.setValue(fieldNames[fldName], context[fldName]);
                    }
                }
                if (!isNullOrEmpty(customerData.entityId)) {
                    objRecord.setValue('custentity_eclipseid', String(customerData.entityId));
                }
                objRecord.save({ ignoreMandatoryFields: true });
                result = {
                    success: true,
                    message: "Customer Record updated successfully!"
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
         * Create or update customer record
         * @param {*} customerData
         * @returns N/Customer Record
         */
        function createCustomer(customerData) {
            var custRec = record.create({
                type: record.Type.CUSTOMER,
                isDynamic: true,
            });

            custRec.setValue('isperson',
                isNullOrEmpty(customerData.companyName) ? 'T' : 'F'
            );

            custRec.setValue('subsidiary', "2"); // Default Subsdiary is MROSupply.com
            log.debug('customerData', customerData);

            for (var fldName in customerData) {
                if (customerData.hasOwnProperty(fldName) && !isNullOrEmpty(fieldNames[fldName]) && !isNullOrEmpty(customerData[fldName])) {
                    custRec.setValue(fieldNames[fldName], customerData[fldName]);
                }
            }

            custRec.setValue('externalid', String(customerData.externalId));
            custRec.setValue('custentity_mro_ecom_id', String(customerData.externalId));
            if (!isNullOrEmpty(customerData.entityId)) {
                custRec.setValue('custentity_eclipseid', String(customerData.entityId));
            }
            var customerId = custRec.save({ ignoreMandatoryFields: true });


            /*    if (!isNullOrEmpty(entityId)) {
                    values['entityid'] = entityId;
                }
       
                // Check if there are values to update
                if (Object.keys(values).length > 0) {
                    record.submitFields({
                        type: record.Type.CUSTOMER,
                        id: customerId,
                        values: values,
                        options: {
                            ignoreMandatoryFields: true
                        }
                    });
                } */

            return custRec;
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
