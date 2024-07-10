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
            log.debug('params', params);
            var customerID = params.customerId; //customer internal id
            var extId = params.contact.externalId;
            if(isNullOrEmpty(extId)) {
                return {
                    success: false,
                    message: 'Missing a required argument externalId for POST method.'
                }
            }
            
            if (isNullOrEmpty(customerID)) {
                return {
                    success: false,
                    message: 'Please input correct customer information!'
                }
            }
            // Check if Contact already exists
                var contactSearch = search.create({
                    type: search.Type.CONTACT,
                    columns: [
                      {'name': 'email'},
                      {'name': 'firstname'},
                      {'name': 'lastname'},
                      {'name': 'phone'},
                      {'name': 'externalid'},
                      {'name': 'company'}
                    ],
                    filters: [
                        ['externalid', 'anyof', extId],
                        'OR', 
                        ['entityid','is', params.contact.firstName + ' ' + params.contact.lastName],
                    ]
                }).run().getRange(0, 1);
                log.debug('test', contactSearch);
                if (contactSearch.length) {
                  var savedContact = contactSearch[0];
                  return {
                      success: false, 
                      message: 'Contact already present',
                      data: {
                        id: savedContact.id,
                        firstName: savedContact.getValue('firstname'),
                        lastName: savedContact.getValue('lastname'),
                        email: savedContact.getValue('email'),
                        phone: savedContact.getValue('phone'),
                        externalId: savedContact.getValue('externalid'),
                        companyId: params.customerId,
                        companyName: savedContact.getValue('company') || '',
                      }
                  };
                }

            try {
                // Add Contact record to customer                
                var custRec = record.load({
                    type: record.Type.CUSTOMER,
                    id: customerID,
                    isDynamic: true
                });
                if (isNullOrEmpty(custRec)) {
                    result = {
                        success: false,
                        message: "Customer Record not found!"
                    }
                } else {
                    var isPerson = custRec.getValue('isperson');
                    log.debug("isPerson", isPerson);
                    if (isPerson == "F") {
                        contactRec = addContact(custRec, params.contact);

                        result = {
                            success: true,
                            message: 'Contact created successfully on customer Record!',
                            data: {
                                customerId: custRec.id,
                                ContactId: contactRec.id,
                                ContactName: contactRec.getValue('firstname') + " " + contactRec.getValue('lastname'),
                                Email: custRec.getValue('email'),
                                Phone: custRec.getValue('phone'),
                            }
                        };
                    } else {
                        result = {
                            success: false,
                            message: 'This customer is not Company Type! You can only add contact to Company!'
                        }
                    }
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
         * Get customer Record by using customerEmail, if no exist, then return null
         * @param {*} customerEmail 
         * @returns N/customer Record 
         */
        function getCustomer(customerEmail) {
            var custRec = null;
            var mySearch = search.create({
                type: search.Type.CUSTOMER,
                columns: [],
                filters: [
                    ['email', 'is', customerEmail]
                ]
            });
            var customerId = null;
            mySearch.run().each(function (result) {
                customerId = result.id;
            });
            if (customerId != null) {
                custRec = record.load({
                    type: record.Type.CUSTOMER,
                    id: customerId, 
                    isDynamic: true,
                });    
            }
            return custRec;
        }

        /**
         * Add new contact to customer record
         * @param {*} custRec - customer Record in Netsuite
         * @param {*} contactData - contact data which is getting from request
         * @returns Contact Record
         */
        function addContact(custRec, contactData) {
            var contactRec = record.create({
                type: record.Type.CONTACT,
                isDynamic: true
            });
            contactRec.setValue('company', custRec.id);
            contactRec.setValue('firstname', contactData.firstName);
            contactRec.setValue('lastname', contactData.lastName);
            contactRec.setValue('email', contactData.email);
            contactRec.setValue('phone', contactData.phone);
            contactRec.setValue('externalid', String(contactData.externalId));
            contactRec.setValue('custentity_mro_ecom_id', String(contactData.externalId));
            var contactId = contactRec.save();
            log.debug('contactId', contactId);
            return contactRec;
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

       /* function doValidation(args, argNames, methodName) {
            for (var i = 0; i < args.length; i++) {
                if (!args[i] && args[i] !== 0) {
                    throw error.create({
                        name: 'MISSING_REQ_ARG',
                        message: 'Missing a required argument: [' + argNames[i] + '] for method: ' + methodName
                    });
                }
            }
        }*/

        return {
            post: doPost
        };

    });