/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
 define(['N/record', 'N/search', 'N/log','N/cache', 'SuiteScripts/Modules/mro/mro_serverside'], function(_record, _search, _log, _cache, _mross) {

    function get_items_by_brand(brand_id, start, end) {
      var items_search = _search.create({
        type: "inventoryitem",
        filters: [
          ["custitem_mro_brand", "is", brand_id],
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
        var brand = result.getValue("custitem_mro_brand");
        if (brand) {
          brand = _mross.getBrand(brand);
          if (brand) brand = brand["name"];
        }      
        var category = result.getValue("custitem_mro_item_prodcategory");
        if (category) {
          category = _mross.getCategory(category);
          if (category) category = category["name"];
        }
  
        var uom = result.getValue("saleunit");
        if (uom) {
          uom = _mross.getUnitOfMeasure(uom);
        }
  
        items.push({
          "Product ID": internalid,
          "SKU": result.getValue("mpn"),
          "Name": result.getValue("itemid"),
          "Product URL": "https://sca.mrosupply.com/product/"+internalid,
          "Category": category,
          "Brand": brand,
          "Description": _mross.twoBeforeOne(result.getValue("salesdescription"),result.getValue("storedescription")),
          "Search Keywords": "",
          "Unit of Measure": uom,
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
  
    function get_brands() {
      var index = 0;
      var search_length = 1000;
      var results = []
      var brand_search = _search.create({
        type: "inventoryitem",
        filters:[
        ],
        columns: [
          _search.createColumn({
            name: "custitem_mro_brand",
            summary: "GROUP",
          }),
          _search.createColumn({
            name: "internalid",
            summary: "COUNT",
          }),
        ]
      });
      var brand_results = brand_search.run();
      do {
        var start = index;
        var end = start + search_length;
  
        var result_subset = brand_results.getRange(start, end);
        if (result_subset.length == 0) {
          break;
        }
        for (var i = 0; i < result_subset.length; i++) {
          brand_id = result_subset[i].getValue({name: "custitem_mro_brand", summary: 'GROUP'});
          brand_name = result_subset[i].getText({name: "custitem_mro_brand", summary: 'GROUP'});
          item_count = result_subset[i].getValue({name: "internalid", summary: 'COUNT'});
          if(item_count > 0){
            results.push({"id": brand_id, "name": brand_name, "item_count": item_count});
          }
        }
        index = index + result_subset.length;
      } while (true);
      return { brands: results };
    }
  
    function _get (context) {
        try {
          var brand_id = context.brand;
          if (brand_id) {
            _log.debug({title: 'GET->Items', details: "context->start: "+context.start+" context->end: "+context.end});
            var start = Number(context.start);
            var end = Number(context.end);
            _log.debug({title: 'GET->Items', details: "Brand ID: "+brand_id+" Start: "+start+" End: "+end});
            if (start >= 0 && end >=0 ) {
              return get_items_by_brand(brand_id, start, end);
            }
          }
          else {
            _log.debug({title: 'GET->Brands', details: "Loading All Brands"})
            return get_brands();
          }
        } catch (err) {
          _log.debug({title: 'GET', details: JSON.stringify(err)});
          return err;
        }
    }
  
  
    return {
      get: _get,
    };
  
  });
  