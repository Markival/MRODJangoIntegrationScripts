/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @author      Milan
 * @version     1.0
 */

define(['N/record', 'N/error', 'N/search', 'N/format', 'N/log', 'N/runtime'],

    function (record, error, search, format, log, runtime) {

        var fieldNames = {
            //[{"value":"13","text":"ACH"},{"value":"2","text":"General Token"},{"value":"1","text":"Payment Card"},{"value":"3","text":"Payment Card Token"}]
            "instrumenttype": 'instrumenttype',
            //[{"value":"","text":""},{"value":"14","text":"Payment Card Token"}]
            "paymentMethod": 'paymentmethod', // PAYMETN METHOD
            "customer": 'entity', // CUSTOMER
            "memo": 'memo',
            "token": 'token',
            //('8Quanta','18'), ('Access Worldpay','15'), ('Adyen','3'), ('AltaPay','4'), ('Cybersource','1'), ('Dummy Gateway','12'), ('eWAY','5'), ('FreedomPay','2'), ('MerchantE','6'), ('Paycorp','8'), ('PayPal','17'), ('PayU','9'), ('SecurePay','10'), ('Square','16'), ('Versapay','11'), ('Windcave','13'), ('Worldpay','7'), ('WorldPay Integrated Payments','14')
            // "tokenFamily": 'tokenfamily',
            "tokenExpirationDate": 'tokenexpirationdate',
            "tokenNamespace": 'tokennamespace',
            "cardIssuerID": 'cardissueridnumber',
            "cardName": 'cardnameoncard',
            "cardBrand": 'cardbrand', //('AMEX','6'), ('CIRRUS','12'), ('DINERS_CLUB','3'), ('DISCOVER','5') ,('JCB','8'), ('LASER','11'),('LOCAL_CARD','7'), ('MAESTRO','4'), ('MASTERCARD','2'), ('SOLO','10'), ('UNIONPAY','9'), ('VISA','1')
            "cardLastFourDigits": 'cardlastfourdigits',
            //[{"value":"","text":""},{"value":"CREDIT","text":"Credit"},{"value":"DEBIT","text":"Debit"}]
            "cardType": 'cardtype',
            "cardExpirationDate": 'cardexpirationdate'
        };

        var tokenFamilies = {
            '8Quanta': '18',
            'Access Worldpay': '15',
            'Adyen': '3',
            'AltaPay': '4',
            'Cybersource': '1',
            'Dummy Gateway': '12',
            'eWAY': '5',
            'FreedomPay': '2',
            'MerchantE': '6',
            'Paycorp': '8',
            'PayPal': '17',
            'PayU': '9',
            'SecurePay': '10',
            'Square': '16',
            'Versapay': '11',
            'Windcave': '13',
            'Worldpay': '7',
            'WorldPay Integrated Payments': '14'
        }

        var cardBrands = {
            'AMEX': '6',
            'CIRRUS': '12',
            'DINERS_CLUB': '3',
            'DISCOVER': '5',
            'JCB': '8',
            'LASER': '11',
            'LOCAL_CARD': '7',
            'MAESTRO': '4',
            'MASTERCARD': '2',
            'SOLO': '10',
            'UNIONPAY': '9',
            'VISA': '1'
        }

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
         * Get PaymentCardToken Record by Id
         * @param {*} context
         * @returns
         */
        function doGet(context) {
            addJsonToRecord(context, 'GET', 'PAYMENT CARD TOKEN');
            var result = {};
            try {
                doValidation([context.id], ['id'], 'GET');
                var objRecord = record.load({
                    type: record.Type.PAYMENT_CARD_TOKEN,
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
         * Post function for http request - Create PaymentCardToken Record
         * @param {*} context - Params for Http objects
         * @returns results
         */
        function doPost(context) {
            addJsonToRecord(context, 'POST', 'PAYMENT CARD TOKEN');
            var result = null;
            try {
                doValidation([context.token, context.customer], ['token', 'customer'], 'GET');
                var pcRec = createPaymentCardToken(context);


                result = {
                    success: true,
                    message: 'PaymentTokenCard added successfully!',
                    data: {
                        id: pcRec.id,
                    }
                };

                linkPaymentToSalesOrder(context.externalid, pcRec.id, context.customer, context);
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
         * Delete PaymentCardToken Record by id
         * @param {*} context
         * @returns
         */
        function doDelete(context) {
            addJsonToRecord(context, 'DELETE', 'PAYMENT CARD TOKEN');
            var result = null;
            try {
                doValidation([context.id], ['id'], 'DELETE');
                record.delete({
                    type: record.Type.PAYMENT_CARD_TOKEN,
                    id: context.id
                });
                result = {
                    success: true,
                    message: "PaymentCardToken Record deleted successfully!"
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
         * Update PaymentCardToken Record
         * @param {*} context
         * @returns
         */
        function doPut(context) {
            addJsonToRecord(context, 'PUT', 'PAYMENT CARD TOKEN');
            var result = null;
            try {
                doValidation([context.id], ['id'], 'PUT');
                var objRecord = record.load({
                    type: record.Type.PAYMENT_CARD,
                    id: context.id
                });

                var exceptParams = ['tokenExpirationDate', 'cardExpirationDate', 'cardBrand'];
                for (var fldName in context) {
                    if (context.hasOwnProperty(fldName) && !isNullOrEmpty(fieldNames[fldName]) && exceptParams.indexOf(fldName) == -1) {
                        objRecord.setValue(fieldNames[fldName], context[fldName]);
                    }
                }

                if (!isNullOrEmpty(context['tokenExpirationDate'])) {
                    var dateArray = context['tokenExpirationDate'].split("/");
                    if (dateArray.length == 2) {
                        var date = new Date(Number(dateArray[1]), Number(dateArray[0]));
                        objRecord.setValue('tokenexpirationdate', date);
                    }
                }
                if (!isNullOrEmpty(context['cardExpirationDate'])) {
                    var dateArray = context['cardExpirationDate'].split("/");
                    if (dateArray.length == 2) {
                        var date = new Date(Number(dateArray[1]), Number(dateArray[0]));
                        objRecord.setValue('cardexpirationdate', date);
                    }
                }
                // if (!isNullOrEmpty(context['tokenFamily'])) {
                //     objRecord.setValue('tokenfamily', tokenFamilies[context['tokenFamily']]);
                // }
                if (!isNullOrEmpty(context['cardBrand'])) {
                    objRecord.setValue('cardbrand', tokenFamilies[context['cardBrand']]);
                }

                objRecord.save();
                result = {
                    success: true,
                    message: "PaymentCardToken Record updated successfully!"
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

        function getSalesOrder(salesOrderExternalId) {
            var intOrderId = null;
            var objSearch = search.create({
                type: search.Type.SALES_ORDER,
                filters: [
                    ['type', 'anyof', 'SalesOrd'],
                    'AND',
                    ['mainline', 'is', 'T'],
                    'AND',
                    ['externalid', 'anyof', salesOrderExternalId]
                ]
            });
            if (objSearch.runPaged().count > 0) {
                objSearch.run().getRange({ start: 0, end: 1 }).forEach(function (result) {
                    intOrderId = result.id;
                });
            }
            return intOrderId;
        }

        function linkPaymentToSalesOrder(salesOrderExternalId, paymentTokenId, customer, context) {
            if (!salesOrderExternalId) {
                throw error.create({
                    name: 'MISSING_REQ_ARG',
                    message: 'Missing a required argument: [salesOrderExternalId] for method: linkPaymentToSalesOrder'
                });
            } else {
                var intSalesOrderId = getSalesOrder(salesOrderExternalId);

                if (!!intSalesOrderId) {
                    if (orderAndCustomerMatch(salesOrderExternalId, customer)) {
                        record.submitFields({
                            type: record.Type.SALES_ORDER,
                            id: intSalesOrderId,
                            values: {
                                custbody_payment_card_token: paymentTokenId,
                                custbody_mrk_payload: JSON.stringify(context)
                            }
                        })
                        return true;
                    } else {
                        throw error.create({
                            name: 'ORDER_NOT_FOUND',
                            message: 'Order ' + salesOrderExternalId + ' does not match customer ' + customer
                        });
                    }
                } else {
                    throw error.create({
                        name: 'ORDER_NOT_FOUND',
                        message: 'Order does not exist for external ID: ' + salesOrderExternalId
                    });
                }

            }
        }

        function orderAndCustomerMatch (salesOrderExternalId, customer) {
            var isMatch = false;
            var objSearch = search.create({
                type: search.Type.SALES_ORDER,
                filters: [
                    ['name', 'anyof', customer],
                    'AND',
                    ['mainline', 'is', 'T'],
                    'AND',
                    ['externalid', 'anyof', salesOrderExternalId]
                ]
            });
            if (objSearch.runPaged().count > 0) isMatch = true;
            return isMatch;
        }

        /**
         * Create or update PaymentCardToken Record
         * @param {*} params
         * @returns N/PaymentCardToken Record
         */
        function createPaymentCardToken(params) {
            var objRecord = record.create({
                type: record.Type.PAYMENT_CARD_TOKEN,
                isDynamic: true
            });
            // objRecord.setValue('instrumenttype', 3); //Payment Card Token
            objRecord.setValue('paymentmethod', 14); //Payment method
            objRecord.setValue('tokenfamily', 1); //Cybersource

            var exceptParams = ['tokenExpirationDate', 'cardExpirationDate', 'cardBrand'];
            for (var fldName in params) {
                if (params.hasOwnProperty(fldName) && !isNullOrEmpty(fieldNames[fldName]) && exceptParams.indexOf(fldName) == -1) {
                    objRecord.setValue(fieldNames[fldName], params[fldName]);
                }
            }

            if (!isNullOrEmpty(params['tokenExpirationDate'])) {
                var dateArray = params['tokenExpirationDate'].split("/");
                if (dateArray.length == 2) {
                    var date = new Date(Number(dateArray[1]), Number(dateArray[0]));
                    objRecord.setValue('tokenexpirationdate', date);
                }
            }
            if (!isNullOrEmpty(params['cardExpirationDate'])) {
                var dateArray = params['cardExpirationDate'].split("/");
                if (dateArray.length == 2) {
                    var date = new Date(Number(dateArray[1]), Number(dateArray[0]));
                    objRecord.setValue('cardexpirationdate', date);
                }
            }

            if (!isNullOrEmpty(params['cardBrand'])) {
                objRecord.setValue('cardbrand', cardBrands[params['cardBrand']]);
            }

            var recordId = objRecord.save({
                ignoreMandatoryFields: false
            });
            return objRecord;
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

        function addJsonToRecord(jsonData, type, recordType) {
            //add try catch block
            try {
                var logLevel = runtime.getCurrentScript().logLevel;
                log.debug('logLevel', logLevel);
                if(logLevel === 'DEBUG') {
                    var requestsRecord = record.create({
                        type: 'customrecord_mrk_json_incoming_requests'
                    });
                    requestsRecord.setValue('custrecord_mrk_json_request', JSON.stringify(jsonData));
                    requestsRecord.setValue('custrecord_mrk_request_type', type);
                    requestsRecord.setValue('custrecord_mrk_request_record_type', recordType);
                    requestsRecord.save({ignoreMandatoryFields: true});
                }
            }
            catch(e) {
                log.error('Error', e);
            }
        }

        function validateParams(params) {
            // cardType, cardLastFourDigits, token
        }

        return {
            post: doPost,
            get: doGet,
            delete: doDelete,
            put: doPut,
        };
    }
);