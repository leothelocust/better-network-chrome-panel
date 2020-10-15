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

BNPChrome.controller("PanelController", function PanelController($scope, toolbar, parse) {
    $scope.uniqueid = 1000000;
    $scope.activeId = null;
    $scope.requests = {};
    $scope.masterRequests = [];
    $scope.filteredRequests = [];
    $scope.showAll = true;
    $scope.limitNetworkRequests = true;
    $scope.showOriginal = false;
    $scope.currentDetailTab = "tab-response";

    $scope.myResponseCodeMirror = null;

    $scope.activeCookies = [];
    $scope.activeHeaders = [];
    $scope.activePostData = [];
    $scope.activeRequest = [];
    $scope.activeResponseData = [];
    $scope.activeResponseCookies = [];
    $scope.activeResponseHeaders = [];
    $scope.activeCode = null;

    $scope.filter = "";

    $scope.showIncomingRequests = true;

    $scope.init = function (type) {
        $("#tabs").tabs();

        $scope.initChrome();

        this.createToolbar();
    };

    $scope.initChrome = function () {
        chrome.devtools.network.onRequestFinished.addListener(function (request) {
            // do not show requests to chrome extension resources
            if (request.request.url.startsWith("chrome-extension://")) {
                return;
            }
            $scope.handleRequest(request);
        });
    };

    $scope.filterRequests = function () {
        const searchString = $scope.filter.toLowerCase();
        if (!searchString) $scope.filteredRequests = $scope.masterRequests;

        $scope.filteredRequests = $scope.masterRequests.filter(function (x) {
            if (x && x.searchIndex && x.searchIndex.includes(searchString)) return true;
        });
    };

    $scope.handleRequest = function (har_entry) {
        $scope.addRequest(har_entry, har_entry.request.method, har_entry.request.url, har_entry.response.status, null);
    };

    $scope.createToolbar = function () {
        toolbar.createButton("search", "Search Code", false, function () {
            // ga('send', 'event', 'button', 'click', 'Search Code');
            $scope.$apply(function () {
                if ($scope.myResponseCodeMirror) {
                    $scope.myResponseCodeMirror.execCommand("find");
                }
            });
        });
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
                var blob = new Blob([JSON.stringify($scope.requests)], { type: "application/json;charset=utf-8" });
                saveAs(blob, "BNPChromeExport.json");
            });
        });
        toolbar.createButton("upload3", "Import", true, function () {
            // ga('send', 'event', 'button', 'click', 'Import');
            $scope.$apply(function () {
                $("#ImportInput").click();
            });
        });
        toolbar.createToggleButton(
            "meter",
            "Limit network requests to 500",
            false,
            function () {
                // ga('send', 'event', 'button', 'click', 'Toggle Limit Network Request');
                $scope.$apply(function () {
                    $scope.limitNetworkRequests = !$scope.limitNetworkRequests;
                });
            },
            true
        );
        toolbar.createButton("blocked", "Clear", false, function () {
            // ga('send', 'event', 'button', 'click', 'Clear');
            $scope.$apply(function () {
                $scope.clear();
            });
        });

        $(".toolbar").replaceWith(toolbar.render());

        //clears the input value so you can reload the same file
        document.getElementById("ImportInput").addEventListener(
            "click",
            function () {
                this.value = null;
            },
            false
        );
        document.getElementById("ImportInput").addEventListener("change", readFile, false);
        function readFile(evt) {
            const files = evt.target.files;
            const file = files[0];
            const reader = new FileReader();
            reader.onload = function () {
                $scope.importFile(this.result);
            };
            reader.readAsText(file);
        }
    };

    $scope.importFile = function (data) {
        $scope.$apply(function () {
            const importHar = JSON.parse(data);
            for (i in importHar) {
                $scope.handleRequest(importHar[i]);
            }
        });
    };

    $scope.addRequest = function (data, request_method, request_url, response_status) {
        $scope.$apply(function () {
            const requestId = $scope.uniqueid;
            $scope.uniqueid = $scope.uniqueid + 1;

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
                    let text =
                        data && data.request && data.request.postData && data.request.postData.text
                            ? JSON.parse(data.request.postData.text)
                            : "";
                    data["request_apex_type"] =
                        text.data && typeof text.data[1] === "string" ? text.data[1] : JSON.stringify(text.data);
                    data["request_apex_method"] = text.method || "";
                } catch (e) {
                    console.debug("Error", e);
                }
            }
            data["request_url"] = request_url;
            data["response_status"] = response_status;
            data["id"] = requestId;

            $scope.requests[requestId] = data; // master
            data.searchIndex = JSON.stringify(data).toLowerCase();
            // console.debug('SearchIndex', data.searchIndex)
            $scope.masterRequests.push(data);
            $scope.filteredRequests.push(data);

            data.getContent(function (content, encoding) {
                try {
                    $scope.requests[requestId].response_data.response_body = JSON.stringify(
                        JSON.parse(content),
                        null,
                        4
                    );
                } catch (e) {}
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

    $scope.getClass = function (requestId) {
        if (requestId === $scope.activeId) {
            return "selected";
        } else {
            return "";
        }
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
        $scope.displayCode("tab-response-codemirror", $scope.activeCode, "myResponseCodeMirror", 3);
        $scope.displayCode("tab-request-codemirror", $scope.flatten($scope.activePostData), "myRequestCodeMirror", 6);
    });

    $scope.selectDetailTab = function (tabId, external) {
        $scope.currentDetailTab = tabId;
        if (external) {
            $("#tabs a[href='#" + tabId + "']").trigger("click");
        }
        if (tabId === "tab-response")
            $scope.displayCode("tab-response-codemirror", $scope.activeCode, "myResponseCodeMirror", 3);
        if (tabId === "tab-request")
            $scope.displayCode(
                "tab-request-codemirror",
                $scope.flatten($scope.activePostData),
                "myRequestCodeMirror",
                6
            );
    };

    $scope.flatten = function (input) {
        if (input && typeof input === "object")
            return input.map(function (x) {
                var tmp = {};
                tmp[x.name] = x.value;
                return tmp;
            });
    };

    $scope.displayCode = function (elementId, input, scopeVar, depth) {
        if (input != null) {
            document.getElementById(elementId).style.visibility = "visible";

            let content;
            if ($scope.showOriginal) {
                content = JSON.stringify(parse(input, 0, 1), null, 4);
            } else {
                content = JSON.stringify(parse(input, 0, depth), null, 4);
            }

            if ($scope[scopeVar]) {
                $scope[scopeVar].getDoc().setValue(content);

                $scope[scopeVar].refresh();
                return;
            }

            document.getElementById(elementId).innerHTML = "";
            const codeMirror = CodeMirror(document.getElementById(elementId), {
                value: content,
                mode: "application/json",
                theme: "neat",
                lineNumbers: true,
                lineWrapping: false,
                readOnly: true,
                foldGutter: true,
                gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
            });
            $scope[scopeVar] = codeMirror;
        }
    };

    $scope.getPretty = function (source) {
        let code = JSON.stringify(parse(source, 0, 1), null, 4);
        return code;

        const options = {
            source: code,
            mode: "beautify", //  beautify, diff, minify, parse
            lang: "auto",
            inchar: " " // indent character
        };
        const pd = prettydiff(options); // returns and array: [beautified, report]

        const pretty = pd[0];

        return pretty;
    };
});
