Developing Symple Slycer in WSL
---------------------------------

The development of the desktop version of Symple Slicer can
be done under Windows Subsystem for Linux version 1.

There is a bug in Chromium where WebGL will fail to start
if the files are hosted in a network drive, as is the case
for the WSL Linux file system. Because of this, it is
necessary to checkout the files into a Windows native drive.

From the WSL bash shell, change directories into a Windows
native drive and run it as follows:

```
cd /mnt/c/Users/USERNAME/Documents
git clone git@github.com:SynDaverCO/symple-slicer.git
cd symple-slicer
git checkout symple-slicer-electron
git submodule update --init
```

However, it is necessary to prepare the NPM files from the Windows command prompt:

```
cd C:/USERNAME/Documents\symple-slicer
npm install
.\node_modules\.bin\electron-rebuild.cmd
```

From this point "npm start" should work either under WSL or the DOS command prompt.

