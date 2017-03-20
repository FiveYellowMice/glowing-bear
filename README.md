# Glowing Bear ~ Haram Edition ~

[![Build Status](https://travis-ci.org/FiveYellowMice/glowing-bear.svg?branch=master)](https://travis-ci.org/FiveYellowMice/glowing-bear)

Glowing Bear ~ Haram Edition ~ is a fork of [Glowing Bear](https://github.com/glowing-bear/glowing-bear). It has several improvements:

- Real URL preview  
  The original Glowing Bear uses a very dumb way to decide whether and how to show preview of an URL - by matching hard-coded RegExes. That is understandable because of the same-origin policy. But Glowing Bear ~ haram Edition ~ uses a little bit of backend code (PHP) to detect the Content-Type of the URL, and title and description of an HTML webpage. This way is also much more lightweight, compare to excessive use of iframes.
- Smaller preview for stickers  
  Stickers are usually not as important as normal images. So to maximize screen usage, Glowing Bear ~ Haram Edition ~ will make them smaller.

More improvements / features to come!

## Getting started

Just use <https://github.com/glowing-bear/glowing-bear>, that's the easiest way. And read the [original Glowing Bear guide](https://github.com/glowing-bear/glowing-bear#readme) for detail. But if you want to host your own, read ahead.

Unlike the original Glowing Bear, Glowing Bear ~ Haram Edition ~ needs PHP to work. But don't worry, most of the code are still on the frontend. For guides to set up PHP, search the internet, and other parts of setting up are still the same as the original Glowing Bear.
