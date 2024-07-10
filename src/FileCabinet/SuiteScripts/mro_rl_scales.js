/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log'], function(record, search, log) {

  /* PAYLOAD
  {
    "scales": [
      {"serialnumber": "abcd1", "reading": "1234"},
      {"serialnumber": "abcd2", "reading": "1234"},
      {"serialnumber": "abcd3", "reading": "1234"},
      {"serialnumber": "abcd4", "reading": "1234"},
      {"serialnumber": "abcd5", "reading": "1234"}
    ]
  }
	*/
  /*
  		var s = search.create({
		   type: search.Type.INVENTORY_ITEM,
		   filters:
		   [
		   		search.createFilter({name: "isinactive", operator: search.Operator.IS, values: "F"}),
		   		search.createFilter({name: "salesdescription", operator: search.Operator.CONTAINS, values: itemDescription})
		   ],
		   columns:
		   [
		     	search.createColumn({name: "itemid"}),
		     	search.createColumn({name: "salesdescription"})
		   ]
		});
   */
  function _get (context) {
      try {
        log.audit({title: 'GET', details: "Gotten!"})
        return { test: 'Hello World' };
      } catch (err) {
        log.audit({title: 'GET', details: JSON.stringify(err)});
        return err;
      }
  }

  /*

   */
  function _getScaleBySerialNumber(serialnumber) {
    var scaleSearch = search.create({
      type: "customrecord_mro_scale_scale",
      filters: [
        search.createFilter({name: "custrecord_mro_scale_scale_serialnumber", operator: search.Operator.IS, values: serialnumber})
      ],
      columns: [
        search.createColumn({name: "id"})
      ]
    });
    var resultSet = scaleSearch.run();
    var range = resultSet.getRange({start: 0, end: 1});
    if (range.length > 0) {
      log.audit({title: "Found scale", details: range[0].id});
      return range[0].id;
    }
    return null;
  }

  function _createScale(serialnumber, reading) {
    var scale = record.create({
      type: 'customrecord_mro_scale_scale',
      isDynamic: true
    });
    scale.setValue({fieldId: 'custrecord_mro_scale_scale_serialnumber', value:serialnumber});
    scale.setValue({fieldId: 'custrecord_mro_scale_scale_baseline', value:reading});
    var scale_id = scale.save();
    log.audit({title: "Scale Created", details: scale_id});
    return scale_id;

  }
  function _createReading(scale, readingvalue) {
    var reading = record.create({type: 'customrecord_mro_scale_scalereading', isDynamic: false});
    reading.setValue({fieldId: 'custrecord_mro_scale_scalereading_value', value: readingvalue});
    reading.setValue({fieldId: 'custrecord_mro_scale_scalereading_scale', value: scale});
    var reading_id = reading.save();
    log.audit({title: "Reading Created", details: reading_id});
    return reading_id;
  }

  function _consumeScale(value, index, array){
    log.audit({title: "Consuming Data", details: value})
    var serialnumber = value.serialnumber;
    var reading = value.reading;
    log.audit({title: value.serialnumber, details: value.reading})
    var scale = _getScaleBySerialNumber(serialnumber);
    if(scale == null) {
      scale = _createScale(serialnumber, reading);
    }
    return _createReading(scale, reading);
  }
	function _post(context) {
		var scales = context.scales;
		return scales.map(_consumeScale);

	}

  return {
    get: _get,
    post: _post,
  };

});

