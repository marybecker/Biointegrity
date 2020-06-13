// asynchronous calls to data files
const townsJson = d3.json('data/CTTowns.json');
const waterLineJson = d3.json('data/StateWaterbodyLine.json');
const waterPolyJson = d3.json('data/StateWaterbodyPoly.json');
const bcgCSV = d3.csv('data/BCG_OverTime2.csv');
// const bcg5CSV = d3.csv('data/BCG5_Tier4And5_OverTime.csv');
// const bcg2CSV = d3.csv('data/BCG2_Tier2And4_OverTime.csv');

// use promise to call all data files, then send data to callback
Promise.all([townsJson, waterPolyJson, waterLineJson, bcgCSV])
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
    const bcgData = data[3];
    // const bcg5Data = data[3];
    // const bcg2Data = data[4];

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
    const radius = d3.scaleLinear().domain([0, 1]).range([0, 40]);
    console.log(radius(1));

    // Create  div for the tooltip and hide with opacity
    const tooltip = d3.select('.container-fluid').append('div')
        .attr('class', 'my-tooltip bg-secondary text-white py-1 px-2 rounded position-absolute invisible');

    // when mouse moves over the mapContainer
    mapContainer
        .on('mousemove', event => {
            // update the position of the tooltip
            tooltip.style('left', (d3.event.pageX + 10) + 'px')
                .style('top', (d3.event.pageY - 30) + 'px');
        });

    let Yr = d3.select("#timeslide").node().value;
    console.log(Yr);
    let bcg = d3.selectAll('input[name="BCG"]:checked').node().value;
    console.log(bcg);
    updateCircles(Yr,bcgData,bcg,svg,projection,radius,tooltip);

    d3.select("#timeslide").on("input", function() {
        let Yr = this.value;
        let bcg = d3.selectAll('input[name="BCG"]:checked').node().value;
        updateCircles(Yr, bcgData, bcg, svg, projection, radius)

    });

    d3.selectAll('input[name="BCG"]').on('change',function() {
        let Yr = d3.select("#timeslide").node().value;
        let bcg = this.value;
        updateCircles(Yr, bcgData, bcg, svg, projection, radius,tooltip)

    });



    drawLegend(svg, width, height, radius);
    updateCircles(Yr,bcgData,bcg,svg,projection,radius,tooltip);
}




function updateCircles (Yr,data,bcg,svg,projection,radius,tooltip){

    function color (metric){
        if(metric == 'T2'){
            return '#008837'
        }
        if (metric == 'T4'){
            return '#f9711d'
        }
        if (metric == 'T5'){
            return '#34394b'
        }
    }

    function display (bcg,bcgValue){
        if (bcg == 2){
            if (bcgValue == '5') return 'none';
            if (bcgValue == '2') return 'inline';
        } else {
            if (bcgValue == '2') return 'none';
            if (bcgValue == '5') return 'inline';
        }
    }

        var Taxa = svg.select('g')  // select g element
            .selectAll('circle')  // select all the circles
            .data(data);
        Taxa.exit().remove();
        Taxa.enter().append('circle')
            .attr('class', 'Taxa')// give each circle a class name
            .attr('cx', d => {  // feed the long/lat to the projection generator
                d.position = projection([d.XLong, d.YLat]);  // create a new data attribute
                return d.position[0];  // position the x
            })
            .attr('cy', d => {
                return d.position[1];  // position the y
            });

        Taxa.transition()
            .duration(500)
            .attr('r', d => {
                let Year = Yr;
                const TaxaYr = 'Yr' + Year;
                return radius(+d[TaxaYr]);
            })//define a proportional radius
            .style('stroke', d => {
                return color(d.Metric);
            })
            .style('display', d=>{
                if (bcg == 2){
                    if (d.BCG == '5') return 'none';
                    if (d.BCG == '2') return 'inline';
                } else {
                    if (d.BCG == '2') return 'none';
                    if (d.BCG == '5') return 'inline';
                }
            });



    // applies event listeners to facilities for user interaction
    Taxa.on('mouseover', (d, i, nodes) => { // when mousing over an element
        console.log(d);
        d3.select(nodes[i]).attr('class', 'hover').raise()// remove to access smaller circles .raise(); // select it, add a class name, and bring to front
        tooltip.classed('invisible', false).html(`<h4>${d.Station_Name}</h4>`) // make tooltip visible and update info
    })
        .on('mouseout', (d, i, nodes) => { // when mousing out of an element
            d3.select(nodes[i]).attr('class', 'Taxa') // remove the class from the polygon
            tooltip.classed('invisible', true) // hide the element
        });

}


function drawLegend(svg, width, height, radius,data) {

    const legend = svg.append('g')
        .attr('dy', '1.3em')
        .attr('class', 'legend')
        .attr('transform', 'translate(' + (width - 40) + ',' + (height - 20) + ')')
        .selectAll('g')
        .data([0,1])
        .join('g');

    legend.append('circle')
        .attr('cy', d => {
            return -radius(d);
        })
        .attr('r', radius);

    legend.append('text')
        .attr('y', d => {
            return radius(d);
        })
        .attr('dy', '1.5em')
        .text(d3.format('.1s'));

    legend.append('text')
        .attr('y', 16)
        .text('relative abundance');
}