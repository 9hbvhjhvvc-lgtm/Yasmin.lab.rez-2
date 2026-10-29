#!/bin/sh
cd "$(dirname "$0")"
javac -encoding UTF-8 -d . Server.java
java -cp . Server
