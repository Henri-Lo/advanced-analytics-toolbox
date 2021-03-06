define([
  '../chart/line_chart',
  '../util/utils',
  'ng!$q',
], (lineChart, utils, $q) => {
  return {
    /**
     * createCube - create HyperCubes
     *
     * @param {Object} app    reference to app
     * @param {Object} $scope angular $scope
     *
     * @return {Null} null
     */
    createCube(app, $scope) {
      const layout = $scope.layout;

      // Display loader
      // utils.displayLoader($scope.extId);

      const dimension = utils.validateDimension(layout.props.dimensions[0]);

      // Set definitions for dimensions and measures
      const dimensions = [{ qDef: { qFieldDefs: [dimension] } }];
      const measure = utils.validateMeasure(layout.props.measures[0]);
      const measures = [
        {
          qDef: {
            qDef: measure,
          },
        },
        {
          qDef: {
            qDef: `R.ScriptEval('library(dplyr);data<-ts(q$Measure,frequency=${layout.props.frequency});(decompose(data)$trend);', ${measure} as Measure)`,
          },
        },
        {
          qDef: {
            qDef: `R.ScriptEval('library(dplyr);data<-ts(q$Measure,frequency=${layout.props.frequency});(decompose(data)$seasonal);', ${measure} as Measure)`,
          },
        },
        {
          qDef: {
            qDef: `R.ScriptEval('library(dplyr);data<-ts(q$Measure,frequency=${layout.props.frequency});(decompose(data)$random);', ${measure} as Measure)`,
          },
        },
        {
          qDef: {
            qLabel: '-',
            qDef: '', // Dummy
          },
        },
      ];

      $scope.backendApi.applyPatches([
        {
          qPath: '/qHyperCubeDef/qDimensions',
          qOp: 'replace',
          qValue: JSON.stringify(dimensions),
        },
        {
          qPath: '/qHyperCubeDef/qMeasures',
          qOp: 'replace',
          qValue: JSON.stringify(measures),
        },
      ], false);

      $scope.patchApplied = true;
      return null;
    },

    /**
     * drawChart - draw chart with updated data
     *
     * @param {Object} $scope angular $scope
     *
     * @return {Object} Promise object
     */
    drawChart($scope, app) {
      const defer = $q.defer();
      const layout = $scope.layout;

      // const dimension = utils.validateDimension(layout.props.dimensions[0]);
      const requestPage = [{
        qTop: 0,
        qLeft: 0,
        qWidth: 6,
        qHeight: 1500,
      }];

      $scope.backendApi.getData(requestPage).then((dataPages) => {
        const measureInfo = $scope.layout.qHyperCube.qMeasureInfo;

        // Display error when all measures' grand total return NaN.
        if (isNaN(measureInfo[1].qMin) && isNaN(measureInfo[1].qMax)
          && isNaN(measureInfo[2].qMin) && isNaN(measureInfo[2].qMax)
          && isNaN(measureInfo[3].qMin) && isNaN(measureInfo[3].qMax)
        ) {
          utils.displayConnectionError($scope.extId);
        } else {
          let elemNum;
          let dim;
          let mea;
          const palette = utils.getDefaultPaletteColor();

          const chartData = [];
          for (let i = 1; i < 5; i++) {
            elemNum = [];
            dim = [];
            mea = [];

            $.each(dataPages[0].qMatrix, (key, value) => {
              elemNum.push(value[0].qElemNumber);
              dim.push(value[0].qText);
              mea.push(value[i].qNum);
            });
            const dataset = {
              x: dim,
              y: mea,
              elemNum,
              name: (i === 1) ? 'Observed' : (i === 2) ? 'Trend' : (i === 3) ? 'Seasonal' : (i === 4) ? 'Random' : '',
              mode: 'lines+markers',
              fill: layout.props.line,
              fillcolor: (layout.props.colors) ? `rgba(${palette[3]},0.3)` : `rgba(${palette[layout.props.colorForMain]},0.3)`,
              marker: {
                color: (layout.props.colors) ? `rgba(${palette[3]},1)` : `rgba(${palette[layout.props.colorForMain]},1)`,
                size: (layout.props.datapoints) ? layout.props.pointRadius : 1,
              },
              line: {
                width: layout.props.borderWidth,
              },
            };

            if (layout.props.decomposeInFourCharts && i != 4) {
              dataset.xaxis = 'x';
              dataset.yaxis = 'y' + (5 - i);
            }

            chartData.push(dataset);
          } // end of for loop

          // Set HTML element for chart
          $(`.advanced-analytics-toolsets-${$scope.extId}`).html(`<div id="aat-chart-${$scope.extId}" style="width:100%;height:100%;"></div>`);

          let chart = '';
          if (layout.props.decomposeInFourCharts) {
            const customOptions = {
              showlegend: $scope.layout.props.showLegend,
              xaxis: {
                showgrid: $scope.layout.props.xScale,
              },
              yaxis: {
                title: 'Random',
                domain: [0, 0.24],
                showgrid: $scope.layout.props.yScale,
                tickformat: utils.getTickFormat($scope, 0),
                tickprefix: utils.getPrefix($scope, 0),
                ticksuffix: utils.getSuffix($scope, 0),
              },
              yaxis2: {
                title: 'Seasonal',
                domain: [0.25, 0.49],
                anchor: 'x2',
                showgrid: $scope.layout.props.yScale,
                tickformat: utils.getTickFormat($scope, 0),
                tickprefix: utils.getPrefix($scope, 0),
                ticksuffix: utils.getSuffix($scope, 0),
              },
              yaxis3: {
                title: 'Trend',
                domain: [0.5, 0.74],
                anchor: 'x3',
                showgrid: $scope.layout.props.yScale,
                tickformat: utils.getTickFormat($scope, 0),
                tickprefix: utils.getPrefix($scope, 0),
                ticksuffix: utils.getSuffix($scope, 0),
              },
              yaxis4: {
                title: 'Observed',
                domain: [0.74, 1],
                anchor: 'x4',
                showgrid: $scope.layout.props.yScale,
                tickformat: utils.getTickFormat($scope, 0),
                tickprefix: utils.getPrefix($scope, 0),
                ticksuffix: utils.getSuffix($scope, 0),
              },
              dragmode: 'select',
              margin: { r: 10, t: 0 },
            }
            chart = lineChart.draw($scope, chartData, `aat-chart-${$scope.extId}`, customOptions);
          } else {
            chart = lineChart.draw($scope, chartData, `aat-chart-${$scope.extId}`, null);
          }
          lineChart.setEvents(chart, $scope, app);
        }
        return defer.resolve();
      });
      return defer.promise;
    },
  };
});
