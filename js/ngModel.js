/**
 * Created by rhett on 2/5/14.
 */

angular.module('jQueryUI', [])
    .directive('rangeSlider', [function() {
        var noop = angular.noop;

        return {
            restrict: "EA",
            require: 'ngModel',
            link: function(scope, elem, attrs, ngModel) {
                if (!ngModel || typeof attrs.min === 'undefined' || typeof attrs.max === 'undefined'){
                    return;
                }

                var slider, bounceBack = false,
                    step = scope.$eval(attrs.step) || 1,
                    min = scope.$eval(attrs.min),
                    max = scope.$eval(attrs.max),
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


//                ngModel.$parsers.push(checkLowHigh);
                ngModel.$formatters.push(checkLowHigh);

                slider = elem.slider({
                    animate: true,
                    range: true,
                    step: step,
                    min: min,
                    max: max,
                    values: ngModel.$viewValue,
                    slide: function(e, ui){
                        scope.$apply(function(){
                            ngModel.$setViewValue(ui.values);
                        });
                    },
                    stop: function(e, ui){
                        scope.$apply(function(){
                            scope.$eval(attrs.ngStop, {
                                values: ui.values,
                                low: ui.values[0],
                                high: ui.values[1]
                            });
                        });
                    }
                });

                ngModel.$render = function(){
                    if (bounceBack) {
                        bounceBack = false;
                        ngModel.$setViewValue(ngModel.$viewValue);
                    }
                    slider.slider('values', ngModel.$viewValue);
                };
            }
        };
    }]);