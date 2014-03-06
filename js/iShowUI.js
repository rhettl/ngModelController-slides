/*

    License:
    This code is property of i-Showcase, Inc. and is not to be used by anyone but i-Showcase, Inc. and its clients.
    It is included in this project for educational purposes and MUST NOT be altered or used in any other entities website --
    including but not limited to  personal or company websites for or not for profit.

    This disclaimer must be attached to all copies (development, production or otherwise) at all times unless distributed
    by i-Showcase, Inc.

 */



var noop = angular.noop,
    forEach = angular.forEach,
    element = angular.element,
    round = Math.round;
var VALID_CLASS = 'ng-valid',
    INVALID_CLASS = 'ng-invalid',
    PRISTINE_CLASS = 'ng-pristine',
    DIRTY_CLASS = 'ng-dirty',
    CHECKED_CLASS = 'checked',
    nullFormCtrl = {
        $addControl: noop,
        $removeControl: noop,
        $setValidity: noop,
        $setDirty: noop,
        $setPristine: noop
    };

//Extending Array comparison
Array.prototype.compare = function(array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time
    if (this.length != array.length)
        return false;

    for (var i = 0, l = this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].compare(array[i]))
                return false;
        }
        else if (this[i] != array[i]) {
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;
        }
    }
    return true;
};
var setCheckedClass = function($element, checked) {
    if (checked) {
        $element.addClass(CHECKED_CLASS);
    } else {
        $element.removeClass(CHECKED_CLASS);
    }
};

