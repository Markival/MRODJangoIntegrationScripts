/* To protect against version incompatibility, this script includes the @NApiVersion tag.
* @NApiVersion 2.x
*/

define(['N/record', 'N/https', 'N/log'], function (_record, _https, _log) {

    var HEADERS = {
        "Content-Type": 'application/json',
        "x-api-key": "knP0G5C1x04A8craIGcmn9NCSFukzLsg5EU0N1fD"
    };

    function getItemPreferredVendor(item) {
        // TODO maybe avail should be fetched for all possible vendors?
        var sublist = "itemvendor";
        var lines = item.getLineCount({sublistId: sublist});
        for (var line = 0; line < lines; line++) {
            if (item.getSublistValue({sublistId: sublist, fieldId: "preferredvendor", line: line})) {
                return item.getSublistValue({sublistId: sublist, fieldId: "vendor", line: line});
            }
        }
        return -1;
    }

    function requestInventoryUpdate(items) {
        /* Payload structurep
            {
              "items": [
                {"item_id":"503596","mpn":"VM3542", "vendor_id":"1", "brand_id":"2"},
                {"item_id":"462589","mpn":"CEM3614T", "vendor_id":"1", "brand_id":"2"},
              ]
            }
        */
        if (!items.length) {
            return null;
        }
        var payload_items = [];
        items.forEach(function (item) {
            payload_items.push({
                "item_id": item.id,
                "mpn": item.getValue({fieldId: "mpn"}),
                "vendor_id": getItemPreferredVendor(item),
                "brand_id": item.getValue({fieldId: "custitem_mro_brand"})
            });
        })
        return _https.post({
            url: 'https://u5dnrbc068.execute-api.us-east-1.amazonaws.com/prod/availability',
            headers: HEADERS,
            body: JSON.stringify({'items': payload_items})
        });
        /*
         * If success response then create blocking request records (Custom Record)
         * Poll to see if jobs have completed and return results
         */
    }

    return {
        requestInventoryUpdate: requestInventoryUpdate
    };
});
