(function() {
'use strict';

var weechat = angular.module('weechat');

weechat.factory('imgur', ['$rootScope', 'settings', function($rootScope, settings) {

    var process = function(image, callback) {
        // Is it an image?
        if (!image || !image.type.match(/image.*/)) return;

        // Progress bars container
        var progressBars = document.getElementById("imgur-upload-progress"),
            currentProgressBar = document.createElement("div");
        currentProgressBar.className='imgur-progress-bar';
        currentProgressBar.style.width = '0';

        progressBars.appendChild(currentProgressBar);

        // Create new XMLHttpRequest
        var xhttp = new XMLHttpRequest();

        // Post request to <del>Imgur</del><ins>Ymage</ins> API
        xhttp.open("POST", "https://img.fym.one/", true);
        xhttp.setRequestHeader('Accept', 'application/json');
        xhttp.setRequestHeader('Content-Type', image.type);

        // Handler for response
        xhttp.onload = function() {

            // Remove progress bar
            progressBars.removeChild(currentProgressBar);

            // Check state and response status
            if(xhttp.status === 200) {
                var response = JSON.parse(xhttp.responseText);

                // Send link as message
                if (response.short_url) {
                    if (callback && typeof(callback) === "function") {
                        callback(response.short_url);
                    }
                } else {
                    showErrorMsg();
                }
            } else {
                showErrorMsg();
            }
        };

        if ("upload" in xhttp) {
            // Update the progress bar if we can compute progress
            xhttp.upload.onprogress = function (event) {
                if (event.lengthComputable) {
                    var complete = (event.loaded / event.total * 100 | 0);
                    currentProgressBar.style.width = complete + '%';
                }
            };
        }

        xhttp.onerror = function() {
            showErrorMsg();
        };

        // Send request with form data
        xhttp.send(image);
    };

    var showErrorMsg = function() {
        // Show error msg
        $rootScope.uploadError = true;
        $rootScope.$apply();

        // Hide after 5 seconds
        setTimeout(function(){
            // Hide error msg
            $rootScope.uploadError = false;
            $rootScope.$apply();
        }, 5000);
    };

    return {
        process: process,
    };

}]);

})();
