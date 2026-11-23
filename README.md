# Nava Launcher for the TX60 PRO

The Nava TV web demo remade as a real Android TV launcher: same look, but it lists and opens the
apps that are actually installed on your box.

* Home: *Continue* (recently opened), *Favorites*, then your apps grouped as Movies & TV / Music / Games / Social / Apps
* Apps tab: every app in a grid
* Search: on-screen keyboard (a USB/Bluetooth keyboard works too, just start typing)
* Hold **OK** on an app: Open, Pin to Favorites, App info, Uninstall (system apps can't be uninstalled)
* Settings tab / Menu key: Wi-Fi, Network, Bluetooth, Display, Sound, Date & time, volume, screensaver
* Fully offline, no INTERNET permission, no root, nothing in the system is modified

## 1. Build the APK (no Android Studio needed)

1. Create a free GitHub account and a **new repository**. On its page choose *Add file -> Upload files* and drag in everything
   from this folder (the hidden `.github` folder is usually skipped, that's fine, step 2 fixes it).
2. Still in the repository: *Add file -> Create new file*. In the name box type exactly `.github/workflows/build.yml`
   (typing the `/` creates the folders). Paste in the contents of `build-apk-workflow.yml` from this folder and press *Commit changes*.
3. Open the **Actions** tab. The build starts by itself after that commit (or pick **Build APK -> Run workflow**).
   If Actions asks, click "I understand my workflows, go ahead and enable them".
4. After 2-4 minutes open the finished run and download **nava-launcher-apk** at the bottom. Unzip it: `app-debug.apk`.

Prefer Android Studio? Open this folder, press Run, or build with `./gradlew assembleDebug` (JDK 17).

## 2. Install on the TX60 PRO

Pick one:

* **adb over Wi-Fi** (same network as your computer; enable *Developer options → USB/Network debugging* on the box)
  ```
  adb connect <box-ip>:5555
  adb install -r app-debug.apk
  ```
* **USB stick**: copy the APK to a stick, open it with a file manager app on the box, allow "install unknown apps" when asked.

## 3. Try it first, then make it your home screen

Nava TV now shows up in the box's app list. Open it from there and look around. **Nothing has changed yet.**

To make it the home screen, press **Home** on the remote and, if Android asks which home app to use, choose **Nava TV → Always**.
If your box doesn't ask: open the launcher's Settings panel → **Home app**, or run
```
adb shell cmd package set-home-activity com.nava.launcher/.MainActivity
```

## Undo (go back to the original launcher)

Nothing is replaced, the old launcher is still installed. Any one of these puts things back:

* Box Settings → Apps → **Nava TV** → *Clear defaults* (then Home asks again, pick the old launcher), or
* Box Settings → Apps → **Nava TV** → *Uninstall*, or
* `adb uninstall com.nava.launcher`

Keep adb working before you set Nava as default, so you always have a way back.

## Notes

* App categories (Movies & TV, Music, Games...) come from what each app declares; apps that declare nothing land in *Apps*.
* Rarely, a box's firmware hides some Settings screens; the launcher then opens the main Settings app instead.
* Want it faster on a weak box? "Glass blur" is off by default; leave it off.
* Desktop preview of the UI: open `app/src/main/assets/launcher/index.html` through any local web server
  (arrows, Enter, hold Enter, Esc, Tab, `/`), it uses fake apps.