var NamedNgModelController = function(attrName) {
    return function() {
        return {
            require: [attrName, '^?form'],
            controller: ['$scope', '$exceptionHandler', '$attrs', '$element', '$parse',
                function($scope, $exceptionHandler, $attr, $element, $parse) {
                    this.$viewValue = Number.NaN;
                    this.$modelValue = Number.NaN;
                    this.$parsers = [];
                    this.$formatters = [];
                    this.$viewChangeListeners = [];
                    this.$pristine = true;
                    this.$dirty = false;
                    this.$valid = true;
                    this.$invalid = false;
                    this.$name = $attr.name;

                    var ngModelGet = $parse($attr[attrName]),
                        ngModelSet = ngModelGet.assign;

                    if (!ngModelSet) {
                        throw minErr(attrName)('nonassign', "Expression '{0}' is non-assignable. Element: {1}",
                            $attr[attrName], startingTag($element));
                    }

                    /**
                     * @ngdoc function
                     * @name ng.directive:ngModel.NgModelController#$render
                     * @methodOf ng.directive:ngModel.NgModelController
                     *
                     * @description
                     * Called when the view needs to be updated. It is expected that the user of the ng-model
                     * directive will implement this method.
                     */
                    this.$render = noop;
                    /**
                     * @ngdoc function
                     * @name { ng.directive:ngModel.NgModelController#$isEmpty
                     * @methodOf ng.directive:ngModel.NgModelController
                     *
                     * @description
                     * This is called when we need to determine if the value of the input is empty.
                     *
                     * For instance, the required directive does this to work out if the input has data or not.
                     * The default `$isEmpty` function checks whether the value is `undefined`, `''`, `null` or `NaN`.
                     *
                     * You can override this for input directives whose concept of being empty is different to the
                     * default. The `checkboxInputType` directive does this because in its case a value of `false`
                     * implies empty.
                     *
                     * @param {*} value Reference to check.
                     * @returns {boolean} True if `value` is empty.
                     */
                    this.$isEmpty = function(value) {
                        return isUndefined(value) || value === '' || value === null || value !== value;
                    };
                    var parentForm = $element.inheritedData('$formController') || nullFormCtrl,
                        invalidCount = 0, // used to easily determine if we are valid
                        $error = this.$error = {}; // keep invalid keys here


                    // Setup initial state of the control
                    $element.addClass(PRISTINE_CLASS);
                    toggleValidCss(true);
                    // convenience method for easy toggling of classes
                    function toggleValidCss(isValid, validationErrorKey) {
                        validationErrorKey = validationErrorKey ? '-' + snake_case(validationErrorKey, '-') : '';
                        $element.
                            removeClass((isValid ? INVALID_CLASS : VALID_CLASS) + validationErrorKey).
                            addClass((isValid ? VALID_CLASS : INVALID_CLASS) + validationErrorKey);
                    }

                    /**
                     * @ngdoc function
                     * @name ng.directive:ngModel.NgModelController#$setValidity
                     * @methodOf ng.directive:ngModel.NgModelController
                     *
                     * @description
                     * Change the validity state, and notifies the form when the control changes validity. (i.e. it
                     * does not notify form if given validator is already marked as invalid).
                     *
                     * This method should be called by validators - i.e. the parser or formatter functions.
                     *
                     * @param {string} validationErrorKey Name of the validator. the `validationErrorKey` will assign
                     *        to `$error[validationErrorKey]=isValid` so that it is available for data-binding.
                     *        The `validationErrorKey` should be in camelCase and will get converted into dash-case
                     *        for class name. Example: `myError` will result in `ng-valid-my-error` and `ng-invalid-my-error`
                     *        class and can be bound to as  `{{someForm.someControl.$error.myError}}` .
                     * @param {boolean} isValid Whether the current state is valid (true) or invalid (false).
                     */
                    this.$setValidity = function(validationErrorKey, isValid) {
                        // Purposeful use of ! here to cast isValid to boolean in case it is undefined
                        // jshint -W018
                        if ($error[validationErrorKey] === !isValid)
                            return;
                        // jshint +W018

                        if (isValid) {
                            if ($error[validationErrorKey])
                                invalidCount--;
                            if (!invalidCount) {
                                toggleValidCss(true);
                                this.$valid = true;
                                this.$invalid = false;
                            }
                        } else {
                            toggleValidCss(false);
                            this.$invalid = true;
                            this.$valid = false;
                            invalidCount++;
                        }

                        $error[validationErrorKey] = !isValid;
                        toggleValidCss(isValid, validationErrorKey);
                        parentForm.$setValidity(validationErrorKey, isValid, this);
                    };
                    /**
                     * @ngdoc function
                     * @name ng.directive:ngModel.NgModelController#$setPristine
                     * @methodOf ng.directive:ngModel.NgModelController
                     *
                     * @description
                     * Sets the control to its pristine state.
                     *
                     * This method can be called to remove the 'ng-dirty' class and set the control to its pristine
                     * state (ng-pristine class).
                     */
                    this.$setPristine = function() {
                        this.$dirty = false;
                        this.$pristine = true;
                        $element.removeClass(DIRTY_CLASS).addClass(PRISTINE_CLASS);
                    };
                    /**
                     * @ngdoc function
                     * @name ng.directive:ngModel.NgModelController#$setViewValue
                     * @methodOf ng.directive:ngModel.NgModelController
                     *
                     * @description
                     * Update the view value.
                     *
                     * This method should be called when the view value changes, typically from within a DOM event handler.
                     * For example {@link ng.directive:input input} and
                     * {@link ng.directive:select select} directives call it.
                     *
                     * It will update the $viewValue, then pass this value through each of the functions in `$parsers`,
                     * which includes any validators. The value that comes out of this `$parsers` pipeline, be applied to
                     * `$modelValue` and the **expression** specified in the `ng-model` attribute.
                     *
                     * Lastly, all the registered change listeners, in the `$viewChangeListeners` list, are called.
                     *
                     * Note that calling this function does not trigger a `$digest`.
                     *
                     * @param {string} value Value from the view.
                     */
                    this.$setViewValue = function(value) {
                        this.$viewValue = value;
                        // change to dirty
                        if (this.$pristine) {
                            this.$dirty = true;
                            this.$pristine = false;
                            $element.removeClass(PRISTINE_CLASS).addClass(DIRTY_CLASS);
                            parentForm.$setDirty();
                        }

                        forEach(this.$parsers, function(fn) {
                            value = fn(value);
                        });
                        if (this.$modelValue !== value) {
                            this.$modelValue = value;
                            ngModelSet($scope, value);
                            forEach(this.$viewChangeListeners, function(listener) {
                                try {
                                    listener();
                                } catch (e) {
                                    $exceptionHandler(e);
                                }
                            });
                        }
                    };
                    // model -> value
                    var ctrl = this;
                    $scope.$watch(function ngModelWatch() {
                        var value = ngModelGet($scope);
                        // if scope model value and ngModel value are out of sync
                        if (ctrl.$modelValue !== value) {
                            var formatters = ctrl.$formatters,
                                idx = formatters.length;
                            ctrl.$modelValue = value;
                            while (idx--) {
                                value = formatters[idx](value);
                            }

//                            if (ctrl.$viewValue !== value) {
                            ctrl.$viewValue = value;
                            ctrl.$render();
//                            }
                        }

                        return value;
                    });
                }],
            link: function(scope, element, attr, ctrls) {
                // notify others, especially parent forms

                var modelCtrl = ctrls[0],
                    formCtrl = ctrls[1] || nullFormCtrl;

                formCtrl.$addControl(modelCtrl);

                scope.$on('$destroy', function() {
                    formCtrl.$removeControl(modelCtrl);
                });
            }
        };
    };
};
var ngRangeSliderDirective = [function() {

    return {
        restrict: "A",
        require: ['ngModelLow', 'ngModelHigh'],
        link: function(scope, elem, attrs, models) {
            if (!models || typeof attrs.min === 'undefined' || typeof attrs.max === 'undefined') {
                return;
            }

            var modelLow = models[0],
                modelHigh = models[1],
                startDrag;

            var slider, bounceBack = false,
                logMarkers = scope.$eval(attrs.logMarkers) || false,
                step = scope.$eval(attrs.step) || 1,
                min = scope.$eval(attrs.min),
                max = scope.$eval(attrs.max),
//                        swapVariables = function(input){
//                            if (modelLow.$modelValue > modelHigh.$modelValue){
//                                var temp = modelLow.$modelValue;
//                                modelLow.$modelValue = modelHigh.$modelValue;
//                                modelHigh.$modelValue = temp;
//                                return;
//                            }
//                            return input;
//                        },
                boundries = function(input) {
                    if (input !== 0)
//                                console.log('boundries', input);
                        if (input < min) {
                            input = min;
                            bounceBack = true;
                        }
                    if (input > max) {
//                                console.log('too high', input);
                        input = max;
                        bounceBack = true;
//                                console.log('input reset', input);
                    }
                    return input;
                },
                percentToMarkers = function(value) {
//                            console.log('percent', value);
                    var h, _startPerc, _fromVal, i;

                    h = logMarkers;
                    _startPerc = 0;
                    _fromVal = min;

                    for (i = 0; i <= h.length; i++) {
                        if (h[i])
                            v = h[i].split("/");
                        else
                            v = [100, max];
                        v[0] = new Number(v[0]);
                        v[1] = new Number(v[1]);

                        if (value >= _startPerc && value <= v[0]) {
                            var out = round((value - _startPerc) / (v[0] - _startPerc) * (v[1] - _fromVal) + _fromVal);
//                                    console.log(out);
                            return out;
                        }

                        _startPerc = v[0];
                        _fromVal = v[1];
                    }
                },
                markersToPercent = function(value) {
//                            console.log('marker', value);
                    var h, _startPerc, _fromVal;

                    h = logMarkers;
                    _startPerc = 0;
                    _fromVal = min;

                    for (var i = 0; i <= h.length; i++) {
                        if (h[i])
                            v = h[i].split("/");
                        else
                            v = [100, max];
                        v[0] = new Number(v[0]);
                        v[1] = new Number(v[1]);

                        if (value >= _fromVal && value <= v[1]) {
                            var out = (((value - _fromVal) * (v[0] - _startPerc)) / (v[1] - _fromVal)) + _startPerc;
//                                    console.log('marker percent', out);
                            return out;
                        }

                        _startPerc = v[0];
                        _fromVal = v[1];
                    }
                };

            var sliderStart = {
                min: min,
                max: max,
                step: step,
                values: [modelLow.$viewValue, modelHigh.$viewValue]
            };

            if (logMarkers && logMarkers.length) {
                //inbound
                modelLow.$formatters.push(markersToPercent);
                modelHigh.$formatters.push(markersToPercent);

                //outbound
                modelLow.$parsers.push(percentToMarkers);
                modelHigh.$parsers.push(percentToMarkers);

                sliderStart = {
                    step: 0.000000001,
                    min: 0.0,
                    max: 100.0,
                    values: [markersToPercent(modelLow.$viewValue), markersToPercent(modelHigh.$viewValue)]
                };
            }

            modelLow.$formatters.push(boundries);
            modelHigh.$formatters.push(boundries);
//                modelLow.$formatters.push(swapVariables);
//                modelHigh.$formatters.push(swapVariables);

            slider = elem.slider({
                animate: true,
                range: true,
                step: sliderStart.step,
                min: sliderStart.min,
                max: sliderStart.max,
                values: sliderStart.values,
                slide: function(e, ui) {
                    scope.$apply(function() {
                        modelLow.$setViewValue(ui.values[0]);
                        modelHigh.$setViewValue(ui.values[1]);
                    });
                },
                start: function(e, ui) {
                    startDrag = ui.values;
                },
                stop: function(e, ui) {
                    if (ui.values[0] != startDrag[0] || ui.values[1] != startDrag[1]) {

                        scope.$apply(function() {
                            scope.$eval(attrs.ngStop, {
                                values: ui.values,
                                low: ui.values[0],
                                high: ui.values[1]
                            });
                        });
                    }
                }
            });
            modelLow.$render = function() {
                if (bounceBack) {
                    bounceBack = false;
                    modelLow.$setViewValue(modelLow.$viewValue);
                }

                var tempHigh = slider.slider('values', 1);
                if (tempHigh < modelLow.$viewValue) {
                    var tempLow = modelLow.$viewValue;
                    modelLow.$setViewValue(tempHigh);
                    modelHigh.$setViewValue(tempLow);
                    slider.slider('values', [modelLow.$viewValue, modelHigh.$viewValue]);
                } else {
                    slider.slider('values', 0, modelLow.$viewValue);
                }

            };
            modelHigh.$render = function() {
//                    console.log(bounceBack);
                if (bounceBack) {
                    bounceBack = false;
                    modelHigh.$setViewValue(modelHigh.$viewValue);
                }

                var tempLow = slider.slider('values', 0);
                if (tempLow > modelHigh.$viewValue) {
                    var tempHigh = modelHigh.$viewValue;
                    modelLow.$setViewValue(tempHigh);
                    modelHigh.$setViewValue(tempLow);
                    slider.slider('values', [modelLow.$viewValue, modelHigh.$viewValue]);
                } else {
                    slider.slider('values', 1, modelHigh.$viewValue);
                }


            };
        }
    };
}];

