# react-native-mqtt-client
[![Build Status](https://travis-ci.org/rh389/react-native-mqtt-client.svg?branch=master)](https://travis-ci.org/rh389/react-native-mqtt-client)

## Status
Not production-ready just yet. Contributors very welcome.

## Why another MQTT client?
Before working on this package I looked at using:
 - [MQTT.js](https://www.npmjs.com/package/mqtt) - A great library but deeply dependent on node's streams and buffers.
 - [react-native-mqtt](https://www.npmjs.com/package/react-native-mqtt) - Currently not production ready, and largely implemented on the native side.
 - [Paho javascript client](https://www.npmjs.com/package/paho-client) - Dependent on global `localStorage`, code needs a lot of love.
 - [react_native_mqtt](https://www.npmjs.com/package/react_native_mqtt) - A thin wrapper around paho that works by adding to the global namespace.

This project borrows heavily from [mqtt-packet](https://www.npmjs.com/package/mqtt-packet) and [paho-client](https://www.npmjs.com/package/paho-client)

Goals for this package
 - Fully ES6, flow typed, and tested
 - Minimal external dependencies
 - Promise/event based API

## Features
None yet! Todo:

 - [ ] Full QoS 0 compliance
 - [ ] Full QoS 1 compliance
 - [ ] Full QoS 2 compliance
 - [ ] Session persistence (with AsyncStorage)
