#!/bin/bash
set -e 

cargo build --target wasm32-unknown-unknown --release 
mkdir -p ../out 
cp target/wasm32-unknown-unknown/release/*.wasm ../out/delt-xp.wasm