// asynchronous calls to data files
const townsJson = d3.json('data/CTTowns.json');
const waterLineJson = d3.json('data/StateWaterbodyLine.json');
const waterPolyJson = d3.json('data/StateWaterbodyPoly.json');
const bcgCSV = d3.csv('data/BCG_OverTime.csv');
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
    const radius = d3.scaleLinear().domain([0, 1]).range([1, 40]);
    console.log(radius(1));

    // Create  div for the tooltip and hide with opacity
    const tooltip = d3.select('.container-fluid').append('div')
        .attr('class', 'my-tooltip bg-light text-dark py-1 px-2 rounded position-absolute invisible');

    // when mouse moves over the mapContainer
    mapContainer
        .on('mousemove', event => {
            // update the position of the tooltip
            tooltip.style('left', (d3.event.pageX + 10) + 'px')
                .style('top', (d3.event.pageY - 30) + 'px');
        });

    // set the dimensions and margins of the graph
    var marginPlot = {top: 10, right: 30, bottom: 30, left: 60},
        widthPlot = 460 - marginPlot.left - marginPlot.right,
        heightPlot = 400 - marginPlot.top - marginPlot.bottom;

// append the svg object to the body of the page
    var svgPlot = d3.select("#plot")
        .append("svg")
        .attr("width", widthPlot + marginPlot.left + marginPlot.right)
        .attr("height", heightPlot + marginPlot.top + marginPlot.bottom)
        .append("g")
        .attr("transform",
            "translate(" + marginPlot.left + "," + marginPlot.top + ")");

    let Yr = d3.select("#timeslide").node().value;
    console.log(Yr);
    let bcg = d3.selectAll('input[name="BCG"]:checked').node().value;
    console.log(bcg);
    updateCircles(Yr,bcgData,bcg,svg,projection,radius,tooltip);

    d3.select("#timeslide").on("input", function() {
        let Yr = this.value;
        let bcg = d3.selectAll('input[name="BCG"]:checked').node().value;
        updateCircles(Yr, bcgData, bcg, svg, projection, radius,tooltip)
        d3.select('#range').text(getYrName(Yr))

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
                let bug = 'T4Yr';
                const modYr = bug + Year;
                return radius(+d[modYr]);
            })//define a proportional radius
            .style('display', d=>{
                if (bcg == 2){
                    if (d.BCG == '5') return 'none';
                    if (d.BCG == '2') return 'inline';
                } else {
                    if (d.BCG == '2') return 'none';
                    if (d.BCG == '5') return 'inline';
                }
            });


        var senTaxa = svg.select('g')  // select g element
            .selectAll('circle.senTaxa')  // select all the circles
            .data(data);
        senTaxa.exit().remove();
        senTaxa.enter().append('circle')
            .attr('class', 'senTaxa')// give each circle a class name
            .attr('cx', d => {  // feed the long/lat to the projection generator
                d.position = projection([d.XLong, d.YLat]);  // create a new data attribute
                return d.position[0];  // position the x
            })
            .attr('cy', d => {
                return d.position[1];  // position the y
            });

        senTaxa.transition()
            .duration(500)
            .attr('r', d => {
                let Year = Yr;
                let bug = 'T2Yr';
                const senYr = bug + Year;
                return radius(+d[senYr]);
            })//define a proportional radius
            .style('display', d=>{
                if (bcg == 2){
                    if (d.BCG == '5') return 'none';
                    if (d.BCG == '2') return 'inline';
                } else {
                    if (d.BCG == '2') return 'none';
                    if (d.BCG == '5') return 'inline';
                }
            });

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
                let bug = 'T5Yr';
                const tolYr = bug + Year;
                return radius(+d[tolYr]);
            })//define a proportional radius
            .style('display', d=>{
                if (bcg == 2){
                    if (d.BCG == '5') return 'none';
                    if (d.BCG == '2') return 'inline';
                } else {
                    if (d.BCG == '2') return 'none';
                    if (d.BCG == '5') return 'inline';
                }

            });

    var Taxa = svg.select('g')  // select g element
        .selectAll('circle.Taxa')  // select all the circles
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
            let bug = 'MaxYr';
            const maxYr = bug + Year;
            return radius(+d[maxYr]);
        })//define a proportional radius
        .style('display', d=>{
            if (bcg == 2){
                if (d.BCG == '5') return 'none';
                if (d.BCG == '2') return 'inline';
            } else {
                if (d.BCG == '2') return 'none';
                if (d.BCG == '5') return 'inline';
            }

        });


    // applies event listeners to Taxa.  Max radius for each site.
    Taxa.on('mouseover', (d, i, nodes) => { // when mousing over an element
        console.log(d);
        let Year = Yr;
        let bug = ['T2Yr','T4Yr','T5Yr'];
        d3.select(nodes[i]).attr('class', 'hover')// select it, add a class name, and bring to front
        tooltip.classed('invisible', false).html(`<h4>${d.Station_Name} (${d.Municipality_Name})</h4>
        Percent Relative Abundance
        Years (${getYrName(Year)})<br>
        <span style="color:#008837">Sensitive Taxa:</span> ${Math.round((d[bug[0]+Yr])*100)} %<br>
        <span style="color:#f9711d">Moderate Taxa:</span> ${Math.round((d[bug[1]+Yr])*100)} %<br>
        <span style="color:#B39DDB">Tolerant Taxa:</span> ${Math.round((d[bug[2]+Yr])*100)} %`)

        // make tooltip visible and update info
    })
        .on('mouseout', (d, i, nodes) => { // when mousing out of an element
            d3.select(nodes[i]).attr('class', 'Taxa')// remove the class
            tooltip.classed('invisible', true) // hide the element
        });


}

