#!/bin/bash
cd "$(dirname "$0")"
npm install ws 2>/dev/null

# Kill any existing server on port 8765
PATH=/usr/sbin:/sbin:$PATH lsof -ti:8765 | xargs kill -9 2>/dev/null
sleep 1

node server.js
