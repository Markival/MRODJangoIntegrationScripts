/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/runtime', 'N/search', 'N/url'], (runtime, search, url) => {

    /**
     * Defines the function definition that is executed before record is loaded.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
     * @param {Form} scriptContext.form - Current form
     * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
     * @since 2015.2
     */
    const beforeLoad = (scriptContext) => {
        const objScript = runtime.getCurrentScript();
        const objUser = runtime.getCurrentUser();
        const PARAM_SUITELET_ID = objScript.getParameter({ name: 'custscript_mrk_capturetokensl' });

        try {
            if (scriptContext.type !== scriptContext.UserEventType.VIEW) return;
            const objNewRecord = scriptContext.newRecord;
            const intRecordId = objNewRecord.id;
            const objForm = scriptContext.form;
            const intUserId = objUser.id;
            const intPaymentTokenId = objNewRecord.getValue({
                fieldId: 'custbody_payment_card_token'
            });

            if ((!intPaymentTokenId || intPaymentTokenId == '') && searchRelatedDeposit(intRecordId) == 0) return;
            const stUrl = url.resolveScript({
                scriptId: 'customscript' + PARAM_SUITELET_ID,
                deploymentId: 'customdeploy' + PARAM_SUITELET_ID,
                params: {
                    internalid: intRecordId,
                    paymentokenid: intPaymentTokenId,
                    userid: intUserId
                }
            });

            objForm.addButton({
                id: 'custpage_mrk_capturetokenbtn',
                label: 'Capture Token',
                functionName: 'window.open("' + stUrl + '", "_blank")'
            });
        } catch (ex) {
            var stError = (ex.getCode != null) ? ex.getCode() + '\n' + ex.getDetails() + '\n' : ex.toString();
            log.error('Error: beforeLoad()', stError);
        }
    }

    const searchRelatedDeposit = (salesOrderId) => {
        try {
            const objSearch = search.create({
                type: search.Type.CUSTOMER_DEPOSIT,
                filters: [
                    ['mainline', 'is', 'T'],
                    'AND',
                    ['salesorder', 'anyof', salesOrderId]
                ]
            });
            log.debug('searchRelatedDeposit count', objSearch.runPaged().count);
            return objSearch.runPaged().count;
        } catch (ex) {
            var stError = (ex.getCode != null) ? ex.getCode() + '\n' + ex.getDetails() + '\n' : ex.toString();
            log.error('Error: searchRelatedDeposit()', stError);
        }
    }

    return { beforeLoad }
});
