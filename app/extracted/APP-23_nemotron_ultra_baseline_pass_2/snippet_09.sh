# Install dependencies
npm install react-native-vision-camera react-native-vision-camera-frame-processor vision-camera-code-scanner

# iOS
cd ios && pod install && cd ..

# Android (add to android/settings.gradle)
# include ':react-native-vision-camera'
# project(':react-native-vision-camera').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-vision-camera/android')

# Rebuild native apps
npx react-native run-ios
npx react-native run-android