function getYrName (Yr){
    if(Yr==1){
        return '1989 - 1995'
    }
    if(Yr==2){
        return '1996 - 2000'
    }
    if (Yr == 3) {
        return '2001 - 2005'
    }
    if (Yr ==4){
        return '2006 - 2010'
    }
    if (Yr ==5){
        return '2011 - 2015'
    }
    if (Yr == 6){
        return '2016 - 2017'
    }
}


function drawLegend(svg, width, height, radius) {

    const legend = svg.append('g')
        .attr('dy', '1.3em')
        .attr('class', 'legend')
        .attr('transform', 'translate(' + (width - 60) + ',' + (height - 20) + ')')
        .selectAll('g')
        .data([0.5,1])
        .join('g');

    legend.append('circle')
        .attr('cy', d => {
            return -radius(d);
        })
        .attr('r', radius);

    legend.append('text')
        .attr('y', d => {
            return -2* radius(d);
        })
        .attr('dy', '1.5em')
        .attr('class','circle-text')
        .text(d3.format('.0%'));

    legend.append('text')
        .attr('y', -90)
        .attr('x', -225)
        .text("Percent relative abundance of")
        .style('alignment-baseline','hanging');

    legend.append('text')
        .attr('y', -70)
        .attr('x', -225)
        .text("sensitive,")
        .style('fill', '#008837')
        .style('alignment-baseline','middle');

    legend.append('text')
        .attr('y', -70)
        .attr('x', -150)
        .text("moderate,")
        .style('fill', '#f9711d')
        .style('alignment-baseline','middle');

    legend.append('text')
        .attr('y', -70)
        .attr('x', -70)
        .text("and")
        .style('alignment-baseline','middle');


    legend.append('text')
        .attr('y', -50)
        .attr('x', -225)
        .text("tolerant")
        .style('fill', '#B39DDB')
        .style('alignment-baseline','baseline');

    legend.append('text')
        .attr('y', -50)
        .attr('x', -150)
        .text("species")
        .style('alignment-baseline','baseline');

}

function linePlot (Yr,data) {

    // Add X axis --> it is a date format
    var x = d3.scalelinear()
        .domain([0,6])
        .range([ 0,6]);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    // Add Y axis
    var y = d3.scaleLinear()
        .domain([0, d3.max(data, function(d) {
            let Year = Yr;
            let bug = 'T2Yr';
            const senYr = bug + Year;
            return +d[senYr]; })])
        .range([0,1]);
    svg.append("g")
        .call(d3.axisLeft(y));

    // Add the line
    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .x(function(d) { return x(d.date) })
            .y(function(d) { return y(d.value) })
        )

}
