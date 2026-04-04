#!/bin/bash
mkdir bak && mv *.png bak && cd bak && pngquant -f --speed 1 *.png && mv *-fs8.png .. && cd .. && mmv "*-fs8.png" "#1.png"

