/* -----------------------------------------------------------------------------------
   Hydro Charting
   Develolped by the Applications Prototype Lab
   (c) 2015 Esri | http://www.esri.com/legal/software-license  
----------------------------------------------------------------------------------- */

require([
    'esri/map',
    'esri/layers/FeatureLayer',
    'esri/renderers/SimpleRenderer',
    'esri/symbols/SimpleLineSymbol',
    'esri/Color',
    'esri/tasks/query',
    'dojo/domReady!'
],
function (
    Map,
    FeatureLayer,
    SimpleRenderer,
    SimpleLineSymbol,
    Color,
    Query
    ) {
    $(document).ready(function () {
        // Enforce strict mode
        'use strict';

        // Constants
        var RIVERS = 'http://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/HydroHierarchy/FeatureServer/0';
        var CHECKED = 'Hide Help';
        var UNCHECKED = 'Show Help';
        var RIVER_DEFAULT = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 255, 255, 0.3]), 1);
        var RIVER_SELECTION = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 255, 255, 1]), 2);
        var RIVER_ANCESTORS = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0, 1]), 1);
        var RIVER_DESCENDANTS = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 255, 0, 1]), 1);

        var vars = getUrlVars();
        if (vars && vars.view && vars.view === 'bright') {
            RIVER_DEFAULT = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 255, 255, 0.7]), 1);
            RIVER_SELECTION = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 255, 255, 1]), 2);
            RIVER_ANCESTORS = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0, 1]), 2);
            RIVER_DESCENDANTS = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 255, 0, 1]), 2);
        }

        // Variables
        var _chords = {};
        var _ancestors = [];
        var _descendants = [];
        var _selected = -1;

        // Help button/window
        $('#help-button-text').html(UNCHECKED);
        $('#help-button').click(function () {
            if ($('#help-button-text').html() === CHECKED) {
                var w1 = -$('#help-window').width();
                var w2 = w1.toString() + 'px';
                $('#help-window').animate({ marginRight: w2 }, 300, 'swing', function () {
                    $('#help-button-text').html(UNCHECKED);
                });
            } else {
                $('#help-window').animate({ marginRight: '0px' }, 300, 'swing', function () {
                    $('#help-button-text').html(CHECKED);
                });
            }
        });

        // Define river layer
        var _rivers = new FeatureLayer(RIVERS, {
            mode: FeatureLayer.MODE_SNAPSHOT,
            outFields: [
                'N',   // Name
                'S',   // Stream Order
                'V',   // Average monthly flow (over ten years)
                'F1',  // January flow
                'F2',  // Feburary flow
                'F3',  // March flow
                'F4',  // April flow
                'F5',  // May flow
                'F6',  // June flow
                'F7',  // July flow
                'F8',  // August flow
                'F9',  // September flow
                'F10', // October flow
                'F11', // November flow
                'F12'  // December flow
            ],
            showAttribution: false,
            showLabels: false,
            visible: true
        });
        _rivers.setRenderer(new SimpleRenderer(RIVER_DEFAULT));
        _rivers.setSelectionSymbol(RIVER_SELECTION);
        _rivers.on('mouse-over', function (e) {
            hideAttributes();
            hideAncestors();

            //
            if (_selected > 0) {
                d3.select(_chords[_selected]).attr('fill', '#ffffff');
            }

            // Selected id
            _selected = e.graphic.attributes[_rivers.objectIdField];

            // Map
            var query = new Query();
            query.objectIds = [_selected];
            _rivers.selectFeatures(query, FeatureLayer.SELECTION_NEW);

            // Chart
            d3.select(_chords[_selected]).attr('fill', '#0ff');

            //
            showAttributes();
            showAncestors();
        });
        _rivers.on('load', function () {
            _rivers.minScale = 0;
            _rivers.maxScale = 0;
        });
        if (_rivers.surfaceType !== 'svg') {
            alert('This app is not compatiable with this browser.');
            return;
        }

        // Create map
        var _map = new Map('map', {
            zoom: 5,
            center: [-100, 40],
            logo: false,
            showAttribution: false,
            slider: false,
            wrapAround180: false
        });
        _map.addLayers([
            _rivers
        ]);

        // Load river hierarchy file 
        d3.json('river.js', function (error, file) {
            var width = 400;
            var height = 400;
            var radius = 200;

            var svg = d3.select('#chart')
                .append('svg')
                .attr('width', width)
                .attr('height', height)
                .append('g')
                .attr('transform', 'translate({0},{1})'.format(
                    0.5 * width,
                    0.4 * height
                ));

            var path = svg
                .selectAll('path')
                .data(
                    d3.layout.partition()
                        .sort(null)
                        .size([2 * Math.PI, radius * radius])
                        .children(function (d) {
                            return d.c;
                        })
                        .value(function (d) {
                            return 1;
                        })
                        .nodes(file)
                )
                .enter()
                .append('path')
                .attr('display', function (d) {
                    return d.depth ? null : 'none'; // hide inner ring
                })
                .attr('d',
                    d3.svg.arc()
                        .startAngle(function (d) {
                            return d.x;
                        })
                        .endAngle(function (d) {
                            return d.x + d.dx;
                        })
                        .innerRadius(function (d) {
                            return Math.sqrt(d.y);
                        })
                        .outerRadius(function (d) {
                            return Math.sqrt(d.y + d.dy);
                        })
                )
                .attr('fill', '#ffffff')
                .on('mouseenter', function (d) {
                    if (d.id < 0) { return; }

                    _selected = d.id;

                    hideAttributes();
                    hideAncestors();

                    // Highlight chord
                    d3.select(this).attr('fill', '#0ff');

                    // Highlight river
                    var query = new Query();
                    query.objectIds = [_selected];
                    _rivers.selectFeatures(query, FeatureLayer.SELECTION_NEW);

                    //
                    showAttributes();
                    showAncestors();
                })
                .on('mouseout', function (d) {
                    if (d.id < 0) { return; }

                    // Unhighlight chord
                    d3.select(this).attr('fill', '#ffffff');
                })
                .on('touchstart', function () {
                    d3.event.sourceEvent.stopPropagation();
                })
                .on('touchmove', function () {
                    d3.event.sourceEvent.stopPropagation();
                })
                .on('touchend', function () {
                    d3.event.sourceEvent.stopPropagation();
                });

            // Build chord index
            d3.select('#chart')
                .select('svg')
                .select('g')
                .selectAll('path')
                .each(function (d) {
                    _chords[d.id] = this;
                });
        });

        function showAncestors() {
            var chord = d3.select(_chords[_selected]);
            var data = chord.data()[0];
            if (!data) { return; }

            // Find ancestors            
            var current = data;
            while (current.parent && current.parent.id > 0) {
                _ancestors.push(current.parent.id);
                current = current.parent;
            }

            // Draw ancestors
            var query1 = new Query();
            query1.objectIds = _ancestors;
            _rivers.queryFeatures(query1, function (e) {
                $.each(e.features, function () {
                    this.setSymbol(RIVER_ANCESTORS);
                });
            });

            // Find descendants
            if (data.children) {
                $.each(data.children, function () {
                    getDescendants(this, _descendants);
                });
            }

            // Draw descendants
            var query2 = new Query();
            query2.objectIds = _descendants;
            _rivers.queryFeatures(query2, function (e) {
                $.each(e.features, function () {
                    this.setSymbol(RIVER_DESCENDANTS);
                });
            });
        }
        function getDescendants(data, ids) {
            ids.push(data.id);
            if (data.children) {
                $.each(data.children, function () {
                    getDescendants(this, ids);
                });
            }
        }
        function hideAncestors() {
            var join = _ancestors.concat(_descendants);
            var query = new Query();
            query.objectIds = join;
            _rivers.queryFeatures(query, function (e) {
                $.each(e.features, function () {
                    this.setSymbol(RIVER_DEFAULT);
                });
                _ancestors = [];
                _descendants = [];
            });
        }
        function showAttributes() {
            var query = new Query();
            query.objectIds = [_selected];
            _rivers.queryFeatures(query, function (e) {
                //
                $('#river-name').html(e.features[0].attributes.N);

                var average = e.features[0].attributes.V;
                var data = [];
                for (var i = 1; i < 13; i++) {
                    data.push(
                        {
                            m: i,
                            f: e.features[0].attributes['F' + i]
                        }
                    );
                }

                var w = $('#river-flow').width();
                var h = $('#river-flow').height();
                var l = 75; // Left buffer for y-axis text
                var b = 25; // Lower buffer for x-axis text

                var ymin = 0;
                var ymax = d3.max(data, function (d) {
                    return d.f;
                });

                var x = d3.scale.ordinal().rangeRoundBands([0, w - l], 0.1).domain(data.map(function (d) {
                    return d.m;
                }));
                var y = d3.scale.linear().range([h - b, 0]).domain([ymin, ymax * 1.15]);

                var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient('bottom')
                    .tickFormat(function (d) {
                        var date = new Date(2014, d - 1, 1);
                        var form = d3.time.format('%B')(date);
                        return form.substring(0, 1);
                    });

                var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient('left').ticks(5);
                    //.tickPadding(function (d) { return 30; });

                var tip = d3.tip()
                  .attr('class', 'd3-tip')
                  .offset([-10, 0])
                  .html(function (d) {
                      return "<strong>Flow:</strong> <span style='color:red'>" + d.f + "m³/s</span>";
                  });

                var svg = d3.select('#river-flow')
                    .append('svg')
                    .attr('width', w)
                    .attr('height', h)
                    .append('g')
                    .attr('transform', 'translate({0},{1})'.format(l, -b))
                    .call(tip);

                svg.append('g')
                    .attr('transform', 'translate({0},{1})'.format(0, h))
                    .call(xAxis);

                svg.append('g')
                    .attr('transform', 'translate({0},{1})'.format(0, b))
                    .call(yAxis);

                svg.selectAll()
                    .data(data)
                    .enter()
                    .append('rect')
                    .attr('class','bar')
                    .attr('x', function (d) {
                        return x(d.m);
                    })
                    .attr('width', x.rangeBand())
                    .attr('y', function (d) {
                        return y(d.f) + b;
                    })
                    .attr('height', function (d) {
                        return h - y(d.f) - b;
                    })
                    .on('mouseover', tip.show)
                    .on('mouseout', tip.hide);

                var average_line = y(average) + b;
                if (average_line > 0) {
                    svg.append('line')
                        .attr('x1', 0)
                        .attr('x2', x(12) + 20)
                        .attr('y1', average_line)
                        .attr('y2', average_line)
                        .attr('stroke', 'red')
                        .attr('stroke-width', '2');
                }
            });
        }
        function hideAttributes() {
            $('#river-name').empty();
            $('#river-flow').empty();
        }

        // String formating function
        String.prototype.format = function () {
            var s = this;
            var i = arguments.length;
            while (i--) {
                s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
            }
            return s;
        };

        function getUrlVars() {
            var vars = [], hash;
            var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
            for (var i = 0; i < hashes.length; i++) {
                hash = hashes[i].split('=');
                vars.push(hash[0]);
                vars[hash[0]] = hash[1];
            }
            return vars;
        }
    });
});
