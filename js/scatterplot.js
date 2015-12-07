var projectData;
var spController;

function collect(dataRow) {

    return {
        billName: dataRow.Bill,
        moneyGivenInSupport : +dataRow['Money Given in Favor of Bill'].replace("$", "").replace(",", ""),
        moneySpentInOppose : +dataRow['Money Given in against the Bill'].replace("$", "").replace(",", ""),
        billStatus: dataRow['Bill Status'],
        session: +dataRow.Session
    };
}

function loadCsvData(callback, filename) {
    d3.csv(filename).row(collect).get(function (error, rows) {
        projectData = rows;
        callback();
    });
}

function loadVisualization() {
   //tooltip div
    var tooltip = d3.select("body")
                    .append("div")
                    .style("position", "absolute")
                    .style("z-index", "10")
                    .style("visibility", "hidden")
                    .style("color","black");

    var margin = {top: 50, right: 50, bottom: 70, left: 70},
        width = 600 - margin.left - margin.right,
        height = 600 - margin.top - margin.bottom;

    var spDispatcher = {
        add: function(view){
            if (!this.subscribers){
                this.subscribers = [];
            }
            this.subscribers.push(view);
        },

        notify: function(type, payload){
            this.subscribers.forEach(function(s){
              s[type](payload);
            });
        }
    };

    spController = {
        loadData: function(data){
            this.data = data;
            spDispatcher.notify('onDataUpdate', this.data);
        },

        remove: function(index){
            this.data.splice(index,1);
            spDispatcher.notify('onDataUpdate', this.data);
        },

        filter: function(value) {
            var dt = this.data.filter(function(d){
               return d.name.toLowerCase().indexOf(value.toLowerCase()) > -1;
            });
            spDispatcher.notify('onDataUpdate', dt);
        }
    };

    var scatterplot = {
        init: function(width, height, margin) {
            // setup x
            this.xValue = function(d) { return d.moneyGivenInSupport;}; // data -> value
            this.xScale = d3.scale.linear().range([0,width]); // value -> display
            this.xMap = function(d) { return this.xScale(this.xValue(d));}.bind(this); // data -> display
            this.xAxis = d3.svg.axis().scale(this.xScale).orient("bottom").tickFormat(function(d){return "$" + +d/1000 + "k"});

            // setup y
            this.yValue = function(d) { return d.moneySpentInOppose;}; // data -> value
            this.yScale = d3.scale.linear().range([height, 0]), // value -> display
            this.yMap = function(d) { return this.yScale(this.yValue(d));}.bind(this), // data -> display
            this.yAxis = d3.svg.axis().scale(this.yScale).orient("left").tickFormat(function(d){return "$" + +d/1000 + "k"});

            // setup fill color
            this.cValue = function(d) { return d.moneyGivenInSupport;};
            this.color = d3.scale.category10();

            this.svg =d3.select("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            // x-axis
            this.xgroup = this.svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")");

            this.xgroup.append("text")
              .attr("class", "label")
              .attr("x", width/2)
              .attr("y", 55)
              .style("text-anchor", "middle")
              .text("Amount of Funding From Supporters");


                      // y-axis
          this.ygroup = this.svg.append("g")
              .attr("class", "y axis");

            this.ygroup.append("text")
              .attr("class", "label")
              .attr("transform", "rotate(-90)")
              .attr("x", -width/2)
              .attr("y", -70)
              .attr("dy", ".71em")
              .style("text-anchor", "middle")
              .text("Amount of Funding From Opposers");





        },
        getItem : function(d){ return d3.select('svg').selectAll('circle').filter(function(e){return d.billName == e.billName})},
        mouseover: function(d){
            this.getItem(d).attr("r",8).attr("fill", "green"); return tooltip.style("visibility", "visible").append("span")
                .html(" <b>Bill</b> : " + d.billName + "<br> <b>GDP</b> : " + d.moneyGivenInSupport + "<br> <b>Money Spent In Oppose</b> : " +d.moneySpentInOppose)},

        mouseout: function(d){
            this.getItem(d).attr("r",4).attr("fill", "red"); return tooltip.style("visibility", "hidden").selectAll("span").remove();
        },

        mousemove: function(d){
            return tooltip.style("top", (+d3.select(this.getItem(d)[0][0]).attr('cy')+100)+"px").style("left",(+d3.select(this.getItem(d)[0][0]).attr('cx')+410)+"px");
        },

        click: function(d){d3.select('#infoDiv').html(" <b>Bill</b> : " + d.billName + "<br> <b>GDP</b> : " + d.moneyGivenInSupport + "<br> <b>Money Spent In Oppose</b> : " +d.moneySpentInOppose)},


        onDataUpdate: function(data)
        {
            this.xScale.domain([d3.min(data, this.xValue)-1,d3.max(data, this.xValue)+1]);
            this.yScale.domain([d3.min(data, this.yValue)-1,d3.max(data, this.yValue)+1]);
            this.xgroup.transition().call(this.xAxis);
            this.ygroup.transition().call(this.yAxis);

            this.viz = this.svg.selectAll("circle").data(data, function(d){return d.billName;});
            this.viz.enter()
            .append("circle");
            this.viz.on("mouseover", function(d) { spDispatcher.notify('mouseover', d) })
            .on("mouseout", function(d) { spDispatcher.notify('mouseout', d) })
            .on("mousemove", function(d) { spDispatcher.notify('mousemove', d) })
            .on("click", this.click)
            .on("contextmenu", function(d, i){
                d3.event.preventDefault();
                tooltip.style("visibility", "hidden").selectAll("span").remove();
                spController.remove(i);
            });

            this.viz.exit().remove();

            this.viz.transition().attr({
            r: 4,
            cx: this.xMap,
            cy: this.yMap,
            fill: "red",opacity: 0.5
            })
        }
    };

    scatterplot.init(width, height, margin);
    spDispatcher.add(scatterplot);
    spController.loadData(projectData);
}

loadCsvData(loadVisualization, "data.csv");
