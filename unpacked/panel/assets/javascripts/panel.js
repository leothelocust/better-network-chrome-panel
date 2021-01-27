function Console() {}

Console.Type = {
    LOG: "log",
    DEBUG: "debug",
    INFO: "info",
    WARN: "warn",
    ERROR: "error",
    GROUP: "group",
    GROUP_COLLAPSED: "groupCollapsed",
    GROUP_END: "groupEnd"
};

Console.addMessage = function (type, format, args) {
    chrome.runtime.sendMessage({
        command: "sendToConsole",
        tabId: chrome.devtools.inspectedWindow.tabId,
        args: escape(JSON.stringify(Array.prototype.slice.call(arguments, 0)))
    });
};

// Generate Console output methods, i.e. Console.log(), Console.debug() etc.
(function () {
    var console_types = Object.getOwnPropertyNames(Console.Type);
    for (var type = 0; type < console_types.length; ++type) {
        var method_name = Console.Type[console_types[type]];
        Console[method_name] = Console.addMessage.bind(Console, method_name);
    }
})();

BNPChrome.controller("PanelController", function PanelController($scope, toolbar, parse, $timeout) {

    const LOCALSTORAGE = window.localStorage;
    const MAXBODYSIZE = 20000;
    const HOST = "https://leviolson.com" // "http://localhost:3000"
    const CHANGELOG = {
        "What's New": {
            "v1.0.0:": {
                "Improved Search": HOST + "/posts/bnp-changelog#improved-search",
                "JSON Editor BUILT IN": HOST + "/posts/bnp-changelog#json-editor-built-in",
                "Vertical Chrome Panel": HOST + "/posts/bnp-changelog#vertical-chrome-panel",
                "Download JSON": HOST + "/posts/bnp-changelog#download-json"
            }
        }
    }

    $scope.search = "";
    $scope.searchTerms = [];
    $scope.oldSearchTerms = [];
    $scope.andFilter = true;
    $scope.uniqueId = 100000;
    $scope.activeId = null;
    $scope.requests = {};
    $scope.masterRequests = [];
    $scope.filteredRequests = [];
    $scope.showAll = true;
    $scope.limitNetworkRequests = false;
    $scope.showOriginal = false;
    $scope.currentDetailTab = "tab-response";
    $scope.showIncomingRequests = true;
    $scope.myResponseCodeMirror = null;
    $scope.filter = "";
    $scope.editor = null;

    $scope.activeCookies = [];
    $scope.activeHeaders = [];
    $scope.activePostData = [];
    $scope.activeRequest = [];
    $scope.activeResponseData = [];
    $scope.activeResponseCookies = [];
    $scope.activeResponseHeaders = [];
    $scope.activeCode = null;

    $scope.init = function (type) {
        $("#tabs").tabs();

        $scope.initChrome();

        $scope.createToolbar();

        const options = {
            mode: 'view',
            modes: ['code', 'view'],
            onEditable: function (node) {
              if (!node.path) {
                // In modes code and text, node is empty: no path, field, or value
                // returning false makes the text area read-only
                return false;
              }
              return true
            }
        }
        const response = document.getElementById('response-jsoneditor')
        const request = document.getElementById('request-jsoneditor')
        $scope.responseJsonEditor = new JSONEditor(response, options)
        $scope.requestJsonEditor = new JSONEditor(request, options)

        $timeout(() =>  {
            $scope.responseJsonEditor.set(CHANGELOG);
            $scope.responseJsonEditor.expandAll();
        })
    };

    $scope.initChrome = function () {
        try {
            let oldSearchTerms = JSON.parse(LOCALSTORAGE.getItem('bnp-oldsearchterms'));
            $scope.oldSearchTerms = oldSearchTerms || [];
        } catch (e) {
            $scope.oldSearchTerms = [];
        }
        
        try {
            let searchTerms = JSON.parse(LOCALSTORAGE.getItem('bnp-searchterms'));
            $scope.searchTerms = searchTerms || [];
        } catch (e) {
            $scope.searchTerms = [];
        }
        
        try {
            let andFilter = JSON.parse(LOCALSTORAGE.getItem('bnp-andfilter'));
            $scope.andFilter = andFilter || false;
        } catch (e) {
            $scope.andFilter = false;
        }

        console.debug('Retrieving', $scope.andFilter, $scope.searchTerms, $scope.oldSearchTerms);

        chrome.devtools.network.onRequestFinished.addListener(function (request) {
            // do not show requests to chrome extension resources
            if (request.request.url.startsWith("chrome-extension://")) {
                return;
            }
            $scope.handleRequest(request);
        });

        chrome.devtools.network.onNavigated.addListener(function (event) {
            console.log("Event", event);
            $scope.masterRequests.push({
                id: $scope.uniqueId,
                separator: true,
                event: event
            });
            $scope.uniqueId++;
            $scope.cleanRequests();
        });
    };

    $scope.filterRequests = function () {
        if (!$scope.searchTerms || $scope.searchTerms.length === 0) {
            $scope.filteredRequests = $scope.masterRequests;
            return;
        }
        // console.log("Filtering for: ", $scope.searchTerms);

        let negTerms = [];
        let posTerms = [];
        for (let term of $scope.searchTerms) {
            term = term.toLowerCase();
            if (term && term[0] === '-') negTerms.push(term.substring(1));
            else posTerms.push(term);
        }

        $scope.filteredRequests = $scope.masterRequests.filter(function (x) {
            if (x.separator) return true;
            for (let term of negTerms) {
                // if neg
                if (x && x.searchIndex && x.searchIndex.includes(term)) return false;
            }

            if ($scope.andFilter) {
                // AND condition
                for (let term of posTerms) {
                    // if pos
                    if (x && x.searchIndex && !x.searchIndex.includes(term)) {
                        return false;
                    }
                }
                return true;
            } else {
                // OR condition
                for (let term of posTerms) {
                    // if pos
                    if (x && x.searchIndex && x.searchIndex.includes(term)) {
                        return true;
                    }
                }
                return false;
            }
        });
    };

    $scope.toggleSearchType = function() {
        $scope.andFilter = !$scope.andFilter;
        _setLocalStorage();
        $scope.filterRequests();
    };

    $scope.customSearch = function() {
        if (!$scope.searchTerms.includes($scope.search)) {
            $scope.searchTerms.push($scope.search);
            $scope.search = "";
            _setLocalStorage();
            $scope.filterRequests()
        }
    };

    _setLocalStorage = function() {
        // do some sort of comparison to searchTerms and oldSearchTerms to make sure there is only one.
        // although, now that I think about it... this comparison shouldn't be necessary... /shrug
        LOCALSTORAGE.setItem('bnp-andfilter', JSON.stringify($scope.andFilter));
        LOCALSTORAGE.setItem('bnp-searchterms', JSON.stringify($scope.searchTerms));
        LOCALSTORAGE.setItem('bnp-oldsearchterms', JSON.stringify($scope.oldSearchTerms));
        console.debug('Saving', $scope.andFilter, $scope.searchTerms, $scope.oldSearchTerms);
    }

    $scope.addSearchTerm = function(index) {
        $scope.searchTerms.push($scope.oldSearchTerms.splice(index, 1)[0]);
        _setLocalStorage();
        $scope.filterRequests();
    };

    $scope.removeSearchTerm = function(index) {
        $scope.oldSearchTerms.push($scope.searchTerms.splice(index, 1)[0]);
        _setLocalStorage();
        $scope.filterRequests();
    };

    $scope.deleteSearchTerm = function(index) {
        $scope.oldSearchTerms.splice(index, 1);
        _setLocalStorage();
    };

    $scope.handleRequest = function (har_entry) {
        $scope.addRequest(har_entry, har_entry.request.method, har_entry.request.url, har_entry.response.status, null);
    };

    $scope.createToolbar = function () {
        toolbar.createToggleButton(
            "embed",
            "JSON Parsing",
            false,
            function () {
                // ga('send', 'event', 'button', 'click', 'Toggle JSON Parsing');
                $scope.$apply(function () {
                    $scope.showOriginal = !$scope.showOriginal;
                    $scope.selectDetailTab($scope.currentDetailTab);
                    // $scope.displayCode();
                });
            },
            true
        );
        toolbar.createButton("download3", "Download", false, function () {
            // ga('send', 'event', 'button', 'click', 'Download');
            $scope.$apply(function () {
                const panel = $scope.currentDetailTab;
                if (panel === "tab-response") {
                    var blob = new Blob([JSON.parse(JSON.stringify($scope.activeCode, null, 4))], { type: "application/json;charset=utf-8" });
                    saveAs(blob, "export_response.json");
                } else {
                    try {
                        var blob = new Blob([JSON.stringify($scope.activePostData)], { type: "application/json;charset=utf-8" });
                        saveAs(blob, "export_request.json");
                    } catch (e) {
                        console.log(e)
                    }
                    
                }
            });
        });
        toolbar.createButton("blocked", "Clear", false, function () {
            // ga('send', 'event', 'button', 'click', 'Clear');
            $scope.$apply(function () {
                $scope.clear();
            });
        });

        $(".toolbar").replaceWith(toolbar.render());
    };

    $scope.addRequest = function (data, request_method, request_url, response_status) {
        $scope.$apply(function () {
            const requestId = data.id || $scope.uniqueId;
            $scope.uniqueId++

            if (data.request != null) {
                data["request_data"] = $scope.createKeypairs(data.request);
                if (data.request.cookies != null) {
                    data.cookies = $scope.createKeypairsDeep(data.request.cookies);
                }
                if (data.request.headers != null) {
                    data.headers = $scope.createKeypairsDeep(data.request.headers);
                }
                if (data.request.postData != null) {
                    data.postData = $scope.createKeypairs(data.request.postData);
                }
            }
            if (data.response != null) {
                data["response_data"] = $scope.createKeypairs(data.response);
                data.response_data.response_body = "Loading " + requestId;
                if (data.response.cookies != null) {
                    data["response_cookies"] = $scope.createKeypairsDeep(data.response.cookies);
                }
                if (data.response.headers != null) {
                    data["response_headers"] = $scope.createKeypairsDeep(data.response.headers);
                }
            }

            data["request_method"] = request_method;
            if (request_url.includes("apexremote")) {
                try {
                    let text = data && data.request && data.request.postData && data.request.postData.text ? JSON.parse(data.request.postData.text) : "";
                    data["request_apex_type"] = text.data && typeof text.data[1] === "string" ? text.data[1] : JSON.stringify(text.data);
                    data["request_apex_method"] = text.method || "";
                } catch (e) {
                    console.debug("Error", e);
                }
            }
            data.request_url     = request_url;
            data.response_status = response_status;
            data['id']           = requestId;
            let ctObj            = data.response_headers.find(x => x.name == "Content-Type")
            data.content_type    = ctObj && ctObj.value || null;

            $scope.requests[requestId] = data; // master
            data.searchIndex = JSON.stringify(data.request).toLowerCase();
            $scope.masterRequests.push(data);

            data.getContent(function (content, encoding) {
                $scope.requests[requestId].response_data.response_body = content;
            });

            $scope.cleanRequests();
        });
    };

    $scope.cleanRequests = function () {
        if ($scope.limitNetworkRequests === true) {
            if ($scope.masterRequests.length >= 500) $scope.masterRequests.shift();
            const keys = Object.keys($scope.requests).reverse().slice(500);
            keys.forEach(function (key) {
                if ($scope.requests[key]) {
                    delete $scope.requests[key];
                }
            });
        }
        $scope.filterRequests();
    };

    $scope.clear = function () {
        $scope.requests = {};
        $scope.activeId = null;
        $scope.masterRequests = [];
        $scope.filteredRequests = [];

        $scope.activeCookies = [];
        $scope.activeHeaders = [];
        $scope.activePostData = [];
        $scope.activeRequest = [];
        $scope.activeResponseData = [];
        $scope.activeResponseDataPreview = "";
        $scope.activeResponseCookies = [];
        $scope.activeResponseHeaders = [];
        $scope.activeCode = null;

        $scope.showIncomingRequests = true;
    };

    $scope.setActive = function (requestId) {
        if (!$scope.requests[requestId]) {
            return;
        }
        $scope.activeId = requestId;

        $scope.activeCookies = $scope.requests[requestId].cookies;
        $scope.activeHeaders = $scope.requests[requestId].headers;
        $scope.activePostData = $scope.requests[requestId].postData;
        $scope.activeRequest = $scope.requests[requestId].request_data;
        $scope.activeResponseData = $scope.requests[requestId].response_data;
        $scope.activeResponseDataPreview = $scope.requests[requestId].response_data.response_body;
        $scope.activeResponseCookies = $scope.requests[requestId].response_cookies;
        $scope.activeResponseHeaders = $scope.requests[requestId].response_headers;
        $scope.activeCode = $scope.requests[requestId].response_data.response_body;
    };

    $scope.getClass = function (requestId, separator) {
        if (separator) return "separator"
        if (requestId === $scope.activeId) {
            return "selected";
        } else {
            return "";
        }
    };
    $scope.titleIfSeparator = function(separator) {
        if (separator)
            return "Page reloaded here"
        return ""
    };

    $scope.createKeypairs = function (data) {
        let keypairs = [];
        if (!(data instanceof Object)) {
            return keypairs;
        }

        $.each(data, function (key, value) {
            if (!(value instanceof Object)) {
                keypairs.push({
                    name: key,
                    value: value
                });
            }
        });

        return keypairs;
    };

    $scope.createKeypairsDeep = function (data) {
        let keypairs = [];

        if (!(data instanceof Object)) {
            return keypairs;
        }

        $.each(data, function (key, value) {
            keypairs.push({
                name: value.name,
                value: value.value
            });
        });

        return keypairs;
    };

    $scope.$watch("activeCode", function (newVal, oldVal) {
        if (newVal === null) {
            $scope.responseJsonEditor.set(null)
            $scope.requestJsonEditor.set(null)
        }
        $scope.displayCode("responseJsonEditor", $scope.activeCode, 3);
        $scope.displayCode("requestJsonEditor", $scope.activePostData, 6);
    });

    $scope.selectDetailTab = function (tabId, external) {
        $scope.currentDetailTab = tabId;
        if (external) {
            $("#tabs a[href='#" + tabId + "']").trigger("click");
        }
        if (tabId === "tab-response") {
            $scope.displayCode("responseJsonEditor", $scope.activeCode, 3);
        }
        if (tabId === "tab-request") {
            $scope.displayCode("requestJsonEditor", $scope.activePostData, 6);
        }
    };

    $scope.displayCode = function (elementId, input, depth) {
        if (input) {
            let content;
            if ($scope.showOriginal) {
                content = parse(input, 0, 1);
            } else {
                content = parse(input, 0, depth);
            }

            if (typeof input === 'object' || Array.isArray(input)) {
                // JSON
                $scope[elementId].setMode("view");
                $scope[elementId].set(content);
            } else {
                // Something else
                try {
                    let json = JSON.parse(input)
                    $scope[elementId].setMode("view");
                    $scope[elementId].set(content);
                } catch (e) {
                    $scope[elementId].setMode("code");
                    $scope[elementId].set(content);
                }
            }

            if (elementId === "responseJsonEditor") {
                var bodySize = $scope.activeResponseData.find(x => x.name === "bodySize");
                if (bodySize && bodySize.value < MAXBODYSIZE) { // an arbitrary number that I picked so there is HUGE lag
                    if ($scope[elementId].getMode() === 'tree' || $scope[elementId].getMode() === 'view')
                        $scope[elementId].expandAll();
                }
            } else if (elementId === "requestJsonEditor") {
                var bodySize = $scope.activeRequest.find(x => x.name === "bodySize");
                if (bodySize && bodySize.value < MAXBODYSIZE) {
                    if ($scope[elementId].getMode() === 'tree' || $scope[elementId].getMode() === 'view')
                        $scope[elementId].expandAll();
                }
            }
        } else {
            $scope[elementId].set(null);
            $scope[elementId].expandAll();
        }
    };
});