var scaleSlider = [function() {
    var flopLowHigh = function(lowHigh) {
        var low = lowHigh[1] - 1,
            high = lowHigh[0] + 1;
        return [low, high];
    };
    return {
        restrict: 'A',
        require: ['ngModelLow', 'ngModelHigh'],
        link: function(scope, elem, attrs, models) {
            if (!models || typeof attrs.scale === 'undefined') {
                return;
            }

            var modelLow = models[0],
                modelHigh = models[1],
                startDrag;

            var slider, bounceBack = false,
                scale = scope.$eval(attrs.scale),
                stringToIndexFactory = function(offset) {
                    offset = offset || 0;
                    return function(input) {
                        var i = scale.indexOf(input);
                        return i >= 0 ? i + offset : null;
                    };
                },
                indexToStringFactory = function(offset) {
                    offset = offset || 0;
                    return function(input) {
                        var i = input + offset;
                        return i >= 0 && i < scale.length ? scale[i] : null;
                    };
                };

            modelLow.$formatters.push(stringToIndexFactory());
            modelHigh.$formatters.push(stringToIndexFactory(1));
            modelLow.$parsers.push(indexToStringFactory());
            modelHigh.$parsers.push(indexToStringFactory(-1));

            slider = elem.slider({
                animate: true,
                range: true,
                step: 1,
                min: 0,
                max: scale.length,
                values: [0, scale.length],
                slide: function(e, ui) {
                    //revent crossover and overlapping
                    if (ui.values[0] >= ui.values[1])
                        return false;

                    scope.$apply(function() {
                        modelLow.$setViewValue(ui.values[0]);
                        modelHigh.$setViewValue(ui.values[1]);
                    });
                },
                start: function(e, ui) {
                    startDrag = ui.values;
                },
                stop: function(e, ui) {
                    if (ui.values[0] != startDrag[0] || ui.values[1] != startDrag[1]) {

                        scope.$apply(function() {
                            scope.$eval(attrs.ngStop, {
                                values: [modelLow.$modelValue, modelHigh.$modelValue],
                                low: modelLow.$modelValue,
                                high: modelHigh.$modelValue
                            });
                        });
                    }
                }
            });
            modelLow.$render = function() {
                var tempHigh = slider.slider('values', 1);
                if (tempHigh - 1 < modelLow.$viewValue) {
                    var tempLow = modelLow.$viewValue,
                        flopedVals = flopLowHigh([tempLow, tempHigh]);

                    modelLow.$setViewValue(flopedVals[0]);
                    modelHigh.$setViewValue(flopedVals[1]);
                    slider.slider('values', flopedVals);
                } else {
                    slider.slider('values', 0, modelLow.$viewValue);
                }
            };
            modelHigh.$render = function() {
                var tempLow = slider.slider('values', 0);
                if (tempLow >= modelHigh.$viewValue) {
                    var tempHigh = modelHigh.$viewValue,
                        flopedVals = flopLowHigh([tempLow, tempHigh]);

                    modelLow.$setViewValue(flopedVals[0]);
                    modelHigh.$setViewValue(flopedVals[1]);
                    slider.slider('values', flopedVals);
                } else {
                    slider.slider('values', 1, modelHigh.$viewValue);
                }
            };
        }
    };
}];

