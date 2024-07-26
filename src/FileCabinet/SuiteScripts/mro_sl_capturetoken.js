/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */

 define(['N/runtime', 'N/record', 'N/search', 'N/redirect', 'N/ui/message', 'N/error'], function (runtime, record, search, redirect, message, error) {
    const intPaymentProcessingProfileId = '3';
    function onRequest(context) {
        try {
            if (context.request.method !== 'GET') return;
            //throw error.create({
            //name: 'Test Name - Suitelet',
            //message: 'Test Message - Suitelet'
            //});

            var objRequest = context.request;
            var intSalesOrderId = objRequest.parameters.internalid;
            var intPaymentTokenId = objRequest.parameters.paymentokenid;

            if (intSalesOrderId == '' || intPaymentTokenId == '') return;

            var stDepositReturn = createCustomerDeposit(intSalesOrderId, intPaymentTokenId);
            log.debug('stDepositReturn', stDepositReturn);
            if (isNumericOnly(stDepositReturn)) {
                setPaymentTokenInactive(intPaymentTokenId);
                setSalesOrderCaptured(intSalesOrderId);
            } else {
                var stDepositReturnError = JSON.parse(stDepositReturn);
                stDepositReturn = stDepositReturnError.name + ': ' + stDepositReturnError.message;
            }
            var bSuccess = isNumericOnly(stDepositReturn) ? true : false;
            context.response.write(JSON.stringify({
                isSuccess: bSuccess,
                depositReturn: stDepositReturn
            }));
        } catch (ex) {
            var stError = (ex.getCode != null) ? ex.getCode() + '\n' + ex.getDetails() + '\n' : ex.toString();
            log.error('Error: onRequest()', stError);
            context.response.write(JSON.stringify({
                isSuccess: false,
                depositReturn: stError
            }));
        }
    }

    function createCustomerDeposit(orderId, paymentTokenId) {
        try {
            log.debug('paymentTokenId', paymentTokenId);
            var objSalesOrderLookup = search.lookupFields({
                type: search.Type.SALES_ORDER,
                id: orderId,
                columns: ['entity', 'amount']
            });

            var intCustomerId = objSalesOrderLookup.entity[0].value;
            var flAmount = objSalesOrderLookup.amount;
            log.debug('intCustomerId', intCustomerId);
            log.debug('flAmount', flAmount);

            var objDepositRecord = record.create({
                type: record.Type.CUSTOMER_DEPOSIT,
            });
            objDepositRecord.setValue({
                fieldId: 'customer',
                value: intCustomerId
            });
            objDepositRecord.setValue({
                fieldId: 'salesorder',
                value: orderId
            });
            objDepositRecord.setValue({
                fieldId: 'payment',
                value: flAmount
            });

            try {
                objDepositRecord.setValue({
                    fieldId: 'paymentoption',
                    value: paymentTokenId
                });
            } catch (ex) {
                log.error('Error: Invalid value for payment option', paymentTokenId);
                objDepositRecord.setValue({
                    fieldId: 'paymentoption',
                    value: ''
                });
            }
            objDepositRecord.setValue({
                fieldId: 'paymentprocessingprofile',
                value: intPaymentProcessingProfileId
            });
            objDepositRecord.setValue({
                fieldId: 'custbody_mrk_from_capture_token_btn',
                value: true
            });

            var intDepositId = objDepositRecord.save({
                ignoreMandatoryFields: true,
                enableSourcing: true
            });
            return intDepositId;
        } catch (ex) {
            var stError = (ex.getCode != null) ? ex.getCode() + '\n' + ex.getDetails() + '\n' : ex.toString();
            log.error('Error: createCustomerDeposit()', stError);
            return stError;
        }
    }

    function setSalesOrderCaptured(salesOrderId) {
        try {
            record.submitFields({
                type: record.Type.SALES_ORDER,
                id: salesOrderId,
                values: {
                    custbody_mrk_deposit_created_capture: true
                }
            });
        } catch (ex) {
            var stError = (ex.getCode != null) ? ex.getCode() + '\n' + ex.getDetails() + '\n' : ex.toString();
            log.error('Error: setSalesOrderCaptured()', stError);
            return null;
        }
    }

    function setPaymentTokenInactive(paymentTokenId) {
        try {
            record.submitFields({
                type: record.Type.PAYMENT_CARD_TOKEN,
                id: paymentTokenId,
                values: {
                    isinactive: true
                }
            });
        } catch (ex) {
            var stError = (ex.getCode != null) ? ex.getCode() + '\n' + ex.getDetails() + '\n' : ex.toString();
            log.error('Error: createCustomerDeposit()', stError);
            return null;
        }
    }

    function isNumericOnly(value) {
        return !isNaN(value) && !isNaN(parseFloat(value));
    }

    return {
        onRequest: onRequest
    };
});