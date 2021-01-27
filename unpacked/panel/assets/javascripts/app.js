var BNPChrome = angular
    .module("BNPChrome", [])
    .factory("parse", function () {
        const parser = function (input, level, depthOverride) {
			const depth = depthOverride || 3;
            if (level > depth) return input;

            if (!input || typeof input === "number" || typeof input === "boolean") {
                return input;
            }

            if (Array.isArray(input)) {
                // loop and parse each node
                for (var i = 0; i < input.length; i++) {
                    input[i] = parser(input[i], level ? level + 1 : 1, depth);
                }
                return input;
            }

            if (typeof input === "string") {
                try {
                    input = parser(JSON.parse(input), level ? level + 1 : 1, depth);
                    return input;
                } catch (e) {
                    // not a stringified node
                    return input;
                }
            } else if (typeof input === "object") {
                Object.keys(input).forEach(function (item) {
                    input[item] = parser(input[item], level ? level + 1 : 1, depth);
                    return item;
                });
            } else {
                // unless there is a datatype I'm not checking for....
                // console.log('shouldnt get here')
            }

            return input;
        };

        return parser;
    })
    .directive("prettyPrint", function (parse) {
        return {
            restrict: "E",
            replace: true,
            transclude: false,
            scope: { data: "=data" },
            link: function (scope, element, attrs) {
                let data = scope.data;
                let $el = $("<div></div>");

                if (data === true) {
                    data = "<i>true</i>";
                } else if (data === false) {
                    data = "<i>false</i>";
                } else if (data === undefined) {
                    data = "<i>undefined</i>";
                } else if (data === null) {
                    data = "<i>null</i>";
                } else if (typeof data === "number") {
                    // skip (i.e. do default)
                } else if (typeof data === "string" && (data[0] === "{" || data[0] === "[")) {
					$el = $("<pre></pre>");
					data = JSON.stringify(parse(data, 0), null, 4);
                } else if (typeof data === "string") {
                    // i.e. a string but not a JSON stringified string
                    data = $("<div>").text(data).html();
                }

                $el.html(data);

                element.replaceWith($el);
            }
        };
    })
    .directive("resizableColumns", function ($parse) {
        return {
            link: function (scope, element, attrs) {
                const options = { minWidth: 5 };

                if ($(element).data("resizable-columns-sync")) {
                    var $target = $($(element).data("resizable-columns-sync"));

                    $(element).on("column:resize", function (
                        event,
                        resizable,
                        $leftColumn,
                        $rightColumn,
                        widthLeft,
                        widthRight
                    ) {
                        var leftColumnIndex = resizable.$table
                            .find(".rc-column-resizing")
                            .parent()
                            .find("td, th")
                            .index($leftColumn);

                        var $targetFirstRow = $target.find("tr:first");

                        $($targetFirstRow.find("td, th").get(leftColumnIndex)).css("width", widthLeft + "%");
                        $($targetFirstRow.find("td, th").get(leftColumnIndex + 1)).css("width", widthRight + "%");

                        $target.data("resizableColumns").syncHandleWidths();
                        $target.data("resizableColumns").saveColumnWidths();
                    });
                    // $(window).on("resize", function () {
                    //     // console.log('resize event');
                    //     // var $target = $($(element).data("resizable-columns-sync"));
                    //     // $target.data("resizableColumns").refreshHeaders();
                    //     // $(element).resizableColumns(options);
                    // })
                }

                $(element).resizableColumns(options);
            }
        };
    })
    .directive("scrollToNew", function ($parse) {
        return function (scope, element, attrs) {
            if (scope.showIncomingRequests && scope.$last) {
                const $container = $(element).parents(".data-container").first();
                const $parent = $(element).parent();

                $container.scrollTop($parent.height());
            }
        };
    }).directive('onSearch', function () {
        return function (scope, element, attrs) {
            element.bind("keypress", function (event) {
                if((event.shiftKey && event.which === 220) || event.which === 13 || event.which === 44 || event.which === 124) {
                    scope.$apply(function (){
                        scope.$eval(attrs.onSearch);
                    });
    
                    event.preventDefault();
                }
            });
        };
    }).directive('ngRightClick', function($parse) {
        return function(scope, element, attrs) {
            element.bind('contextmenu', function(event) {
                scope.$apply(function() {
                    scope.$eval(attrs.ngRightClick);
                });
                
                event.preventDefault();
            });
        };
    });
