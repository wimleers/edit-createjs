#!/bin/sh

# Run this from the location where this file lives.
#
# Requirements:
# - internet access
# - git
# - nodejs
# - uglifyjs

BUILDPROFILE=build/aloha/build-profile-drupal.js
TARGETDIR=target/build-profile-drupal




echo "[1/6] Cloning Aloha Editor"

git clone git://github.com/alohaeditor/Aloha-Editor.git --depth 1




echo "[2/6] Applying patches"

cd Aloha-Editor
wget https://github.com/alohaeditor/Aloha-Editor/pull/642.patch
git apply 642.patch
wget https://github.com/alohaeditor/Aloha-Editor/pull/683.patch
git apply 683.patch
wget https://github.com/alohaeditor/Aloha-Editor/pull/695.patch
git apply 695.patch




echo "[3/6] Building"

cp ../build-profile-drupal.js build/aloha/
node build/r.js -o $BUILDPROFILE

# For some reason, these vendor libs are NOT being copied.
cp src/lib/vendor/jquery-ui-1.9m6.js $TARGETDIR/lib/vendor/
cp src/lib/vendor/sanitize.js $TARGETDIR/lib/vendor/




echo "[4/6] Cleaning up build of Aloha Editor"

# General clean-up.
rm -rf $TARGETDIR/build.txt
rm -rf $TARGETDIR/*.patch
rm -rf $TARGETDIR/demo
rm -rf $TARGETDIR/img
rm -rf $TARGETDIR/lib/aloha/nls
rm -rf $TARGETDIR/lib/vendor/grid.locale.*
# Remove bundled jQuery versions.
rm -rf $TARGETDIR/lib/vendor/jquery-1.*
rm -rf $TARGETDIR/lib/vendor/jquery.*
rm -rf $TARGETDIR/lib/vendor/repository-browser
rm -rf $TARGETDIR/test

# Remove "common" plug-ins we don't use and remove cruft from the remaining ones.
rm -rf $TARGETDIR/plugins/common/abbr
rm -rf $TARGETDIR/plugins/common/characterpicker/img
rm -rf $TARGETDIR/plugins/common/horizontalruler/img
rm -rf $TARGETDIR/plugins/common/image/demo
# rm -rf $TARGETDIR/plugins/common/image/img
rm -rf $TARGETDIR/plugins/common/image/test
rm -rf $TARGETDIR/plugins/common/image/vendor/ui
rm -rf $TARGETDIR/plugins/common/link/demo
rm -rf $TARGETDIR/plugins/common/link/demo
rm -rf $TARGETDIR/plugins/common/table
rm -rf $TARGETDIR/plugins/common/undo

# Remove all "extra" plug-ins except for captioned-image.
mv $TARGETDIR/plugins/extra/captioned-image $TARGETDIR/plugins/
rm -rf $TARGETDIR/plugins/extra/*
mv $TARGETDIR/plugins/captioned-image $TARGETDIR/plugins/extra/




echo "[5/6] Minifying aloha.js"

uglifyjs -o $TARGETDIR/lib/aloha.js $TARGETDIR/lib/aloha.js




echo "[6/6] Build clean-up"

cd ..
rm -rf alohaeditor
mv Aloha-Editor/$TARGETDIR alohaeditor
rm -rf Aloha-Editor
