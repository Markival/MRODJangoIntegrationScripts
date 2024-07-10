/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log'], function (record, search, log) {

    var ACCOUNT = "384";
    var SUBSIDIARY = "5";

    function getMatchedLocation(vendorLocationID) {
        var location_search = search.create({
            type: "location",
            filters: [
                ["custrecord_mro_avail_vendorloc", "is", vendorLocationID],
                "AND",
                ["subsidiary", "anyof", SUBSIDIARY]
            ],
            columns: ['name']
        });
        var result = location_search.run().getRange({start: 0, end: 1})
        if (result.length) {
            return record.load({
                type: "location",
                id: result[0].id
            });
        } else {
            log.error({
                title: "Error finding Vendor Location: ",
                details: "Vendor Location Code: " + vendorLocationID
            });
        }
    }

    /*
     * could refactor to improve performance by querying for all items in the payload
     */
    function getAvailabilityByLocation(item) {
        var data = []
        var itemSearchObj = search.create({
            type: "item",
            filters: [
                ["inventorylocation.subsidiary", "anyof", SUBSIDIARY],
                "AND",
                ["internalidnumber", "equalto", item.id],
                "AND",
                ["locationquantityonhand", "greaterthan", "0"]
            ],
            columns: [
                search.createColumn({name: "inventorylocation"}),
                search.createColumn({name: "locationquantityonhand"}),
                search.createColumn({name: "custrecord_mro_avail_vendorloc", join: "inventoryLocation"})
            ]
        });
        itemSearchObj.run().each(function (result) {
            data.push({
                item_id: item.id,
                quantity: result.getValue("locationquantityonhand"),
                vendor_location_code: result.getValue("custrecord_mro_avail_vendorloc"),
                location_id: result.getValue("inventorylocation"),
                cost: 0
            });
        });
        return data;
    }


    function calculateInventoryAdjustments(data) {
        var adjustments = [];
        try {
            var item = record.load({
                type: "inventoryitem",
                id: data.item_id
            })
        }
        catch (e) {
            if (e.name === 'RCRD_DSNT_EXIST') {
                log.error({
                    title: "No matching product found",
                    details: "Item Lookup Value: " + data.item_id
                });
                return adjustments;
            }
            else {
                throw e;
            }
        }

        /*
         * 0 out all onhands for this item in the Vendor Warehouse subsidiary
         */
        var avail_data = getAvailabilityByLocation(item);
        for (var i = 0; i < avail_data.length; i++) {
            var adjustment = avail_data[i];
            log.debug({
                title: "adjustment object",
                details: adjustment
            });
            adjustment.quantity = -1 * adjustment.quantity;
            adjustments.push(adjustment);
        }

        /*
         * add back in all the new data.
         */
        data.availability.forEach(function (avail, i) {
            //Get Location by Vendor Location Code
            var location = getMatchedLocation(avail.location_code);
            if (location) {
                adjustments.push({
                    item_id: item.id,
                    mpn: item.mpn,
                    quantity: avail.quantity,
                    location_id: location.id,
                    cost: 0
                });
            }
        })
        return adjustments;
    }


    function createInventoryAdjustments(adjustments) {
        var sublistId = "inventory";
        var ia = record.create({
            type: "inventoryadjustment",
            isDynamic: true,
            defaultValues: null
        });
        /*
         * Set record level fields here
         * Order of operations since we are in dynamic mode: subsidiary first, then account
         */
        ia.setValue({fieldId: 'subsidiary', value: SUBSIDIARY});
        ia.setValue({fieldId: 'account', value: ACCOUNT});

        /*
         * Loop through all the adjustment lines
         */
        adjustments.forEach(function (adj, i) {
            ia.selectNewLine({sublistId: sublistId});
            ia.setCurrentSublistValue({sublistId: sublistId, fieldId: "item", value: adj.item_id});
            ia.setCurrentSublistValue({sublistId: sublistId, fieldId: "adjustqtyby", value: adj.quantity});
            ia.setCurrentSublistValue({sublistId: sublistId, fieldId: "location", value: adj.location_id});
            ia.setCurrentSublistValue({sublistId: sublistId, fieldId: "unitcost", value: adj.cost});
            ia.commitLine({sublistId: sublistId});
        })
        ia.save();
    }

    function post(context) {
        log.debug({
            title: "Context",
            details: context
        });
        if (context.status === "success" && context.results.length) {
            var adjustments = [];
            var results = context.results;
            results.forEach(function (value, i) {
                adjustments = adjustments.concat(calculateInventoryAdjustments(value));
            })
            log.debug({
                title: "Total Calculated Adjustments",
                details: adjustments.length
            });
            if (adjustments.length) {
                createInventoryAdjustments(adjustments);
            }
            /*
             * TODO: HERE: Create custom record to log success task completion and reference inventory adjustment
             * TODO: Create the task record from the requesting script library and set status to pending?
             */
        } else if (context.results.length) {
            log.error({title: "Results", details: "no results received"});
            return {"status": "no results"}
        } else {
            /*
             * TODO: HERE: Create custom record to log failure task completion.
             */
            log.error({
                title: "Tasked failed to complete",
                details: "UUID: " + context.uuid + " " + context.status
            });
            return {"status": context.status}
        }
        return {"status": "success"}
    }

    return {
        post: post
    };

});