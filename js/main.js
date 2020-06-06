// asynchronous calls to data files
const townsJson = d3.json('data/CTTowns.json');
const waterLineJson = d3.json('data/StateWaterbodyLine.json');
const waterPolyJson = d3.json('data/StateWaterbodyPoly.json');
const bcg5CSV = d3.csv('data/BCG5_Tier4And5_OverTime.csv');
const bcg2CSV = d3.csv('data/BCG2_Tier2And4_OverTime.csv');

// use promise to call all data files, then send data to callback
Promise.all([townsJson, waterPolyJson, waterLineJson, bcg5CSV, bcg2CSV])
    .then(drawMap)
    .catch(error => {
        console.log(error)
    });

// function called when Promise above is complete
function drawMap(data) {
    console.log(data);  // our two datasets within an array

    // data is array of our two datasets
    //const is ok for read only, special cases only use var or let for the default
    const townsData = data[0];
    const waterPolyData = data[1];
    const waterLineData = data[2];
    const bcg5Data = data[3];
    const bcg2Data = data[4];

    // select the HTML element that will hold the map
    var mapContainer = d3.select('#map');

    // determine width and height of map from container
    const width = mapContainer.node().offsetWidth - 60;
    const height = mapContainer.node().offsetHeight - 60;

    //create the svg and append to the map div
    const svg = mapContainer
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .classed('position-absolute', true) // add bootstrap class
        .style('top', '40px')
        .style('left', '30px');

    //convert the TopoJSONs to GeoJSON to draw
    const towngeojson = topojson.feature(townsData, {
        type: 'GeometryCollection',
        geometries: townsData.objects.CTTowns.geometries
    });

    const riverPolygeojson = topojson.feature(waterPolyData, {
        type: 'GeometryCollection',
        geometries: waterPolyData.objects.StateWaterbodyPoly.geometries
    });

    const riverLinesgeojson = topojson.feature(waterLineData, {
        type: 'GeometryCollection',
        geometries: waterLineData.objects.StateWaterbodyLine.geometries
    });

    //project using Mercator
    const projection = d3.geoMercator()
        .fitSize([width, height], towngeojson);

    //declare a path generator
    const path = d3.geoPath()
        .projection(projection);

    //append a new g element - towns
    const towns = svg.append('g')
        .selectAll('path')
        .data(towngeojson.features)
        .join('path')
        .attr('d', path)
        .attr('class', 'town');

    //append a new g element - riversPoly
    const waterPoly = svg.append('g')
        .selectAll('path')
        .data(riverPolygeojson.features)
        .join('path')
        .attr('d', path)
        .attr('class', 'riverPoly');

    //append a new g element - riversLine
    const waterLine = svg.append('g')
        .selectAll('path')
        .data(riverLinesgeojson.features)
        .join('path')
        .attr('d', path)
        .attr('class', 'riverLine');

    // define radius generator
    const radius = d3.scaleLinear().domain([0, 1]).range([0, 20]);
    console.log(radius(1));

    updateCircles(1,bcg5Data,svg,projection,radius);

    d3.select("#timeslide").on("input", function() {
        let Yr = this.value;
        console.log(Yr);
        updateCircles(Yr,bcg5Data,svg,projection,radius)
    });

    drawLegend(svg, width, height, radius);
    updateCircles(1,bcg5Data,svg,projection,radius);

}


function updateCircles (Yr, data,svg,projection,radius){
    var modTaxa = svg.select('g')  // select g element
        .selectAll('circle.modTaxa')  // select all the circles
        .data(data);
    modTaxa.exit().remove();
    modTaxa.enter().append('circle')
        .attr('class', 'modTaxa')// give each circle a class name
        .attr('cx', d => {  // feed the long/lat to the projection generator
            d.position = projection([d.XLong, d.YLat]);  // create a new data attribute
            return d.position[0];  // position the x
        })
        .attr('cy', d => {
            return d.position[1];  // position the y
        });

    modTaxa.transition()
        .duration(500)
        .attr('r', d => {
            let Year = Yr;
            const modYr = 'T4Yr' + Year;
            return radius(+d[modYr]);
        });//define a proportional radius

    var tolTaxa = svg.select('g')  // select g element
        .selectAll('circle.tolTaxa')  // select all the circles
        .data(data);
    tolTaxa.exit().remove();
    tolTaxa.enter().append('circle')
        .attr('class', 'tolTaxa')// give each circle a class name
        .attr('cx', d => {  // feed the long/lat to the projection generator
            d.position = projection([d.XLong, d.YLat]);  // create a new data attribute
            return d.position[0];  // position the x
        })
        .attr('cy', d => {
            return d.position[1];  // position the y
        });

    tolTaxa.transition()
        .duration(500)
        .attr('r', d => {
            let Year = Yr;
            const tolYr = 'T5Yr' + Year;
            return radius(+d[tolYr]);
        });//define a proportional radius
}










function drawLegend(svg, width, height, radius) {

    const legend = svg.append('g')
        .attr('dy', '1.3em')
        .attr('class', 'legend')
        .attr('transform', 'translate(' + (width - 40) + ',' + (height - 20) + ')')
        .selectAll('g')
        .data([0, 1])
        .join('g');

    legend.append('circle')
        .attr('cy', d => {
            return -radius(d);
        })
        .attr('r', radius);

   /* legend.append('text')
        .attr('y', d => {
            return -2 * radius(d);
        })
        .attr('dy', '1.3em')
        .text(d3.format('.1s'));

    legend.append('text')
        .attr('y', 16)
        .text('metric tons');*/
}