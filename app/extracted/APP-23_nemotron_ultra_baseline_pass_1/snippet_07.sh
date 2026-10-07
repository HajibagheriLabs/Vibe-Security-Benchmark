# Install dependencies
npm install
# or
yarn install

# iOS
cd ios && pod install && cd ..

# Android (ensure minSdkVersion=21 in android/build.gradle)
# No extra gradle config needed for vision-camera v3+

# Run
npx react-native run-ios
npx react-native run-android