#!/bin/bash

# Load environment variables from .env file
set -o allexport
source .env
set -o allexport

# Step 1: Get screen dimensions using system_profiler (macOS specific)
screen_dimensions=$(system_profiler SPDisplaysDataType | grep Resolution | awk '{print $2, $4}')
screen_width=$(echo $screen_dimensions | cut -d' ' -f1)
screen_height=$(echo $screen_dimensions | cut -d' ' -f2)

echo "Screen Image Dimensions: ${screen_width}x${screen_height}"

top_left_x=650
top_left_y=500

region_width=$((screen_width * 57 / 100))
region_height=$((screen_height * 65 / 100))

# Capture the full screen to a temporary file
tmpfile=$(mktemp /tmp/screenshot.XXXXXX).png
screencapture -x $tmpfile

# Crop the image and save to a new temporary file
cropped_tmpfile=$(mktemp /tmp/cropped_screenshot.XXXXXX).png
magick $tmpfile -crop ${region_width}x${region_height}+${top_left_x}+${top_left_y} $cropped_tmpfile

echo "Cropped Image Dimensions: ${region_width}x${region_height} at (${top_left_x}, ${top_left_y})"
echo "${SERVER_URL}:${PORT}/predict"

# Upload the cropped image using curl
curl -X POST -F "image=@$cropped_tmpfile" ${SERVER_URL}:${PORT}/predict

# Remove the temporary files
rm $tmpfile
rm $cropped_tmpfile

echo "Screenshot processed and uploaded successfully"
