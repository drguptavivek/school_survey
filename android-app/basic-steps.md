
# Make sure no emulator is running
emulator -list-avds
# emulator -avd Medium_Phone_API_36.0 -netdelay none -netspeed full
adb devices       # optional, just to see what’s up
adb emu kill

emulator -avd Medium_Phone_API_36.0

# emulator -avd Medium_Phone_API_36.0 -wipe-data -no-snapshot-load  -no-snapshot-save -no-boot-anim & 

adb shell 'while [[ "$(getprop sys.boot_completed)" != "1" ]]; do sleep 1; done; echo "booted"'
# Reverse proxy for local API testing
adb reverse tcp:5173 tcp:5173 


cd /Users/vivekgupta/workspace/schoo_survey/android-app
./gradlew tasks
./gradlew :app:assembleDebug 

adb install -r app/build/outputs/apk/debug/app-debug.apk

Test Credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
National Admin:   admin@example.com / password123
Partner Manager:  manager@example.com / password123
Team Member:      team@example.com / password123
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━