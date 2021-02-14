// asynchronous calls to data files
const townsJson = d3.json('data/CTTowns.json');
const waterLineJson = d3.json('data/StateWaterbodyLine.json');
const waterPolyJson = d3.json('data/StateWaterbodyPoly.json');
const bcgCSV = d3.csv('data/BCG_OverTime_021421.csv');


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
        .style('left', '80px');

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
        .attr('class', 'my-tooltip bg-light text-dark py-1 px-2 rounded position-absolute invisible')
        .attr('id','tooltipContainer');


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
        let Year = Yr;
        let bug = ['T2Yr','T4Yr','T5Yr'];
        d3.select(nodes[i]).attr('class', 'hover')// select it, add a class name, and bring to front
        tooltip.classed('invisible', false)
                .html(`<div>
                    <h4>${d.Station_Name} (${d.Municipality_Name})</h4>
                    Percent Relative Abundance
                    Years (${getYrName(Year)})<br>
                    <span style="color:#008837">Sensitive Taxa:</span> ${Math.round((d[bug[0]+Yr])*100)} %<br>
                    <span style="color:#f9711d">Moderate Taxa:</span> ${Math.round((d[bug[1]+Yr])*100)} %<br>
                    <span style="color:#B39DDB">Tolerant Taxa:</span> ${Math.round((d[bug[2]+Yr])*100)} %<br>
                    <span style="color:#636363">Other Taxa:</span> ${Math.round(100-(Number(d[bug[0]+Yr])
                    +Number(d[bug[1]+Yr])+ Number(d[bug[2]+Yr]))*100)} %<br>
                    </div>`)
        //now you can do d3.select('#plotContainer').append('g')
        //data //use if you want

        if ($(window).width() > 1400){
            drawPlot(d,Year,'#plotContainer')
        }


        // make tooltip visible and update info
    })
        .on('mouseout', (d, i, nodes) => { // when mousing out of an element
            d3.select(nodes[i]).attr('class', 'Taxa')// remove the class
            tooltip.classed('invisible', true)// hide the element
            d3.select('#plotContainer').html('');

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
        return '2016 - 2019'
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

function drawPlot(data,Yr,id) {

    // set the dimensions and margins of the graph
    var margin = {top: 30, right: 30, bottom: 50, left: 60},
        width = 500 - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    var svg = d3.select(id)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    var yearIndex = [1,2,3,4,5,6,1,2,3,4,5,6,1,2,3,4,5,6];

    var RA = [data.T5Yr1,data.T5Yr2,data.T5Yr3,data.T5Yr4,data.T5Yr5,data.T5Yr6,
        data.T4Yr1,data.T4Yr2,data.T4Yr3,data.T4Yr4,data.T4Yr5,data.T4Yr6,
        data.T2Yr1,data.T2Yr2,data.T2Yr3,data.T2Yr4,data.T2Yr5,data.T2Yr6];
    console.log(RA);
    var cat = ["Tol","Tol","Tol","Tol","Tol","Tol","Mod","Mod","Mod","Mod","Mod","Mod","Sen","Sen","Sen",
        "Sen","Sen","Sen"];

    var xy = [];
    for(var i=0;i<yearIndex.length;i++){
        xy.push({x:yearIndex[i],y:RA[i],z:cat[i]});
    }

    var clean_xy = [];
    var dirty_xy = [];
    for(var i=0; i<xy.length; i++) {
        if (xy[i].x != 'null' && xy[i].y != 'null') {
            clean_xy.push(xy[i]);
        } else {
            dirty_xy.push(xy[i]);
        }
    }
    console.log(xy);
    console.log(clean_xy);
    console.log(dirty_xy);

    var Tol = [];
    var Mod = [];
    var Sen = [];
    for(var i=0; i<clean_xy.length; i++){
        if (clean_xy[i].z == 'Tol'){
            Tol.push(clean_xy[i]);
        }
        if(clean_xy[i].z == 'Mod'){
            Mod.push(clean_xy[i]);
        }
        if(clean_xy[i].z == 'Sen'){
            Sen.push(clean_xy[i]);
        }
    }
    console.log(Tol);
    console.log(Mod);
    console.log(Sen);

    var xscale = d3.scaleOrdinal()
        .domain([0,1,2,3,4,5,6])
        .range([0,1*width/6,2*width/6,3*width/6,4*width/6,5*width/6,width]);

    var xAxis = d3.axisBottom(xscale)
        .tickValues(["","1989 - 1995", "1996-2000", "2001-2005", "2006-2010","2011-2015","2016-2019"]);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    // Add Y axis
    var yscale = d3.scaleLinear()
        .domain([0, 100])
        .range([ height, 0 ]);
    svg.append("g")
        .call(d3.axisLeft(yscale));

    svg.append("line")
        .attr("x1", Yr*width/6)
        .attr("y1", 0)
        .attr("x2", Yr*width/6)
        .attr("y2", height)
        .style("stroke-width", 1)
        .style("stroke", "#66FCF1")
        .style("fill", "none");

    // Add the line
    svg.append("path")
        .datum(Tol)
        .attr("fill", "none")
        .attr("stroke", "#B39DDB")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .x(function(d) { return xscale(d.x) })
            .y(function(d) { return yscale(d.y*100) })
        );

    svg.append("path")
        .datum(Mod)
        .attr("fill", "none")
        .attr("stroke", "#f9711d")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .x(function(d) { return xscale(d.x) })
            .y(function(d) { return yscale(d.y*100) })
        );

    svg.append("path")
        .datum(Sen)
        .attr("fill", "none")
        .attr("stroke", "#008837")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .x(function(d) { return xscale(d.x) })
            .y(function(d) { return yscale(d.y*100) })
        );


    // Add the points
    svg.append("g")
        .selectAll("dot")
        .data(Tol)
        .enter()
        .append("circle")
        .attr("cx", function(d) { return xscale(d.x) } )
        .attr("cy", function(d) { return yscale(d.y*100) } )
        .attr("r", 5)
        .attr("fill", "#B39DDB");

    // Add the points
    svg.append("g")
        .selectAll("dot")
        .data(Mod)
        .enter()
        .append("circle")
        .attr("cx", function(d) { return xscale(d.x) } )
        .attr("cy", function(d) { return yscale(d.y*100) } )
        .attr("r", 5)
        .attr("fill", "#f9711d");
    // Add the points
    svg.append("g")
        .selectAll("dot")
        .data(Sen)
        .enter()
        .append("circle")
        .attr("cx", function(d) { return xscale(d.x) } )
        .attr("cy", function(d) { return yscale(d.y*100) } )
        .attr("r", 5)
        .attr("fill", "#008837");

    // text label for the x axis
    svg.append("text")
        .attr("transform", "translate(" + (width/2) + " ," + (height + margin.top + 20) + ")")
        .style("text-anchor", "middle")
        .style("fill","#ffffff")
        .text("Year");

    // text label for the y axis
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x",0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("fill","#ffffff")
        .text("Percent Relative Abundance");

    svg.append("text")
        .attr("x", (width / 2))
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill","#ffffff")
        .text(data.Station_Name);
}

// When the browser resizes...
window.addEventListener('resize', () => {

    // remove existing SVG
    d3.selectAll("svg > *").remove();

    // use promise to call all data files, then send data to callback
    Promise.all([townsJson, waterPolyJson, waterLineJson, bcgCSV])
    .then(drawMap)
    .catch(error => {
        console.log(error)
    });
});



