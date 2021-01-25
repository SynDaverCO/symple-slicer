Building Symple Slicer Desktop
------------------------------

To build the Electron desktop app, install node.js on your machine then:

```
git clone git@github.com:SynDaverCO/symple-slicer.git
cd symple-slicer
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

Hosting Symple Slicer Web
-------------------------

Symple Slicer Web makes use of a service worker for the auto update and to allow the webapp to be used offline.
This functionality is complex and the following web server requirements must be met:

  1) The web server must be HTTPS capable.
  2) The web server must have a valid public certificate.
  3) The file "service-worker.js" must be kept up-to-date with a list of files to cache on a user's client.

It is suggested to use [GitHub Pages] for hosting as it meets the first and second requirements.

If you wish to have a HTTP-only hosting, delete the "service-worker.js" file. This will allow Symple Slicer
to operate as a static web page.

[GitHub Pages]: https://pages.github.com/