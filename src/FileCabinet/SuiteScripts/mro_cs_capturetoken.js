/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/runtime', 'N/record', 'N/search', 'N/ui/message', 'N/https', 'N/url'], function (runtime, record, search, message, https, url) {

    function pageInit(scriptContext) {
        //
    }

    /**
     Global Variables
     */
    {
        var suiteletId = '_mrk_sl_capturetoken';
    }

    function captureToken(orderId, paymentTokenId) {
        try {
            log.debug('orderId', orderId);
            log.debug('paymentTokenId', paymentTokenId);
            var intSalesOrderId = orderId;
            var intPaymentTokenId = paymentTokenId;

            if (intSalesOrderId == '' || intPaymentTokenId == '') {
                message.create({
                    title: 'Error',
                    message: 'Order or Payment Token not found.',
                    type: message.Type.ERROR
                }).show({ duration: 20000 });
            };

            var response = {
                success: false,
                message: '',
                slResponse: null,
            };
            try {
                var stUrl = url.resolveScript({
                    scriptId: 'customscript' + suiteletId,
                    deploymentId: 'customdeploy' + suiteletId,
                    params: {
                        internalid: intSalesOrderId,
                        paymentokenid: intPaymentTokenId
                    }
                });
                var objResponse = https.get({
                    url: stUrl,
                });
                response.slResponse = JSON.parse(objResponse.body);
                var stDepositReturn = response.slResponse.depositReturn;

                if (response.slResponse.isSuccess) {
                    var stDepositUrl = url.resolveRecord({
                        recordType: record.Type.CUSTOMER_DEPOSIT,
                        recordId: stDepositReturn
                    });
                    window.open(stDepositUrl, '_blank');
                    message.create({
                        title: 'Confirmation',
                        message: 'Transaction successfully created.',
                        type: message.Type.CONFIRMATION
                    }).show();
                } else {
                    message.create({
                        title: 'Error',
                        message: stDepositReturn,
                        type: message.Type.ERROR
                    }).show({ duration: 60000 });
                }
            } catch (e) {
                log.error('requestSuitelet', e.message);
                response.message = e.message;
            } finally {
                return response;
            }
        } catch (ex) {
            var stError = (ex.getCode != null) ? ex.getCode() + '\n' + ex.getDetails() + '\n' : ex.toString();
            log.error('Error: captureToken()', stError);
        }
    }

    return {
        pageInit: pageInit,
        captureToken: captureToken
    };

});

