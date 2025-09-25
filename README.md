# AuthTiles – Mobile 2FA Authenticator (React Native)

AuthTiles is a mobile 2FA authenticator app I built as my first foray into React Native and mobile dev. The app can scan standard `otpauth://` QR codes, generate live TOTP codes, and let users organize accounts into draggable tiles on a canvas.

---

## Features

* **QR Code Import** – uses `react-native-camera-kit` to scan `otpauth://` URIs and parse issuer, account, and secret.
* **TOTP Generation** – implements RFC-6238 one-time passcodes locally with `jsotp`.
* **Draggable Tiles** – accounts are displayed as draggable/resizable tiles on a whiteboard-style canvas (`PanResponder + Animated`).
* **Live Countdown Bar** – visual timer shows when codes refresh.
* **Safe-Area Support** – works on iOS devices with notches.

---

## Tech Stack

* **Framework:** React Native (TypeScript)
* **UI & Gestures:** `PanResponder`, `Animated API`
* **Camera & QR Scanning:** `react-native-camera-kit`
* **Auth Codes:** `jsotp`
* **Platform:** iOS (tested on simulator and device)

---

## Notes

* This was my first React Native project. It was scoped, built, and shipped as a functional app to learn mobile development hands-on.
* Core features (QR scan, TOTP codes, draggable tiles) are working. Additional features such as dark mode, settings, and Face ID login are planned. And maybe eventually App Store publication.

---

## Why This Project

I built AuthTiles to:

* Learn mobile development by creating and shipping an app.
* Explore auth flows and secure client-side storage.
* Showcase a spin on authenticators (tile-based, draggable layout instead of fixed lists).

---

## Disclaimer

This project was built for learning purposes. It is likely not production-ready security software.
