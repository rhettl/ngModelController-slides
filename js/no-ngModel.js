/**
* Created by rhett on 2/5/14.
*/

angular.module('jQueryUI', [])
    .directive('rangeSlider', [function() {
        var noop = angular.noop;

        return {
            restrict: "EA",
            replace: true,
            template: '<div class="slider"></div>',
            scope: {
                step: '@?',
                min: '@',
                max: '@',
                ngModelLow: '=',
                ngModelHigh: '=',
                stop: '&?',
                slide: '&?'
            },
            link: function(scope, elem, attrs) {
                var slider,
                    externalChange = function(){
                        console.log('external', [scope.ngModelLow, scope.ngModelHigh]);
                        slider.slider('values', [scope.ngModelLow, scope.ngModelHigh]);
                    },
                    setValues = function(values){
                        console.log('internal', values);
                        values = checkLowHigh(values);
                        scope.$apply(function(){
                            scope.ngModelLow = values[0];
                            scope.ngModelHigh = values[1];
                        });
                    },
                    checkLowHigh = function(vals){
                        if (typeof vals === 'undefined' || vals.length !== 2)
                            vals = [min, max];

                        var low = vals[0], high = vals[1];

                        if (high < low){
                            var temp = high;
                            high = low; low = temp;
                            bounceBack = true;
                        }
                        if (low < min) {
                            low = min;
                            bounceBack = true;
                        }
                        if (high > max) {
                            high = max;
                            bounceBack = true;
                        }

                        return [low, high];
                    };

                scope.stop = scope.stop || noop;
                scope.slide = scope.slide || nooLowp;

                scope.min = parseFloat(scope.min);
                scope.max = parseFloat(scope.max);

                scope.step = typeof scope.step !== 'undefined' ? scope.step : 1;
                scope.ngModelLow = typeof scope.ngModelLow !== 'undefined' ? scope.ngModelLow : scope.min;
                scope.ngModelHigh = typeof scope.ngModelHigh !== 'undefined' ? scope.ngModelHigh : scope.max;

                slider = elem.slider({
                    animate: true,
                    range: true,
                    step: scope.step,
                    min: scope.min,
                    max: scope.max,
                    values: [scope.ngModelLow, scope.ngModelHigh],
                    slide: function(e, ui){
                        setValues(ui.values);

                        scope.slide({
                            values: ui.values,
                            low: ui.values[0],
                            high: ui.values[1]
                        });
                    },
                    stop: function(e, ui){
                        scope.stop({
                            values: ui.values,
                            low: ui.values[0],
                            high: ui.values[1]
                        });
                    }
                });

                scope.$watch('ngModelLow', externalChange);
                scope.$watch('ngModelHigh', externalChange);
            }
        };
    }]);