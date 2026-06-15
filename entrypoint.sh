#!/bin/sh

mkdir -p $HOME/.pi/agent/
echo $INPUT_MODELS_JSON > $HOME/.pi/agent/models.json

node /srv/dist/main.js