var scaleListItemsDirective = ['$timeout', '$window', function($timeout, $window) {
    return {
        restrict: 'A',
        require: ['ngModelLow', 'ngModelHigh'],
        template: '<ul class="scale-items">' +
            '</ul>',
        link: function(scope, elem, attrs, models) {
            if (!models || typeof attrs.scale === 'undefined') {
                return;
            }

            var scale = scope.$eval(attrs.scale), updating = false,
                currentLow = 0, currentHigh = scale.length,
                currentWindowX, w = element($window),
                modelLow = models[0],
                modelHigh = models[1],
                scale = scope.$eval(attrs.scale),
                ul = elem.find('ul'),
                stringToIndexFactory = function(offset) {
                    offset = offset || 0;
                    return function(input) {
                        var i = scale.indexOf(input);
                        return i >= 0 ? i + offset : null;
                    };
                },
                indexToStringFactory = function(offset) {
                    offset = offset || 0;
                    return function(input) {
                        var i = input + offset;
                        return i >= 0 && i < scale.length ? scale[i] : null;
                    };
                },
                findClosestHandle = function(e) {
                    var p = element(this).index(),
                        l = modelLow.$viewValue,
                        h = modelHigh.$viewValue,
                        handle = false;

                    //choose handle
                    if (p < l) {
                        handle = 'low';
                    } else if (p > h) {
                        handle = 'high';
                    } else {
                        var lDiff = Math.abs(p - l),
                            hDiff = Math.abs(p - h) - 1;

                        if (lDiff === 0) {
                            handle = 'high';
                        } else if (hDiff === 0) {
                            handle = 'low';
                        } else if (lDiff <= hDiff) {
                            handle = 'low';
                        } else {
                            handle = 'high';
                        }
                    }

                    //act on handle
                    scope.$apply(function() {
                        if (handle === 'low') {
                            modelLow.$setViewValue(p);
                        } else if (handle === 'high') {
                            modelHigh.$setViewValue(p + 1);
                        }
                        updateActive();
                    });
                },
                updateActive = function() {
                    if (updating) {
                        $timeout.cancel(updating);
                        updating = false;
                    }

                    updating = $timeout(function(){
                        ul.find('li').removeClass('active').slice(modelLow.$viewValue, modelHigh.$viewValue).addClass('active');
                    }, 25);
                },
                updateInnerWidths = function(){
                    var ulWidth = ul[0].offsetWidth-2,
                        liSet = ul.find('li');
//                            console.log(ulWidth);
                    forEach(liSet, function(li) {
                        element(li).css('width', ((ulWidth - 1) / liSet.length) - 1);
                    });
                };

            modelLow.$formatters.push(stringToIndexFactory());
            modelHigh.$formatters.push(stringToIndexFactory(1));
            modelLow.$parsers.push(indexToStringFactory());
            modelHigh.$parsers.push(indexToStringFactory(-1));

            forEach(scale, function(item, i) {
                ul.append(element('<li>' + item + '</li>'));
            });

            ul.find('li').on('click', findClosestHandle);

            modelLow.$render = updateActive;
            modelHigh.$render = updateActive;

            w.bind('resize', function(){
                var newWindowX = w.width()
                if (newWindowX !== currentWindowX){
                    currentWindowX = newWindowX;
                    updateInnerWidths();
                }
            }).trigger('resize');
        }
    };
}];

