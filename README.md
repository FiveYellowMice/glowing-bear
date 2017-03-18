# Glowing Bear ~ Haram Edition ~

[![Build Status](https://travis-ci.org/FiveYellowMice/glowing-bear.svg?branch=master)](https://travis-ci.org/FiveYellowMice/glowing-bear)

Glowing Bear ~ Haram Edition ~ is a fork of [Glowing Bear](https://github.com/glowing-bear/glowing-bear). It has several improvements:

- Less unecessary preview features
  Removed preview features of YouTube, DailyMotion, Allocine, Spotify, SoundCloud, Google Maps, Yr, Gist, Pastebin and Vine. Most of them use iframe which make the page more laggy, and take a lot of space to make it harder to scroll.
- Smarter image previews  
  The original Glowing Bear uses hard-coded RegEx to decide whether to show an image preview. That is understandable because it is the consequence of same-origin policy. But Glowing Bear ~ Haram Edition ~ uses a little bit of backend code (PHP) to implement true MIME type detection based on Content-Type header.
- Smaller preview for stickers  
  Stickers are usually not as important as normal images. So to maximize screen usage, Glowing Bear ~ Haram Edition ~ will make them smaller.

More improvements / features to come!

## Getting started

Just use <https://github.com/glowing-bear/glowing-bear>, that's the easiest way. And read the [original Glowing Bear guide](https://github.com/glowing-bear/glowing-bear#readme) for detail. But if you want to host your own, read ahead.

Unlike the original Glowing Bear, Glowing Bear ~ Haram Edition ~ needs PHP to work. But don't worry, most of the code are still on the frontend. For guides to set up PHP, search the internet, and other parts of setting up are still the same as the original Glowing Bear.
