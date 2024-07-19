/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */

define(['N/runtime', 'N/record', 'N/search', 'N/http', 'N/file', 'N/render', 'N/xml', 'N/format', 'N/email', 'N/redirect'], function (runtime, record, search, http, file, render, xml, format, email, redirect) {
    function onRequest(context) {
        try {
            if (context.request.method !== 'GET') return;
            var objScript = runtime.getCurrentScript();

            var objRequest = context.request;
            var intSalesOrderId = objRequest.parameters.internalid;
            var intPaymentTokenId = objRequest.parameters.paymentokenid;

            if (intSalesOrderId == '' || intPaymentTokenId == '') return;

            var intDepositId = createCustomerDeposit(intSalesOrderId, intPaymentTokenId);
            if (intDepositId) {
                setPaymentTokenInactive(intPaymentTokenId);
            }

            redirect.toRecord({
                type: record.Type.CUSTOMER_DEPOSIT,
                id: intDepositId
            })
        } catch (ex) {
            var stError = (ex.getCode != null) ? ex.getCode() + '\n' + ex.getDetails() + '\n' : ex.toString();
            log.error('Error: onRequest()', stError);
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
                fieldId: 'custbody_cs_pymt_tran_level_type',
                value: '3'
            });
            objDepositRecord.setValue({
                fieldId: 'paymentoperation',
                value: 'SALE'
            });
            objDepositRecord.setValue({
                fieldId: 'paymentprocessingprofile',
                value: '2'
            });
            objDepositRecord.setValue({
                fieldId: 'handlingmode',
                value: 'PROCESS'
            });

            var intDepositId = objDepositRecord.save({
                ignoreMandatoryFields: true,
                enableSourcing: true
            });
            return intDepositId;
        } catch (ex) {
            var stError = (ex.getCode != null) ? ex.getCode() + '\n' + ex.getDetails() + '\n' : ex.toString();
            log.error('Error: createCustomerDeposit()', stError);
            return null;
        }
    }

    function setPaymentTokenInactive(paymentTokenId) {
        try {
            record.submitFields({
                type: record.Type.PAYMENT_CARD_TOKEN,
                id: paymentTokenId,
                values: {
                    inactive: true
                }
            });
        } catch (ex) {
            var stError = (ex.getCode != null) ? ex.getCode() + '\n' + ex.getDetails() + '\n' : ex.toString();
            log.error('Error: createCustomerDeposit()', stError);
            return null;
        }
    }

    return {
        onRequest: onRequest
    };
});