/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @author      Milan
 * @version     1.0
 */

define(['N/record', 'N/error', 'N/search', 'N/format', 'N/log', 'N/runtime'],

    function (record, error, search, format, log, runtime) {
        /**
         * Post function for http request
         * @param {*} params - Params for Http objects
         * @returns results
         */
        function doPost(params) {
            addJsonToRecord(params, 'POST', 'ADDRESS');
            var customerId = params.customerId || '';
            // var customerEmail = params.customerEmail;

            try {
                // add address values to customer

                if (isNullOrEmpty(customerId)) {
                    throw error.create({
                        name: 'MISSING_REQ_PARAM',
                        message: 'customerId field is required'

                    })
                }
                try {
                    var custRec = record.load({
                        type: record.Type.CUSTOMER,
                        id: customerId,
                        isDynamic: true
                    });
                } catch (e) {
                    throw error.create({
                        name: 'INVALID_CUSTOMER_ID',
                        message: 'Customer Record not found with id: ' + customerId
                    });

                }


                var addressRec = addAddress(custRec, params.address);

                return {
                    success: true,
                    message: 'Address created successfully on customer Record!',
                    data: {
                        customerId: customerId,
                        firstName: custRec.getValue('firstname'),
                        lastName: custRec.getValue('lastname'),
                        email: custRec.getValue('email'),
                        phone: custRec.getValue('phone'),
                    }
                };
            } catch (err) {
                log.audit({title: 'POST', details: JSON.stringify(err)});
                return {
                    name: err.name,
                    message: err.message,
                    data: params,
                    success: false,

                }
            }
        }

        function getAddressById(custRec, addressId) {
            var lineCount = custRec.getLineCount({
                sublistId: 'addressbook'
            });
            for (var i = 0; i < lineCount; i++) {
                custRec.selectLine({
                    sublistId: 'addressbook',
                    line: i
                });
                var addrSubRecord = custRec.getCurrentSublistSubrecord({
                    sublistId: 'addressbook',
                    fieldId: 'addressbookaddress'
                });

                var extId = addrSubRecord.getValue({fieldId: 'custrecord_mro_address_externalid'});
                if (addressId == Number(extId)) {
                    return addrSubRecord;
                }
            }
        }

        /**
         * Add new address to customer record
         * @param {*} custRec - customer Record in Netsuite
         * @param {*} addressData - address data which is getting from request
         * @returns Customer Record
         */
        function addAddress(custRec, addressData) {
            if (isNullOrEmpty(addressData.externalId)) {
                throw error.create({
                    name: 'MISSING_REQ_PARAM',
                    message: 'Address externalId field is required'
                });
            }
            var address = getAddressById(custRec, addressData.externalId);
            if (isNullOrEmpty(address)) {
                // add addresses
                custRec.selectNewLine({
                    sublistId: 'addressbook'
                });

                address = custRec.getCurrentSublistSubrecord({
                    sublistId: 'addressbook',
                    fieldId: 'addressbookaddress'
                });
            }

            address.setValue({fieldId: 'addr1', value: addressData.address1});
            address.setValue({fieldId: 'addr2', value: addressData.address2});
            address.setValue({fieldId: 'country', value: addressData.country});
            address.setValue({fieldId: 'city', value: addressData.city});
            address.setValue({fieldId: 'state', value: addressData.state});
            address.setValue({fieldId: 'zip', value: addressData.postalCode});
            address.setValue({fieldId: 'addrphone', value: addressData.phone});
            address.setValue({fieldId: 'custrecord_mro_address_email', value: addressData.email});
            address.setValue({
                fieldId: 'custrecord_mro_address_externalid',
                value: addressData.externalId
            });
            if (!isNullOrEmpty(addressData.isResidential)) {
                address.setValue({
                    fieldId: 'custrecord_mro_address_residential',
                    value: addressData.isResidential
                });
                custRec.setCurrentSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'isresidential',
                    value: addressData.isResidential,
                    ignoreFieldChange: true
                });
            }
            if (!isNullOrEmpty(addressData.fax)) {
                address.setValue({
                    fieldId: 'custrecord_mro_address_fax',
                    value: addressData.fax
                });
            }
            if (!isNullOrEmpty(addressData.lat)) {
                address.setValue({
                    fieldId: 'custrecord_mro_address_latitude',
                    value: addressData.lat
                });
            }
            if (!isNullOrEmpty(addressData.lng)) {
                address.setValue({
                    fieldId: 'custrecord_mro_address_longitude',
                    value: addressData.lng
                });
            }
            if (addressData.locType == 'Shipping') {
                custRec.setCurrentSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'defaultshipping',
                    value: true,
                    ignoreFieldChange: true
                });
            } else if (addressData.locType == 'Billing') {
                custRec.setCurrentSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'defaultbilling',
                    value: true,
                    ignoreFieldChange: true
                });
            }

            custRec.commitLine({
                sublistId: 'addressbook'
            });

            var customerId = custRec.save({ignoreMandatoryFields: true});
            return address;
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

        return {
            post: doPost
        };

    });
