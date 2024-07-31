/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @author      Milan
 * @version     1.0
 * @description This script is creating sales order
 */

define(['N/record', 'N/error', 'N/search', 'N/email', 'N/format', 'N/log', 'N/config', 'N/url', 'SuiteScripts/Modules/mro/mro_serverside', 'N/runtime'],

    function (record, error, search, email, format, log, config, url, _mross, runtime) {
        /**
         * Post functions
         * @param {*} params
         * @returns
         */
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

        var custRecord = null;
        function doPost(params) {
            log.debug('params', params);
            addJsonToRecord(params, 'POST', 'SALESORDER');

            var customerId = params.customerId;
            var externalId = params.externalId;
            // var custRecord = null;
            try {
                doValidation([params.customerId, params.externalId], ['customerId', 'externalid'], 'POST');

                // CHECK FOR EXISTING SO WITH THIS EXTERNAL ID 
                var soSearch = search.create({
                    type: search.Type.SALES_ORDER,
                    filters: [
                        ['externalid', 'is', externalId]
                    ],
                    columns: ['tranid', 'entity', 'externalid']
                });
                var soSearchResults = soSearch.run().getRange(0, 1);
                if (soSearchResults.length > 0) {
                    var soResult = soSearchResults[0];
                    return {
                        success: false,
                        message: 'Sales Order already present',
                        data: {
                            id: soResult.id,
                            tranId: soResult.getValue('tranid'),
                            entity: soResult.getValue('entity'),
                            externalid: soResult.getValue('externalid')
                        }
                    };
                }
            } catch (err) {
                log.debug({ title: 'POST', details: JSON.stringify(err) });
                return {
                    success: false,
                    message: err.message
                };
            }
            // Get customer Id
            if (!isNullOrEmpty(customerId)) {
                custRecord = getCustomer(params.customerId);
            }

            if (isNullOrEmpty(custRecord)) {
                return { success: false, message: 'Customer record not exist!' };
            }

            var soId = null;
            try {
                // Get Sales Order Record
                var soRecord = record.create({ type: record.Type.SALES_ORDER, isDynamic: true });
                var itemTotalPrice = 0;

                soRecord.setValue('customform', 229); // MRO - Sales Order
                soRecord.setValue('entity', customerId);
                // set External Id
                soRecord.setValue('externalid', String(params.externalId));
                soRecord.setValue('custbody_mro_ecom_id', String(params.externalId));

                // TODO - Set PO # from payload
                if (!isNullOrEmpty(params.customerPO)) {
                    soRecord.setValue('otherrefnum', params.customerPO);
                }
                if (!isNullOrEmpty(params.taxTotal)) {
                    soRecord.setValue('custbody_mrk_mro_sales_tax', params.taxTotal);
                }

                // TODO: Set Sales Rep from Customer - Sales Rep
                var custSalesRep = custRecord.getValue('salesrep');
                soRecord.setValue('salesrep', custSalesRep);

                // Set location to Dropship
                soRecord.setValue('location', 4); // Dropship Location
                soRecord.setValue('cseg1', 4); // Financial Location - eCommerce


                /*
                             // customer.terms or COD
                             var customerTerms = custRecord.getValue('terms');
                              //if payload has token info set prepayment terms 
                              //TODO: update after payload is updated
                             if (!isNullOrEmpty(params.token)) {
                                 soRecord.setValue('terms', 16); // Prepayment
                             } else if (!isNullOrEmpty(customerTerms)) {
                                 soRecord.setValue('terms', customerTerms);  
                             } else {
                                 soRecord.setValue('terms', 28); // COD
                             }
                            
                             // TODO: update after payload is updated - Ship Method
                             soRecord.setValue('shipmethod', params.shipMethod); 
                             // TODO: update after payload is updated - Shipping Terms
                             soRecord.setValue('custbody_mrk_shipping_terms', params.shippingTerms);
                             
                             
                             // TODO: Shippping comments, ship via, tax total, Shipping Total, shipping no
                             if (!isNullOrEmpty(params.shippingComments)) {
                                 soRecord.setValue('custbody_mrk_shipping_comments', params.shippingComments);
                             }
                             if (!isNullOrEmpty(params.shipVia)) {
                                 soRecord.setValue('custbody_mrk_ship_via', params.shipVia);
                             }
                             
                             if (!isNullOrEmpty(params.shippingTotal)) {
                                 soRecord.setValue('shippingcost', params.shippingTotal);
                             }
                             // Set shipping number
                             if (!isNullOrEmpty(params.shippingNumber)) {
                                 soRecord.setValue('custbody_mrk_shipping_number', params.shippingNumber);
                             }
                
                 
                             */

                // Create line items in new order
                var lineCount = soRecord.getLineCount({ sublistId: 'item' });

                for (var i = 0; i < lineCount; i++) {
                    soRecord.removeLine({ sublistId: 'item', line: 0 });
                }

                /* for (var i = 0; i < params.items.length; i++) {
                     var itemObj = params.items[i];
                     itemTotalPrice = itemTotalPrice + Number(itemObj.price) * Number(itemObj.quantity);
                 } */

                // check if the item exists
                var itemsNotFound = [];
                for (var i = 0; i < params.items.length; i++) {
                    var itemObj = params.items[i];
                    var item = _mross.load_item(itemObj.id, itemObj.externalId); // Item record checks
                    log.debug('itemid', itemObj.id);
                    log.debug('item obj', itemObj);

                    log.debug('item', item);

                    if (item != null) {
                        soRecord.selectNewLine({ sublistId: 'item' });

                        soRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: Number(item.id)
                        });
                        //add location
                        soRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            value: 4
                        });
                        //add financial location - eCommerce = 4
                        soRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'cseg1',
                            value: 4
                        });
                        soRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            value: Number(itemObj.quantity)
                        });
                        var priceAfterDisc = Number(Number(itemObj.price) - Number(itemObj.discountAmt || 0.00));
                        log.debug('priceAfterDisc', priceAfterDisc);
                        soRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'rate',
                            value: Number(Number(itemObj.price) - Number(itemObj.discountAmt || 0.00))
                        });
                        cost = _mross.getItemVendorPreferredCost(item);
                        soRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_kd_cost_price',
                            value: Number(cost)
                        });
                        if (!isNullOrEmpty(itemObj.discountAmt)) {
                            soRecord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_item_discount_amount',
                                value: Number(itemObj.discountAmt)
                            });
                        }
                        soRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'taxcode',
                            value: "1347195" //AVATAX
                        });
                        soRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_mrk_mro_group_id',
                            value: itemObj.orderItemGroupId
                        });
                        soRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_mrk_mro_item_id',
                            value: itemObj.orderItemId
                        });


                        soRecord.commitLine({
                            sublistId: 'item'
                        });
                    } else {
                        itemsNotFound.push({ 'id': itemObj.id, 'externalId': itemObj.externalId });
                    }
                }
                if (itemsNotFound.length == params.items.length) {
                    return { success: false, message: 'Following Items not found!' + ' ' + JSON.stringify(itemsNotFound) }
                }
                //TODO: else if itemsNotFound.length > 0, return message with items not found

                // Set shipping address
                var shippingAddressId = null;
                if (!isNullOrEmpty(params.shippingAddress)) {
                    shippingAddressId = getCustomerAddressId(custRecord, params.shippingAddress);
                } else {
                    shippingAddressId = getCustomerShippingAddressId(custRecord);
                }
                soRecord.setValue({
                    fieldId: 'shipaddresslist',
                    value: shippingAddressId,
                });


                // Set billing address
                var billingAddressId = null;
                if (!isNullOrEmpty(params.billingAddress)) {
                    billingAddressId = getCustomerAddressId(custRecord, params.billingAddress);
                } else {
                    billingAddressId = getCustomerBillingAddressId(custRecord);
                }
                soRecord.setValue({
                    fieldId: 'billaddresslist',
                    value: billingAddressId,
                });


                // Set shipping value
                if (!isNullOrEmpty(params.shippingTotal)) {
                    var shippingTotal = Number(params.shippingTotal);
                    if (!isNaN(shippingTotal) && shippingTotal != 0) {
                        soRecord.setValue('shippingcost', shippingTotal);
                    }
                }

                soId = soRecord.save({/*enableSourcing: true,*/ ignoreMandatoryFields: true });
                //declare result object
                var result = {};
                result = {
                    "success": true,
                    "message": "SO Record created successfully!",
                    "data": {
                        "id": soId
                    }
                };
            } catch (err) {
                result = {
                    success: false,
                    message: err.message
                };
                log.debug('error', JSON.stringify(err));
            }

            return result;
        }

        /**
         * Get Customer record id from netsuite
         * @param {*} customerInfo
         */
        function getCustomer(customerId) {
            //var custRecord = null;
            if (!isNullOrEmpty(customerId)) {
                var mySearch = search.create({
                    type: search.Type.CUSTOMER,
                    columns: ['internalid'],
                    filters: [
                        ['internalid', search.Operator.ANYOF, [customerId]]
                    ]
                });
                var results = [];
                mySearch.run().each(function (result) {
                    results.push(result);
                    return true;
                });
                //var custRecord = null;
                if (results.length > 0) {
                    customerId = results[0].id;
                    custRecord = record.load({
                        type: record.Type.CUSTOMER,
                        id: customerId,
                        isDynamic: true,
                    });
                }
            }
            return custRecord;
        }

        /**
         * Get customer's address index by using address object
         * @param {*} custRecord
         * @param {*} address
         * @returns
         */
        function getCustomerAddressIndex(custRecord, address) {
            var lineCount = custRecord.getLineCount({
                sublistId: 'addressbook'
            });
            // add addresses
            for (var i = 0; i < lineCount; i++) {
                custRecord.selectLine({
                    sublistId: 'addressbook',
                    line: i,
                });
                var addr1 = custRecord.getCurrentSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'addr1_initialvalue',
                });

                var country = custRecord.getCurrentSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'country_initialvalue',
                });

                var city = custRecord.getCurrentSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'city_initialvalue',
                });

                var state = custRecord.getCurrentSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'state_initialvalue',
                });
                var zip = custRecord.getCurrentSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'zip_initialvalue',
                });

                if (addr1 == address.address1 && country == address.country &&
                    city == address.city && state == address.state && zip == address.postalCode) {
                        log.debug('address found', i);
                    return i;
                }
            }
            return -1;
        }

        /**
         * Get address subrecord id
         * @param {*} custRecord
         * @param {*} address
         * @returns
         */
        function getCustomerAddressId(custRecord, address) {
            var index = getCustomerAddressIndex(custRecord, address);
            if (index == -1) {
                index = addCustomerAddress(custRecord, address);
                if (!isNullOrEmpty(custRecord.id)) {
                    custRecord = getCustomer(custRecord.id);
                }
            }
            custRecord.selectLine({
                sublistId: 'addressbook',
                line: index
            });
            var addressId = custRecord.getCurrentSublistValue({
                sublistId: 'addressbook',
                fieldId: 'addressid'
            });
            log.debug('addressId', addressId);
            return addressId;
        }
        /**
         * Add address to customer record
         * @param {*} custRecord
         * @param {*} addressInfo
         * @returns
         */
        function addCustomerAddress(custRecord, addressInfo) {
            log.debug('addCustomerAddress', 'addCustomerAddress')
            // add addresses
            var address = addressInfo;
            custRecord.selectNewLine({
                sublistId: 'addressbook'
            });
            var lineCount = custRecord.getLineCount({
                sublistId: 'addressbook'
            });
            log.debug('lineCount', lineCount);
            var myAddressSubRecord = custRecord.getCurrentSublistSubrecord({
                sublistId: 'addressbook',
                fieldId: 'addressbookaddress'
            });

            myAddressSubRecord.setValue({
                fieldId: 'addr1',
                value: address.address1
            });

            myAddressSubRecord.setValue({
                fieldId: 'addr2',
                value: address.address2
            });

            myAddressSubRecord.setValue({
                fieldId: 'country',
                value: address.country
            });

            myAddressSubRecord.setValue({
                fieldId: 'city',
                value: address.city
            });

            myAddressSubRecord.setValue({
                fieldId: 'state',
                value: address.state
            });
            myAddressSubRecord.setValue({
                fieldId: 'zip',
                value: address.postalCode
            });

            custRecord.commitLine({
                sublistId: 'addressbook'
            });

            custRecord.save({
                ignoreMandatoryFields: true
            });
            // custRecord = getCustomer(custRecord.id);
            // var lineCount = custRecord.getLineCount({
            //     sublistId: 'addressbook'
            // });
            // log.debug('lineCount', lineCount);

            return lineCount;
        }

        /**
         * Get all of datas for Search Object
         *
         * @param {*} searchObj
         * @returns Searchresult object
         */
        function getResults(searchObj) {
            log.debug('search order started');

            var resultArray = [];

            var pagedData = searchObj.runPaged();
            pagedData.pageRanges.forEach(function (pageRange) {

                var curPage = pagedData.fetch({ index: pageRange.index });

                curPage.data.forEach(function (result) {
                    resultArray.push(result);
                });
            });

            // log.debug('order result count', resultArray.length);
            return resultArray;
        }

        /**
         * Check Customer billing address
         * @param {*} custRec - Customer record
         * @returns address subrecord id
         */
        function getCustomerBillingAddressId(custRec) {
            var lineCount = custRec.getLineCount({
                sublistId: 'addressbook'
            });
            var addressId = '';
            for (var i = 0; i < lineCount; i++) {
                addressId = custRec.getSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'addressid',
                    line: i
                });
                var defaultBilling = custRec.getSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'defaultbilling',
                    line: i
                });
                if (defaultBilling == "T") {
                    break;
                }
            }
            return addressId;
        }

        /**
         * Check Customer shipping address
         * @param {*} custRec - Customer record
         * @returns address subrecord id
         */
        function getCustomerShippingAddressId(custRec) {
            var lineCount = custRec.getLineCount({
                sublistId: 'addressbook'
            });
            var addressId = '';
            for (var i = 0; i < lineCount; i++) {
                addressId = custRec.getSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'addressid',
                    line: i
                });
                var defaultBilling = custRec.getSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'defaultshipping',
                    line: i
                });
                if (defaultBilling == "T") {
                    break;
                }
            }
            return addressId;
        }



        /**
         * Format Dateobject to M/d/yy h:mm a
         *
         * @param {*} date
         */
        function formatAMPM(date) {
            var hours = date.getHours();
            var minutes = date.getMinutes();
            var ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            minutes = minutes < 10 ? '0' + minutes : minutes;
            var strTime = (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear() + " " +
                hours + ':' + minutes + ' ' + ampm;
            return strTime;
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
