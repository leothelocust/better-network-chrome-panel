
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

Console.addMessage = function(type, format, args) {
    chrome.runtime.sendMessage({
        command: "sendToConsole",
        tabId: chrome.devtools.inspectedWindow.tabId,
        args: escape(JSON.stringify(Array.prototype.slice.call(arguments, 0)))
    });
};

// Generate Console output methods, i.e. Console.log(), Console.debug() etc.
(function() {
    var console_types = Object.getOwnPropertyNames(Console.Type);
    for (var type = 0; type < console_types.length; ++type) {
        var method_name = Console.Type[console_types[type]];
        Console[method_name] = Console.addMessage.bind(Console, method_name);
    }
})();


BNPChrome.controller('PanelController', function PanelController($scope, $http, toolbar) {

    $scope.uniqueid = 1000000;
    $scope.activeId = null;
    $scope.requests = {};
    $scope.masterRequests = [];
    $scope.filteredRequests = [];
    $scope.showAll = true;
    $scope.limitNetworkRequests = true;
    $scope.showOriginal = true;
    $scope.currentDetailTab = "tab-code";

    $scope.myCodeMirror = null;

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

    $scope.init = function(type) {
        $('#tabs').tabs();

        $scope.initChrome();

        this.createToolbar();
    };

    $scope.initChrome = function() {
        key('⌘+k, ctrl+l', function() {
            $scope.$apply(function() {
                $scope.clear();
            });
        });

        chrome.devtools.network.onRequestFinished.addListener(function(request) {
            // do not show requests to chrome extension resources
            if (request.request.url.startsWith("chrome-extension://")) {
                return;
            }
            $scope.handleRequest(request);
        });
    };

    $scope.filterRequests = function() {
        // console.debug('Search Filter: ', $scope.filter, $scope.filteredRequests.length, $scope.masterRequests.length);
        // console.debug("Request", $scope.masterRequests[0]);
        // console.debug('Requests', $scope.requests);
        $scope.filteredRequests = $scope.masterRequests.filter(function(x) {
            if (!$scope.filter) return true;
            if (x && JSON.stringify(x).toLowerCase().includes($scope.filter.toLowerCase())) return true;
        });
    }

    $scope.handleRequest = function(har_entry) {
        const request_method = har_entry.request.method;
        const request_url = har_entry.request.url;
        const response_status = har_entry.response.status;

        $scope.addRequest(har_entry, request_method, request_url, response_status, null);
    };

    $scope.createToolbar = function() {
        toolbar.createButton('search', 'Search Code', false, function() {
            // ga('send', 'event', 'button', 'click', 'Search Code');
            $scope.$apply(function() {
                if ($scope.myCodeMirror) {
                    $scope.myCodeMirror.execCommand("find");
                }
            });
        });
        toolbar.createToggleButton('embed', 'JSON Parsing', false, function() {
            // ga('send', 'event', 'button', 'click', 'Toggle JSON Parsing');
            $scope.$apply(function() {
                $scope.showOriginal = !$scope.showOriginal;
                $scope.displayCode();
            });
        }, false);
        toolbar.createButton('download3', 'Download', false, function() {
            // ga('send', 'event', 'button', 'click', 'Download');
            $scope.$apply(function() {
                var blob = new Blob([JSON.stringify($scope.requests)], {type: "application/json;charset=utf-8"});
                saveAs(blob, "BNPChromeExport.json");
            });
        });
        toolbar.createButton('upload3', 'Import', true, function() {
            // ga('send', 'event', 'button', 'click', 'Import');
            $scope.$apply(function() {
                $('#ImportInput').click();
            });
        });
        toolbar.createToggleButton('meter', 'Limit network requests to 500', false, function() {
            // ga('send', 'event', 'button', 'click', 'Toggle Limit Network Request');
            $scope.$apply(function() {
                $scope.limitNetworkRequests = !$scope.limitNetworkRequests;
            });
        }, true);
        toolbar.createButton('blocked', 'Clear', false, function() {
            // ga('send', 'event', 'button', 'click', 'Clear');
            $scope.$apply(function() {
                $scope.clear();
            });
        });

        $('.toolbar').replaceWith(toolbar.render());

        //clears the input value so you can reload the same file
        document.getElementById('ImportInput').addEventListener('click', function() {this.value=null;}, false);
        document.getElementById('ImportInput').addEventListener('change', readFile, false);
        function readFile (evt) {
            const files = evt.target.files;
            const file = files[0];
            const reader = new FileReader();
            reader.onload = function() {
                $scope.importFile(this.result);
            }
            reader.readAsText(file)
        }
    };

    $scope.importFile = function(data) {
        $scope.$apply(function() {
            const importHar = JSON.parse(data);
            for (i in importHar)
            {
                $scope.handleRequest(importHar[i]);
            }
        });
    }

    $scope.addRequest = function(data, request_method, request_url, response_status) {

        $scope.$apply(function() {
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
            if (request_url.includes('apexremote')) {
                try {
                    let text = (data && data.request && data.request.postData && data.request.postData.text) ? JSON.parse(data.request.postData.text) : '';
                    data["request_apex_type"] = (text.data && typeof text.data[1] === 'string') ?  text.data[1] : JSON.stringify(text.data);
                    data["request_apex_method"] = text.method || '';
                } catch (e) {console.debug('Error', e)}
            }
            data["request_url"] = request_url;
            data["response_status"] = response_status;
            data["id"] = requestId;

            $scope.requests[requestId] = data; // master
            $scope.masterRequests.push(data);
            $scope.filteredRequests.push(data);

            data.getContent(function (content, encoding) {
                try {
                    $scope.requests[requestId].response_data.response_body = JSON.stringify(JSON.parse(content), null, 4);
                } catch (e) {}
            });

            $scope.cleanRequests();
        });
    };

    $scope.cleanRequests = function() {
        if ($scope.limitNetworkRequests === true) {
            if ($scope.masterRequests.length >= 500 ) $scope.masterRequests.shift();
            const keys = Object.keys($scope.requests).reverse().slice(500);
            keys.forEach(function(key) {
                if ($scope.requests[key]) {
                    delete $scope.requests[key];
                }
            });
        }
        $scope.filterRequests();
    }

    $scope.clear = function() {
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
        document.getElementById("tab-code-codemirror").style.visibility = "hidden";

    };

    $scope.setActive = function(requestId) {
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

    $scope.getClass = function(requestId) {
        if (requestId === $scope.activeId) {
            return 'selected';
        } else {
            return '';
        }
    };

    $scope.createKeypairs = function(data) {
        let keypairs = [];
        if (!(data instanceof Object)) {
            return keypairs;
        }

        $.each(data, function(key, value) {
            if (!(value instanceof Object)) {
                keypairs.push({
                    name: key,
                    value: value
                });
            }
        });

        return keypairs;
    };

    $scope.createKeypairsDeep = function(data) {
        let keypairs = [];

        if (!(data instanceof Object)) {
            return keypairs;
        }

        $.each(data, function(key, value) {
            keypairs.push({
                name: value.name,
                value: value.value
            });
        });

        return keypairs;
    };


    $scope.$watch('activeCode', function() {
        $scope.displayCode();
    });

    $scope.selectDetailTab = function(tabId) {
        $scope.currentDetailTab = tabId;
        if (tabId === "tab-code") {
            $scope.displayCode();
        }
    }

    $scope.displayCode = function() {
        if ($scope.activeCode != null) {
            document.getElementById("tab-code-codemirror").style.visibility = "visible";

            let content = $scope.activeCode;
            // if (!$scope.showOriginal) {
            //     content = $scope.getPretty(content);
            // } else {
                content = JSON.stringify($scope.parse(content), null, 4);
            // }

            if ($scope.myCodeMirror) {
                $scope.myCodeMirror.getDoc().setValue(content);

                $scope.myCodeMirror.refresh();
                return;
            }

            document.getElementById("tab-code-codemirror").innerHTML = "";
            const myCodeMirror = CodeMirror(document.getElementById("tab-code-codemirror"), {
                value: content,
                mode: "application/json",
                theme: "neat",
                lineNumbers: true,
                lineWrapping: false,
                readOnly: true,
                foldGutter: true,
                gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
            });
            myCodeMirror.setOption("extraKeys", {
                "Ctrl-F": function(cm) {
                    cm.execCommand('findPersistent');
                },
                "Ctrl-G": function(cm) {
                    cm.execCommand('findPersistentNext');
                },
                "Shift-Ctrl-G": function(cm) {
                    cm.execCommand('findPersistentPrev');
                }
            });
            $scope.myCodeMirror = myCodeMirror;
        }
    }

    $scope.getPretty = function(source) {
        let code = $scope.parse(source);

        const options = {
            source: code,
            mode: "beautify", //  beautify, diff, minify, parse
            lang: "auto",
            inchar: " ", // indent character
        };
        const pd = prettydiff(options); // returns and array: [beautified, report]

        const pretty = pd[0];

        return pretty;
    }

    $scope.parse = function(input) {
        try {
            // console.warn('Parse Type', typeof input);

            if (typeof input === 'boolean') return input;
            if (typeof input === 'number') return input;
            if (!input) return input;
            
            if (typeof input === 'string') {
                // if string, try to parse
                // returns the original string if this fails
                input = JSON.parse(input);
                // console.debug('Parse String', input);
                return $scope.parse(input);
            }

            if (Array.isArray(input)) {
                for (let i = 0; i < input.length; i++) {
                    // console.debug('Parse Inner Array', i, input[i]);
                    input[i] = $scope.parse(input[i]);
                }
            }

            if (typeof input === 'object') {
                // console.debug('Parse Object', input);
                Object.entries(input).forEach(function([key, value]) {
                    // console.debug('Parse Inner Object', key, value);
                    if (key === "result")
                        input[key] = $scope.parse(value);
                })
            }
        } catch (e) {
            // console.info('Error parsing', e, typeof input, input)
            // console.debug('Parse String Failed', input);
            return input
        }

        // console.debug('Returning', input);
        return input;
    }
});