var ngDollarDirective = ['$timeout', function($timeout) {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function(scope, elem, attrs, ngModel) {
            var deci = '.',
                comma = ',',
                deciPlaces = 2,
                curSign = '$',
                keyTimeoutPromise,
                addFormat = function(n) {
                    var sign = curSign,
                        c = isNaN(c = Math.abs(deciPlaces)) ? 2 : deciPlaces,
                        d = deci ? deci : ".",
                        t = comma ? comma : ",",
                        s = n < 0 ? "-" : "",
                        i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "",
                        j = (j = i.length) > 3 ? j % 3 : 0;
                    return s + sign + (j ? i.substr(0, j) + t : "")
                        + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t)
                        + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
                },
                removeFormat = function(n) {
                    return parseFloat(n.replace(/[^0-9\.]/gi, '')) || 0;
                },
                refreshElem = function() {
                    ngModel.$setViewValue(elem.val());
                    elem.val(addFormat(removeFormat(elem.val())));
                };

            ngModel.$parsers.push(removeFormat);
            ngModel.$formatters.push(addFormat);

            elem.bind('keyup blur', function(e) {
                if (keyTimeoutPromise) {
                    $timeout.cancel(keyTimeoutPromise);
                    keyTimeoutPromise = null;
                }

                var commit = (e.type === 'blur' || (e.type === 'keyup' && e.keyCode === 13));

                if (commit) {
                    refreshElem();
                } else {
                    keyTimeoutPromise = $timeout(refreshElem, 1200);
                }
            });

//                ngModel.$render = function(){
//                    elem.val(ngModel.$viewValue);
//                };
        }
    };
}];
var chkButtonSetDirective = ['$parse', '$timeout', function($parse, $timeout) {
    return {
        restrict: 'AE',
        require: ['chkButtonSet', '?ngModel'],
        controller: ['$scope', '$element', '$attrs',
            function($scope, $element, $attrs) {

                //Outputable information
                this.$buttons = [];

                //All controllers that make up the buttons above
                this.$ctrls = [];

                //used to decide what happens to the data once updated. to be set be the linking function ususally
                this.$render = noop;

                //This is used to prevent multiple changes at once on the update function from the add and remove functions
                this._delayTimer = false;

                //adds new button to end of controllers
                this.$addButton = function(btn) {
                    this.$ctrls.push(btn);

                    this._delayedUpdate();
//                        this.$update();
                };

                //removes button from controllers
                this.$removeButton = function(btn) {
                    this.$ctrls.splice(btn, 1);

                    this._delayedUpdate();
//                        this.$update();
                };

                this._delayedUpdate = function() {
                    if (this._delayTimer) {
                        $timeout.cancel(this._delayTimer);
                        this._delayTimer = false;
                    }
                    var self = this;
                    this._delayTimer = $timeout(function() {
                        self.$update();
                    }, 150);
                };
                //initiates controllers => buttons
                this.$update = function() {
                    var out = [];
                    this.$ctrls.forEach(function(item) {
                        if (item.$checked) {
                            out.push(item.$value);
                        }
                    });
                    if (!this.$buttons.compare(out)) {
                        this.$buttons = out;
                        this.$render();
                    }
                };
            }],
        link: function(scope, elem, attrs, model) {
            var buttonSetCtrl = model[0],
                modelCtrl = model[1] || {
                    $setViewValue: noop
                };

//                var btnSetGet = $parse(attrs.ngModel || 'ngModel'),
//                        btnSetSet = btnSetGet.assign;

//                var btnSetScope;
//                if (attrs.ngModel) {
//                    btnSetScope = scope;
//                } else {
//                    btnSetScope = {ngModel: []};
//                }
//                $timeout(function(){
            buttonSetCtrl.$render = function() {
                //                    btnSetSet(btnSetScope, model.$buttons);
                modelCtrl.$setViewValue(buttonSetCtrl.$buttons);
            };
//                }, 300);

//                scope.$watch(function(){
//                    //nothign here yet but I may make bi directional arrayed communication
//                    //not dure how exactly
//                });

        }
    };
}];
var ngCheckModelDirective = [function() {
    return {
        restrict: 'A',
        controller: ['$scope', '$element', '$attrs', '$parse', '$exceptionHandler',
            function($scope, $element, $attrs, $parse, $exceptionHandler) {
                var ctrl = this,
                    checkedClass = $scope.$eval($attrs.activeClass) || CHECKED_CLASS,
                    chkModelGet = $parse($attrs.ngCheckModel || 'ngCheckModel'),
                    chkModelSet = chkModelGet.assign;

                var chkModelScope;
                if ($attrs.ngCheckModel) {
                    chkModelScope = $scope;
                } else {
                    chkModelScope = {ngCheckModel: false};
                }

                var valueModelGet, valueModelSet;
                if ($attrs.ngValue) {
                    valueModelGet = $parse($attrs.ngValue);
                    valueModelSet = valueModelGet.assign;
                } else {
                    valueModelGet = function($scope) {
                        return ctrl.$checked;
                    };
                    valueModelSet = function($newVal) {
                    };
                }

                var parentCont = $element.inheritedData('$chkButtonSetController') || {$update: noop};

//                    if (!chkModelSet) {
//                        throw minErr('ngCheckModel')('nonassign', "Expression '{0}' is non-assignable. Element: {1}",
//                                $attrs.ngCheckModel, startingTag($element));
//                    }

                this.$modelChecked = chkModelGet(chkModelScope);
                this.$checked = Boolean(this.$modelChecked);
                this.$value = valueModelGet($scope);
                setCheckedClass($element, this.$checked, checkedClass);

                this.$toggle = function(trueFalse) {
                    if (typeof trueFalse === 'undefined') {
                        trueFalse = !this.$checked;
                    } else {
                        trueFalse = Boolean(trueFalse);
                    }
                    this.$checked = trueFalse;

                    setCheckedClass($element, this.$checked, checkedClass);

                    if (this.$modelChecked !== trueFalse) {

                        this.$modelChecked = trueFalse;
                        chkModelSet(chkModelScope, this.$checked);

                    }
                    parentCont.$update();
                };
                this.$setOn = function() {
                    this.$toggle(true);
                };
                this.$setOff = function() {
                    this.$toggle(false);
                };

                $scope.$watch(function() {
                    var checked = chkModelGet(chkModelScope);

                    ctrl.$value = valueModelGet($scope);

                    if (checked !== ctrl.$modelChecked) {

                        ctrl.$modelChecked = checked;
                        ctrl.$checked = Boolean(ctrl.$modelChecked);
                        setCheckedClass($element, ctrl.$checked, checkedClass);
                        parentCont.$update();
                    }
                });
            }]
    };
}];
var chkButtonDirective = [function() {
    return {
        restrict: 'AE',
        require: ['^chkButtonSet', 'ngCheckModel'],
        link: function(scope, elem, attrs, models) {
            var buttonSetModel = models[0],
                buttonModel = models[1];

//                console.log(buttonModel.$checked, buttonModel.$value);
            buttonSetModel.$addButton(buttonModel);

            elem.bind('click', function() {
                scope.$apply(function() {
                    buttonModel.$toggle();
                });
            });
            scope.$on('$destroy', function() {
                buttonSetModel.$removeButton(buttonModel);
            });
        }
    };
}];

angular.module('iShowUI', [])
    .directive('ngCheckModel', ngCheckModelDirective)
    .directive('chkButtonSet', chkButtonSetDirective)
    .directive('chkButton', chkButtonDirective)
    .directive('ngDollar', ngDollarDirective)
    .directive('ngModelLow', NamedNgModelController('ngModelLow'))
    .directive('ngModelHigh', NamedNgModelController('ngModelHigh'))
    .directive('rangeSlider', ngRangeSliderDirective)
    .directive('scaleItems', scaleListItemsDirective)
    .directive('scaleSlider', scaleSlider);