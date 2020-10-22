# Better Network Panel - a Chrome extension #

> "As a Salesforce and Vlocity developer, I'm constantly looking for ways to improve my workflow, speed up my debugging, and find answers fast."

## THE PROBLEM

Over the last couple months, part of my debugging process has involved using the Chrome DevTools "Network" panel to find a specific `apexremote` call.  The search to find one `apexremote` call out of dozens has been... annoying.  

The page loads, several dozen `apexremote` calls flood the panel, and I start clicking each one, until the correct one (i.e. `Request-Body` contains "xyz") and I can proceed to look at the Preview.

The issue has only just begun, as I need to inspect the `Response`, perform some searches for `ID`s and the like, and although the `Response` is JSON format, the node in the response I need to search is stringified in a child member.  So I must copy the data, parse it somehow, either locally on my machine or on the web (jsoneditoronline.org has been great) and finally perform the searching I need.

And all of the above is done several times a day.

## THE SOLUTION

[![BNP for Chrome](/images/bnpscreenshot.png)](https://chrome.google.com/webstore/detail/better-network-panel/kknnkgpbclaljhfcknhbebhppmkmoaml)


I present to you a [Better Network Panel](https://chrome.google.com/webstore/detail/better-network-panel/kknnkgpbclaljhfcknhbebhppmkmoaml).  A Chrome extension that adds a new panel, and offers great features like:

* **Full Search** - Entire request is searchable (i.e. headers, postbody, etc...), not just URI
* **JSON Parsing** - Even nested members that contain stringified JSON are parsed
* **JSON Search** - Incremental searching is available directly in the Preview pane
* **Import HAR** - Import your own HAR file and use this tool for debugging
* **Download HAR** - Export a request as a HAR file and use an external tool for further debugging
* **Regex Search** - Powerfull regex searches can be performed on the Preview pane
* More to come


## Special Thanks

A huge thanks and recognition goes to [Milton Lai](https://github.com/milton-lai/saml-chrome-panel) and his project SAML Chrome Panel.  I started from a fork of his project, but later started fresh as there was a lot of SAML specific code that this project doesn't use/need.  The UI is nearly identical, but the code underneath has become fairly different at this point.

The SAML Chrome Panel was a huge help and ispiration!  Thank you Milton and contributors to the SAML Chrome Panel project!
