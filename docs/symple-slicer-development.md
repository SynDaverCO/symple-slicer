Building Symple Slicer Desktop
------------------------------

To build the Electron desktop app, install node.js on your machine then:

```
git clone git@github.com:SynDaverCO/symple-slicer.git
cd symple-slicer
git submodule update --init
npm install
```

To run:

```
npm start
```

To build all distributibles:

```
npm run package-win
npm run package-mac
npm run package-linux
npm run installer-win
```

Distributables will be stored in the `dist` directory.


Building Symple Slicer Web
--------------------------

Building the web version of Symple Slicer relies on UNIX shell
scripts. Under Windows, you may want to use WSL version 1.

There is a bug in Chromium where WebGL will fail to start
if the files are hosted in a network drive, as is the case
for the native WSL Linux file system. Because of this, it is
necessary to checkout the files into a Windows native drive
using the regular windows command prompt (see steps above),
then from within WSL create a symlink to that location:

```
ln -s /mnt/c/Users/USERNAME/Documents/symple-slicer
cd symple-slicer
```

To run a web server on localhost serving the app:

```
./run-local-host.sh
```

To rebuild the Cura Engine from source:

```
./build-cura-engine.sh
```

To create a web release of Symple Slicer:

```
./build-web-release.sh
```


