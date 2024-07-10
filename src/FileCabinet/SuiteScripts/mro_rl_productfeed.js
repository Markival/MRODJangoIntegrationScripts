/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log','N/cache', 'SuiteScripts/Modules/mro/mro_serverside'], function(_record, _search, _log, _cache, _mross) {

  function getCategoryItemCount(id) {
    return _mross.getCategory(id)["product_count"];
  }
  /*function get_item_count_by_category(category_id) {
      var index = 0;
      var search_length = 1000;
      var items_search = _search.create({
        type: "inventoryitem",
        filters: [
          ["custitem_mro_item_prodcategory", "is", category_id],
          "and",
          ["isonline","is","T"]
        ],
        columns: [
          "internalid"
        ]
      });
      return items_search.runPaged().count;
  }*/


  function get_items_by_category(category_id, start, end) {
    var items_search = _search.create({
      type: "inventoryitem",
      filters: [
        ["custitem_mro_item_prodcategory", "is", category_id],
        "and",
        ["isonline","is","T"]
      ],
      columns: [
        "internalid",
        "mpn",
        "itemid",
        "custitem_mro_item_prodcategory",
        "custitem_mro_brand",
        "salesdescription",
        "storedescription",
        "saleunit",
        "minimumquantity",
        "weight",
        "custitem_mro_returnable",
        "custitem_mro_obsolete",
        "custitem_mro_madetoorder",
        "onlineprice",
        "custitem_mro_item_attributes",
        "custitem_mro_typicallyships",
        "custitem_mro_additional_description",
        "custitem_mro_ecommerce_mainimage"
      ]
    });
    var items = []
    var item_results = items_search.run();
    var result_subset = item_results.getRange(start, end);

    if (result_subset.length == 0) {
        _log.debug({title: 'GET->Items', details: "No items returned start: "+start+" end:"+end});
        return {
          items: items,
          start: start,
          end: end
        };
    }

    for (var i = 0; i < result_subset.length; i++) {
      var result = result_subset[i];
      var internalid = result.getValue("internalid");
      var brand = _mross.getBrand(result.getValue("custitem_mro_brand"));
      if (brand) brand = brand["name"];
      var category = _mross.getCategory(result.getValue("custitem_mro_item_prodcategory"));
      if (category) category = category["name"];

      items.push({
        "Product ID": internalid,
        "SKU": result.getValue("mpn"),
        "Name": result.getValue("itemid"),
        "Product URL": "https://sca.mrosupply.com/product/"+internalid,
        "Category": category,
        "Brand": brand,
        "Description": _mross.twoBeforeOne(result.getValue("salesdescription"),result.getValue("storedescription")),
        "Search Keywords": "",
        "Unit of Measure": _mross.getUnitOfMeasure(result.getValue("saleunit")),
        "Minimum Order Quantity": result.getValue("minimumquantity"),
        "Weight": result.getValue("weight"),
        "Returnable": result.getValue("custitem_mro_returnable"),
        "Obsolete": result.getValue("custitem_mro_obsolete"),
        "Made to Order": result.getValue("custitem_mro_madetoorder"),
        "Price": result.getValue("onlineprice"),
        "Thumbnail URL": result.getValue("custitem_mro_ecommerce_mainimage"),
        "Additional Description": result.getValue("custitem_mro_additional_description"),
        "Attributes": result.getValue("custitem_mro_item_attributes"),
      });
    }
    return {
      items: items,
      start: start,
      end: end
    };
  }

  function get_categories() {
    var index = 0;
    var search_length = 1000;
    var results = []

    var category_search = _search.create({
      type: "customrecord_mro_prod_category",
      filters:[
        ["custrecord_mro_prod_category_leaf", "is", "T"],
        'and',
        ["custrecord_mro_prod_category_visible", "is", "T"]
      ],
      columns: ["internalid","name","custrecord_mro_prod_category_prodcount"]
    });
    var category_results = category_search.run();
    do {
      var start = index;
      var end = start + search_length;

      var result_subset = category_results.getRange(start, end);
      if (result_subset.length == 0) {
        break;
      }
      for (var i = 0; i < result_subset.length; i++) {
        category_id = result_subset[i].getValue("internalid");
        item_count = result_subset[i].getValue("custrecord_mro_prod_category_prodcount");
        if(item_count > 0){
          results.push({"id": category_id, "name": result_subset[i].getValue("name"), "item_count": item_count});
        }
      }
      index = index + result_subset.length;
    } while (true);
    return { categories: results };
  }

  function _get (context) {
      try {
        var category_id = context.category;
        if (category_id) {
          _log.debug({title: 'GET->Items', details: "context->start: "+context.start+" context->end: "+context.end});
          var start = Number(context.start);
          var end = Number(context.end);
          _log.debug({title: 'GET->Items', details: "Category ID: "+category_id+" Start: "+start+" End: "+end});
          if (start >= 0 && end >=0 ) {
            return get_items_by_category(category_id, start, end);
          }
        }
        else {
          _log.audit({title: 'GET->Categories', details: "Loading All Leaf Categories"})
          return get_categories();
        }
      } catch (err) {
        log.audit({title: 'GET', details: JSON.stringify(err)});
        return err;
      }
  }


  return {
    get: _get,
  };

});
