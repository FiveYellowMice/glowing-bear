(function() {
'use strict';

var weechat = angular.module('weechat');

weechat.factory('imgur', ['$rootScope', function($rootScope) {

    var process = function(image, callback) {

        // Is it an image?
        if (!image || !image.type.match(/image.*/)) return;

        // Progress bars container
        var progressBars = document.getElementById("imgur-upload-progress"),
            currentProgressBar = document.createElement("div");

        // Set progress bar attributes
        currentProgressBar.className='imgur-progress-bar';
        currentProgressBar.style.width = '0';

        // Append progress bar
        progressBars.appendChild(currentProgressBar);

        // Create new XMLHttpRequest
        var xhr = new XMLHttpRequest();

        // Post request to <del>Imgur</del><ins>Ymage</ins> API
        xhr.open("POST", "https://img.fym.one/", true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('Content-Type', image.type);

        // Handler for response
        xhr.onload = function() {

            // Remove progress bar
            currentProgressBar.parentNode.removeChild(currentProgressBar);

            // Check state and response status
            if(xhr.status === 200) {

                // Get response text
                var response = JSON.parse(xhr.responseText);

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

        }

        if ("upload" in xhr) {

            // Set progress
            xhr.upload.onprogress = function (event) {

                // Check if we can compute progress
                if (event.lengthComputable) {
                    // Complete in percent
                    var complete = (event.loaded / event.total * 100 | 0);

                    // Set progress bar width
                    currentProgressBar.style.width = complete + '%';
                }
            };

        }

        xhr.onerror = function() {
            showErrorMsg();
        }

        xhr.send(image);
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
        process: process
    };

}]);

})();
