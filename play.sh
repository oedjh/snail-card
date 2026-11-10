#!/bin/bash
python3 -m http.server 8000 &
sleep 1
xdg-open http://localhost:8000
