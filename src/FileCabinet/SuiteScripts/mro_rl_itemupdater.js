/**
 *@NApiVersion 2.x
 *@NScriptType Restlet

 JSON Payload Example

 {
  "items": [
    {
      id: '12345678',
      externalid: '87654321',
      fields: {
        custitem_mro_item_attributes: 'depth:7/16|length:20|cogged:no|section:b|top width:21/32|number ribs:1|outside length:20|depth (per rib):7/16|top width (per rib):21/32',
      }
      prices: [
        {'pricelevel': '1', price: '12345678'},
        {'pricelevel': '2', price: '12345678'},
        {'pricelevel': '3', price: '12345678'}
      ]
    },
  ]
}

 */
define(['N/record', 'N/search', 'N/log', 'SuiteScripts/Modules/mro/mro_serverside'], function(_record, _search, _log, _mross) {
  var type = 'inventoryitem';

  function update_costs(nsrecord, costs) {
    for(var i = 0; i < costs.length; i++) {
      var cost = costs[i];
      _mross.updateItemSupplierCost(nsrecord, cost.vendor, cost.preferred, cost.cost);
    }
  }

  function update_prices(nsrecord, prices) {
    for(var i = 0; i < prices.length; i++) {
      var price = prices[i];
      _mross.updateItemPriceLevelPrice(nsrecord, price.price, price.pricelevel);
    }
  }


  function process_record(jsonrecord) {
    var type = 'inventoryitem';
    var nsrecord;
    if(jsonrecord.internalid) {
      nsrecord = _record.load({type: 'inventoryitem', id: jsonrecord.internalid, isDynamic: false});
    }
    else if (jsonrecord.externalid) {
      nsrecord = _mross.get_item_by_externalid(jsonrecord.externalid);
    }
    if(nsrecord) {
      try {
        if(jsonrecord.fields) {
          Object.keys(jsonrecord.fields).forEach(function(key) {
            nsrecord.setValue({fieldId: key, value: jsonrecord.fields[key]});
          });
        }
        if(jsonrecord.prices || jsonrecord.costs) {
          //To limit the number of record loads combine them HERE
          if(jsonrecord.prices) {
            update_prices(nsrecord, jsonrecord.prices);
          }
          if(jsonrecord.costs) {
            update_costs(nsrecord, jsonrecord.costs);
          }

        }
        nsrecord.save();
      }
      catch(error) {
        log.debug({title: "some logs here", details: error});
      }
    }

  }

  function get_item_count_by_group(pmg_id) {
      var items_search = _search.create({
        type: "inventoryitem",
        columns: ["internalid"],
        filters: [
          ["custitem_mro_pricematrixgroup","is", pmg_id]
        ]
      });
      return items_search.runPaged().count;
  }

  function get_items_by_price_matrix_group(pmg_id, start, end) {
    try{
      var results = [];
      var items_search = _search.create({
        type: "inventoryitem",
        columns: [
          "internalid",
          "baseprice",
          "price5",  //Default
          "price29", //List
          "price30", //MAP
          "price31", //Amazon
        ],
        filters: [
          ["custitem_mro_pricematrixgroup","is", pmg_id],
        ]
      });
      var item_results = items_search.run();
      if((end - start) <= 1000) {
        var result_subset = item_results.getRange(start, end);
        if(result_subset.length > 0) {
          for(var i = 0; i < result_subset.length; i++){
            var item_data = result_subset[i];
            item_id = item_data.getValue("internalid");
            item = _record.load({type: "inventoryitem", id: item_id});

            vendor_preferred_cost = _mross.getItemVendorPreferredCost(item);

            results.push({
              id: item_id,
              vendor_preferred_cost: vendor_preferred_cost,
              price1: item_data.getValue("baseprice"),  //Cost
              price5: item_data.getValue("price5"),  //Default
              price29: item_data.getValue("price29"), //List
              price30: item_data.getValue("price30"), //MAP
              price31: item_data.getValue("price31"), //Amazon
            });
          }
        }
      }

    } catch(e) {
      log.error('map', e.message);
    }
    return {
      items: results
    };
  }

  function get_price_matrix_group_levels(pmg_id) {
    try {
      var results = []
      var index = 0;
      var search_length = 1000;
      var price_matrix_search = _search.create({
        type: "customrecord_mro_item_pricematrix",
        columns: [
          "internalid",
          "custrecord_mro_pricing_pm_mincost",
          "custrecord_mro_pricing_pm_maxcost",
          "custrecord_mro_pm_defaultprc_formula",
          "custrecord_mro_pm_amazonprc_formula"
        ],
        filters: [
          ["custrecord_mro_pricing_pm_pmgroup","is", pmg_id]
        ]
      });
      var price_matrix_results = price_matrix_search.run();
      do {

        var start = index;
        var end = start + search_length;
        var result_subset = price_matrix_results.getRange(start, end);

        if (result_subset.length == 0) {
          break;
        }
        for (var i = 0; i < result_subset.length; i++) {
          var pl_data = result_subset[i];
          results.push({
            id: pl_data.getValue("internalid"),
            minimum: pl_data.getValue("custrecord_mro_pricing_pm_mincost"),
            maximum: pl_data.getValue("custrecord_mro_pricing_pm_maxcost"),
            default_price_formula: pl_data.getValue("custrecord_mro_pm_defaultprc_formula"),
            amazon_price_formula: pl_data.getValue("custrecord_mro_pm_amazonprc_formula"),
          });

        }
        index = index + result_subset.length;
      } while (true);
      return results;
    } catch(e){
      log.error('get_price_matrix_group_levels', e);
    }
  }
  function get_price_matrix_group_count(){
    var count = 0;
    try {
      var price_matrix_group_search = _search.create({
        type: "customrecord_mro_item_pricematrixgroup",
        columns: [
          "internalid",
          "name",
          "custrecord_pmg_defaultprc_formula",
          "custrecord_pmg_amazonprc_formula",
          "custrecord_pmg_priceupdaterequired"
        ]
      });
      count = price_matrix_group_search.runPaged().count;
    }
    catch(e) {
      log.error('get_price_matix_groups', e);
    }
    return {
      price_matrix_group_count: count
    }
  }
  function get_price_matrix_groups(start, end) {
    try {
      var results = [];

      var price_matrix_group_search = _search.create({
        type: "customrecord_mro_item_pricematrixgroup",
        filters: [
          ["custrecord_pmg_priceupdaterequired","is","T"]
        ],
        columns: [
          "internalid",
          "name",
          "custrecord_pmg_defaultprc_formula",
          "custrecord_pmg_amazonprc_formula",
          "custrecord_pmg_priceupdaterequired"
        ]
      });
      var price_matrix_group_results = price_matrix_group_search.run();

      var result_subset = price_matrix_group_results.getRange(start, end);

      if (result_subset.length > 0) {
        for (var i = 0; i < result_subset.length; i++) {
          var pmg_data = result_subset[i];
          var pmgid = pmg_data.getValue("internalid")

          results.push({
            id: pmg_data.getValue("internalid"),
            name: pmg_data.getValue("name"),
            default_price_formula: pmg_data.getValue("custrecord_pmg_defaultprc_formula"),
            amazon_price_formula: pmg_data.getValue("custrecord_pmg_amazonprc_formula"),
            price_update_required: pmg_data.getValue("custrecord_pmg_priceupdaterequired"),
            levels: get_price_matrix_group_levels(pmgid),
            item_count: get_item_count_by_group(pmgid)
          });

        }
      }

    } catch (e) {
      log.error({title: 'get_price_matrix_groups', details: JSON.stringify(e)});
    }
    return {
      price_matrix_groups: results
    }
  }
  function get(context) {
      try {
        var pmg = context.pmg;
        var pmgcount = context.pmgcount;
        var pmgfetch = context.pmgfetch;
        var start = context.start;
        var end = context.end;
        if (pmg) {
          return get_items_by_price_matrix_group(pmg, start, end);
        }
        if(pmgcount) {
          return get_price_matrix_group_count();
        }
        if(pmgfetch) {
          return get_price_matrix_groups(start, end);
        }
      } catch (err) {
        log.audit({title: 'GET', details: JSON.stringify(err)});
        return err;
      }
  }

  function post(context) {
    try {
      var items = context.items;
      //log.audit({title: 'POST', details: items});
      for(var i = 0; i < items.length; i++) {

        process_record(items[i]);
      }
    } catch(err) {
      log.debug({title: 'POST', details: JSON.stringify(err)});
      return err;
    }
  }

  return {
    get: get,
    post: post
  };

});
