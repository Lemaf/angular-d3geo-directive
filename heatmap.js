(function(d3) {


	var COLOR_TYPE = 'color', NUMBER_TYPE = 'number';

	var COLOR_BLEND_FACTOR = 0.5;

	var STYLE_TYPES = {
		fill: COLOR_TYPE,
		stroke: COLOR_TYPE,
		fillOpacity: NUMBER_TYPE,
		opacity: NUMBER_TYPE,
		strokeOpacity: NUMBER_TYPE,
		strokeWidth: NUMBER_TYPE
	};

	function getProperty(feature, property) {
		if(feature && (property in feature.properties)) 
			return feature.properties[property];

		throw new Error("Feature doesn't have property " + property);
	}

	function getMinMax(layer, property) {
		var features = layer.geojson.features;

		if (features.length) {

			var min = getProperty(features[0], property);
			var max = min, value;

			for (var i=1; i < features.length; i++) {
				value = getProperty(features[i], property);
				if (value < min)
					min = value;
				else if (value > max)
					max = value;
			}

			return [min, max];
		}
	}

	function HeatMap(svg, layers) {
		this._svg = svg;
		this._layers = layers;
	}

	HeatMap.prototype.getLegend = function(layer) {
		var styles = this.getStyles(layer);

		if (!styles)
			return;

		var div = document.createElement('div');
		div.className = 'heatmap-legend';

		var selection = d3.select(div);

		var linear, fill = styles.fill;
		if (fill) {

			if(fill.gauges) {

				var initialColor, finalColor;


				for (var property in fill.gauges) {
					linear = fill.gauges[property];

					var title = this._gauges[layer.name].fill[property].title;
					var unit = this._gauges[layer.name].fill[property].unit || '';

					selection.append('span').classed('initial', true).text((title ? title + ': ' : '') + linear.domain()[0] + unit);
					
					initialColor = initialColor ? d3.interpolateRgb(initialColor, linear.range()[0])(COLOR_BLEND_FACTOR) : linear.range()[0];
					finalColor = finalColor ? d3.interpolateRgb(finalColor, linear.range()[1])(COLOR_BLEND_FACTOR) : linear.range()[1];

					selection.append('span').classed('final', true).text(linear.domain()[1] + unit);
				}
				
				var sample = document.createElement('div');

				d3.select(sample).style("background", "linear-gradient(to right, " + initialColor + ", " + finalColor + ")")
				.classed('heatmap-sample', true);

				div.insertBefore(sample, selection.select('.final').node());
			}
			
		}

		return div;		
	};
	HeatMap.prototype.update = function(gauges) {
		this._gauges = gauges;

		return this;
	};

	HeatMap.prototype.getStyles = function(layer) {
		if (this._gauges && this._gauges[layer.name])
			return this._newStyles(layer, this._gauges[layer.name]);
	};

	HeatMap.prototype._newStyles = function(layer, layerGauges) {

		var styles = {};
		for (var style in layerGauges) {

			styles[style] = this._newStyle(style, layer, layerGauges[style]);
		}

		return styles;
	};

	HeatMap.prototype._newStyle = function(styleName, layer, properties) {

		switch(typeof properties) {
		case 'string':
		case 'number':
		case 'boolean':
		case 'function':
			return properties;
		}
		
		if (!properties)
			return null;

		var type = STYLE_TYPES[styleName];

		switch(type) {
		case COLOR_TYPE:
			return this._newColorStyle(layer, properties);

		case NUMBER_TYPE:
			return this._newNumberStyle(layer, properties);
			
		default:
			throw new Error('Unrecognized style ' + styleName);

		}
	};


	function colorOf(datum, gauges) {
		var color, newColor, property;
		for (property in gauges) {
			newColor = gauges[property](datum.properties[property]);
			color = color ? d3.interpolateRgb(color, newColor)(COLOR_BLEND_FACTOR) : newColor;
		}

		return color;
	}

	HeatMap.prototype._newColorStyle = function(layer, properties) {
		var gauges = {}, property, minMax, minColor, maxColor;

		for (property in properties) {
			minMax = getMinMax(layer, property);
			minColor = d3.rgb(properties[property].min);
			maxColor = d3.rgb(properties[property].max);

			gauges[property] = d3.scale.linear().domain(minMax).range([minColor, maxColor]);
		}

		function colorStyle(datum, index) {
			return colorOf(datum, gauges);
		}
		colorStyle.gauges = gauges;
		return colorStyle;
	};

	function numberOf(datum, gauges) {
		var number, newNumber;
		for (var property in gauges) {
			newNumber = gauges[property](datum.properties[property]);
			number = (number === undefined) ? newNumber : (number + newNumber) / 2;
		}
		return number;
	}

	HeatMap.prototype._newNumberStyle = function(layer, properties) {
		var gauges = {}, property, minMax, minValue, maxValue;

		for (property in properties) {
			minMax = getMinMax(layer, property);
			minValue = properties[property].min;
			maxValue = properties[property].max;

			gauges[property] = d3.scale.linear().domain(minMax).range([minValue, maxValue]);
		}

		function numberStyle(datum, index) {
			return numberOf(datum, gauges);
		}
		numberStyle.gauges = gauges;
	};

	angular.module('d3MapModule').constant('heatmap.STYLE_TYPES', STYLE_TYPES);
	angular.module('d3MapModule').constant('heatmap.COLOR_TYPE', COLOR_TYPE);
	angular.module('d3MapModule').constant('heatmap.NUMBER_TYPE', NUMBER_TYPE);

	angular.module('d3MapModule').factory('heatmap', [function() {

		return function(svg, layers) {
			return new HeatMap(svg, layers);
		};
	}]);

})(window.d3);