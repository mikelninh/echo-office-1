#!/bin/bash
cd "$(dirname "$0")"
npm install ws 2>/dev/null
node server.js
